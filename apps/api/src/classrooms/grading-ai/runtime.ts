import { createHash, randomUUID } from 'node:crypto';
import type { ClassroomPorts, Transaction } from '../contracts.ts';
import type { AiConfiguration } from '../../ai/index.ts';
import { validateGradingAiProposal } from '../../../../../src/core/domain/index.ts';
import { createGradingAiSqlQueue, type GradingAiLease } from './sql-queue.ts';
import { gradingAiSnapshotFromSql } from './snapshot-sql.ts';
import type { GradingAiEvidence } from './provider.ts';
import { SerialJobScheduler } from './scheduler.ts';

type Config = Pick<AiConfiguration, 'maxConcurrency' | 'deadlineMs' | 'dailyActorRequests' | 'dailyGlobalRequests'
  | 'maxInputTokens' | 'maxOutputTokens' | 'inputUsdPerMillion' | 'outputUsdPerMillion' | 'dailyBudgetUsd'>;
type ProviderInput = { evidence: GradingAiEvidence; signal: AbortSignal };
export interface GradingAiProvider {
  countGradingAiTokens(input: ProviderInput): Promise<number>;
  generateGradingAi(input: ProviderInput): Promise<{ json: unknown; inputTokens: number | null; outputTokens: number | null }>;
}
export type GradingAiFileGrant = { jobId: string; leaseNonce: string; ownerId: string; classroomId: string; activityId: string; attemptId: string; fileId: string; digest: string };
type Reader = { read(grant: GradingAiFileGrant, signal: AbortSignal): Promise<unknown> };
type Options = { database: ClassroomPorts['database']; configuration: Config; provider: GradingAiProvider; reader: Reader; instructionReader?: Reader; diagnostics?: ClassroomPorts['diagnostics'] };
export class GradingAiRuntime {
  private readonly queue;
  private active?: Promise<boolean>;
  private stopped = false;
  private controller?: AbortController;
  private readonly scheduler: SerialJobScheduler;
  constructor(private readonly options: Options) {
    this.queue = createGradingAiSqlQueue(options);
    this.scheduler = new SerialJobScheduler(() => this.runOnce(), { onError: () => this.diagnostic('grading-ai.scheduler', false, 0) });
  }
  onModuleInit(): void { this.scheduler.start(); }
  async onModuleDestroy(): Promise<void> { this.stopped = true; this.controller?.abort(); await this.scheduler.stop(); await this.active; }
  runOnce(): Promise<boolean> {
    if (this.stopped) return Promise.resolve(false);
    if (this.active) return this.active;
    this.controller = new AbortController();
    this.active = this.run(this.controller.signal).finally(() => { this.active = undefined; this.controller = undefined; }); return this.active;
  }
  async authorizeClaim(grant: GradingAiFileGrant, signal: AbortSignal, tx?: Transaction): Promise<void> {
    if (signal.aborted) throw new Error('FORBIDDEN');
    const check = async (source: Transaction) => {
      const [row] = await source.query(`SELECT j.id FROM grading_ai_jobs j
        JOIN classrooms c ON c.id=j.classroom_id JOIN users u ON u.id=j.owner_id
        JOIN attempts a ON a.id=j.attempt_id AND a.activity_id=j.activity_id
        WHERE j.id=$1::uuid AND j.lease_nonce=$2::uuid AND j.state='RUNNING'
          AND j.lease_until>clock_timestamp() AND j.owner_id=$3::uuid AND j.classroom_id=$4::uuid
          AND j.activity_id=$5::uuid AND j.attempt_id=$6::uuid AND a.status='SUBMITTED'
          AND c.teacher_id=j.owner_id AND c.ai_grading_enabled AND c.ai_grading_epoch=j.epoch
          AND c.archived_at IS NULL AND u.email_verified_at IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM attempt_grades g WHERE g.attempt_id=j.attempt_id AND g.is_published)
          AND (EXISTS (SELECT 1 FROM attempt_attachments x WHERE x.attempt_id=j.attempt_id AND x.file_id=$7::uuid)
            OR EXISTS (SELECT 1 FROM activity_instruction_files x WHERE x.activity_id=j.activity_id AND x.file_id=$7::uuid))`,
      grant.jobId, grant.leaseNonce, grant.ownerId, grant.classroomId, grant.activityId, grant.attemptId, grant.fileId);
      if (!row || signal.aborted) throw new Error('FORBIDDEN');
    };
    if (tx) return check(tx);
    await this.options.database.$transaction(raw => check({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }),
      { maxWait: 2000, timeout: 6000 });
  }
  private async snapshot(job: GradingAiLease, texts: Record<string, string> = {}, listOnly = false) {
    return this.options.database.$transaction(async raw => {
      const tx: Transaction = { query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) };
      await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE', job.classroomId);
      return gradingAiSnapshotFromSql(tx, job, texts, listOnly);
    }, { maxWait: 2000, timeout: 6000 });
  }
  private async run(shutdown: AbortSignal): Promise<boolean> {
    await this.measured('grading-ai.recover', () => this.queue.recover());
    const job = await this.measured('grading-ai.claim', () => this.queue.claim()); if (!job) return false;
    const signal = AbortSignal.any([shutdown, AbortSignal.timeout(this.options.configuration.deadlineMs)]);
    let usage: { inputTokens: number | null; outputTokens: number | null } | undefined;
    try {
      if (!await this.queue.isCurrent(job)) { await this.queue.finish(job, 'STALE'); return true; }
      const listed = await this.snapshot(job, {}, true);
      const texts: Record<string, string> = {};
      const pdfs: { id: string; kind: string; data: string }[] = [];
      for (const file of listed.files) {
        const reader = file.kind === 'instruction' ? this.options.instructionReader : this.options.reader;
        if (!reader || !file.digest) throw new Error('SOURCE_UNAVAILABLE');
        const value = await reader.read({ ownerId: job.ownerId, classroomId: job.classroomId,
          attemptId: job.attemptId, activityId: job.activityId, jobId: job.id, leaseNonce: job.leaseNonce,
          fileId: file.id, digest: file.digest }, signal);
        const parsed = value as { kind?: string; text?: string; document?: { kind?: string; text?: string; bytes?: Uint8Array }; warnings?: string[] };
        const document = parsed.document ?? parsed;
        if ((parsed.warnings?.length ?? 0) > 0) throw new Error('SOURCE_UNAVAILABLE');
        if (document.kind === 'text' && typeof document.text === 'string' && document.text.trim()) texts[file.id] = document.text;
        else if (document.kind === 'pdf' && 'bytes' in document && document.bytes instanceof Uint8Array
          && document.bytes.length > 0 && document.bytes.length <= 20000000
          && createHash('sha256').update(document.bytes).digest('hex') === file.digest) {
          const bytes = Buffer.from(document.bytes);
          if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('SOURCE_UNAVAILABLE');
          pdfs.push({ id: file.id, kind: file.kind, data: bytes.toString('base64') });
          texts[file.id] = 'Contenido del PDF adjunto proporcionado al proveedor.';
        } else throw new Error('SOURCE_UNAVAILABLE');
      }
      const loaded = await this.snapshot(job, texts);
      const snapshot = loaded.snapshot;
      if (!snapshot || !loaded.fingerprint || JSON.stringify(listed.files) !== JSON.stringify(loaded.files)) throw new Error('SOURCE_UNAVAILABLE');
      for (const pdf of pdfs) {
        let ref = Object.entries(snapshot.references.files).find(([, id]) => id === pdf.id)?.[0];
        if (!ref) ref = `F${snapshot.evidence.files.length + 1}`;
        const replacement = { ref, kind: 'pdf' as const, data: pdf.data,
          purpose: pdf.kind === 'instruction' ? 'instruction' as const : 'attachment' as const };
        const index = snapshot.evidence.files.findIndex(file => file.ref === ref);
        if (index >= 0) snapshot.evidence.files[index] = replacement; else snapshot.evidence.files.push(replacement);
      }
      if (signal.aborted) throw new Error('AI_CANCELLED');
      const current = await this.queue.isCurrent(job, async tx =>
        (await gradingAiSnapshotFromSql(tx, job, {}, false, true)).fingerprint === loaded.fingerprint);
      if (!current) { await this.queue.finish(job, 'STALE'); return true; }
      if (signal.aborted) throw new Error('AI_CANCELLED');
      const input = { evidence: snapshot.evidence, signal };
      const count = await this.options.provider.countGradingAiTokens(input);
      if (!Number.isSafeInteger(count) || count < 1 || count > this.options.configuration.maxInputTokens) throw new Error('AI_INPUT_LIMIT');
      if (signal.aborted) throw new Error('AI_CANCELLED');
      let stale = false;
      const reserved = await this.queue.reserve(job, count, async tx => {
        try { stale = (await gradingAiSnapshotFromSql(tx, job, {}, false, true)).fingerprint !== loaded.fingerprint; }
        catch { stale = true; }
        return !stale;
      });
      if (!reserved) { await this.queue.finish(job, stale ? 'STALE' : 'FAILED'); return true; }
      if (signal.aborted) { await this.queue.finish(job, 'PROVIDER_OUTCOME_UNKNOWN'); return true; }
      let response: Awaited<ReturnType<GradingAiProvider['generateGradingAi']>>;
      try { response = await this.options.provider.generateGradingAi(input); }
      catch { await this.queue.finish(job, 'PROVIDER_OUTCOME_UNKNOWN'); return true; }
      usage = { inputTokens: response.inputTokens, outputTokens: response.outputTokens };
      const proposal = validateGradingAiProposal(response.json, snapshot.spec);
      await this.queue.finish(job, 'READY', proposal, async tx => (await gradingAiSnapshotFromSql(tx, job, {}, false, true)).fingerprint === loaded.fingerprint, loaded.fingerprint, usage);
    } catch { this.diagnostic('grading-ai.scheduler', false, 0); await this.queue.finish(job, 'FAILED', undefined, undefined, undefined, usage); }
    return true;
  }
  private diagnostic(operation: 'grading-ai.scheduler' | 'grading-ai.recover' | 'grading-ai.claim', success: boolean, durationMs: number) {
    try { this.options.diagnostics?.record({ operation, code: success ? 'COMPLETED' : 'UNEXPECTED', outcome: success ? 'success' : 'failure', durationMs, correlationId: randomUUID() }); } catch {}
  }
  private async measured<T>(operation: 'grading-ai.recover' | 'grading-ai.claim', run: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try { const result = await run(); this.diagnostic(operation, true, performance.now() - start); return result; }
    catch (error) { this.diagnostic(operation, false, performance.now() - start); throw error; }
  }
}
