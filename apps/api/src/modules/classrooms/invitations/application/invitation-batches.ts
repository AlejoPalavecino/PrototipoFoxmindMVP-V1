import type { InvitationBatchRepository } from './invitation-batches-repository.ts';
import type { InvitationBatchReceipt, InvitationBatchRecipient } from '../../../../../../../src/core/contracts/classrooms.ts';

import type { Actor, Transaction } from '../../access/public.ts';
import type { createInvitationIssueOperations, InvitationAccess } from './invitations-operations.ts';
import { fail, object, uuid } from '../../domain/policy.ts';

const maximumRecipients = 50;

function mailbox(value: unknown, validate: InvitationAccess['ports']['validateMailbox']) {
  if (typeof value !== 'string') return fail('INVALID_INPUT');
  // The account comparison is case-insensitive. SMTP retains the supplied local part.
  const domainStart = value.lastIndexOf('@') + 1;
  try { return validate(value.slice(0, domainStart) + value.slice(domainStart).toLowerCase()); }
  catch { return fail('INVALID_INPUT'); }
}

async function distinctMailboxes(repository: InvitationBatchRepository, tx: Transaction, emails: string[]) {
  const normalized = await repository.distinctMailboxes(tx, { emails: JSON.stringify(emails) });
  if (normalized.length > maximumRecipients) return fail('INVALID_INPUT');
  const first = new Set(normalized.map(({ email }) => email));
  return [...new Set(emails.filter(email => first.has(email)))];
}

export class InvitationBatchOperations {
  constructor(private readonly access: InvitationAccess, private readonly repository: InvitationBatchRepository,
    private readonly operations: ReturnType<typeof createInvitationIssueOperations>,
    private readonly envelopes: { sealReceipt(key: Buffer, value: InvitationBatchReceipt, aad: string): string; openReceipt(key: Buffer, envelope: string, aad: string, previous?: readonly Buffer[]): InvitationBatchReceipt }) {}

  async reserve(request: unknown, classroomId: string, input: unknown): Promise<InvitationBatchReceipt> {
    const { requestId, emails } = object(input, ['requestId', 'emails']);
    if (!uuid(requestId) || !Array.isArray(emails) || !emails.length) return fail('INVALID_INPUT');
    const id = requestId.toLowerCase();
    const mailboxes = emails.map(email => mailbox(email, this.access.ports.validateMailbox));
    return this.access.run(request, true, async (tx, actor) => {
      const room = await this.access.classroom(tx, actor, classroomId, false, true);
      const distinct = await distinctMailboxes(this.repository, tx, mailboxes);
      const previous = await this.readReceipt(tx, classroomId, id);
      if (previous) {
        if (previous.recipients.length !== distinct.length ||
          previous.recipients.some(({ email }, index) => email !== distinct[index])) return fail('CONFLICT');
        return previous;
      }
      if (room.archived_at) return fail('CONFLICT');
      const receipt: InvitationBatchReceipt = { requestId: id, recipients: distinct.map(email => ({ email, status: 'pending' })) };
      await this.repository.createReceipt(tx, { classroomId: classroomId, requestId: id, envelope: this.seal(classroomId, receipt) });
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
      await this.repository.updateReceipt(tx, { classroomId: classroomId, requestId: requestId, envelope: this.seal(classroomId, receipt) });
      return result;
    });
  }

  private async issue(tx: Transaction, actor: Actor, classroomId: string, classroomName: string, email: string): Promise<InvitationBatchRecipient> {
    const [{ normalized }] = await this.repository.normalizeMailbox(tx, { email: email });
    if (normalized === actor.email_normalized) return { email, status: 'failed', code: 'ENROLLMENT_UNAVAILABLE' };
    if (await this.operations.hasActiveMember(tx, classroomId, normalized)) return { email, status: 'already_member' };
    const existing = await this.operations.findOpenInvitation(tx, classroomId, normalized);
    if (existing) return { email, status: 'already_invited', invitationId: existing.id };
    const invitation = await this.operations.createInvitation(tx, classroomId, normalized, actor.id);
    await this.operations.enqueueInvitation(tx, this.access, invitation, email, classroomName, actor);
    return { email, status: 'created', invitationId: invitation.id };
  }

  private async readReceipt(tx: Transaction, classroomId: string, requestId: string): Promise<InvitationBatchReceipt | undefined> {
    const [row] = await this.repository.readReceipt(tx, { classroomId: classroomId, requestId: requestId });
    if (row) return this.envelopes.openReceipt(this.access.ports.deliveryKey, row.receipt_envelope, this.aad(classroomId, requestId), this.access.ports.previousDeliveryKeys);
  }

  private seal(classroomId: string, receipt: InvitationBatchReceipt) {
    return this.envelopes.sealReceipt(this.access.ports.deliveryKey, receipt, this.aad(classroomId, receipt.requestId));
  }

  private aad(classroomId: string, requestId: string) {
    return `classroom-invitation-batch:${classroomId.toLowerCase()}:${requestId.toLowerCase()}`;
  }
}
