import { createHash } from 'node:crypto';
import type { CountTokensParameters, GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import type { AiExecutionTask } from '../../../../../src/core/contracts/ai-execution.ts';
import type { AiConfiguration } from './configuration.ts';
import type { GeminiClient } from './gemini-client.ts';
import type { AiPart, AiTextProfile, AiTextRequest, AiTextTransport } from './text-contract.ts';
import { AiError } from './errors.ts';
import { configurationForJob, snapshotForTask, executionConfigurationSource } from './execution-snapshot.ts';
import { snapshotTextRequest } from './text-request.ts';
import { executeAiText } from './text-execution.ts';
import { createGeminiTextTransport } from './gemini-text-transport.ts';
import { createAnthropicTextTransport } from './anthropic-text-transport.ts';
import { getGeminiClient } from './sdk-clients.ts';

const clients = new WeakMap<AiConfiguration, Map<AiExecutionTask, { signature: string; client: GeminiClient }>>();
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function requestDigest(request: AiTextRequest, profile: AiTextProfile): string {
  const digest = createHash('sha256');
  const frame = (value: string | Uint8Array) => {
    digest.update(`${typeof value === 'string' ? Buffer.byteLength(value) : value.byteLength}:`).update(value);
  };
  frame(JSON.stringify(profile)); frame(request.system); frame(JSON.stringify(request.schema ?? null));
  frame(String(request.messages.length));
  for (const message of request.messages) {
    frame(message.role); frame(String(message.parts.length));
    for (const part of message.parts) { frame(part.kind); frame(part.kind === 'pdf' ? part.bytes : part.text); }
  }
  return digest.digest('hex');
}
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
function normalized(error: unknown): AiError {
  if (error instanceof AiError) return error;
  const value = error as { code?: unknown; status?: number; usage?: unknown; dispatched?: boolean };
  const codes = ['AI_UNAVAILABLE', 'AI_INPUT_LIMIT', 'AI_RATE_LIMITED', 'AI_TIMEOUT', 'PROVIDER_OUTCOME_UNKNOWN', 'INVALID_AI_OUTPUT'] as const;
  const code = codes.find(code => code === value?.code) ?? (value?.status === 429 ? 'AI_RATE_LIMITED' : 'AI_UNAVAILABLE');
  return Object.assign(new AiError(code), value?.usage ? { usage: value.usage, dispatched: value.dispatched } : {});
}

export function countForExecution(client: GeminiClient, countRequest: CountTokensParameters, generationRequest: GenerateContentParameters) {
  return client.models.countForGeneration ? client.models.countForGeneration(generationRequest) : client.models.countTokens(countRequest);
}

function bridge(profile: AiTextProfile, transport: AiTextTransport): GeminiClient {
  const tickets = new Map<string, { request: AiTextRequest; count: number; deadline: number }>();
  return { models: {
    async countTokens() { return fail(); },
    async countForGeneration(input) {
      try {
        const request = prepare(input, profile), digest = requestDigest(request, profile);
        tickets.delete(digest);
        const deadline = performance.now() + profile.deadlineMs;
        const signal = AbortSignal.any([...(input.config?.abortSignal ? [input.config.abortSignal] : []), AbortSignal.timeout(profile.deadlineMs)]);
        if (signal.aborted) throw new AiError('AI_TIMEOUT');
        let onAbort: (() => void) | undefined;
        const aborted = new Promise<never>((_, reject) => {
          onAbort = () => reject(new AiError('AI_TIMEOUT')); signal.addEventListener('abort', onAbort, { once: true });
        });
        const keepAlive = setTimeout(() => {}, profile.deadlineMs);
        let count: number;
        try { count = await Promise.race([transport.count({ ...request, model: profile.model, maxOutputTokens: profile.maxOutputTokens, signal }), aborted]); }
        finally { clearTimeout(keepAlive); if (onAbort) signal.removeEventListener('abort', onAbort); }
        if (signal.aborted) throw new AiError('AI_TIMEOUT');
        if (!Number.isSafeInteger(count) || count < 1) return fail();
        if (count > profile.maxInputTokens) throw new AiError('AI_INPUT_LIMIT');
        if (digest !== requestDigest(prepare(input, profile), profile)) return fail();
        tickets.set(digest, { request, count, deadline });
        if (tickets.size > 128) tickets.delete(tickets.keys().next().value!);
        return { totalTokens: count };
      } catch (error) { throw normalized(error); }
    },
    async generateContent(input) {
      try {
        const request = prepare(input, profile), digest = requestDigest(request, profile);
        const ticket = tickets.get(digest); tickets.delete(digest);
        if (!ticket) return fail();
        const remaining = Math.floor(ticket.deadline - performance.now());
        if (remaining <= 0 || input.config?.abortSignal?.aborted) throw new AiError('AI_TIMEOUT');
        const result = await executeAiText({ profile: { ...profile, deadlineMs: remaining }, request: ticket.request,
          transport: { provider: transport.provider, count: async () => ticket.count, generate: value => transport.generate(value) }, signal: input.config?.abortSignal });
        return { text: result.text, candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: result.text }] } }],
          usageMetadata: { promptTokenCount: result.usage.inputTokens ?? undefined, candidatesTokenCount: result.usage.outputTokens ?? undefined,
            ...(result.usage.outputTokens !== null ? { thoughtsTokenCount: 0 } : {}), cachedContentTokenCount: result.usage.cachedInputTokens ?? undefined },
        } as GenerateContentResponse;
      } catch (error) { throw normalized(error); }
    },
  } };
}

export function createExecutionTransport(configuration: AiConfiguration, task: AiExecutionTask): AiTextTransport {
  try {
    const pinned = configurationForJob(configuration, configuration.executionProfile ?? snapshotForTask(configuration, task), task);
    const snapshot = pinned.executionProfile;
    const key = snapshot.provider === 'anthropic' ? pinned.anthropicApiKey : pinned.apiKey;
    if (typeof key !== 'string' || !key.trim()) return fail();
    return snapshot.provider === 'gemini'
      ? createGeminiTextTransport({ apiKey: key, deadlineMs: snapshot.deadlineMs, client: getGeminiClient(executionConfigurationSource(configuration)) })
      : createAnthropicTextTransport({ apiKey: key, deadlineMs: snapshot.deadlineMs });
  } catch (error) { throw normalized(error); }
}

export function getAiTextClient(configuration: AiConfiguration, task: AiExecutionTask): GeminiClient {
  try {
    const pinned = configurationForJob(configuration, configuration.executionProfile ?? snapshotForTask(configuration, task), task);
    const snapshot = pinned.executionProfile;
    const key = snapshot.provider === 'anthropic' ? pinned.anthropicApiKey : pinned.apiKey;
    if (typeof key !== 'string' || !key.trim()) return fail();
    const signature = hash({ snapshot, key: snapshot.provider === 'anthropic' ? pinned.anthropicApiKey : pinned.apiKey });
    // A pinned configuration belongs to one job. Share only the underlying SDK;
    // preflight tickets and deadlines must never be shared across jobs.
    const byTask = clients.get(configuration) ?? new Map();
    const existing = byTask.get(task);
    if (existing?.signature === signature) return existing.client;
    const profile: AiTextProfile = { id: snapshot.profileId, version: snapshot.profileVersion, task, provider: snapshot.provider,
      model: snapshot.model, capabilities: ['text', 'pdf', 'json'], maxInputTokens: snapshot.maxInputTokens, maxOutputTokens: snapshot.maxOutputTokens,
      deadlineMs: snapshot.deadlineMs, maxDocumentBytes: snapshot.maxDocumentBytes };
    const transport = createExecutionTransport(configuration, task);
    const client = bridge(profile, transport);
    byTask.set(task, { signature, client }); clients.set(configuration, byTask);
    return client;
  } catch (error) { throw normalized(error); }
}
