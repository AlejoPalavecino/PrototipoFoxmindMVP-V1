import { randomInt, randomUUID } from 'node:crypto';
import type { Transaction } from '../../access/public.ts';
import { fail } from '../../domain/policy.ts';
import { CLASSROOM_CODE_ALPHABET, CLASSROOM_CODE_LENGTH } from '../../../../../../../src/core/domain/classrooms/access-code.ts';

/** randomInt evita el sesgo de módulo; cada carácter se sortea de forma independiente. */
export function generateClassroomCode(): string {
  let code = '';
  for (let index = 0; index < CLASSROOM_CODE_LENGTH; index++) code += CLASSROOM_CODE_ALPHABET[randomInt(CLASSROOM_CODE_ALPHABET.length)];
  return code;
}



/** Call while holding the classroom write lock, or during initial publication. */
export async function newClassroomCode(tx: Transaction, classroomId: string, key: Buffer, digest: (text: string) => string, encryptDelivery: (key: Buffer, value: { code: string }, aad: string) => string) {
  for (let attempt = 0; attempt < 16; attempt++) {
    const code = generateClassroomCode();
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
