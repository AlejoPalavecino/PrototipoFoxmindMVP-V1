import { createHash } from 'node:crypto';
import { fail } from '../../../classrooms/public.ts';
import type { Transaction } from '../../../classrooms/public.ts';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}
export function inputHash(operation: string, classroomId: string, id: string | null, body: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical({ operation, classroomId, id, body }))).digest('hex');
}
export async function replay(tx: Transaction, ownerId: string, requestId: string, hash: string): Promise<string | null> {
  const [row] = await tx.query<{ input_hash: string; generation_id: string }>('SELECT * FROM activity_ai_requests WHERE owner_id=$1::uuid AND request_id=$2::uuid', ownerId, requestId);
  if (!row) return null;
  if (row.input_hash !== hash) return fail('CONFLICT');
  return row.generation_id;
}
export async function recordRequest(tx: Transaction, ownerId: string, requestId: string, operation: string, hash: string, generationId: string) {
  await tx.query(`INSERT INTO activity_ai_requests(owner_id,request_id,operation,input_hash,generation_id)
    VALUES($1::uuid,$2::uuid,$3,$4,$5::uuid) RETURNING generation_id`, ownerId, requestId, operation, hash, generationId);
}
