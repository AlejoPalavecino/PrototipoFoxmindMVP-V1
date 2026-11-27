import type { InvitationIssueRepository } from './invitations-operations-repository.ts';
import { fail } from '../../domain/policy.ts';
import type { Actor, Transaction } from '../../access/public.ts';
import type { ClassroomRuntimeAccess } from '../../access/public.ts';
export type InvitationAccess = Pick<ClassroomRuntimeAccess, 'run' | 'classroom' | 'ports'>;
type InvitationRow = { id: string; generation: bigint; can_resend: boolean };

/** S6: recipients a teacher may have queued per rolling window (new invitations and resends, single or batch). */
export const INVITATION_DELIVERY_BUDGETS = Object.freeze({
  day: Object.freeze({ limit: 200, windowSeconds: 86400 }),
  hour: Object.freeze({ limit: 60, windowSeconds: 3600 }),
});

/** Charges one queued delivery to the teacher. Only RATE_LIMITED keeps its wait; any other failure closes the door. */
async function chargeDelivery(capability: InvitationAccess, actor: Actor) {
  const admit = capability.ports.admitInvitationDelivery;
  if (!admit) return;
  try { await admit(actor.id); } catch (error) {
    const { code, retryAfter } = (error ?? {}) as { code?: unknown; retryAfter?: unknown };
    if (code === 'RATE_LIMITED') return fail('RATE_LIMITED', typeof retryAfter === 'number' ? retryAfter : undefined);
    return fail('SERVICE_UNAVAILABLE');
  }
}

export function createInvitationIssueOperations(repository: InvitationIssueRepository, dependencies: { randomUUID(): string; sealMessage(key: Buffer, value: { to: string; classroom: string; teacher: string; url: string }, aad: string): string }) {
const { randomUUID, sealMessage: encryptDelivery } = dependencies;
async function inviteOperation(capability: InvitationAccess, request: unknown, classroomId: string, input: unknown) {
  let email: string;
  try { email = capability.ports.validateMailbox(input); } catch { return fail('INVALID_INPUT'); }
  return capability.run(request, true, async (tx, actor) => {
    const room = await capability.classroom(tx, actor, classroomId, true, true);
    const normalized = await normalizeInvitationMailbox(tx, email);
    if (normalized === actor.email_normalized) return fail('ENROLLMENT_UNAVAILABLE');
    if (await hasActiveMember(tx, classroomId, normalized)) return fail('CONFLICT');
    const invitation = await upsertInvitation(tx, classroomId, normalized, actor.id);
    await enqueueInvitation(tx, capability, invitation, email, room.name, actor);
    return { ...invitation, delivery: 'queued' };
  });
}

async function normalizeInvitationMailbox(tx: Transaction, email: string) {
  const [{ normalized }] = await repository.normalizeMailbox(tx, { email: email });
  return normalized;
}

async function hasActiveMember(tx: Transaction, classroomId: string, normalized: string) {
  const [active] = await repository.findActiveMember(tx, { classroomId: classroomId, email: normalized });
  return Boolean(active);
}

async function findOpenInvitation(tx: Transaction, classroomId: string, normalized: string) {
  const [pending] = await repository.findOpenInvitation(tx, { classroomId: classroomId, email: normalized });
  return pending;
}

async function upsertInvitation(tx: Transaction, classroomId: string, normalized: string, actorId: string) {
  const pending = await findOpenInvitation(tx, classroomId, normalized);
  if (!pending) return createInvitation(tx, classroomId, normalized, actorId);
  if (!pending.can_resend) return fail('CONFLICT');
  const [invitation] = await repository.advanceGeneration(tx, { invitationId: pending.id });
  return { id: pending.id, generation: invitation.generation.toString() };
}

async function createInvitation(tx: Transaction, classroomId: string, normalized: string, actorId: string) {
  const id = randomUUID();
  const [row] = await repository.createInvitation(tx, { invitationId: id, classroomId: classroomId, email: normalized, actorId: actorId });
  return { id, generation: row.generation.toString() };
}

async function enqueueInvitation(tx: Transaction, capability: InvitationAccess, invitation: { id: string; generation: string },
  email: string, classroom: string, actor: Actor) {
  await chargeDelivery(capability, actor);
  const { id, generation } = invitation, aad = `p5:${id}:${generation}`;
  const envelope = encryptDelivery(capability.ports.deliveryKey, { to: email, classroom,
    teacher: `${actor.first_name} ${actor.last_name}`, url: `${capability.ports.webOrigin}/mis-aulas?invitacion=${id}` }, aad);
  await repository.enqueueDelivery(tx, { jobId: randomUUID(), payload: JSON.stringify({ invitationId: id, generation, envelope }), deduplicationKey: aad });
}

return { inviteOperation, normalizeInvitationMailbox, hasActiveMember, findOpenInvitation, createInvitation, enqueueInvitation };
}
