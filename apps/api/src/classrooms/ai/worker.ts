import type { ExtractionError, ExtractedCurriculum } from '../../../../../src/core/domain/index.ts';
import type { Transaction } from '../contracts.ts';
import type { ClassroomAiOptions, JobRow, PlanGrant } from './contracts.ts';
import { transaction } from './database.ts';
import { claim, fenced } from './queue.ts';
import { reserve, settle } from './budget.ts';
import { bounded, errorCode, prepare, proposal } from './execution.ts';
import { businessSource, checkSource, requireGrant } from './worker-source.ts';

interface Outcome { proposal?: ExtractedCurriculum; error?: ExtractionError;
  usage?: { inputTokens: number | null; outputTokens: number | null } }
export class ClassroomAiWorker {
  private readonly options: ClassroomAiOptions;
  private readonly grants = new WeakMap<object, JobRow>();
  private readonly active = new Set<Promise<boolean>>();
  private readonly controllers = new Set<AbortController>();
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  constructor(options: ClassroomAiOptions) { this.options = options; }
  authorizeClaim(input: PlanGrant, signal: AbortSignal, tx?: Transaction): Promise<void> {
    const operation = (transaction: Transaction) => requireGrant(transaction, this.options, this.grants.get(input), signal);
    return tx ? operation(tx) : transaction(this.options, operation);
  }
  runOnce(): Promise<boolean> {
    if (this.stopped) return Promise.resolve(false);
    const running = this.run();
    this.active.add(running);
    void running.finally(() => this.active.delete(running)).catch(() => undefined);
    return running;
  }
  onModuleInit(): void { this.poll(); }
  private poll(): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      void Promise.allSettled(Array.from({ length: this.options.configuration.maxConcurrency }, () => this.runOnce()))
        .finally(() => this.poll());
    }, 500);
    this.timer.unref();
  }
  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.timer);
    for (const controller of this.controllers) controller.abort();
    await Promise.allSettled(this.active);
  }
  private async run(): Promise<boolean> {
    const row = await claim(this.options);
    if (!row) return false;
    if (this.stopped) { await this.releaseClaim(row); return true; }
    const grant = { ownerId: row.owner_id, draftId: row.draft_id, fileId: row.file_id, digest: row.source_digest };
    const controller = new AbortController(), signal = controller.signal;
    this.grants.set(grant, row); this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), this.options.configuration.deadlineMs);
    try {
      if (!await this.check(row, grant, signal)) return true;
      const outcome = await this.execute(row, grant, signal);
      await this.complete(row, grant, signal, outcome);
      return true;
    } finally {
      clearTimeout(timer); this.grants.delete(grant); this.controllers.delete(controller);
    }
  }
  private check(row: JobRow, grant: PlanGrant, signal: AbortSignal): Promise<boolean> {
    return transaction(this.options, async tx => {
      const sourceOwner = await businessSource(tx, row);
      const pending = await fenced(tx, row, this.options.configuration.maxJobAgeMs, false);
      if (!pending) return false;
      if (pending.expired) {
        if (await fenced(tx, row, this.options.configuration.maxJobAgeMs))
          await this.finish(tx, row, sourceOwner ? 'FAILED' : 'STALE', { error: sourceOwner ? 'AI_TIMEOUT' : undefined });
        return false;
      }
      const valid = await checkSource(tx, this.options, row, grant, signal);
      const current = await fenced(tx, row, this.options.configuration.maxJobAgeMs);
      if (!current) return false;
      if (valid && !current.expired) return true;
      await this.finish(tx, row, valid ? 'FAILED' : 'STALE', { error: valid ? 'AI_TIMEOUT' : undefined });
      return false;
    });
  }
  private releaseClaim(row: JobRow): Promise<void> {
    return transaction(this.options, async tx => {
      await tx.query(`UPDATE classroom_curriculum_extractions SET state='QUEUED',lease_nonce=NULL,
        lease_until=NULL,updated_at=clock_timestamp() WHERE id=$1::uuid AND lease_nonce=$2::uuid
        AND state='RUNNING' AND dispatch_started_at IS NULL RETURNING id`, row.id, row.lease_nonce);
    });
  }
  private async execute(row: JobRow, grant: PlanGrant, signal: AbortSignal): Promise<Outcome> {
    let prepared: Awaited<ReturnType<typeof prepare>>;
    try { prepared = await prepare(this.options, grant, signal); }
    catch (error) { return { error: errorCode(error, false) }; }
    const admitted = await this.dispatch(row, grant, signal, prepared.count);
    if (!admitted) return { error: 'AI_BUDGET_EXCEEDED' };
    try {
      const result = await bounded(() => this.options.provider.extractStudyPlan(prepared.input), signal);
      const extracted = proposal(result.json);
      if (prepared.input.document.kind === 'text' && !extracted.warnings.includes('DOCX_IMAGES_OMITTED'))
        extracted.warnings.push('DOCX_IMAGES_OMITTED');
      return { proposal: extracted, usage: result };
    } catch (error) { return { error: errorCode(error, true) }; }
  }
  private dispatch(row: JobRow, grant: PlanGrant, signal: AbortSignal, count: number): Promise<boolean> {
    return transaction(this.options, async tx => {
      const valid = await checkSource(tx, this.options, row, grant, signal);
      const current = await fenced(tx, row, this.options.configuration.maxJobAgeMs);
      if (!current || !valid || current.expired || signal.aborted) return false;
      if (current.dispatch_count >= this.options.configuration.maxDispatches) return false;
      return reserve(tx, current, count, this.options.configuration);
    });
  }
  private complete(row: JobRow, grant: PlanGrant, signal: AbortSignal, outcome: Outcome): Promise<void> {
    return transaction(this.options, async tx => {
      // Completion still validates custody after deadline; the grant is fenced by DB lease.
      const valid = await checkSource(tx, this.options, row, grant, signal.aborted ? new AbortController().signal : signal);
      if (!await fenced(tx, row, this.options.configuration.maxJobAgeMs)) return;
      await this.finish(tx, row, valid ? outcome.error ? 'FAILED' : 'READY' : 'STALE', outcome);
    });
  }
  private async finish(tx: Transaction, row: JobRow, state: string, outcome: Outcome): Promise<void> {
    await settle(tx, row, this.options.configuration, outcome.usage);
    await tx.query(`UPDATE classroom_curriculum_extractions SET state=$3,proposal=$4::jsonb,error_code=$5,
      lease_nonce=NULL,lease_until=NULL,completed_at=clock_timestamp(),updated_at=clock_timestamp()
      WHERE id=$1::uuid AND lease_nonce=$2::uuid RETURNING id`, row.id, row.lease_nonce, state,
    state === 'READY' ? JSON.stringify(outcome.proposal) : null, outcome.error ?? null);
  }
}
