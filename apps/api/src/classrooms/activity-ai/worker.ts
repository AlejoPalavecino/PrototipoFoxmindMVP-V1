import type { ActivityProposal, ActivitySourceGrant, ActivitySourceReport } from '../../../../../src/core/domain/index.ts';
import type { Transaction } from '../contracts.ts';
import type { ActivityAiOptions, JobRow } from './contracts.ts';
import { transaction } from './database.ts';
import { claim, fenced } from './queue.ts';
import { reserve, settle } from './budget.ts';
import { bounded, errorCode, prepare, proposal } from './execution.ts';
import { validSource, requireGrant } from './worker-source.ts';
interface Outcome { proposal?: ActivityProposal; error?: JobRow['error_code']; missing?: string[];
  report?: ActivitySourceReport[]; usage?: { inputTokens: number | null; outputTokens: number | null } }
export class ActivityAiWorker {
  private readonly options: ActivityAiOptions;
  private readonly sources = new Map<string, ActivitySourceGrant[]>();
  private readonly grants = new WeakMap<object, JobRow>();
  private readonly active = new Set<Promise<boolean>>();
  private readonly controllers = new Set<AbortController>();
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  constructor(options: ActivityAiOptions) { this.options = options; }
  authorizeClaim(grant: ActivitySourceGrant, signal: AbortSignal, tx?: Transaction): Promise<void> {
    const operation = (current: Transaction) => requireGrant(this.options, current, this.grants.get(grant), grant, signal);
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
      void Promise.allSettled(Array.from({ length: this.options.configuration.maxConcurrency }, () => this.runOnce())).finally(() => this.poll());
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
    const controller = new AbortController(), signal = controller.signal;
    const grants = row.source_snapshot.map(s => ({ ownerId: row.owner_id, classroomId: row.classroom_id,
      sourceId: s.sourceId, fileId: s.fileId, digest: s.digest }));
    this.sources.set(row.id, grants);
    for (const grant of grants) this.grants.set(grant, row);
    this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), this.options.configuration.deadlineMs);
    try {
      if (this.stopped) controller.abort();
      if (!await this.check(row, signal)) return true;
      const outcome = await this.execute(row, grants, signal);
      await this.complete(row, signal, outcome);
      return true;
    } finally {
      clearTimeout(timer);
      this.sources.delete(row.id);
      for (const grant of grants) this.grants.delete(grant);
      this.controllers.delete(controller);
    }
  }
  private check(row: JobRow, signal: AbortSignal): Promise<boolean> {
    return transaction(this.options, async tx => {
      const valid = await validSource(this.options, tx, row, signal, this.sources.get(row.id));
      const current = await fenced(tx, row, this.options.configuration.maxJobAgeMs);
      if (!current) return false;
      if (valid && !current.expired && !signal.aborted) return true;
      await this.finish(tx, row, valid ? 'FAILED' : 'STALE', { error: valid ? 'AI_TIMEOUT' : null });
      return false;
    });
  }
  private async execute(row: JobRow, grants: ActivitySourceGrant[], signal: AbortSignal): Promise<Outcome> {
    let prepared: Awaited<ReturnType<typeof prepare>>;
    try { prepared = await prepare(this.options, row, grants, signal); }
    catch (error) { return { error: errorCode(error, false) }; }
    if (!await this.dispatch(row, signal, prepared.count)) return { error: 'AI_BUDGET_EXCEEDED' };
    try {
      const result = await bounded(() => this.options.provider.generateActivity(prepared.input), signal);
      const parsed = proposal(result.json, prepared.input);
      return { ...parsed, error: parsed.missing ? 'INSUFFICIENT_CONTENT' : null, usage: result,
        report: prepared.input.sources.map(s => ({ sourceId: s.sourceId, status: 'READ', pageCount: s.pageCount, warnings: s.warnings })) };
    } catch (error) { return { error: errorCode(error, true) }; }
  }
  private dispatch(row: JobRow, signal: AbortSignal, count: number): Promise<boolean> {
    return transaction(this.options, async tx => {
      const valid = await validSource(this.options, tx, row, signal, this.sources.get(row.id));
      const current = await fenced(tx, row, this.options.configuration.maxJobAgeMs);
      if (!current || !valid || current.expired || signal.aborted || current.dispatch_count > 0) return false;
      return reserve(tx, current, count, this.options.configuration);
    });
  }
  private complete(row: JobRow, signal: AbortSignal, outcome: Outcome): Promise<void> {
    return transaction(this.options, async tx => {
      const valid = await validSource(this.options, tx, row, signal.aborted ? new AbortController().signal : signal, this.sources.get(row.id));
      const current = await fenced(tx, row, this.options.configuration.maxJobAgeMs);
      if (!current) return;
      await this.finish(tx, row, !valid ? 'STALE' : outcome.error || current.expired ? 'FAILED' : 'READY',
        current.expired ? { ...outcome, error: current.dispatch_started_at ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_TIMEOUT' } : outcome);
    });
  }
  private async finish(tx: Transaction, row: JobRow, state: string, outcome: Outcome): Promise<void> {
    await settle(tx, row, this.options.configuration, outcome.usage);
    await tx.query(`UPDATE activity_ai_generations SET state=$3,proposal=$4::jsonb,error_code=$5,
      source_report=$6::jsonb,missing_information=$7::jsonb,lease_nonce=NULL,lease_until=NULL,
      completed_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1::uuid AND lease_nonce=$2::uuid RETURNING id`,
    row.id, row.lease_nonce, state, state === 'READY' ? JSON.stringify(outcome.proposal) : null,
    outcome.error ?? null, JSON.stringify(outcome.report ?? []), JSON.stringify(outcome.missing ?? []));
  }
}
