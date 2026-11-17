import { revision } from '../../../classrooms/public.ts';
import { fail, uuid } from '../../../classrooms/public.ts';
import { editorCapability, receptionPolicy, type EditorCapability } from '../../domain/attempt-policy.ts';
import type { Transaction } from '../../../classrooms/public.ts';

import type { Obligation, AttemptRow } from './attempt-contracts.ts';
export type { Obligation, AttemptRow } from './attempt-contracts.ts';
/** Transaction-only resolver for future answer/file writers. No admission or standalone session validation here. */
export async function resolveAttemptContext(repository: AttemptAccessRepository, tx: Transaction, userId: string, classroomId: string, attemptId: string) {
  if (![userId, classroomId, attemptId].every(uuid)) return fail('FORBIDDEN');
  const [room] = await repository.lockClassroom(tx, { classroomId: classroomId });
  if (!room) return fail('FORBIDDEN');
  const [row] = await repository.lockAttempt(tx, { attemptId: attemptId, classroomId: classroomId });
  if (!row || row.student_id !== userId) return fail('FORBIDDEN');
  const [membership] = await repository.membership(tx, { obligationId: row.student_activity_id });
  if (!membership) return fail('FORBIDDEN');
  const [{ now }] = await repository.clock(tx);
  return { room, attempt: row, now, reception: receptionPolicy(row.deadline_at, row.individual_deadline_at, row.allow_late_submissions, now) };
}

/** An editor epoch is authorization; an optional revision is an independent compare-and-swap guard. */
export async function assertAttemptWrite(repository: AttemptAccessRepository, tx: Transaction, userId: string, classroomId: string, attemptId: string,
  capability: EditorCapability, expectedRevision?: unknown, receivedAt?: Date) {
  const context = await resolveAttemptContext(repository, tx, userId, classroomId, attemptId), a = context.attempt;
  const parsed = editorCapability(capability.token, capability.epoch);
  const reception = receivedAt ? receptionPolicy(a.deadline_at, a.individual_deadline_at, a.allow_late_submissions, receivedAt) : context.reception;
  if (context.room.archived_at || a.status !== 'DRAFT' || a.activity_status !== 'PUBLISHED'
    || !a.is_expected || !reception.open) return fail('CONFLICT');
  if (!repository.matchesEditor(a.editor_token_hash, a.editor_epoch, parsed)) return fail('FORBIDDEN');
  if (expectedRevision !== undefined && a.revision.toString() !== revision(expectedRevision)) return fail('CONFLICT');
  return { ...context, reception };
}


export type { EditorCapability } from '../../domain/attempt-policy.ts';

export interface AttemptAccessRepository {
 matchesEditor: (hash: string | null, epoch: bigint, capability: EditorCapability) => boolean;
 lockClassroom(tx: Transaction, input: { classroomId: string }): Promise<({ archived_at: Date | null })[]>;
 lockAttempt(tx: Transaction, input: { attemptId: string; classroomId: string }): Promise<(AttemptRow & { student_id: string; is_expected: boolean; activity_status: string;
    deadline_at: Date | null; allow_late_submissions: boolean; activity_type: string; attachments_required: boolean })[]>;
 membership(tx: Transaction, input: { obligationId: string }): Promise<({ id: string })[]>;
 clock(tx: Transaction): Promise<({ now: Date })[]>;
}
