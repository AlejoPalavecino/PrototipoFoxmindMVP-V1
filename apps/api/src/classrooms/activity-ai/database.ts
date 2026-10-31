import type { Actor, Transaction } from '../contracts.ts';
import { fail, uuid } from '../policy.ts';
import type { ActivityAiOptions, JobRow } from './contracts.ts';
import { registerTransactionMode } from '../context.ts';

export function transaction<T>(options: ActivityAiOptions, operation: (tx: Transaction) => Promise<T>): Promise<T> {
  return options.classrooms.ports.database.$transaction(raw => operation({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }),
    { maxWait: 2000, timeout: 6000 });
}
export function authorized<T>(options: ActivityAiOptions, request: unknown, classroomId: string, write: boolean,
  operation: (tx: Transaction, room: { id: string; teacher_id: string; revision: bigint; archived_at: Date | null }, actor: Actor) => Promise<T>,
  lockIntent: 'read' | 'write' = write ? 'write' : 'read') {
  return transaction(options, async tx => {
    registerTransactionMode(tx, lockIntent === 'write' || write);
    const id = await options.classrooms.ports.authenticate(tx, request, write);
    if (!uuid(id)) return fail('FORBIDDEN');
    const [user] = await tx.query<Actor & { email_verified_at: Date | null }>(
      `SELECT id,email,email_normalized,first_name,last_name,account_role,email_verified_at FROM users WHERE id=$1::uuid FOR ${write ? 'UPDATE' : 'SHARE'}`, id);
    if (!user?.email_verified_at || await options.classrooms.ports.authenticate(tx, request, write) !== id) return fail('FORBIDDEN');
    const [time] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
    const actor = { ...user, now: time!.now };
    const room = await options.classrooms.classroom(tx, actor, classroomId, write, true);
    return operation(tx, room, actor);
  });
}
export async function job(tx: Transaction, classroomId: string, id: string): Promise<JobRow> {
  if (!uuid(id)) return fail('FORBIDDEN');
  const [row] = await tx.query<JobRow>(`SELECT g.* FROM activity_ai_generations g JOIN classrooms c ON c.id=g.classroom_id
    WHERE g.id=$1::uuid AND g.classroom_id=$2::uuid AND g.owner_id=c.teacher_id FOR UPDATE OF g`, id, classroomId);
  if (!row) return fail('FORBIDDEN');
  return row;
}
export function view(row: JobRow) {
  return { id: row.id, classroomId: row.classroom_id, baseRevision: String(row.base_revision), state: row.state,
    type: row.type, unitId: row.unit_id, topicIds: row.input_payload.topicIds, createdAt: row.created_at,
    proposal: row.state === 'READY' || row.state === 'APPLIED' ? row.proposal : null, error: row.error_code,
    missingInformation: row.missing_information, sourceReport: row.source_report, appliedActivityId: row.applied_activity_id,
    retryable: row.state === 'FAILED' && ['AI_UNAVAILABLE', 'AI_RATE_LIMITED', 'AI_TIMEOUT', 'AI_BUDGET_EXCEEDED'].includes(row.error_code ?? '') };
}
