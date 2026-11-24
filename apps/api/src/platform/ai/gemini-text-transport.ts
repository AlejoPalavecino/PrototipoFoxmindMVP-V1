import { GoogleGenAI, ThinkingLevel, type Content, type GenerateContentParameters } from '@google/genai';
import type { GeminiClient } from './gemini-client.ts';
import type { AiTextTransport, AiTransportRequest, AiTextResult } from './text-contract.ts';
import { geminiUsage } from './usage.ts';
import { AiError } from './errors.ts';

function contents(input: AiTransportRequest): Content[] {
  return input.messages.map(message => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: message.parts.map(part => part.kind === 'text' ? { text: part.text } : {
      inlineData: { mimeType: 'application/pdf', data: Buffer.from(part.bytes).toString('base64') },
    }),
  }));
}

const thinkingLevels = { minimal: ThinkingLevel.MINIMAL, low: ThinkingLevel.LOW, medium: ThinkingLevel.MEDIUM, high: ThinkingLevel.HIGH };
// Only the Gemini 3 family accepts thinkingLevel; older models keep their provider defaults.
const supportsThinkingLevel = (model: string) => /^gemini-3(?:[.-]|$)/u.test(model);

function finish(reason: string | undefined, blocked: boolean): AiTextResult['finish'] {
  if (blocked || ['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'RECITATION', 'IMAGE_SAFETY'].includes(reason ?? '')) return 'blocked';
  if (reason === 'STOP') return 'stop';
  return reason === 'MAX_TOKENS' ? 'length' : 'other';
}

export function createGeminiTextTransport(options: {
  apiKey: string; deadlineMs: number; client?: GeminiClient;
}): AiTextTransport {
  const { deadlineMs } = options;
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs <= 0) throw new TypeError('Invalid AI deadline');
  if (!options.client && (typeof options.apiKey !== 'string' || !options.apiKey.trim())) throw new TypeError('Invalid AI credential');
  const httpOptions = { timeout: deadlineMs, retryOptions: { attempts: 1 } };
  const client: GeminiClient = options.client ?? new GoogleGenAI({ apiKey: options.apiKey, vertexai: false, httpOptions });
  const generation = (input: AiTransportRequest): GenerateContentParameters => ({
    model: input.model, contents: contents(input), config: {
      systemInstruction: input.system, maxOutputTokens: input.maxOutputTokens, candidateCount: 1, temperature: input.tuning?.temperature ?? 0,
      ...(input.tuning?.thinking && supportsThinkingLevel(input.model)
        ? { thinkingConfig: { thinkingLevel: thinkingLevels[input.tuning.thinking], includeThoughts: false } } : {}),
      ...(input.schema ? { responseMimeType: 'application/json', responseJsonSchema: input.schema } : {}),
      abortSignal: input.signal, httpOptions, automaticContinuation: false,
    },
  });
  return {
    provider: 'gemini',
    async count(input) {
      input.signal.throwIfAborted();
      // Developer API countTokens cannot accept systemInstruction/generationConfig.
      // Include their text in the counted context instead of silently omitting it.
      const countContents = contents(input);
      countContents.unshift({ role: 'user', parts: [{ text: input.system },
        ...(input.schema ? [{ text: JSON.stringify(input.schema) }] : [])] });
      const result = await client.models.countTokens({ model: input.model, contents: countContents,
        config: { abortSignal: input.signal, httpOptions } });
      if (!Number.isSafeInteger(result.totalTokens) || result.totalTokens! < 0) throw new TypeError('Invalid AI token count');
      return result.totalTokens!;
    },
    async generate(input) {
      input.signal.throwIfAborted();
      const result = await client.models.generateContent(generation(input));
      // Read only public text parts; the SDK convenience getter may emit warnings.
      const text = result.candidates
        ? (result.candidates[0]?.content?.parts ?? []).filter(part => !part.thought).map(part => part.text ?? '').join('')
        : result.promptFeedback?.blockReason ? '' : result.text ?? '';
      return { text,
        finish: finish(result.candidates?.[0]?.finishReason, !!result.promptFeedback?.blockReason),
        usage: geminiUsage(result.usageMetadata) };
    },
    ...(client.models.generateContentStream && { async stream(input, preview) {
      input.signal.throwIfAborted();
      const results = await client.models.generateContentStream!(generation(input));
      let text = '', bytes = 0, reason: string | undefined, usage = {}, inconsistent = false;
      let sentPreview = false;
      function retractPreview() {
        if (!sentPreview) return;
        sentPreview = false;
        preview(undefined);
      }
      for await (const result of results) {
        input.signal.throwIfAborted();
        if (result.usageMetadata) usage = { ...usage, ...result.usageMetadata };
        if (result.promptFeedback?.blockReason) reason = 'SAFETY';
        if ((result.candidates?.length ?? 0) > 1) inconsistent = true;
        if (inconsistent) { retractPreview(); continue; }
        const candidate = result.candidates?.[0];
        const delta = (candidate?.content?.parts ?? []).filter(part => !part.thought).map(part => part.text ?? '').join('');
        const nextReason = candidate?.finishReason === 'FINISH_REASON_UNSPECIFIED' ? undefined : candidate?.finishReason;
        if (reason) {
          if (delta || (nextReason && nextReason !== reason)) inconsistent = true;
          if (inconsistent || finish(reason, false) !== 'stop') retractPreview();
          continue;
        }
        reason = nextReason;
        if (reason && finish(reason, false) !== 'stop') { retractPreview(); continue; }
        if (!delta) continue;
        bytes += Buffer.byteLength(delta);
        if (bytes > 262144) throw new AiError('INVALID_AI_OUTPUT');
        text += delta;
        if (!reason) { sentPreview = true; preview(text); }
      }
      return { text, finish: inconsistent ? 'other' : finish(reason, false), usage: geminiUsage(usage) };
    } }),
  };
}
