import type { Transaction } from './contracts.ts';
import { fail } from './policy.ts';

export function revision(value: unknown): string {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,17})$/.test(value)) return fail('INVALID_INPUT');
  return value;
}

export async function advanceClassroomRevision(tx: Transaction, classroomId: string, current: bigint) {
  await tx.query('UPDATE classrooms SET revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id', classroomId);
  return { revision: (current + 1n).toString() };
}
