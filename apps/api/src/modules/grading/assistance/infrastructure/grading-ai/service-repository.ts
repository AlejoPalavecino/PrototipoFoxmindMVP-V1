import {createHash} from 'node:crypto';
import {isVerifiedRead} from '../../../../classrooms/public.ts';
import {gradingAiSnapshotFromSql} from './snapshot-sql.ts';
import type {GradingAiRepository} from '../../application/grading-ai/service.ts';
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
function bodyHash(body: unknown) { return createHash('sha256').update(canonical(body)).digest('hex'); }

export const repository:GradingAiRepository={
 bodyHash,currentSnapshot: gradingAiSnapshotFromSql,
job(tx, input){return tx.query<Awaited<ReturnType<GradingAiRepository['job']>>[number]>(`SELECT * FROM grading_ai_jobs WHERE classroom_id=$1::uuid AND attempt_id=$2::uuid
    AND ($3::uuid IS NULL OR id=$3::uuid) ORDER BY created_at DESC,id DESC LIMIT 1 FOR ${isVerifiedRead(tx) ? 'SHARE' : 'UPDATE'}`, input.classroomId, input.attemptId, input.jobId)},
apply(tx, input){return tx.query<Awaited<ReturnType<GradingAiRepository['apply']>>[number]>(`UPDATE grading_ai_jobs SET state='APPLIED',apply_request_id=$2::uuid,apply_input_hash=$3,
        updated_at=clock_timestamp() WHERE id=$1::uuid AND state='READY' RETURNING id`, input.jobId, input.requestId, input.inputHash)},
discard(tx, input){return tx.query<Awaited<ReturnType<GradingAiRepository['discard']>>[number]>(`UPDATE grading_ai_jobs SET state='DISCARDED',proposal=NULL,apply_request_id=$2::uuid,
        apply_input_hash=$3,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, input.jobId, input.requestId, input.inputHash)},
};