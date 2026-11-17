import { createHash } from 'node:crypto';
import { requestPayload, replayedGeneration } from '../../application/request-policy.ts';
import type { Transaction } from '../../../../classrooms/public.ts';

export function inputHash(operation: string, classroomId: string, id: string | null, body: unknown): string {
  return createHash('sha256').update(requestPayload(operation, classroomId, id, body)).digest('hex');
}
export async function replay(tx: Transaction, ownerId: string, requestId: string, hash: string): Promise<string | null> {
  const [row] = await tx.query<{ input_hash: string; generation_id: string }>('SELECT * FROM activity_ai_requests WHERE owner_id=$1::uuid AND request_id=$2::uuid', ownerId, requestId);
  return replayedGeneration(row, hash);
}
export async function recordRequest(tx: Transaction, ownerId: string, requestId: string, operation: string, hash: string, generationId: string) {
  await tx.query(`INSERT INTO activity_ai_requests(owner_id,request_id,operation,input_hash,generation_id)
    VALUES($1::uuid,$2::uuid,$3,$4,$5::uuid) RETURNING generation_id`, ownerId, requestId, operation, hash, generationId);
}
