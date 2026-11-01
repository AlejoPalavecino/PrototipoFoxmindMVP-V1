import { ThinkingLevel, type Content } from '@google/genai';
import type { GeminiClient } from './gemini-adapter.ts';
import { AiError } from './errors.ts';
import { parseGeminiFoxyImageResponse } from './foxy-image-response.ts';
import { instruction, prepareImage, type ImageInput } from './foxy-image-adapter-prompt.ts';
type Configuration = { model: string; maxInputTokens: number; maxOutputTokens: number; deadlineMs: number; profileVersion: string };
type Ticket = { digest: string; contents: Content[] };
function configuration(value: Configuration): Configuration {
  if (!value || value.model !== 'gemini-3.1-flash-lite-image' || value.profileVersion !== 'foxy-gemini-image-v1'
    || !Number.isSafeInteger(value.maxInputTokens) || value.maxInputTokens < 1 || value.maxInputTokens > 65536
    || !Number.isSafeInteger(value.maxOutputTokens) || value.maxOutputTokens < 1 || value.maxOutputTokens > 4096
    || !Number.isSafeInteger(value.deadlineMs) || value.deadlineMs < 1 || value.deadlineMs > 30000) throw new AiError('AI_UNAVAILABLE');
  return { model: value.model, maxInputTokens: value.maxInputTokens, maxOutputTokens: value.maxOutputTokens, deadlineMs: value.deadlineMs, profileVersion: value.profileVersion };
}
export class GeminiFoxyImageAdapter {
  private readonly client: GeminiClient; private readonly config: Configuration;
  private readonly tickets = new WeakMap<ImageInput, Ticket>(); private readonly epochs = new WeakMap<ImageInput, object>();
  constructor(options: { client: GeminiClient; configuration: Configuration }) { this.client = options.client; this.config = configuration(options.configuration); }
  async countTokens(input: ImageInput): Promise<number> {
    if (!input || !input.signal || input.signal.aborted) throw new AiError('AI_TIMEOUT');
    this.tickets.delete(input); const epoch = {}; this.epochs.set(input,epoch);
    return this.deadline(input, () => false, async signal => {
      const prepared = prepareImage(input,this.config);
      const result = await this.client.models.countTokens({ model: this.config.model, contents: prepared.contents,
        config: { systemInstruction: instruction, abortSignal: signal, httpOptions: { retryOptions: { attempts: 1 } } } });
      if (signal.aborted || this.epochs.get(input) !== epoch || prepared.digest !== prepareImage(input,this.config).digest) throw new AiError('AI_UNAVAILABLE');
      if (!Number.isSafeInteger(result.totalTokens) || result.totalTokens! < 1) throw new AiError('AI_UNAVAILABLE');
      if (result.totalTokens! > this.config.maxInputTokens) throw new AiError('AI_INPUT_LIMIT');
      this.tickets.set(input, { digest: prepared.digest, contents: prepared.contents }); return result.totalTokens!;
    });
  }
  async generate(input: ImageInput) {
    if (!input || !input.signal || input.signal.aborted) throw new AiError('AI_TIMEOUT');
    const ticket = this.tickets.get(input); this.tickets.delete(input); this.epochs.delete(input);
    if (!ticket || ticket.digest !== prepareImage(input,this.config).digest) throw new AiError('AI_UNAVAILABLE');
    let dispatched = false;
    return this.deadline(input, () => dispatched, async signal => {
      if (signal.aborted) throw new AiError('AI_TIMEOUT');
      dispatched = true;
      const response = await this.client.models.generateContent({ model: this.config.model, contents: ticket.contents,
        config: { systemInstruction: instruction, abortSignal: signal, maxOutputTokens: this.config.maxOutputTokens,
          candidateCount: 1, automaticContinuation: false, responseModalities: ['TEXT','IMAGE'], imageConfig: { aspectRatio: input.aspectRatio, imageSize: '1K' },
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL, includeThoughts: false }, httpOptions: { retryOptions: { attempts: 1 } } } });
      if (signal.aborted) throw new AiError('PROVIDER_OUTCOME_UNKNOWN');
      return parseGeminiFoxyImageResponse(response);
    });
  }
  private async deadline<T>(input: ImageInput, dispatched: () => boolean, operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (input.signal.aborted) throw new AiError('AI_TIMEOUT');
    const controller = new AbortController(), stop = () => controller.abort(); input.signal.addEventListener('abort',stop,{ once: true });
    const timer = setTimeout(stop,this.config.deadlineMs); let abort: (() => void) | undefined;
    const canceled = new Promise<never>((_,reject) => { abort = () => reject(new AiError(dispatched() ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_TIMEOUT')); controller.signal.addEventListener('abort',abort,{ once: true }); });
    try {
      if (input.signal.aborted) stop();
      return await Promise.race([operation(controller.signal),canceled]);
    } catch (error) {
      if (error instanceof AiError || (error as { code?: string })?.code === 'INVALID_AI_OUTPUT') throw error;
      const status = (error as { status?: number })?.status;
      throw new AiError(status === 429 ? 'AI_RATE_LIMITED' : dispatched() && !Number.isInteger(status) ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_UNAVAILABLE');
    } finally { clearTimeout(timer); input.signal.removeEventListener('abort',stop); if (abort) controller.signal.removeEventListener('abort',abort); }
  }
}
