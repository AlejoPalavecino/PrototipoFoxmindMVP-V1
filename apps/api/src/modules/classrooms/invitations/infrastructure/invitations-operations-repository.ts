

import type { InvitationIssueRepository } from '../application/invitations-operations-repository.ts';
export function createInvitationIssueRepository(): InvitationIssueRepository { return {
  async normalizeMailbox(tx, input) { return tx.query<{ normalized: string }>('SELECT lower($1::text) AS normalized', input.email); },
  async findActiveMember(tx, input) { return tx.query<{ '?column?': number }>(`SELECT 1 FROM enrollments e JOIN users u ON u.id=e.student_id
    JOIN membership_periods m ON m.enrollment_id=e.id WHERE e.classroom_id=$1::uuid AND u.email_normalized=$2 AND m.ended_at IS NULL`, input.classroomId, input.email); },
  async findOpenInvitation(tx, input) { return tx.query<{ id: string; generation: bigint; can_resend: boolean }>(`SELECT id,generation,
    issued_at<=clock_timestamp()-interval '60 seconds' AS can_resend FROM invitations
    WHERE classroom_id=$1::uuid AND recipient_email_normalized=$2 AND accepted_at IS NULL AND revoked_at IS NULL AND declined_at IS NULL FOR UPDATE`, input.classroomId, input.email); },
  async advanceGeneration(tx, input) { return tx.query<{ generation: bigint }>(`UPDATE invitations SET generation=generation+1,
    issued_at=clock_timestamp(),expires_at=clock_timestamp()+interval '7 days',updated_at=clock_timestamp()
    WHERE id=$1::uuid RETURNING generation`, input.invitationId); },
  async createInvitation(tx, input) { return tx.query<{ generation: bigint }>(`INSERT INTO invitations
    (id,updated_at,classroom_id,recipient_email_normalized,invited_by_id,issued_at,expires_at)
    VALUES($1::uuid,clock_timestamp(),$2::uuid,$3,$4::uuid,clock_timestamp(),clock_timestamp()+interval '7 days') RETURNING generation`, input.invitationId, input.classroomId, input.email, input.actorId); },
  async enqueueDelivery(tx, input) { return tx.query<{ id: string }>(`INSERT INTO background_jobs(id,updated_at,type,payload,deduplication_key)
    VALUES($1::uuid,clock_timestamp(),'p5.invitation',$2::jsonb,$3) RETURNING id`, input.jobId, input.payload, input.deduplicationKey); },
}; }
