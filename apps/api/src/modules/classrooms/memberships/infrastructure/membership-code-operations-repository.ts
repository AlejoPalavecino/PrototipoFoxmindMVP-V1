

import type { MembershipCodeRepository } from '../application/membership-code-operations-repository.ts';
export function createMembershipCodeRepository(): MembershipCodeRepository { return {
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
