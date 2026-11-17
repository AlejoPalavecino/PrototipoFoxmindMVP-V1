

import type { MembershipLifecycleRepository } from '../application/membership-lifecycle-operations-repository.ts';
export function createMembershipLifecycleRepository(): MembershipLifecycleRepository { return {
  async lockActivePeriod(tx, input) { return tx.query<{ id: string; enrollment_id: string }>(`SELECT m.id,m.enrollment_id FROM membership_periods m
        JOIN enrollments e ON e.id=m.enrollment_id WHERE e.classroom_id=$1::uuid AND e.student_id=$2::uuid
        AND m.ended_at IS NULL FOR UPDATE OF e,m`, input.classroomId, input.studentId); },
  async endPeriod(tx, input) { return tx.query<{ id: string }>(`UPDATE membership_periods SET ended_at=clock_timestamp(),end_reason=$2::"EndReason",
        ended_by_id=$3::uuid,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, input.periodId, input.reason, input.actorId); },
  async listMembers(tx, input) { return tx.query<{
        enrollment_id: string;
        student_id: string;
        first_name: string;
        last_name: string;
        email: string;
        active: boolean;
      }>(`SELECT e.id AS enrollment_id,e.student_id,u.first_name,u.last_name,u.email,EXISTS(SELECT 1 FROM membership_periods m
        WHERE m.enrollment_id=e.id AND m.ended_at IS NULL) AS active FROM enrollments e JOIN users u ON u.id=e.student_id
        WHERE e.classroom_id=$1::uuid ORDER BY u.last_name,u.first_name,e.id`, input.classroomId); },
  async revokePendingInvitations(tx, input) { return tx.query<{ id: string }>(`UPDATE invitations SET revoked_at=clock_timestamp(),updated_at=clock_timestamp()
        WHERE classroom_id=$1::uuid AND recipient_email_normalized=(SELECT email_normalized FROM users WHERE id=$2::uuid)
        AND accepted_at IS NULL AND revoked_at IS NULL AND declined_at IS NULL RETURNING id`, input.classroomId, input.studentId); },
  async listPeriods(tx, input) { return tx.query<{
        enrollment_id: string;
        joinedAt: Date;
        endedAt: Date | null;
        endReason: string | null;
      }>(`SELECT enrollment_id,joined_at AS "joinedAt",ended_at AS "endedAt",end_reason::text AS "endReason"
        FROM membership_periods WHERE classroom_id=$1::uuid ORDER BY joined_at,id`, input.classroomId); },
}; }
