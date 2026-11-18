import { createHash } from 'node:crypto';
import type { AiTextPreview, AiTextProfile, AiTextRequest, AiTextResult, AiTextTransport } from './text-contract.ts';
import { executeAiText, type AiTextMetric } from './text-execution.ts';
import { snapshotTextRequest } from './text-request.ts';
import { validateTextProfile } from './text-profiles.ts';
import { AiError } from './errors.ts';

export interface AiTextCall {
 readonly key: object | string;
 readonly request: () => AiTextRequest;
 readonly signal?: AbortSignal;
 readonly authorize?: () => Promise<void>;
 readonly reserve?: (tokens: number) => Promise<void>;
 readonly onDispatch?: () => void;
 readonly preview?: AiTextPreview;
 readonly record?: (event: AiTextMetric) => void;
}
export interface AiTextClient {
 count(call: AiTextCall): Promise<number>;
 generate(call: AiTextCall): Promise<AiTextResult>;
}
function deferred<T>() {
 let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
 const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
 void promise.catch(() => {});
 return { promise, resolve, reject };
}
export function normalizeTextError(error: unknown): AiError {
 if (error instanceof AiError) return error;
 const value = error as { code?: unknown; status?: number; usage?: unknown; dispatched?: boolean };
 const codes = ['AI_UNAVAILABLE','AI_INPUT_LIMIT','AI_RATE_LIMITED','AI_TIMEOUT','PROVIDER_OUTCOME_UNKNOWN','INVALID_AI_OUTPUT',
  'FORBIDDEN','AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','SOURCE_UNAVAILABLE','CONFLICT','QUOTA_EXCEEDED',
  'AI_BUDGET_EXCEEDED','AI_GLOBAL_DAILY_BUDGET_EXCEEDED','AI_MONTHLY_BUDGET_EXCEEDED'];
 const code = codes.includes(String(value?.code)) ? String(value.code) : value?.status === 429 ? 'AI_RATE_LIMITED' : 'AI_UNAVAILABLE';
 return Object.assign(new AiError(code as ConstructorParameters<typeof AiError>[0]),
  ...(value?.usage ? [{ usage: value.usage }] : []), ...(value?.dispatched !== undefined ? [{ dispatched: value.dispatched }] : []));
}
/** Length-framed byte identity binds profile, controls, documents and message ordering. */
export function textRequestFingerprint(request: AiTextRequest, profile: AiTextProfile): string {
 const digest = createHash('sha256');
 const frame = (value: string | Uint8Array) => { digest.update(`${typeof value === 'string' ? Buffer.byteLength(value) : value.byteLength}:`).update(value); };
 frame(JSON.stringify(profile)); frame(request.system); frame(JSON.stringify(request.schema ?? null)); frame(String(request.messages.length));
 for (const message of request.messages) {
  frame(message.role); frame(String(message.parts.length));
  for (const part of message.parts) { frame(part.kind); frame(part.kind === 'pdf' ? part.bytes : part.text); }
 }
 return digest.digest('hex');
}
/** Split preflight pauses the same executeAiText run before reservation; it never recounts or restarts its deadline. */
export function createAiTextClient(options: { profile: AiTextProfile; transport: AiTextTransport; autoCount?: boolean }): AiTextClient {
 validateTextProfile(options.profile);
 const profile = { ...options.profile, capabilities: [...options.profile.capabilities] };
 type State = { status: 'counting' | 'counted'; fingerprint: string; cancel(): void;
  resume: ReturnType<typeof deferred<void>>; next?: AiTextCall; run: Promise<AiTextResult> };
 type Entry = State | { status: 'consumed'; error?: AiError };
 const objects = new WeakMap<object, Entry>(), strings = new Map<string, Entry>();
 const get = (key: AiTextCall['key']) => typeof key === 'string' ? strings.get(key) : objects.get(key);
 const set = (key: AiTextCall['key'], value: Entry) => {
  if (typeof key !== 'string') { objects.set(key, value); return; }
  strings.delete(key); strings.set(key, value);
  if (strings.size > 128) { const first = strings.keys().next().value!, prior = strings.get(first)!;
   if (prior.status !== 'consumed') prior.cancel(); strings.delete(first); }
 };
 const fail = (): never => { throw new AiError('AI_UNAVAILABLE'); };
 const current = (call: AiTextCall) => snapshotTextRequest(call.request(), profile);
 const client: AiTextClient = {
  async count(call) {
   const prior = get(call.key); if (prior && prior.status !== 'consumed') prior.cancel();
   const request = current(call), fingerprint = textRequestFingerprint(request, profile);
   const counted = deferred<number>(), resume = deferred<void>(), controller = new AbortController();
   const state: State = { status: 'counting', fingerprint, resume,
    cancel() { controller.abort(); resume.reject(new AiError('AI_TIMEOUT')); }, run: undefined! };
   set(call.key, state);
   state.run = executeAiText({ profile, transport: options.transport, request,
    signal: AbortSignal.any([controller.signal, ...(call.signal ? [call.signal] : [])]),
    authorize: async () => { await (state.next ?? call).authorize?.(); },
    async preflight(tokens) { counted.resolve(tokens); await resume.promise; },
    async reserve(tokens) { await state.next?.reserve?.(tokens); },
    onDispatch: () => state.next?.onDispatch?.(), record: event => (state.next ?? call).record?.(event),
    preview: () => state.next?.preview,
   }).catch(error => {
    const failure = normalizeTextError(error); counted.reject(failure); resume.reject(failure);
    if (get(call.key) === state) set(call.key, { status: 'consumed', error: failure });
    throw failure;
   });
   void state.run.catch(() => {});
   const tokens = await counted.promise;
   try {
    if (state.status !== 'counting' || get(call.key) !== state || fingerprint !== textRequestFingerprint(current(call), profile)) fail();
    state.status = 'counted'; return tokens;
   } catch (error) { state.cancel(); throw error; }
  },
  async generate(call) {
   let entry = get(call.key);
   if ((!entry || (entry.status === 'consumed' && !entry.error)) && options.autoCount) { await client.count(call); entry = get(call.key); }
   if (entry?.status === 'consumed') throw entry.error ?? new AiError('AI_UNAVAILABLE');
   if (!entry || entry.status !== 'counted') return fail();
   const state = entry;
   set(call.key, { status: 'consumed' });
   try {
    if (state.fingerprint !== textRequestFingerprint(current(call), profile)) return fail();
   } catch (error) { state.cancel(); throw error; }
   state.next = call;
   const abort = () => state!.cancel();
   if (call.signal?.aborted) abort(); else call.signal?.addEventListener('abort', abort, { once: true });
   state.resume.resolve();
   try { return await state.run; }
   finally { call.signal?.removeEventListener('abort', abort); }
  },
 };
 return client;
}
