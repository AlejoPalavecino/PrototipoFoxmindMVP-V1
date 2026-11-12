import { randomUUID } from 'node:crypto';
import { parseFoxyAnswer, parseSendFoxyMessage, type FoxyContext, type SendFoxyMessage } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
import type { FoxyGroundingSnapshot } from '../../../../../../src/core/domain/foxy/grounding.ts';

type Metadata = { model: string; promptVersion: string; schemaVersion: string };
type ConversationRow = { id: string; revision: bigint; context_kind: 'GENERAL' | 'CLASSROOM'; classroom_id: string | null };
type TurnRow = { id: string; sequence: number; state: string; input_hash: string; conversation_revision: bigint; conversation_id: string };
type Page = { afterSequence: number; limit: number };
type ReadRow = { id: string; sequence: number; state: string; purpose: string; message_text: string;
  answer: unknown; error_code: string | null; created_at: Date; source_report: unknown };
type Citation = { sourceId: string; documentKey: string | null; page: number | null };
const readColumns = 't.id,t.sequence,t.state,t.purpose,t.message_text,t.answer,t.error_code,t.created_at,t.source_report';
function citations(value: unknown): Citation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== 'object' || !Array.isArray(item.citations)) return [];
    return item.citations.flatMap((citation: unknown) => {
      if (!citation || typeof citation !== 'object') return [];
      const c = citation as Record<string, unknown>;
      if (typeof c.sourceId !== 'string' || !/^(plan|material|activity|attachment):[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(c.sourceId)
        || (c.documentKey !== null && (typeof c.documentKey !== 'string' || !/^d[1-9][0-9]*$/u.test(c.documentKey)))
        || (c.page !== null && (typeof c.page !== 'number' || !Number.isSafeInteger(c.page) || c.page < 1))
        || (c.documentKey === null && c.page !== null)) return [];
      return [{ sourceId: c.sourceId, documentKey: c.documentKey as string | null, page: c.page as number | null }];
    });
  });
}
function readView(row: ReadRow) {
  return { id: row.id, sequence: row.sequence, state: row.state, purpose: row.purpose, message: row.message_text,
    answer: row.state === 'READY' ? parseFoxyAnswer(row.answer) : null,
    errorCode: row.state === 'FAILED' && typeof row.error_code === 'string' && /^[A-Z][A-Z0-9_]{1,79}$/u.test(row.error_code) ? row.error_code : null,
    createdAt: row.created_at.toISOString(), citations: row.state === 'READY' ? citations(row.source_report) : [] };
}

function fail(code: 'INVALID_INPUT' | 'NOT_FOUND' | 'CONFLICT'): never { throw Object.assign(new Error(code), { code }); }
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(value)) return fail('INVALID_INPUT');
  return value;
}
function context(row: ConversationRow): FoxyContext {
  if (row.context_kind === 'GENERAL' && row.classroom_id === null) return { kind: 'GENERAL' };
  if (row.context_kind === 'CLASSROOM' && row.classroom_id) return { kind: 'CLASSROOM', classroomId: row.classroom_id };
  return fail('INVALID_INPUT');
}
function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => typeof b[index] === 'string' && item.toLowerCase() === b[index]!.toLowerCase());
}
function validateSnapshot(snapshot: FoxyGroundingSnapshot, expected: FoxyContext, input: SendFoxyMessage): void {
  if (!snapshot || !snapshot.context || !Array.isArray(snapshot.sources) || snapshot.context.kind !== expected.kind) return fail('INVALID_INPUT');
  if (expected.kind === 'GENERAL') {
    if (snapshot.curriculum !== null || snapshot.sources.length || input.selection.topicIds.length || input.selection.sourceIds.length) return fail('INVALID_INPUT');
  } else if (snapshot.context.kind !== 'CLASSROOM' || snapshot.context.classroomId.toLowerCase() !== expected.classroomId.toLowerCase()
    || !snapshot.curriculum || !Array.isArray(snapshot.curriculum.selectedTopicIds)
    || !sameIds(input.selection.topicIds, snapshot.curriculum.selectedTopicIds)) return fail('INVALID_INPUT');
  if (!sameIds(input.selection.sourceIds, snapshot.sources.map(source => source.sourceId))) return fail('INVALID_INPUT');
}
function view(row: TurnRow) { return { id: row.id, sequence: row.sequence, state: row.state }; }
async function lock(tx: SqlTransaction, owner: string, conversationId: string): Promise<ConversationRow> {
  const [row] = await tx.query<ConversationRow>(`SELECT c.id,c.revision,c.context_kind,c.classroom_id FROM foxy_conversations c
    WHERE c.owner_id=$1::uuid AND c.id=$2::uuid AND c.deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM users u WHERE u.id=c.owner_id AND u.account_role='teacher')
    AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms r WHERE r.id=c.classroom_id AND r.teacher_id=c.owner_id)) FOR UPDATE`, owner, conversationId);
  if (!row) return fail('NOT_FOUND');
  return row;
}
function validateMeta(hash: string, metadata: Metadata): void {
  if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/u.test(hash) || !metadata
    || [metadata.model, metadata.promptVersion, metadata.schemaVersion].some(v => typeof v !== 'string' || !v.trim() || v.length > 200)) fail('INVALID_INPUT');
}
async function find(tx: SqlTransaction, owner: string, requestId: string): Promise<TurnRow | undefined> {
  const [row] = await tx.query<TurnRow>('SELECT * FROM foxy_turns WHERE owner_id=$1::uuid AND request_id=$2::uuid', owner, requestId);
  return row;
}
export function createFoxyTurnRepository() {
  return {
    async replay(tx: SqlTransaction, owner: string, conversationId: string, requestId: string, hash: string) {
      id(owner); id(conversationId); id(requestId);
      if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/u.test(hash)) return fail('INVALID_INPUT');
      const previous = await find(tx, owner, requestId);
      if (!previous) return null;
      if (previous.input_hash !== hash || previous.conversation_id.toLowerCase() !== conversationId.toLowerCase()) return fail('CONFLICT');
      return { created: false, turn: view(previous), conversationRevision: String(previous.conversation_revision) };
    },
    async enqueue(tx: SqlTransaction, owner: string, conversationId: string, input: SendFoxyMessage,
      snapshot: FoxyGroundingSnapshot, hash: string, metadata: Metadata) {
      id(owner); id(conversationId); validateMeta(hash, metadata);
      if (!(await tx.query("SELECT id FROM users WHERE id=$1::uuid AND account_role='teacher' FOR UPDATE", owner)).length) return fail('NOT_FOUND');
      const row = await lock(tx, owner, conversationId), request = parseSendFoxyMessage(input, context(row));
      const previous = await find(tx, owner, request.requestId);
      if (previous) {
        if (previous.input_hash !== hash || previous.conversation_id.toLowerCase() !== conversationId.toLowerCase()) return fail('CONFLICT');
        return { created: false, turn: view(previous), conversationRevision: String(previous.conversation_revision) };
      }
      if (String(row.revision) !== request.revision) return fail('CONFLICT');
      validateSnapshot(snapshot, context(row), request);
      const active = await tx.query("SELECT id FROM foxy_turns WHERE conversation_id=$1::uuid AND state IN ('QUEUED','RUNNING')", conversationId);
      if (active.length) return fail('CONFLICT');
      const [next] = await tx.query<{ sequence: number }>('SELECT COALESCE(MAX(sequence),0)+1 AS sequence FROM foxy_turns WHERE conversation_id=$1::uuid', conversationId);
      if (!next) return fail('CONFLICT');
      const revision = String(BigInt(row.revision) + 1n), turnId = randomUUID();
      const [turn] = await tx.query<TurnRow>(`INSERT INTO foxy_turns(id,owner_id,conversation_id,request_id,input_hash,sequence,purpose,message_text,snapshot,metadata,conversation_revision)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::bigint) RETURNING *`,
        turnId, owner, conversationId, request.requestId, hash, next.sequence, request.purpose, request.text, JSON.stringify(snapshot), JSON.stringify(metadata), revision);
      await tx.query('UPDATE foxy_conversations SET revision=$3::bigint,updated_at=clock_timestamp() WHERE owner_id=$1::uuid AND id=$2::uuid', owner, conversationId, revision);
      if (!turn) return fail('CONFLICT');
      return { created: true, turn: view(turn), conversationRevision: revision };
    },
    async get(tx: SqlTransaction, owner: string, conversationId: string, turnId: string) {
      id(owner); id(conversationId); id(turnId);
      const [row] = await tx.query<ReadRow>(`SELECT ${readColumns} FROM foxy_turns t JOIN foxy_conversations c ON c.id=t.conversation_id AND c.owner_id=t.owner_id
        WHERE t.owner_id=$1::uuid AND t.conversation_id=$2::uuid AND t.id=$3::uuid AND c.deleted_at IS NULL
        AND EXISTS (SELECT 1 FROM users u WHERE u.id=c.owner_id AND u.account_role='teacher')
        AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms r WHERE r.id=c.classroom_id AND r.teacher_id=c.owner_id))`, owner, conversationId, turnId);
      return row ? readView(row) : null;
    },
    async list(tx: SqlTransaction, owner: string, conversationId: string, page: Page) {
      id(owner); id(conversationId);
      if (!page || !Number.isSafeInteger(page.afterSequence) || page.afterSequence < 0 || !Number.isSafeInteger(page.limit) || page.limit < 1 || page.limit > 101) return fail('INVALID_INPUT');
      const rows = await tx.query<ReadRow>(`SELECT ${readColumns} FROM foxy_turns t JOIN foxy_conversations c ON c.id=t.conversation_id AND c.owner_id=t.owner_id
        WHERE t.owner_id=$1::uuid AND t.conversation_id=$2::uuid AND t.sequence>$3 AND c.deleted_at IS NULL
        AND EXISTS (SELECT 1 FROM users u WHERE u.id=c.owner_id AND u.account_role='teacher')
        AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms r WHERE r.id=c.classroom_id AND r.teacher_id=c.owner_id))
        ORDER BY t.sequence LIMIT $4`, owner, conversationId, page.afterSequence, page.limit);
      return rows.map(readView);
    },
  };
}
