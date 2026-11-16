import type { Content, GenerateContentParameters } from '@google/genai';
import { getAiTextClient, countForExecution } from '../../../../platform/ai/profile-client.ts';
import { configurationForJob, snapshotForTask } from '../../../../platform/ai/execution-snapshot.ts';
import { createHash } from 'node:crypto';
import { activityGenerationSchemaVersion, activityGenerationResponseSchemaV1, type ActivityGenerationInput,
  type StructuredActivityGenerationPort } from '../../../../../../../src/core/domain/index.ts';
import type { AiConfiguration } from '../../../../platform/ai/configuration.ts';
import type { GeminiClient } from '../../../../platform/ai/gemini-client.ts';
import { AiError } from '../../../../platform/ai/errors.ts';
import { activityContents, activitySystemInstruction } from './activity-prompt.ts';
import { activityResponse } from './activity-response.ts';

type Configuration = Pick<AiConfiguration, 'model' | 'maxInputTokens' | 'maxOutputTokens' | 'deadlineMs'>;
function countContents(input: ActivityGenerationInput): Content[] {
  // Developer API counts contents only; include generation controls conservatively as text.
  const controls = `${activitySystemInstruction}\n${JSON.stringify(activityGenerationResponseSchemaV1)}`;
  return [{ role: 'user', parts: [{ text: controls }] }, ...activityContents(input)];
}
export function createGeminiActivityGenerationAdapter(configuration: AiConfiguration) {
  const client = getAiTextClient(configuration, 'activities');
  const pinned = configurationForJob(configuration, configuration.executionProfile ?? snapshotForTask(configuration, 'activities'), 'activities');
  return new GeminiActivityGenerationAdapter({ client, configuration: pinned });
}
export class GeminiActivityGenerationAdapter implements StructuredActivityGenerationPort {
  private readonly preflight = new WeakMap<ActivityGenerationInput, string>();
  private readonly options: { client: GeminiClient; configuration: Configuration };
  constructor(options: { client: GeminiClient; configuration: Configuration }) { this.options = options; }
  async countActivityTokens(input: ActivityGenerationInput): Promise<number> {
    return this.withDeadline(input, false, async signal => {
      const contents = countContents(input);
      const fingerprint = this.digest(input);
      const response = await countForExecution(this.options.client, { model: this.options.configuration.model, contents,
        config: { abortSignal: signal, httpOptions: { retryOptions: { attempts: 1 } } } }, this.generationRequest(input, signal));
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
      if (this.preflight.get(input) !== this.digest(input)) {
        if (this.options.client.models.countForGeneration) throw new AiError('AI_UNAVAILABLE');
        await this.countActivityTokens({ ...input, signal });
      }
      this.preflight.delete(input);
      if (signal.aborted) throw new AiError('AI_TIMEOUT');
      dispatched = true;
      const response = await this.options.client.models.generateContent(this.generationRequest(input, signal));
      return activityResponse(response, input);
    });
  }
  private generationRequest(input: ActivityGenerationInput, signal: AbortSignal): GenerateContentParameters {
    return { model: this.options.configuration.model, contents: activityContents(input), config: {
      abortSignal: signal, systemInstruction: activitySystemInstruction, responseMimeType: 'application/json',
      responseJsonSchema: activityGenerationResponseSchemaV1, maxOutputTokens: this.options.configuration.maxOutputTokens,
      automaticContinuation: false, candidateCount: 1, temperature: 0, httpOptions: { retryOptions: { attempts: 1 } },
    } };
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
