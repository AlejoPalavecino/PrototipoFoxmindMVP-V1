import { GoogleGenAI, type Content } from '@google/genai';
import { createHash } from 'node:crypto';
import { activityGenerationSchemaVersion, activityGenerationResponseSchemaV1, type ActivityGenerationInput,
  type StructuredActivityGenerationPort } from '../../../../src/core/domain/index.ts';
import type { AiConfiguration } from './configuration.ts';
import type { GeminiClient } from './gemini-adapter.ts';
import { AiError } from './errors.ts';
import { activityContents, activitySystemInstruction } from './activity-prompt.ts';
import { activityResponse } from './activity-response.ts';

type Configuration = Pick<AiConfiguration, 'model' | 'maxInputTokens' | 'maxOutputTokens' | 'deadlineMs'>;
function countContents(input: ActivityGenerationInput): Content[] {
  // Developer API counts contents only; include generation controls conservatively as text.
  const controls = `${activitySystemInstruction}\n${JSON.stringify(activityGenerationResponseSchemaV1)}`;
  return [{ role: 'user', parts: [{ text: controls }] }, ...activityContents(input)];
}
export function createGeminiActivityGenerationAdapter(configuration: AiConfiguration) {
  const client = new GoogleGenAI({ apiKey: configuration.apiKey, vertexai: false,
    httpOptions: { retryOptions: { attempts: 1 }, timeout: configuration.deadlineMs } });
  return new GeminiActivityGenerationAdapter({ client, configuration });
}
export class GeminiActivityGenerationAdapter implements StructuredActivityGenerationPort {
  private readonly preflight = new WeakMap<ActivityGenerationInput, string>();
  private readonly options: { client: GeminiClient; configuration: Configuration };
  constructor(options: { client: GeminiClient; configuration: Configuration }) { this.options = options; }
  async countActivityTokens(input: ActivityGenerationInput): Promise<number> {
    return this.withDeadline(input, false, async signal => {
      const contents = countContents(input);
      const fingerprint = this.digest(input);
      const response = await this.options.client.models.countTokens({ model: this.options.configuration.model, contents,
        config: { abortSignal: signal, httpOptions: { retryOptions: { attempts: 1 } } } });
      const count = response.totalTokens;
      if (!Number.isSafeInteger(count) || count! < 0) throw new AiError('AI_UNAVAILABLE');
      if (count! > this.options.configuration.maxInputTokens) throw new AiError('AI_INPUT_LIMIT');
      if (fingerprint !== this.digest(input)) throw new AiError('AI_UNAVAILABLE');
      this.preflight.set(input, fingerprint); return count!;
    });
  }
  async generateActivity(input: ActivityGenerationInput) {
    let dispatched = false;
    return this.withDeadline(input, () => dispatched, async signal => {
      if (this.preflight.get(input) !== this.digest(input)) await this.countActivityTokens({ ...input, signal });
      this.preflight.delete(input);
      if (signal.aborted) throw new AiError('AI_TIMEOUT');
      dispatched = true;
      const response = await this.options.client.models.generateContent({ model: this.options.configuration.model,
        contents: activityContents(input), config: { abortSignal: signal, systemInstruction: activitySystemInstruction, responseMimeType: 'application/json',
          responseJsonSchema: activityGenerationResponseSchemaV1, maxOutputTokens: this.options.configuration.maxOutputTokens,
          automaticContinuation: false, candidateCount: 1, temperature: 0, httpOptions: { retryOptions: { attempts: 1 } } } });
      return activityResponse(response, input);
    });
  }
  private digest(input: ActivityGenerationInput): string {
    return createHash('sha256').update(JSON.stringify(countContents(input))).digest('hex');
  }
  private async withDeadline<T>(input: ActivityGenerationInput, dispatched: boolean | (() => boolean), operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (input.signal.aborted) throw new AiError('AI_TIMEOUT');
    if (input.schemaVersion !== activityGenerationSchemaVersion) throw new AiError('AI_UNAVAILABLE');
    const signal = AbortSignal.any([input.signal, AbortSignal.timeout(this.options.configuration.deadlineMs)]);
    const hasDispatched = () => typeof dispatched === 'function' ? dispatched() : dispatched;
    let abort: (() => void) | undefined;
    const canceled = new Promise<never>((_, reject) => {
      abort = () => reject(new AiError(hasDispatched() ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_TIMEOUT'));
      signal.addEventListener('abort', abort, { once: true });
    });
    // The timeout signal is unref'ed; keep the bounded operation alive until it settles.
    const keepAlive = setTimeout(() => undefined, this.options.configuration.deadlineMs + 1);
    try { return await Promise.race([operation(signal), canceled]); }
    catch (error) {
      if (error instanceof AiError) throw error;
      const status = (error as { status?: number })?.status;
      throw new AiError(status === 429 ? 'AI_RATE_LIMITED' : hasDispatched() && !Number.isInteger(status) ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_UNAVAILABLE');
    } finally { clearTimeout(keepAlive); if (abort) signal.removeEventListener('abort', abort); }
  }
}
