
import { validateGradingAiProposal, type GradingAiProposal } from '../../../../../../../../src/core/domain/grading/grading-ai.ts';
import type { AcademicFeatureContext } from '../../../../classrooms/public.ts';
import type { GradingService } from '../../../review/public.ts';

import { privateGradingInput } from '../../../domain/grading-policy.ts';
import { revision } from '../../../../classrooms/public.ts';
import { fail, object, uuid } from '../../../../classrooms/public.ts';
import type { Transaction } from '../../../../classrooms/public.ts';
import type { GradingAiSpec } from '../../../../../../../../src/core/domain/grading/grading-ai.ts';

interface Job {
  id: string; owner_id: string; classroom_id: string; activity_id: string; attempt_id: string;
  epoch: bigint; state: string; snapshot_hash: string | null; proposal: unknown; error_code: string | null;
  apply_request_id: string | null; apply_input_hash: string | null;
}
async function jobById(repository: GradingAiRepository, tx: Transaction, classroomId: string, attemptId: string, jobId?: string): Promise<Job | null> {
  const rows = await repository.job(tx, { classroomId: classroomId, attemptId: attemptId, jobId: jobId ?? null });
  return rows[0] ?? null;
}
function parseApply(input: unknown) {
  const body = object(input, ['requestId', 'revision', 'snapshotHash', 'proposal']);
  // The proposal envelope is checked with the rest of the shape; its content needs the job snapshot (below).
  if (Object.keys(body).length !== 4 || !uuid(body.requestId) || typeof body.snapshotHash !== 'string'
    || !/^[a-f0-9]{64}$/.test(body.snapshotHash) || !body.proposal || typeof body.proposal !== 'object'
    || Array.isArray(body.proposal)) return fail('INVALID_INPUT');
  return { requestId: body.requestId, revision: revision(body.revision), snapshotHash: body.snapshotHash, proposal: body.proposal };
}
function parseDiscard(input: unknown) {
  const body = object(input, ['requestId', 'revision']);
  if (Object.keys(body).length !== 2 || !uuid(body.requestId)) return fail('INVALID_INPUT');
  return { requestId: body.requestId, revision: revision(body.revision) };
}

export class GradingAiService {
  private readonly run: AcademicFeatureContext['run'];
  private readonly gradingContext: GradingService['gradingContext'];
  private readonly savePrivateGrading: GradingService['savePrivateGrading'];
  constructor(context: Pick<AcademicFeatureContext, 'run'>, dependencies: Pick<GradingService, 'gradingContext' | 'savePrivateGrading'>, private readonly repository: GradingAiRepository) {
    this.run = context.run.bind(context); this.gradingContext = dependencies.gradingContext; this.savePrivateGrading = dependencies.savePrivateGrading;
  }
  getGradingAi(request: unknown, classroomId: string, attemptId: string) {
    return this.run(request, false, async (tx, actor) => {
      const context = await this.gradingContext(tx, actor, classroomId, attemptId, false);
      const job = await jobById(this.repository, tx, classroomId, attemptId);
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
      const job = await jobById(this.repository, tx, classroomId, attemptId, jobId);
      if (!job || job.owner_id !== actor.id) return fail('FORBIDDEN');
      const hash = this.repository.bodyHash(body);
      if (job.state === 'APPLIED') {
        if (job.apply_request_id !== body.requestId || job.apply_input_hash !== hash) return fail('CONFLICT');
        return { applied: true };
      }
      if (job.state !== 'READY' || !context.room.ai_grading_enabled || context.room.ai_grading_epoch !== job.epoch
        || context.grade?.is_published || context.room.revision.toString() !== body.revision || job.snapshot_hash !== body.snapshotHash) return fail('CONFLICT');
      let snapshot: NonNullable<Awaited<ReturnType<GradingAiRepository['currentSnapshot']>>['snapshot']>;
      try { const current = await this.repository.currentSnapshot(tx, { id: job.id, ownerId: actor.id, classroomId,
        activityId: job.activity_id, attemptId, leaseNonce: '' }, {}, false, true);
        if (!current.snapshot || current.fingerprint !== job.snapshot_hash) return fail('CONFLICT'); snapshot = current.snapshot; }
      catch { return fail('CONFLICT'); }
      let proposal: GradingAiProposal;
      try { proposal = validateGradingAiProposal(body.proposal, snapshot.spec); } catch { return fail('INVALID_INPUT'); }
      const fields = privateGradingInput({ revision: body.revision, overallGrade: proposal.overallGrade,
        overallFeedback: proposal.overallFeedback, questions: proposal.questions.map(q => ({
          questionId: snapshot.references.questions[q.ref], points: q.points, feedback: q.feedback })) });
      await this.savePrivateGrading(tx, actor, classroomId, context, fields);
      const updated = await this.repository.apply(tx, { jobId: job.id, requestId: body.requestId, inputHash: hash });
      if (updated.length !== 1) return fail('CONFLICT');
      return { applied: true };
    });
  }
  discardGradingAi(request: unknown, classroomId: string, attemptId: string, jobId: string, input: unknown) {
    const body = parseDiscard(input); if (!uuid(jobId)) return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      const context = await this.gradingContext(tx, actor, classroomId, attemptId, true);
      const job = await jobById(this.repository, tx, classroomId, attemptId, jobId);
      if (!job || job.owner_id !== actor.id) return fail('FORBIDDEN');
      const hash = this.repository.bodyHash(body);
      if (job.state === 'DISCARDED') {
        if (job.apply_request_id !== body.requestId || job.apply_input_hash !== hash) return fail('CONFLICT');
        return { discarded: true };
      }
      if (job.state !== 'READY' || context.room.revision.toString() !== body.revision
        || !context.room.ai_grading_enabled || context.room.ai_grading_epoch !== job.epoch || context.grade?.is_published) return fail('CONFLICT');
      await this.repository.discard(tx, { jobId: job.id, requestId: body.requestId, inputHash: hash });
      return { discarded: true };
    });
  }
}

export interface GradingAiRepository {
 bodyHash(body: unknown): string;
 currentSnapshot(tx: Transaction, job: {id:string;ownerId:string;classroomId:string;activityId:string;attemptId:string;leaseNonce:string}, texts: Record<string,string>, listOnly:boolean, fenceOnly:boolean): Promise<{fingerprint?:string;snapshot?:{spec:GradingAiSpec;references:{questions:Record<string,string>}} | null}>;
job(tx: Transaction, input: { classroomId: string; attemptId: string; jobId: string | null }):Promise<(Job)[]>;
apply(tx: Transaction, input: { jobId: string; requestId: string; inputHash: string }):Promise<({ id: string })[]>;
discard(tx: Transaction, input: { jobId: string; requestId: string; inputHash: string }):Promise<({ id: string })[]>;
}
