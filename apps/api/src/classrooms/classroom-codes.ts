import { randomBytes, randomUUID } from 'node:crypto';
import type { Transaction } from './contracts.ts';
import { digest } from './policy.ts';
import { encryptDelivery } from './delivery-envelope.ts';

/** Call while holding the classroom write lock, or during initial publication. */
export async function newClassroomCode(tx: Transaction, classroomId: string, key:Buffer) {
  const code = randomBytes(18).toString('base64url');
  await tx.query('UPDATE classroom_codes SET revoked_at=clock_timestamp(),code_envelope=NULL,updated_at=clock_timestamp() WHERE classroom_id=$1::uuid AND revoked_at IS NULL RETURNING id', classroomId);
  const envelope=encryptDelivery(key,{code},`classroom-access:${classroomId.toLowerCase()}`);
  await tx.query(`INSERT INTO classroom_codes(id,updated_at,classroom_id,code_digest,code_envelope)
    VALUES($1::uuid,clock_timestamp(),$2::uuid,$3,$4) RETURNING id`, randomUUID(), classroomId, digest(code),envelope);
  return code;
}
