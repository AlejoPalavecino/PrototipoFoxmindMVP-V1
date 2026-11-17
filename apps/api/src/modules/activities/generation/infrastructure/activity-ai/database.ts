import type { Actor, Transaction } from '../../../../classrooms/public.ts';
import type { SqlDatabase } from '../../../../../../../../src/core/contracts/sql.ts';
type AccessPorts = { database: SqlDatabase; authenticate(tx: Transaction, request: unknown, write: boolean): Promise<string> };
import type { ClassroomAccess } from '../../../../classrooms/public.ts';
import { fail, uuid } from '../../../../classrooms/public.ts';
import type { ActivityAiAccess, ActivityAiOperation, ActivityAiOptions, JobRow } from './contracts.ts';
import { registerTransactionMode } from '../../../../classrooms/public.ts';

export function createActivityAiAccess(ports: AccessPorts, classroom: ClassroomAccess['classroom']): ActivityAiAccess {
  function transaction<T>(operation: (tx: Transaction) => Promise<T>): Promise<T> {
    return ports.database.$transaction(raw => operation({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }),
      { maxWait: 2000, timeout: 6000 });
  }
  function authorized<T>(request: unknown, classroomId: string, write: boolean,
    operation: ActivityAiOperation<T>, lockIntent: 'read' | 'write' = write ? 'write' : 'read') {
    return transaction(async tx => {
      registerTransactionMode(tx, lockIntent === 'write' || write);
      const id = await ports.authenticate(tx, request, write);
      if (!uuid(id)) return fail('FORBIDDEN');
      const [user] = await tx.query<Actor & { email_verified_at: Date | null }>(
        `SELECT id,email,email_normalized,first_name,last_name,account_role,email_verified_at FROM users WHERE id=$1::uuid FOR ${write ? 'UPDATE' : 'SHARE'}`, id);
      if (!user?.email_verified_at || await ports.authenticate(tx, request, write) !== id) return fail('FORBIDDEN');
      const [time] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
      const actor = { ...user, now: time!.now };
      const room = await classroom(tx, actor, classroomId, write, true);
      return operation(tx, room, actor);
    });
  }
  return { transaction, authorized };
}

export function transaction<T>(options: ActivityAiOptions, operation: (tx: Transaction) => Promise<T>): Promise<T> {
  return options.access.transaction(operation);
}
export function authorized<T>(options: ActivityAiOptions, request: unknown, classroomId: string, write: boolean,
  operation: ActivityAiOperation<T>, lockIntent?: 'read' | 'write') {
  return options.access.authorized(request, classroomId, write, operation, lockIntent);
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
    type: row.type, unitId: row.unit_id, topicIds: row.curriculum_snapshot.units ? row.curriculum_snapshot.topics.map(topic => topic.id) : row.input_payload.topicIds,
    unitIds: row.curriculum_snapshot.units?.map(unit => unit.id) ?? [row.unit_id], teacherBrief: row.input_payload.teacherBrief ?? null, createdAt: row.created_at,
    proposal: row.state === 'READY' || row.state === 'APPLIED' ? row.proposal : null, error: row.error_code,
    missingInformation: row.missing_information, sourceReport: row.source_report, appliedActivityId: row.applied_activity_id,
    retryable: row.state === 'FAILED' && ['AI_UNAVAILABLE', 'AI_RATE_LIMITED', 'AI_TIMEOUT', 'AI_BUDGET_EXCEEDED'].includes(row.error_code ?? '') };
}
