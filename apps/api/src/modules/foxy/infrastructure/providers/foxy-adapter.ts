import { GoogleGenAI } from '@google/genai';
import { createHash } from 'node:crypto';
import type { FoxyTextInput } from '../../../../../../../src/core/domain/index.ts';
import type { GeminiClient } from '../../../../platform/ai/gemini-client.ts';
import type { AiConfiguration } from '../../../../platform/ai/configuration.ts';
import { AiError } from '../../../../platform/ai/errors.ts';
import { foxyContents, foxyInstruction, foxyResponseSchema } from './foxy-prompt.ts';
import { foxyResponse } from './foxy-response.ts';

type Configuration = { model: string; maxInputTokens: number; maxOutputTokens: number; deadlineMs: number };
function validate(input: FoxyTextInput): void {
  if (!input || !['GENERAL', 'CLASSROOM'].includes(input.mode) || !['CHAT', 'STUDY_MATERIAL', 'REVIEW', 'SUMMARY', 'ACTIVITY_IDEAS', 'LESSON_PLAN', 'RUBRIC'].includes(input.purpose)
    || typeof input.message !== 'string' || !input.message.trim() || [...input.message].length > 5000
    || !Array.isArray(input.sources) || input.sources.length > 20 || !Array.isArray(input.documents) || input.documents.length > 6
    || !Array.isArray(input.warnings) || (input.mode === 'GENERAL' && (input.curriculum !== null || input.sources.length || input.documents.length))
    || (input.mode === 'CLASSROOM' && !input.curriculum)) throw new AiError('AI_UNAVAILABLE');
  const history = input.history ?? [];
  if (!Array.isArray(history) || history.length > 10 || history.some(pair => !pair || !pair.assistant
    || typeof pair.user !== 'string' || !pair.user.trim() || [...pair.user].length > 5000
    || typeof pair.assistant.title !== 'string' || !pair.assistant.title.trim() || [...pair.assistant.title].length > 200
    || typeof pair.assistant.markdown !== 'string' || !pair.assistant.markdown.trim() || [...pair.assistant.markdown].length > 50000)) throw new AiError('AI_UNAVAILABLE');
  const safeHistory = history.map(pair => ({ user: pair.user, assistant: { title: pair.assistant.title, markdown: pair.assistant.markdown } }));
  if (Buffer.byteLength(JSON.stringify(safeHistory), 'utf8') > 262144) throw new AiError('AI_INPUT_LIMIT');
  const sources = new Set<string>(), documents = new Set<string>(); let size = 0;
  for (const source of input.sources) {
    if (!/^s[1-9][0-9]*$/u.test(source.sourceKey) || sources.has(source.sourceKey) || !Array.isArray(source.documentKeys)) throw new AiError('AI_UNAVAILABLE');
    sources.add(source.sourceKey);
  }
  for (const doc of input.documents) {
    if (!/^d[1-9][0-9]*$/u.test(doc.documentKey) || documents.has(doc.documentKey) || !Array.isArray(doc.sourceKeys)
      || doc.sourceKeys.some(key => !sources.has(key)) || !doc.document) throw new AiError('AI_UNAVAILABLE');
    documents.add(doc.documentKey);
    if (doc.document.kind === 'pdf' && doc.document.bytes instanceof Uint8Array) size += doc.document.bytes.length;
    else if (doc.document.kind === 'text' && typeof doc.document.text === 'string') size += Buffer.byteLength(doc.document.text);
    else throw new AiError('AI_UNAVAILABLE');
  }
  if (size > 20000000) throw new AiError('AI_INPUT_LIMIT');
  if (input.sources.some(source => source.documentKeys.some(key => !documents.has(key)))) throw new AiError('AI_UNAVAILABLE');
}
export function createGeminiFoxyTextAdapter(configuration: AiConfiguration): GeminiFoxyTextAdapter {
  const client = new GoogleGenAI({ apiKey: configuration.apiKey, vertexai: false,
    httpOptions: { retryOptions: { attempts: 1 }, timeout: configuration.deadlineMs } });
  return new GeminiFoxyTextAdapter({ client, configuration });
}
export class GeminiFoxyTextAdapter {
  private readonly options: { client: GeminiClient; configuration: Configuration };
  private readonly preflight = new WeakMap<FoxyTextInput, string>();
  constructor(options: { client: GeminiClient; configuration: Configuration }) { this.options = options; }
  private contents(input: FoxyTextInput) {
    validate(input);
    return [{ role: 'user' as const, parts: [{ text: `${foxyInstruction}\n${JSON.stringify(foxyResponseSchema)}` }] }, ...foxyContents(input)];
  }
  private digest(input: FoxyTextInput): string {
    return createHash('sha256').update(JSON.stringify({ model: this.options.configuration.model,
      maxOutputTokens: this.options.configuration.maxOutputTokens, maxInputTokens: this.options.configuration.maxInputTokens, contents: this.contents(input) })).digest('hex');
  }
  async countTokens(input: FoxyTextInput): Promise<number> {
    return this.withDeadline(input, () => false, async signal => {
      const fingerprint = this.digest(input), contents = this.contents(input);
      const response = await this.options.client.models.countTokens({ model: this.options.configuration.model, contents,
        config: { abortSignal: signal, httpOptions: { retryOptions: { attempts: 1 } } } });
      const count = response.totalTokens;
      if (!Number.isSafeInteger(count) || count! < 1) throw new AiError('AI_UNAVAILABLE');
      if (count! > this.options.configuration.maxInputTokens) throw new AiError('AI_INPUT_LIMIT');
      if (fingerprint !== this.digest(input)) throw new AiError('AI_UNAVAILABLE');
      this.preflight.set(input, fingerprint); return count!;
    });
  }
  async generate(input: FoxyTextInput) {
    let dispatched = false;
    return this.withDeadline(input, () => dispatched, async signal => {
      const cached = this.preflight.get(input);
      if (cached !== undefined && cached !== this.digest(input)) throw new AiError('AI_UNAVAILABLE');
      if (cached === undefined) await this.countTokens(input);
      const fingerprint = this.preflight.get(input); this.preflight.delete(input);
      if (!fingerprint || fingerprint !== this.digest(input) || signal.aborted) throw new AiError('AI_UNAVAILABLE');
      const contents = foxyContents(input);
      const responseInput = { ...input, sources: input.sources.map(source => ({ ...source, documentKeys: [...source.documentKeys] })),
        documents: input.documents.map(doc => ({ ...doc, sourceKeys: [...doc.sourceKeys] })) };
      dispatched = true;
      const response = await this.options.client.models.generateContent({ model: this.options.configuration.model, contents,
        config: { abortSignal: signal, systemInstruction: foxyInstruction, responseMimeType: 'application/json',
          responseJsonSchema: foxyResponseSchema, maxOutputTokens: this.options.configuration.maxOutputTokens,
          automaticContinuation: false, candidateCount: 1, temperature: 0, httpOptions: { retryOptions: { attempts: 1 } } } });
      return foxyResponse(response, responseInput);
    });
  }
  private async withDeadline<T>(input: FoxyTextInput, dispatched: () => boolean, operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (input.signal.aborted) throw new AiError('AI_TIMEOUT');
    const signal = AbortSignal.any([input.signal, AbortSignal.timeout(this.options.configuration.deadlineMs)]);
    let abort: (() => void) | undefined;
    const canceled = new Promise<never>((_, reject) => { abort = () => reject(new AiError(dispatched() ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_TIMEOUT'));
      signal.addEventListener('abort', abort, { once: true }); });
    const keepAlive = setTimeout(() => undefined, this.options.configuration.deadlineMs + 1);
    try { return await Promise.race([operation(signal), canceled]); }
    catch (error) {
      if (error instanceof AiError) throw error;
      const status = (error as { status?: number })?.status;
      throw new AiError(status === 429 ? 'AI_RATE_LIMITED' : dispatched() && !Number.isInteger(status) ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_UNAVAILABLE');
    } finally { clearTimeout(keepAlive); if (abort) signal.removeEventListener('abort', abort); }
  }
}
