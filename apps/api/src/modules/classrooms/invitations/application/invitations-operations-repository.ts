import type { Transaction } from '../../access/public.ts';

export interface InvitationIssueRepository {
  normalizeMailbox(tx: Transaction, input: { email: string }): Promise<{ normalized: string }[]>;
  findActiveMember(tx: Transaction, input: { classroomId: string; email: string }): Promise<{ '?column?': number }[]>;
  findOpenInvitation(tx: Transaction, input: { classroomId: string; email: string }): Promise<{ id: string; generation: bigint; can_resend: boolean }[]>;
  advanceGeneration(tx: Transaction, input: { invitationId: string }): Promise<{ generation: bigint }[]>;
  createInvitation(tx: Transaction, input: { invitationId: string; classroomId: string; email: string; actorId: string }): Promise<{ generation: bigint }[]>;
  enqueueDelivery(tx: Transaction, input: { jobId: string; payload: string; deduplicationKey: string }): Promise<{ id: string }[]>;
}
