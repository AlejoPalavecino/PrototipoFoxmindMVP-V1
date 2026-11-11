import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { InvitationBatchReceipt, InvitationBatchRecipient } from '../../../../../../src/core/contracts/classrooms.ts';
import isEmail from 'validator/lib/isEmail.js';

export function parseInvitationEmails(text: string) {
  const entries: string[] = [];
  let token = '', quoted = false, escaped = false;
  for (const character of text) {
    if (escaped) { token += character; escaped = false; continue; }
    if (character === '\\' && quoted) { token += character; escaped = true; continue; }
    if (character === '"') quoted = !quoted;
    if ((!quoted && /[,;]/u.test(character)) || /[\r\n]/u.test(character)) {
      if (token.trim()) entries.push(token.trim()); token = '';
    } else token += character;
  }
  if (token.trim()) entries.push(token.trim());
  const unique = new Map<string, string>();
  for (const entry of entries) {
    const at = entry.lastIndexOf('@');
    const email = at < 0 ? entry : entry.slice(0, at + 1) + entry.slice(at + 1).toLowerCase();
    if (!unique.has(email.toLowerCase())) unique.set(email.toLowerCase(), email);
  }
  const emails = [...unique.values()];
  // Same delivery-mailbox rules as the server; keep the offending address visible before reserving a batch.
  const invalid = emails.filter(value => /[\u0000-\u001f\u007f-\u009f\uD800-\uDFFF]/u.test(value) || !isEmail(value, {
    allow_display_name: false, require_display_name: false, allow_utf8_local_part: true,
    allow_ip_domain: false, require_tld: true, allow_underscores: false,
    ignore_max_length: false, domain_specific_validation: false,
  }));
  return { emails, invalid, duplicates: entries.length - emails.length };
}

/** A missing response is uncertain. Reconcile and pause; never start a new batch to retry it. */
export async function continueInvitationBatch(api: ClassroomClient, classroomId: string, initial: InvitationBatchReceipt,
  shouldStop: () => boolean, onUpdate: (receipt: InvitationBatchReceipt) => void,
): Promise<{ receipt: InvitationBatchReceipt; paused: boolean }> {
  let receipt = initial;
  const path = `/${classroomId}/invitations/batch/${receipt.requestId}`;
  for (let index = 0; index < receipt.recipients.length; index++) {
    if (shouldStop()) return { receipt, paused: true };
    if (receipt.recipients[index].status !== 'pending') continue;
    try {
      const recipient = await api.call<InvitationBatchRecipient>(`${path}/${index}`, 'POST', {});
      receipt = { ...receipt, recipients: receipt.recipients.map((previous, i) => i === index ? recipient : previous) };
      onUpdate(receipt);
    } catch {
      try { receipt = await api.call<InvitationBatchReceipt>(path); onUpdate(receipt); } catch { /* The receipt remains recoverable by requestId. */ }
      return { receipt, paused: true };
    }
  }
  return { receipt, paused: false };
}
