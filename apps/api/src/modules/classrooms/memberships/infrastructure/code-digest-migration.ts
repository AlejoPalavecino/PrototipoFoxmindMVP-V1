import { createHash } from 'node:crypto';
import type { Transaction } from '../../access/public.ts';
import { classroomCodeDigests, type ClassroomCodeKeys } from '../../../../platform/crypto/classroom-code-digest.ts';

/**
 * Replaces the unkeyed SHA-256 of every live classroom code by its HMAC (S7). The code itself does not change.
 * Revoked codes have no envelope and keep their old digest, which only prevents reissuing them.
 * A live code whose envelope does not open or does not match its digest is left as is and counted as skipped.
 */
export async function rehashClassroomCodes(tx: Transaction, keys: ClassroomCodeKeys & { deliveryKey: Buffer },
  decryptDelivery: (key: Buffer, envelope: string, aad: string) => { code?: unknown }) {
  const rows = await tx.query<{ id: string; classroom_id: string; code_digest: string; code_envelope: string | null }>(
    `SELECT id,classroom_id,code_digest,code_envelope FROM classroom_codes
     WHERE revoked_at IS NULL AND code_digest NOT LIKE 'h1:%' ORDER BY id FOR UPDATE`);
  let rehashed = 0, skipped = 0;
  for (const row of rows) {
    let code: unknown;
    try {
      code = row.code_envelope && decryptDelivery(keys.deliveryKey, row.code_envelope, `classroom-access:${row.classroom_id.toLowerCase()}`).code;
    } catch { code = undefined; }
    if (typeof code !== 'string' || createHash('sha256').update(code).digest('hex') !== row.code_digest) { skipped++; continue; }
    await tx.query('UPDATE classroom_codes SET code_digest=$2,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id',
      row.id, classroomCodeDigests(keys, code)[0]);
    rehashed++;
  }
  return { rehashed, skipped };
}
