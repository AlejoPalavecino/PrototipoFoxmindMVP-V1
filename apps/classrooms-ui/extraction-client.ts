import type { CurriculumUnit, ExtractionView } from '../../src/core/domain/index.ts';
import type { ClassroomClient, Draft } from './api.ts';

export interface AppliedExtraction { extractionId: string; appliedRevision: string; draft: Draft }
export interface ExtractionOptions {
  api: Pick<ClassroomClient, 'call'>;
  getDraft: () => Draft;
  save: () => Promise<unknown>;
  onView: (view: ExtractionView) => void;
  onApplied: (result: AppliedExtraction) => void;
  requestId: () => string;
  serialize?: (operation: () => Promise<void>) => Promise<void>;
}
function conflict(code = 'CONFLICT'): never {
  throw Object.assign(new Error(code), { code });
}
class ExtractionClient {
  private options: ExtractionOptions;
  private controller = new AbortController();
  private source = '';
  private view: ExtractionView | null = null;
  private mutation: Promise<void> = Promise.resolve();
  private requests = new Map<string, string>();

  constructor(options: ExtractionOptions) { this.options = options; }
  cancel() { this.controller.abort(); this.view = null; }
  private current(signal: AbortSignal, source = this.source) {
    const draft = this.options.getDraft();
    return !signal.aborted && draft.payload.planFileId === source && !draft.publishedClassroomId;
  }
  private accept(view: ExtractionView, signal: AbortSignal) {
    if (!this.current(signal) || view.planFileId !== this.source) return;
    this.view = view;
    this.options.onView(view);
  }
  private path() {
    return `/drafts/${this.options.getDraft().id}/curriculum-extractions`;
  }
  private request(key: string) {
    if (!this.requests.has(key)) this.requests.set(key, this.options.requestId());
    return this.requests.get(key)!;
  }
  async start(planFileId: string) {
    this.cancel();
    this.source = planFileId;
    this.controller = new AbortController();
    const signal = this.controller.signal;
    await this.options.save();
    if (!this.current(signal, planFileId)) return;
    const view = await this.options.api.call<ExtractionView>(this.path(), 'POST', {
      revision: this.options.getDraft().revision, planFileId,
    }, signal);
    this.accept(view, signal);
  }
  async poll() {
    const signal = this.controller.signal, view = this.view;
    if (!view || !this.current(signal) || !['QUEUED', 'RUNNING'].includes(view.state)) return;
    const next = await this.options.api.call<ExtractionView>(`${this.path()}/${view.id}`, 'GET', undefined, signal);
    this.accept(next, signal);
  }
  private enqueue(operation: () => Promise<void>) {
    const next = this.mutation.catch(() => {}).then(operation);
    this.mutation = next;
    return next;
  }
  async retry() {
    return this.enqueue(async () => {
      const signal = this.controller.signal, view = this.view;
      if (!view || view.state !== 'FAILED' || !view.retryable || !this.current(signal)) return conflict();
      await this.options.save();
      if (!this.current(signal)) return;
      const next = await this.options.api.call<ExtractionView>(`${this.path()}/${view.id}/retry`, 'POST', {
        revision: this.options.getDraft().revision, requestId: this.request(`retry:${view.id}`),
      }, signal);
      this.accept(next, signal);
    });
  }
  async apply(units: CurriculumUnit[], options: { replaceConfirmed?: boolean } = {}) {
    return this.enqueue(async () => {
      const signal = this.controller.signal, view = this.view;
      if (!view || view.state !== 'READY' || !this.current(signal)) return conflict();
      this.confirmReplacement(options.replaceConfirmed);
      await this.options.save();
      const operation = () => this.applySaved(view, units, signal, options.replaceConfirmed);
      if (this.options.serialize) await this.options.serialize(operation);
      else await operation();
    });
  }
  private confirmReplacement(confirmed?: boolean) {
    if (this.options.getDraft().payload.units?.length && !confirmed) conflict('REPLACEMENT_CONFIRMATION_REQUIRED');
  }
  private async applySaved(view: ExtractionView, units: CurriculumUnit[], signal: AbortSignal, confirmed?: boolean) {
    if (!this.current(signal)) return;
    this.confirmReplacement(confirmed);
    const revision = this.options.getDraft().revision;
    const requestId = this.request(`apply:${view.id}:${revision}:${JSON.stringify(units)}`);
    const result = await this.options.api.call<AppliedExtraction>(`${this.path()}/${view.id}/apply`, 'POST', {
      revision, requestId, units,
    }, signal);
    if (!this.current(signal)) return;
    this.options.onApplied(result);
    this.accept({ ...view, state: 'APPLIED' }, signal);
  }
}
export function createExtractionClient(options: ExtractionOptions) {
  return new ExtractionClient(options);
}
export type PlanExtractionClient = ReturnType<typeof createExtractionClient>;
