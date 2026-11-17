import type { Transaction } from '../../access/public.ts';

export interface InvitationsRepository {
  declineInvitation(tx: Transaction, input: { invitationId: string; classroomId: string; email: string; actorId: string }): Promise<{ id: string }[]>;
  revokeInvitation(tx: Transaction, input: { invitationId: string; classroomId: string }): Promise<{ id: string }[]>;
  listPendingInvitations(tx: Transaction, input: { email: string; actorId: string }): Promise<{ id: string; expiresAt: Date; name: string; subject: string; division: string; coverKey: string; academicYear: number; teacher: string }[]>;
  listClassroomInvitations(tx: Transaction, input: { classroomId: string }): Promise<{ id: string; generation: string; issuedAt: Date; expiresAt: Date; acceptedAt: Date | null; revokedAt: Date | null; declinedAt: Date | null; envelope: string | null; deliveryStatus: string | null; deliveryError: string | null }[]>;
  findInvitationClassroom(tx: Transaction, input: { invitationId: string }): Promise<{ classroom_id: string }[]>;
  lockInvitationClassroom(tx: Transaction, input: { classroomId: string }): Promise<{ teacher_id: string; archived_at: Date | null }[]>;
  lockAcceptableInvitation(tx: Transaction, input: { invitationId: string; classroomId: string; email: string; actorId: string }): Promise<{ id: string }[]>;
  acceptInvitation(tx: Transaction, input: { invitationId: string; actorId: string }): Promise<{ id: string }[]>;
}
