import { GoogleGenAI, type Content } from '@google/genai';
import type { GeminiClient } from './gemini-client.ts';
import type { AiTextTransport, AiTransportRequest, AiTextResult } from './text-contract.ts';
import { geminiUsage } from './usage.ts';

function contents(input: AiTransportRequest): Content[] {
  return input.messages.map(message => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: message.parts.map(part => part.kind === 'text' ? { text: part.text } : {
      inlineData: { mimeType: 'application/pdf', data: Buffer.from(part.bytes).toString('base64') },
    }),
  }));
}

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
  const client = options.client ?? new GoogleGenAI({ apiKey: options.apiKey, vertexai: false, httpOptions });
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
      const result = await client.models.generateContent({ model: input.model, contents: contents(input), config: {
        systemInstruction: input.system, maxOutputTokens: input.maxOutputTokens, candidateCount: 1, temperature: 0,
        ...(input.schema ? { responseMimeType: 'application/json', responseJsonSchema: input.schema } : {}),
        abortSignal: input.signal, httpOptions, automaticContinuation: false,
      } });
      // Read only public text parts; the SDK convenience getter may emit warnings.
      const text = result.candidates
        ? (result.candidates[0]?.content?.parts ?? []).filter(part => !part.thought).map(part => part.text ?? '').join('')
        : result.promptFeedback?.blockReason ? '' : result.text ?? '';
      return { text,
        finish: finish(result.candidates?.[0]?.finishReason, !!result.promptFeedback?.blockReason),
        usage: geminiUsage(result.usageMetadata) };
    },
  };
}
