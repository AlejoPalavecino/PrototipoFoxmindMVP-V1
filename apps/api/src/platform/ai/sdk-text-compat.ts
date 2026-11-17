import type { CountTokensParameters, GenerateContentParameters, GenerateContentResponse, Content } from '@google/genai';
import type { GeminiClient } from './gemini-client.ts';
import type { AiConfiguration } from './configuration.ts';
import type { AiPart, AiTextProfile, AiTextRequest, AiTextResult, AiTask, AiTransportRequest } from './text-contract.ts';
import { AiError } from './errors.ts';
import { snapshotTextRequest } from './text-request.ts';
import { createDefaultTextProfile, textProfileForSnapshot } from './text-profiles.ts';
import { createAiTextClient, textRequestFingerprint, normalizeTextError, type AiTextClient } from './text-client.ts';
import { geminiUsage } from './usage.ts';
const fail = (): never => { throw new AiError('AI_UNAVAILABLE'); };
function exact(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail();
}
function part(input: unknown, maxDocumentBytes: number): AiPart {
  exact(input, ['text', 'inlineData']);
  if (Object.keys(input).length !== 1) return fail();
  if (typeof input.text === 'string') return { kind: 'text', text: input.text };
  exact(input.inlineData, ['mimeType', 'data']);
  const data = input.inlineData.data;
  if (input.inlineData.mimeType !== 'application/pdf' || typeof data !== 'string' || !data
    || data.length > Math.ceil(maxDocumentBytes / 3) * 4) return fail();
  const bytes = Buffer.from(data, 'base64');
  if (bytes.byteLength > maxDocumentBytes || bytes.toString('base64') !== data) return fail();
  return { kind: 'pdf', bytes };
}
function system(value: unknown): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  exact(value, ['role', 'parts']);
  if (!Array.isArray(value.parts) || value.parts.some(item => {
    exact(item, ['text']); return typeof item.text !== 'string';
  })) return fail();
  return value.parts.map(item => item.text).join('\n');
}
function prepare(input: GenerateContentParameters, profile: AiTextProfile): AiTextRequest {
  exact(input, ['model', 'contents', 'config']);
  if (input.model !== profile.model) return fail();
  const config = input.config ?? {};
  exact(config, ['abortSignal', 'systemInstruction', 'responseMimeType', 'responseJsonSchema', 'maxOutputTokens',
    'automaticContinuation', 'candidateCount', 'temperature', 'httpOptions']);
  if (config.maxOutputTokens !== profile.maxOutputTokens || (config.automaticContinuation !== undefined && config.automaticContinuation !== false)
    || (config.candidateCount !== undefined && config.candidateCount !== 1) || (config.temperature !== undefined && config.temperature !== 0)
    || (config.responseMimeType !== undefined && config.responseMimeType !== 'application/json')
    || (!!config.responseJsonSchema !== (config.responseMimeType === 'application/json'))) return fail();
  if (config.httpOptions) {
    exact(config.httpOptions, ['timeout', 'retryOptions']);
    if (config.httpOptions.retryOptions) {
      exact(config.httpOptions.retryOptions, ['attempts']);
      if (config.httpOptions.retryOptions.attempts !== 1) return fail();
    }
  }
  const content = typeof input.contents === 'string' ? [{ role: 'user', parts: [{ text: input.contents }] }] : input.contents;
  if (!Array.isArray(content)) return fail();
  const messages = content.map(value => {
    exact(value, ['role', 'parts']);
    if (!['user', 'model'].includes(String(value.role)) || !Array.isArray(value.parts)) return fail();
    return { role: value.role === 'model' ? 'assistant' as const : 'user' as const, parts: value.parts.map(value => part(value, Math.min(profile.maxDocumentBytes, 20_000_000))) };
  });
  return snapshotTextRequest({ system: system(config.systemInstruction), messages,
    ...(config.responseJsonSchema ? { schema: config.responseJsonSchema as Record<string, unknown> } : {}) }, profile);
}

const legacyClients = new WeakMap<object, AiTextClient>();
const sdkViews = new WeakMap<AiTextClient, GeminiClient>();
export function sdkTextResult(response: GenerateContentResponse): AiTextResult {
 const parts = response.candidates?.[0]?.content?.parts;
 const text = parts ? parts.filter(part => !part.thought).map(part => part.text ?? '').join('') : response.text ?? '';
 const reason = response.candidates?.[0]?.finishReason;
 return { text, finish: response.promptFeedback?.blockReason ? 'blocked' : response.candidates?.length !== 1 ? 'other'
  : reason === 'STOP' ? 'stop' : reason === 'MAX_TOKENS' ? 'length' : 'other', usage: geminiUsage(response.usageMetadata) };
}
export function legacyTextClient(client: AiTextClient, profile: AiTextProfile): GeminiClient {
 const existing = sdkViews.get(client); if (existing) return existing;
 const call = (input: GenerateContentParameters) => ({ key: textRequestFingerprint(prepare(input, profile), profile),
  request: () => prepare(input, profile), signal: input.config?.abortSignal });
 const legacy: GeminiClient = { models: {
  async countTokens() { return fail(); },
  async countForGeneration(input) { try { return { totalTokens: await client.count(call(input)) }; } catch (error) { throw normalizeTextError(error); } },
  async generateContent(input) { try {
   const result = await client.generate(call(input));
   return { text: result.text, candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: result.text }] } }],
    usageMetadata: { promptTokenCount: result.usage.inputTokens ?? undefined, candidatesTokenCount: result.usage.outputTokens ?? undefined,
     ...(result.usage.outputTokens !== null ? { thoughtsTokenCount: 0 } : {}), cachedContentTokenCount: result.usage.cachedInputTokens ?? undefined } } as GenerateContentResponse;
  } catch (error) { throw normalizeTextError(error); } },
 } };
 legacyClients.set(legacy, client); sdkViews.set(client, legacy); return legacy;
}
/** Compatibility view for callers that inspect or inject the historical SDK wrapper. */
export function textClientCompatibilityView(client: AiTextClient,
 configuration: Pick<AiConfiguration, 'model' | 'maxInputTokens' | 'maxOutputTokens' | 'deadlineMs'> & Partial<Pick<AiConfiguration, 'executionProfile'>>,
 task: AiTask): GeminiClient {
 return legacyTextClient(client, configuration.executionProfile ? textProfileForSnapshot(configuration.executionProfile) : createDefaultTextProfile(configuration, task));
}
export function sdkTextContents(messages: AiTextRequest['messages']): Content[] {
 return messages.map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: message.parts.map(part =>
  part.kind === 'text' ? { text: part.text } : { inlineData: { mimeType: 'application/pdf', data: Buffer.from(part.bytes).toString('base64') } }) }));
}
/** Only injected SDK fixtures use this serializer. Production constructors receive the neutral client directly. */
export function injectedTextClient(client: GeminiClient | AiTextClient, configuration: Pick<AiConfiguration, 'model' | 'maxInputTokens' | 'maxOutputTokens' | 'deadlineMs'>,
 task: AiTask, autoCount = false): AiTextClient {
 if ('count' in client && 'generate' in client) return client;
 const existing = legacyClients.get(client); if (existing) return existing;
 const profile = createDefaultTextProfile(configuration, task);
 const generation = (input: AiTransportRequest): GenerateContentParameters => ({ model: input.model, contents: sdkTextContents(input.messages), config: {
  ...(input.system ? { systemInstruction: input.system } : {}), ...(input.schema ? { responseMimeType: 'application/json', responseJsonSchema: input.schema } : {}),
  maxOutputTokens: input.maxOutputTokens, automaticContinuation: false, candidateCount: 1, temperature: 0,
  abortSignal: input.signal, httpOptions: { retryOptions: { attempts: 1 } },
 } });
 return createAiTextClient({ profile, autoCount: autoCount && !client.models.countForGeneration, transport: { provider: 'gemini',
  async count(input) {
   const request = generation(input), contents = sdkTextContents(input.messages);
   if (task !== 'curriculum') contents.unshift({ role: 'user', parts: [{ text: `${input.system}\n${JSON.stringify(input.schema)}` }] });
   const count: CountTokensParameters = { model: input.model, contents, config: { abortSignal: input.signal, httpOptions: { retryOptions: { attempts: 1 } } } };
   const response = client.models.countForGeneration ? await client.models.countForGeneration(request) : await client.models.countTokens(count);
   return response.totalTokens!;
  },
  async generate(input) { return sdkTextResult(await client.models.generateContent(generation(input))); },
 } });
}
