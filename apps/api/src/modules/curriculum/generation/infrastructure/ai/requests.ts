import { createHash } from 'node:crypto';
import { requestPayload, replayedExtraction } from '../../application/request-policy.ts';
import type { Transaction } from '../../../../classrooms/public.ts';

export function inputHash(operation: string, draftId: string, id: string, input: unknown): string {
  return createHash('sha256').update(requestPayload(operation, draftId, id, input)).digest('hex');
}
export async function replay(tx: Transaction, ownerId: string, requestId: string, hash: string): Promise<string | null> {
  await tx.query('SELECT 1 FROM pg_advisory_xact_lock(hashtextextended($1,0))', `${ownerId}:${requestId}`);
  const [row] = await tx.query<{ input_hash: string; extraction_id: string }>(
    'SELECT input_hash,extraction_id FROM classroom_ai_requests WHERE owner_id=$1::uuid AND request_id=$2::uuid', ownerId, requestId);
  return replayedExtraction(row, hash);
}
export async function recordRequest(tx: Transaction, ownerId: string, requestId: string,
  operation: string, hash: string, extractionId: string): Promise<void> {
  await tx.query(`INSERT INTO classroom_ai_requests(owner_id,request_id,operation,input_hash,extraction_id)
    VALUES($1::uuid,$2::uuid,$3,$4,$5::uuid) RETURNING request_id`, ownerId, requestId, operation, hash, extractionId);
}
