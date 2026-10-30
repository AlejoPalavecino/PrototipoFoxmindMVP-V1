import { createHash } from 'node:crypto';
import { validateGradingAiProposal, type GradingAiProposal } from '../../../../../src/core/domain/index.ts';
import type { ClassroomCore } from '../core.ts';
import type { GradingService } from '../grading.ts';
import { isVerifiedRead } from '../context.ts';
import { privateGradingInput } from '../grading-policy.ts';
import { revision } from '../drafts.ts';
import { fail, object, uuid } from '../policy.ts';
import type { Transaction } from '../contracts.ts';
import { gradingAiSnapshotFromSql } from './snapshot-sql.ts';

interface Job {
  id: string; owner_id: string; classroom_id: string; activity_id: string; attempt_id: string;
  epoch: bigint; state: string; snapshot_hash: string | null; proposal: unknown; error_code: string | null;
  apply_request_id: string | null; apply_input_hash: string | null;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
function bodyHash(body: unknown) { return createHash('sha256').update(canonical(body)).digest('hex'); }
async function jobById(tx: Transaction, classroomId: string, attemptId: string, jobId?: string): Promise<Job | null> {
  const rows = await tx.query<Job>(`SELECT * FROM grading_ai_jobs WHERE classroom_id=$1::uuid AND attempt_id=$2::uuid
    AND ($3::uuid IS NULL OR id=$3::uuid) ORDER BY created_at DESC,id DESC LIMIT 1 FOR ${isVerifiedRead(tx) ? 'SHARE' : 'UPDATE'}`, classroomId, attemptId, jobId ?? null);
  return rows[0] ?? null;
}
function parseApply(input: unknown) {
  const body = object(input, ['requestId', 'revision', 'snapshotHash', 'proposal']);
  if (Object.keys(body).length !== 4 || !uuid(body.requestId) || typeof body.snapshotHash !== 'string'
    || !/^[a-f0-9]{64}$/.test(body.snapshotHash)) return fail('INVALID_INPUT');
  return { requestId: body.requestId, revision: revision(body.revision), snapshotHash: body.snapshotHash, proposal: body.proposal };
}
function parseDiscard(input: unknown) {
  const body = object(input, ['requestId', 'revision']);
  if (Object.keys(body).length !== 2 || !uuid(body.requestId)) return fail('INVALID_INPUT');
  return { requestId: body.requestId, revision: revision(body.revision) };
}

export class GradingAiService {
  private readonly run: ClassroomCore['run'];
  private readonly gradingContext: GradingService['gradingContext'];
  private readonly savePrivateGrading: GradingService['savePrivateGrading'];
  constructor(context: Pick<ClassroomCore, 'run'>, dependencies: Pick<GradingService, 'gradingContext' | 'savePrivateGrading'>) {
    this.run = context.run.bind(context); this.gradingContext = dependencies.gradingContext; this.savePrivateGrading = dependencies.savePrivateGrading;
  }
  getGradingAi(request: unknown, classroomId: string, attemptId: string) {
    return this.run(request, false, async (tx, actor) => {
      const context = await this.gradingContext(tx, actor, classroomId, attemptId, false);
      const job = await jobById(tx, classroomId, attemptId);
      if (!job || job.owner_id !== actor.id) return null;
      const current = context.room.ai_grading_enabled && context.room.ai_grading_epoch === job.epoch && !context.room.archived_at;
      return { id: job.id, state: current ? job.state : 'STALE', snapshotHash: current ? job.snapshot_hash : null,
        proposal: current && job.state === 'READY' ? job.proposal : null, error: job.error_code };
    });
  }
  applyGradingAi(request: unknown, classroomId: string, attemptId: string, jobId: string, input: unknown) {
    const body = parseApply(input); if (!uuid(jobId)) return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      const context = await this.gradingContext(tx, actor, classroomId, attemptId, true);
      const job = await jobById(tx, classroomId, attemptId, jobId);
      if (!job || job.owner_id !== actor.id) return fail('FORBIDDEN');
      const hash = bodyHash(body);
      if (job.state === 'APPLIED') {
        if (job.apply_request_id !== body.requestId || job.apply_input_hash !== hash) return fail('CONFLICT');
        return { applied: true };
      }
      if (job.state !== 'READY' || !context.room.ai_grading_enabled || context.room.ai_grading_epoch !== job.epoch
        || context.grade?.is_published || context.room.revision.toString() !== body.revision || job.snapshot_hash !== body.snapshotHash) return fail('CONFLICT');
      let snapshot: NonNullable<Awaited<ReturnType<typeof gradingAiSnapshotFromSql>>['snapshot']>;
      try { const current = await gradingAiSnapshotFromSql(tx, { id: job.id, ownerId: actor.id, classroomId,
        activityId: job.activity_id, attemptId, leaseNonce: '' }, {}, false, true);
        if (!current.snapshot || current.fingerprint !== job.snapshot_hash) return fail('CONFLICT'); snapshot = current.snapshot; }
      catch { return fail('CONFLICT'); }
      let proposal: GradingAiProposal;
      try { proposal = validateGradingAiProposal(body.proposal, snapshot.spec); } catch { return fail('INVALID_INPUT'); }
      const fields = privateGradingInput({ revision: body.revision, overallGrade: proposal.overallGrade,
        overallFeedback: proposal.overallFeedback, questions: proposal.questions.map(q => ({
          questionId: snapshot.references.questions[q.ref], points: q.points, feedback: q.feedback })) });
      await this.savePrivateGrading(tx, actor, classroomId, context, fields);
      const updated = await tx.query(`UPDATE grading_ai_jobs SET state='APPLIED',apply_request_id=$2::uuid,apply_input_hash=$3,
        updated_at=clock_timestamp() WHERE id=$1::uuid AND state='READY' RETURNING id`, job.id, body.requestId, hash);
      if (updated.length !== 1) return fail('CONFLICT');
      return { applied: true };
    });
  }
  discardGradingAi(request: unknown, classroomId: string, attemptId: string, jobId: string, input: unknown) {
    const body = parseDiscard(input); if (!uuid(jobId)) return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      const context = await this.gradingContext(tx, actor, classroomId, attemptId, true);
      const job = await jobById(tx, classroomId, attemptId, jobId);
      if (!job || job.owner_id !== actor.id) return fail('FORBIDDEN');
      const hash = bodyHash(body);
      if (job.state === 'DISCARDED') {
        if (job.apply_request_id !== body.requestId || job.apply_input_hash !== hash) return fail('CONFLICT');
        return { discarded: true };
      }
      if (job.state !== 'READY' || context.room.revision.toString() !== body.revision
        || !context.room.ai_grading_enabled || context.room.ai_grading_epoch !== job.epoch || context.grade?.is_published) return fail('CONFLICT');
      await tx.query(`UPDATE grading_ai_jobs SET state='DISCARDED',proposal=NULL,apply_request_id=$2::uuid,
        apply_input_hash=$3,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, job.id, body.requestId, hash);
      return { discarded: true };
    });
  }
}
