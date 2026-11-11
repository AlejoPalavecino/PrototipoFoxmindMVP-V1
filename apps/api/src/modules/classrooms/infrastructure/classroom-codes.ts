import { randomInt, randomUUID } from 'node:crypto';
import type { Transaction } from './contracts.ts';
import { digest, fail } from './policy.ts';
import { encryptDelivery } from './delivery-envelope.ts';

export function normalizeClassroomCode(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 48) return;
  if (value.length === 24 && /^[\w-]{24}$/.test(value)) return value;
  const grouped = value.replace(/ /g, '');
  if (grouped.length === 6 && /^[0-9]{6}$/.test(grouped)) return grouped;
}

/** Call while holding the classroom write lock, or during initial publication. */
export async function newClassroomCode(tx: Transaction, classroomId: string, key: Buffer) {
  for (let attempt = 0; attempt < 16; attempt++) {
    const code = String(randomInt(1_000_000)).padStart(6, '0');
    // Reserve against the global digest index, including rows already revoked.
    const [reserved] = await tx.query<{ id: string }>(`INSERT INTO classroom_codes
      (id,updated_at,classroom_id,code_digest,revoked_at)
      VALUES ($1::uuid,clock_timestamp(),$2::uuid,$3,clock_timestamp())
      ON CONFLICT (code_digest) DO NOTHING RETURNING id`, randomUUID(), classroomId, digest(code));
    if (!reserved) continue;
    await tx.query(`UPDATE classroom_codes SET revoked_at=clock_timestamp(),code_envelope=NULL,updated_at=clock_timestamp()
      WHERE classroom_id=$1::uuid AND revoked_at IS NULL RETURNING id`, classroomId);
    const envelope = encryptDelivery(key, { code }, `classroom-access:${classroomId.toLowerCase()}`);
    await tx.query(`UPDATE classroom_codes SET revoked_at=NULL,code_envelope=$2,updated_at=clock_timestamp()
      WHERE id=$1::uuid RETURNING id`, reserved.id, envelope);
    return code;
  }
  return fail('SERVICE_UNAVAILABLE');
}
