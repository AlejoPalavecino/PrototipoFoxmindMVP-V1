import { randomBytes, randomUUID } from 'node:crypto';
import type { Transaction } from './contracts.ts';
import { digest } from './policy.ts';

/** Call while holding the classroom write lock, or during initial publication. */
export async function newClassroomCode(tx: Transaction, classroomId: string) {
  const code = randomBytes(18).toString('base64url');
  await tx.query('UPDATE classroom_codes SET revoked_at=clock_timestamp(),updated_at=clock_timestamp() WHERE classroom_id=$1::uuid AND revoked_at IS NULL RETURNING id', classroomId);
  await tx.query(`INSERT INTO classroom_codes(id,updated_at,classroom_id,code_digest)
    VALUES($1::uuid,clock_timestamp(),$2::uuid,$3) RETURNING id`, randomUUID(), classroomId, digest(code));
  return code;
}
