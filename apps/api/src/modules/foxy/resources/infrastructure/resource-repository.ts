import { createHash, randomUUID } from 'node:crypto';
import { assertResourceIdentifiers as ids, resourceEditCommand, assertResourceTurnReady, resourceTurnContent, resourceEditIdentity, resourceEditReplay } from '../application/editorial-policy.ts';
import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';

type Row = { id: string; owner_id: string; conversation_id: string; source_turn_id: string; title: string; markdown: string; revision: bigint };
function fail(code: 'NOT_FOUND' | 'CONFLICT' | 'INVALID_INPUT'): never { throw Object.assign(new Error(code), { code }); }
function view(row: Row) { return { id: row.id, conversationId: row.conversation_id, sourceTurnId: row.source_turn_id,
  title: row.title, markdown: row.markdown, revision: String(row.revision) }; }
async function lockOwner(tx: SqlTransaction, owner: string): Promise<void> {
  if (!(await tx.query("SELECT id FROM users WHERE id=$1::uuid AND account_role='teacher' FOR UPDATE", owner)).length) fail('NOT_FOUND');
}
const visible = `r.owner_id=$1::uuid AND c.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM users u WHERE u.id=c.owner_id AND u.account_role='teacher')
  AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms a WHERE a.id=c.classroom_id AND a.teacher_id=c.owner_id))`;
async function read(tx: SqlTransaction, owner: string, id: string, lock = false): Promise<Row | null> {
  const [row] = await tx.query<Row>(`SELECT r.* FROM foxy_resources r JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id
    WHERE ${visible} AND r.id=$2::uuid ${lock ? 'FOR UPDATE OF r' : ''}`, owner, id);
  return row ?? null;
}
export function createFoxyResourceRepository() {
  return {
    async get(tx: SqlTransaction, owner: string, id: string) { ids(owner, id); const row = await read(tx, owner, id); return row ? view(row) : null; },
    async fromTurn(tx: SqlTransaction, owner: string, conversationId: string, turnId: string) {
      ids(owner, conversationId, turnId); await lockOwner(tx, owner);
      const [turn] = await tx.query<{ state: string; answer: unknown }>(`SELECT t.state,t.answer FROM foxy_turns t
        JOIN foxy_conversations c ON c.id=t.conversation_id AND c.owner_id=t.owner_id
        WHERE t.owner_id=$1::uuid AND t.conversation_id=$2::uuid AND t.id=$3::uuid AND c.deleted_at IS NULL
        AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms a WHERE a.id=c.classroom_id AND a.teacher_id=c.owner_id)) FOR SHARE OF c,t`, owner, conversationId, turnId);
      if (!turn) return fail('NOT_FOUND');
      assertResourceTurnReady(turn.state);
      const [existing] = await tx.query<Row>('SELECT * FROM foxy_resources WHERE source_turn_id=$1::uuid', turnId);
      if (existing) return { created: false, resource: view(existing) };
      const answer = resourceTurnContent(turn.answer);
      const [row] = await tx.query<Row>(`INSERT INTO foxy_resources(id,owner_id,conversation_id,source_turn_id,title,markdown)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6) RETURNING *`, randomUUID(), owner, conversationId, turnId, answer.title, answer.markdown);
      if (!row) return fail('CONFLICT');
      return { created: true, resource: view(row) };
    },
    async edit(tx: SqlTransaction, owner: string, id: string, input: unknown) {
      ids(owner, id); const value = resourceEditCommand(input); await lockOwner(tx, owner);
      const hash = createHash('sha256').update(resourceEditIdentity(id, value)).digest('hex');
      const row = await read(tx, owner, id, true); if (!row) return fail('NOT_FOUND');
      const [prior] = await tx.query<{ input_hash: string; result: ReturnType<typeof view> }>('SELECT input_hash,result FROM foxy_resource_requests WHERE owner_id=$1::uuid AND request_id=$2::uuid', owner, value.requestId);
      const replay = resourceEditReplay(row.revision, prior, hash, value.revision);
      if (replay) return { edited: false, resource: replay.resource };
      const [updated] = await tx.query<Row>(`UPDATE foxy_resources SET title=$3,markdown=$4,revision=revision+1,updated_at=clock_timestamp()
        WHERE owner_id=$1::uuid AND id=$2::uuid RETURNING *`, owner, id, value.title, value.markdown);
      if (!updated) return fail('CONFLICT');
      const resource = view(updated);
      await tx.query(`INSERT INTO foxy_resource_requests(owner_id,request_id,resource_id,input_hash,result)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5::jsonb)`, owner, value.requestId, id, hash, JSON.stringify(resource));
      return { edited: true, resource };
    },
  };
}
