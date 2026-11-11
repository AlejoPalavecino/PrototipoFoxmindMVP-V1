import type { InvitationBatchReceipt, InvitationBatchRecipient } from '../../../../../../src/core/contracts/classrooms.ts';
import { decryptDelivery, encryptDelivery } from './delivery-envelope.ts';
import type { Actor, Transaction } from './contracts.ts';
import { createInvitation, enqueueInvitation, findOpenInvitation, hasActiveMember, normalizeInvitationMailbox, type InvitationAccess } from './invitations-operations.ts';
import { fail, object, uuid } from './policy.ts';

const maximumRecipients = 50;

function mailbox(value: unknown, validate: InvitationAccess['ports']['validateMailbox']) {
  if (typeof value !== 'string') return fail('INVALID_INPUT');
  // The account comparison is case-insensitive. SMTP retains the supplied local part.
  const domainStart = value.lastIndexOf('@') + 1;
  try { return validate(value.slice(0, domainStart) + value.slice(domainStart).toLowerCase()); }
  catch { return fail('INVALID_INPUT'); }
}

async function distinctMailboxes(tx: Transaction, emails: string[]) {
  const normalized = await tx.query<{ email: string }>(`SELECT DISTINCT ON (lower(email)) email
    FROM jsonb_array_elements_text($1::jsonb) WITH ORDINALITY AS source(email, position)
    ORDER BY lower(email), position`, JSON.stringify(emails));
  if (normalized.length > maximumRecipients) return fail('INVALID_INPUT');
  const first = new Set(normalized.map(({ email }) => email));
  return [...new Set(emails.filter(email => first.has(email)))];
}

export class InvitationBatchOperations {
  constructor(private readonly access: InvitationAccess) {}

  async reserve(request: unknown, classroomId: string, input: unknown): Promise<InvitationBatchReceipt> {
    const { requestId, emails } = object(input, ['requestId', 'emails']);
    if (!uuid(requestId) || !Array.isArray(emails) || !emails.length) return fail('INVALID_INPUT');
    const id = requestId.toLowerCase();
    const mailboxes = emails.map(email => mailbox(email, this.access.ports.validateMailbox));
    return this.access.run(request, true, async (tx, actor) => {
      const room = await this.access.classroom(tx, actor, classroomId, false, true);
      const distinct = await distinctMailboxes(tx, mailboxes);
      const previous = await this.readReceipt(tx, classroomId, id);
      if (previous) {
        if (previous.recipients.length !== distinct.length ||
          previous.recipients.some(({ email }, index) => email !== distinct[index])) return fail('CONFLICT');
        return previous;
      }
      if (room.archived_at) return fail('CONFLICT');
      const receipt: InvitationBatchReceipt = { requestId: id, recipients: distinct.map(email => ({ email, status: 'pending' })) };
      await tx.query(`INSERT INTO classroom_invitation_batches(classroom_id,request_id,receipt_envelope)
        VALUES ($1::uuid,$2::uuid,$3) RETURNING request_id`, classroomId, id, this.seal(classroomId, receipt));
      return receipt;
    });
  }

  async read(request: unknown, classroomId: string, requestId: unknown): Promise<InvitationBatchReceipt> {
    if (!uuid(requestId)) return fail('INVALID_INPUT');
    return this.access.run(request, false, async (tx, actor) => {
      await this.access.classroom(tx, actor, classroomId, false, true);
      return await this.readReceipt(tx, classroomId, requestId.toLowerCase()) ?? fail('INVITATION_BATCH_NOT_FOUND');
    });
  }

  async emit(request: unknown, classroomId: string, requestId: unknown, index: number): Promise<InvitationBatchRecipient> {
    if (!uuid(requestId) || !Number.isInteger(index) || index < 0 || index >= maximumRecipients) return fail('INVALID_INPUT');
    return this.access.run(request, true, async (tx, actor) => {
      // The classroom write lock serializes receipt changes with archive, single invites and membership.
      const room = await this.access.classroom(tx, actor, classroomId, false, true);
      const receipt = await this.readReceipt(tx, classroomId, requestId.toLowerCase());
      if (!receipt) return fail('INVITATION_BATCH_NOT_FOUND');
      const recipient = receipt.recipients[index];
      if (!recipient) return fail('INVALID_INPUT');
      if (recipient.status !== 'pending') return recipient;
      const result: InvitationBatchRecipient = room.archived_at
        ? { email: recipient.email, status: 'failed', code: 'CONFLICT' }
        : await this.issue(tx, actor, classroomId, room.name, recipient.email);
      receipt.recipients[index] = result;
      await tx.query(`UPDATE classroom_invitation_batches SET receipt_envelope=$3
        WHERE classroom_id=$1::uuid AND request_id=$2::uuid RETURNING request_id`,
      classroomId, requestId, this.seal(classroomId, receipt));
      return result;
    });
  }

  private async issue(tx: Transaction, actor: Actor, classroomId: string, classroomName: string, email: string): Promise<InvitationBatchRecipient> {
    const [{ normalized }] = await tx.query<{ normalized: string }>('SELECT lower($1::text) AS normalized', email);
    if (normalized === actor.email_normalized) return { email, status: 'failed', code: 'ENROLLMENT_UNAVAILABLE' };
    if (await hasActiveMember(tx, classroomId, normalized)) return { email, status: 'already_member' };
    const existing = await findOpenInvitation(tx, classroomId, normalized);
    if (existing) return { email, status: 'already_invited', invitationId: existing.id };
    const invitation = await createInvitation(tx, classroomId, normalized, actor.id);
    await enqueueInvitation(tx, this.access, invitation, email, classroomName, actor);
    return { email, status: 'created', invitationId: invitation.id };
  }

  private async readReceipt(tx: Transaction, classroomId: string, requestId: string): Promise<InvitationBatchReceipt | undefined> {
    const [row] = await tx.query<{ receipt_envelope: string }>(`SELECT receipt_envelope FROM classroom_invitation_batches
      WHERE classroom_id=$1::uuid AND request_id=$2::uuid`, classroomId, requestId);
    if (row) return decryptDelivery(this.access.ports.deliveryKey, row.receipt_envelope, this.aad(classroomId, requestId));
  }

  private seal(classroomId: string, receipt: InvitationBatchReceipt) {
    return encryptDelivery(this.access.ports.deliveryKey, receipt, this.aad(classroomId, receipt.requestId));
  }

  private aad(classroomId: string, requestId: string) {
    return `classroom-invitation-batch:${classroomId.toLowerCase()}:${requestId.toLowerCase()}`;
  }
}
