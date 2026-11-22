

import type { MembershipCodeRepository } from '../application/membership-code-operations-repository.ts';
const GLOBAL_FAILURE_ACTION = 'classroom-code-failure';
export function createMembershipCodeRepository(): MembershipCodeRepository { return {
  async readGlobalCodeFailures(tx, input) {
    return tx.query<{ failures: number; retry_after: number }>(`SELECT request_count AS failures,
      GREATEST(1,CEIL(EXTRACT(EPOCH FROM (window_started_at+make_interval(secs=>$2::int)-clock_timestamp()))))::int AS retry_after
      FROM account_action_controls
      WHERE action=$1 AND subject_key='global' AND window_started_at > clock_timestamp()-make_interval(secs=>$2::int)`,
      GLOBAL_FAILURE_ACTION, input.windowSeconds);
  },
  async recordGlobalCodeFailure(tx, input) {
    return tx.query<{ request_count: number }>(`INSERT INTO account_action_controls
      (id,updated_at,action,subject_key,last_requested_at,window_started_at,request_count)
      VALUES (gen_random_uuid(),clock_timestamp(),$1,'global',clock_timestamp(),clock_timestamp(),1)
      ON CONFLICT(action,subject_key) DO UPDATE SET last_requested_at=clock_timestamp(),updated_at=clock_timestamp(),
      request_count=CASE WHEN account_action_controls.window_started_at <= clock_timestamp()-make_interval(secs=>$2::int) THEN 1 ELSE account_action_controls.request_count+1 END,
      window_started_at=CASE WHEN account_action_controls.window_started_at <= clock_timestamp()-make_interval(secs=>$2::int) THEN clock_timestamp() ELSE account_action_controls.window_started_at END
      RETURNING request_count`, GLOBAL_FAILURE_ACTION, input.windowSeconds);
  },
  async findLiveCode(tx, input) { return tx.query<{
        id: string;
        classroom_id: string;
        code_digest: string;
      }>('SELECT id,classroom_id,code_digest FROM classroom_codes WHERE code_digest=$1 AND revoked_at IS NULL', input.digest); },
  async readPreviewTime(tx, input) { return tx.query<{ now: Date }>('SELECT clock_timestamp() AS now'); },
  async lockPreviewClassroom(tx, input) { return tx.query<{
        name: string;
        subject: string;
        division: string;
        academic_year: number;
        cover_key?: string;
        teacher: string;
        teacher_id: string;
        archived_at: Date | null;
      }>(`SELECT c.*,concat(u.first_name,' ',u.last_name) AS teacher FROM classrooms c JOIN users u ON u.id=c.teacher_id
        WHERE c.id=$1::uuid FOR UPDATE OF c`, input.classroomId); },
  async findPreviewEnrollment(tx, input) { return tx.query<{ id: string }>('SELECT id FROM enrollments WHERE classroom_id=$1::uuid AND student_id=$2::uuid', input.classroomId, input.actorId); },
  async findUnrevokedCode(tx, input) { return tx.query<{ id: string }>('SELECT id FROM classroom_codes WHERE id=$1::uuid AND revoked_at IS NULL', input.codeId); },
  async lockConfirmationClassroom(tx, input) { return tx.query<{
        teacher_id: string;
        archived_at: Date | null;
      }>('SELECT teacher_id,archived_at FROM classrooms WHERE id=$1::uuid FOR UPDATE', input.classroomId); },
  async findConfirmationCode(tx, input) { return tx.query<{ id: string }>('SELECT id FROM classroom_codes WHERE id=$1::uuid AND classroom_id=$2::uuid AND code_digest=$3 AND revoked_at IS NULL', input.codeId, input.classroomId, input.digest); },
  async findConfirmationEnrollment(tx, input) { return tx.query<{ id: string }>('SELECT id FROM enrollments WHERE classroom_id=$1::uuid AND student_id=$2::uuid', input.classroomId, input.actorId); },
  async readConfirmationTime(tx, input) { return tx.query<{ now: Date }>('SELECT clock_timestamp() AS now'); },
}; }
