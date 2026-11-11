import { randomUUID } from 'node:crypto';
import { fail } from './policy.ts';
import type { Actor, Transaction } from './contracts.ts';
import type { ClassroomRuntimeAccess } from './access.ts';
import { encryptDelivery } from './delivery-envelope.ts';

export type InvitationAccess = Pick<ClassroomRuntimeAccess, 'run' | 'classroom' | 'ports'>;
type InvitationRow = { id: string; generation: bigint; can_resend: boolean };

export async function inviteOperation(capability: InvitationAccess, request: unknown, classroomId: string, input: unknown) {
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

export async function normalizeInvitationMailbox(tx: Transaction, email: string) {
  const [{ normalized }] = await tx.query<{ normalized: string }>('SELECT lower($1::text) AS normalized', email);
  return normalized;
}

export async function hasActiveMember(tx: Transaction, classroomId: string, normalized: string) {
  const [active] = await tx.query(`SELECT 1 FROM enrollments e JOIN users u ON u.id=e.student_id
    JOIN membership_periods m ON m.enrollment_id=e.id WHERE e.classroom_id=$1::uuid AND u.email_normalized=$2 AND m.ended_at IS NULL`, classroomId, normalized);
  return Boolean(active);
}

export async function findOpenInvitation(tx: Transaction, classroomId: string, normalized: string) {
  const [pending] = await tx.query<InvitationRow>(`SELECT id,generation,
    issued_at<=clock_timestamp()-interval '60 seconds' AS can_resend FROM invitations
    WHERE classroom_id=$1::uuid AND recipient_email_normalized=$2 AND accepted_at IS NULL AND revoked_at IS NULL FOR UPDATE`, classroomId, normalized);
  return pending;
}

async function upsertInvitation(tx: Transaction, classroomId: string, normalized: string, actorId: string) {
  const pending = await findOpenInvitation(tx, classroomId, normalized);
  if (!pending) return createInvitation(tx, classroomId, normalized, actorId);
  if (!pending.can_resend) return fail('CONFLICT');
  const [invitation] = await tx.query<{ generation: bigint }>(`UPDATE invitations SET generation=generation+1,
    issued_at=clock_timestamp(),expires_at=clock_timestamp()+interval '7 days',updated_at=clock_timestamp()
    WHERE id=$1::uuid RETURNING generation`, pending.id);
  return { id: pending.id, generation: invitation.generation.toString() };
}

export async function createInvitation(tx: Transaction, classroomId: string, normalized: string, actorId: string) {
  const id = randomUUID();
  const [row] = await tx.query<{ generation: bigint }>(`INSERT INTO invitations
    (id,updated_at,classroom_id,recipient_email_normalized,invited_by_id,issued_at,expires_at)
    VALUES($1::uuid,clock_timestamp(),$2::uuid,$3,$4::uuid,clock_timestamp(),clock_timestamp()+interval '7 days') RETURNING generation`, id, classroomId, normalized, actorId);
  return { id, generation: row.generation.toString() };
}

export async function enqueueInvitation(tx: Transaction, capability: InvitationAccess, invitation: { id: string; generation: string },
  email: string, classroom: string, actor: Actor) {
  const { id, generation } = invitation, aad = `p5:${id}:${generation}`;
  const envelope = encryptDelivery(capability.ports.deliveryKey, { to: email, classroom,
    teacher: `${actor.first_name} ${actor.last_name}`, url: `${capability.ports.webOrigin}/mis-aulas?invitacion=${id}` }, aad);
  await tx.query(`INSERT INTO background_jobs(id,updated_at,type,payload,deduplication_key)
    VALUES($1::uuid,clock_timestamp(),'p5.invitation',$2::jsonb,$3) RETURNING id`,
  randomUUID(), JSON.stringify({ invitationId: id, generation, envelope }), aad);
}
