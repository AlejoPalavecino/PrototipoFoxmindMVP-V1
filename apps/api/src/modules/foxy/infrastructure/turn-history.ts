import { isDeepStrictEqual } from 'node:util';
import { parseFoxyAnswer } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
import type { FoxyGroundingSnapshot } from '../../../../../../src/core/domain/foxy/grounding.ts';
import type { FoxyTurnLease } from './turn-queue.ts';

type Row = { sequence: number; state: string; message_text: string; answer: unknown; snapshot: FoxyGroundingSnapshot };
const redactIds = (value: string): string => value.replace(/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/giu, '[identificador]');
export interface FoxyHistoryPair { user: string; assistant: { title: string; markdown: string } }
export async function claimedHistory(tx: SqlTransaction, lease: FoxyTurnLease, sequence: number,
  snapshot: FoxyGroundingSnapshot, signal?: AbortSignal): Promise<FoxyHistoryPair[]> {
  signal?.throwIfAborted();
  const rows = await tx.query<Row>(`SELECT sequence,state,message_text,answer,snapshot FROM foxy_turns
    WHERE owner_id=$1::uuid AND conversation_id=$2::uuid AND sequence<$3
    ORDER BY sequence DESC LIMIT 10`, lease.ownerId, lease.conversationId, sequence);
  signal?.throwIfAborted();
  const result: FoxyHistoryPair[] = []; let expected = sequence - 1;
  for (const row of rows) {
    if (row.sequence !== expected-- || row.state !== 'READY'
      || !isDeepStrictEqual(row.snapshot, snapshot)
      || typeof row.message_text !== 'string' || !row.message_text.trim() || [...row.message_text].length > 5000) break;
    try {
      const answer = parseFoxyAnswer(row.answer);
      if ([...answer.markdown].length > 50000) break;
      const pair = { user: redactIds(row.message_text), assistant: { title: redactIds(answer.title), markdown: redactIds(answer.markdown) } };
      if (Buffer.byteLength(JSON.stringify([...result, pair]), 'utf8') > 262144) break;
      result.push(pair);
    } catch { break; }
  }
  return result.reverse();
}
