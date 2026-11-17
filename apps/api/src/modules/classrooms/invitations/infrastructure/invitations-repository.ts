

import type { InvitationsRepository } from '../application/invitations-repository.ts';
export function createInvitationsRepository(): InvitationsRepository { return {
  async declineInvitation(tx, input) { return tx.query<{ id: string }>(`UPDATE invitations SET declined_at=COALESCE(declined_at,clock_timestamp()),declined_by_id=$4::uuid,updated_at=clock_timestamp()
  WHERE id=$1::uuid AND classroom_id=$2::uuid AND recipient_email_normalized=$3
  AND accepted_at IS NULL AND revoked_at IS NULL AND (expires_at>clock_timestamp() OR declined_at IS NOT NULL)
  RETURNING id`, input.invitationId, input.classroomId, input.email, input.actorId); },
  async revokeInvitation(tx, input) { return tx.query<{ id: string }>(`UPDATE invitations SET revoked_at=clock_timestamp(),updated_at=clock_timestamp()
        WHERE id=$1::uuid AND classroom_id=$2::uuid AND accepted_at IS NULL AND revoked_at IS NULL AND declined_at IS NULL RETURNING id`, input.invitationId, input.classroomId); },
  async listPendingInvitations(tx, input) { return tx.query<{ id: string; expiresAt: Date; name: string; subject: string; division: string; coverKey: string; academicYear: number; teacher: string }>(`SELECT i.id,i.expires_at AS "expiresAt",c.name,c.subject,c.division,c.cover_key AS "coverKey",
      c.academic_year AS "academicYear",concat(u.first_name,' ',u.last_name) AS teacher FROM invitations i
      JOIN classrooms c ON c.id=i.classroom_id JOIN users u ON u.id=c.teacher_id
      WHERE i.recipient_email_normalized=$1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.declined_at IS NULL
      AND i.expires_at>clock_timestamp() AND c.archived_at IS NULL AND c.teacher_id<>$2::uuid
      AND NOT EXISTS(SELECT 1 FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
        WHERE e.classroom_id=c.id AND e.student_id=$2::uuid AND (m.ended_at IS NULL OR m.ended_at>=i.issued_at))
      ORDER BY i.issued_at DESC,i.id`, input.email, input.actorId); },
  async listClassroomInvitations(tx, input) { return tx.query<{ id: string; generation: string; issuedAt: Date; expiresAt: Date; acceptedAt: Date | null; revokedAt: Date | null; declinedAt: Date | null; envelope: string | null; deliveryStatus: string | null; deliveryError: string | null }>(`SELECT i.id,i.generation::text,i.issued_at AS "issuedAt",i.expires_at AS "expiresAt",i.accepted_at AS "acceptedAt",i.revoked_at AS "revokedAt",i.declined_at AS "declinedAt",
        j.payload->>'envelope' AS envelope,j.status::text AS "deliveryStatus",j.last_error_code AS "deliveryError" FROM invitations i
        LEFT JOIN background_jobs j ON j.deduplication_key='p5:'||i.id::text||':'||i.generation::text
        WHERE i.classroom_id=$1::uuid ORDER BY i.issued_at DESC,i.id`, input.classroomId); },
  async findInvitationClassroom(tx, input) { return tx.query<{ classroom_id: string }>('SELECT classroom_id FROM invitations WHERE id=$1::uuid', input.invitationId); },
  async lockInvitationClassroom(tx, input) { return tx.query<{ teacher_id: string; archived_at: Date | null }>('SELECT teacher_id,archived_at FROM classrooms WHERE id=$1::uuid FOR UPDATE', input.classroomId); },
  async lockAcceptableInvitation(tx, input) { return tx.query<{ id: string }>(`SELECT id FROM invitations i WHERE i.id=$1::uuid AND i.classroom_id=$2::uuid
        AND i.recipient_email_normalized=$3 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.declined_at IS NULL AND i.expires_at>clock_timestamp()
        AND NOT EXISTS(SELECT 1 FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
          WHERE e.classroom_id=i.classroom_id AND e.student_id=$4::uuid AND (m.ended_at IS NULL OR m.ended_at>=i.issued_at)) FOR UPDATE OF i`, input.invitationId, input.classroomId, input.email, input.actorId); },
  async acceptInvitation(tx, input) { return tx.query<{ id: string }>('UPDATE invitations SET accepted_at=clock_timestamp(),accepted_by_id=$2::uuid,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id', input.invitationId, input.actorId); },
}; }
