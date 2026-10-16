import type { FileAccess, FileTransaction, FileTarget } from './contracts.ts';
import { FileError } from './errors.ts';
export type AttemptWriteAuthorizer = (tx: FileTransaction, userId: string, target: FileTarget, request: unknown) => Promise<void>;

/** Used by FileStore after verified-account, scope, archive and membership locking.
 * P3 owns authentication; P7 owns editor/deadline/count policy. Neither has an allow fallback. */
export function createFileAccess(ports: { authenticate: FileAccess['authenticate']; authorizeAttemptWrite: AttemptWriteAuthorizer }): FileAccess {
  if (typeof ports?.authenticate !== 'function' || typeof ports.authorizeAttemptWrite !== 'function') throw new FileError('SERVICE_UNAVAILABLE');
  const authenticate = ports.authenticate, attemptWrite = ports.authorizeAttemptWrite;
  return { authenticate, async authorize(tx, userId, target, action, request) {
    const deny = (): never => { throw new FileError('FORBIDDEN'); };
    if (target.scope.kind === 'draft') {
      if (target.purpose !== 'plan' || target.targetId !== null) deny();
      return; // The store already locks/checks the actual draft owner.
    }
    const [classroom] = await tx.query<{ teacher_id: string }>('SELECT teacher_id FROM classrooms WHERE id=$1::uuid', target.scope.id);
    if (!classroom) deny();
    const teacher = classroom.teacher_id === userId;
    if (action === 'usage') { if (!teacher) deny(); return; }
    if (target.purpose === 'plan' || target.purpose === 'material') {
      if (target.targetId !== null) deny();
      if (teacher) return;
      if (action === 'upload' || !target.fileId) deny();
      const table = target.purpose === 'plan' ? 'study_plan_versions' : 'materials';
      const [link] = await tx.query(`SELECT 1 AS allowed FROM ${table} WHERE file_id=$1::uuid AND classroom_id=$2::uuid FOR SHARE`, target.fileId, target.scope.id);
      if (!link) deny(); return;
    }
    if (target.purpose === 'instructions') {
      const [activity] = await tx.query<{ status: string; first_started_at: Date | null }>(
        'SELECT status::text,first_started_at FROM activities WHERE id=$1::uuid AND classroom_id=$2::uuid FOR SHARE', target.targetId, target.scope.id);
      if (!activity) deny();
      if (action === 'upload') { if (!teacher || activity.first_started_at !== null) deny(); return; }
      if (teacher) return;
      if (activity.status !== 'PUBLISHED' || !target.fileId) deny();
      const [link] = await tx.query(`SELECT 1 AS allowed FROM activity_instruction_files
        WHERE activity_id=$1::uuid AND file_id=$2::uuid AND classroom_id=$3::uuid FOR SHARE`, target.targetId, target.fileId, target.scope.id);
      if (!link) deny(); return;
    }
    if (target.purpose !== 'attachment') deny();
    const [attempt] = await tx.query<{ student_id: string; status: string; type: string; activity_status: string; is_expected: boolean }>(
      `SELECT e.student_id,a.status::text,activity.type::text,activity.status::text AS activity_status,sa.is_expected
       FROM attempts a JOIN student_activities sa ON sa.id=a.student_activity_id
       JOIN enrollments e ON e.id=sa.enrollment_id JOIN activities activity ON activity.id=a.activity_id
       WHERE a.id=$1::uuid AND sa.classroom_id=$2::uuid FOR UPDATE OF a FOR SHARE OF sa,e,activity`, target.targetId, target.scope.id);
    if (!attempt || attempt.type !== 'ASSIGNMENT') deny();
    if (action === 'upload') {
      if (teacher || attempt.student_id !== userId || attempt.status !== 'DRAFT'
        || attempt.activity_status !== 'PUBLISHED' || !attempt.is_expected) deny();
      await attemptWrite(tx, userId, target, request); return;
    }
    if (attempt.student_id === userId) return;
    if (!teacher || attempt.status !== 'SUBMITTED' || !target.fileId) deny();
    const [link] = await tx.query(`SELECT 1 AS allowed FROM attempt_attachments
      WHERE attempt_id=$1::uuid AND file_id=$2::uuid AND classroom_id=$3::uuid FOR SHARE`, target.targetId, target.fileId, target.scope.id);
    if (!link) deny();
  } };
}
