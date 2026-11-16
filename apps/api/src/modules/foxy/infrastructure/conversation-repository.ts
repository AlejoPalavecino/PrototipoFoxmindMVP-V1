import { catalogFilters } from './catalog-input.ts';
import { randomUUID } from 'node:crypto';
import { parseCreateFoxyConversation, type CreateFoxyConversation, type FoxyContext } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
import { carryFoxyAttachments } from './conversation-attachment-carry.ts';

type Row = { id: string; title: string; context_kind: 'GENERAL' | 'CLASSROOM'; classroom_id: string | null; revision: bigint };
export type FoxyConversation = { id: string; title: string; context: FoxyContext; revision: string };
class RepositoryError extends Error {
  readonly code: 'NOT_FOUND' | 'CONFLICT' | 'INVALID_INPUT';
  constructor(code: 'NOT_FOUND' | 'CONFLICT' | 'INVALID_INPUT') { super(code); this.code = code; }
}
function activityUuid(value: string): void {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(value)) throw new RepositoryError('INVALID_INPUT');
}
function activityRevision(value: string): void {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/u.test(value) || value.length > 19
    || BigInt(value) > 9223372036854775807n) throw new RepositoryError('INVALID_INPUT');
}
const columns = 'c.id,c.title,c.context_kind,c.classroom_id,c.revision';
const visible = `c.owner_id=$1::uuid AND c.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM users u WHERE u.id=c.owner_id AND u.account_role='teacher')
  AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms r WHERE r.id=c.classroom_id AND r.teacher_id=c.owner_id))`;
function fromRow(row: Row): FoxyConversation {
  if (row.context_kind === 'CLASSROOM' && !row.classroom_id) throw new RepositoryError('INVALID_INPUT');
  return { id: row.id, title: row.title, revision: String(row.revision),
    context: row.context_kind === 'GENERAL' ? { kind: 'GENERAL' } : { kind: 'CLASSROOM', classroomId: row.classroom_id! } };
}
function validateTitle(title: string): string {
  return parseCreateFoxyConversation({ requestId: '00000000-0000-0000-0000-000000000000', title, context: { kind: 'GENERAL' } }).title;
}
async function lockOwner(tx: SqlTransaction, owner: string): Promise<void> {
  const rows = await tx.query('SELECT id FROM users WHERE id=$1::uuid AND account_role=\'teacher\' FOR UPDATE', owner);
  if (!rows.length) throw new RepositoryError('NOT_FOUND');
}
async function lockConversation(tx: SqlTransaction, owner: string, id: string, revision: string): Promise<void> {
  const [row] = await tx.query<Row>(`SELECT ${columns} FROM foxy_conversations c WHERE ${visible} AND c.id=$2::uuid FOR UPDATE`, owner, id);
  if (!row) throw new RepositoryError('NOT_FOUND');
  if (String(row.revision) !== revision) throw new RepositoryError('CONFLICT');
}
export function createFoxyConversationRepository() {
  return {
    async create(tx: SqlTransaction, owner: string, input: CreateFoxyConversation, hash: string) {
      const request = parseCreateFoxyConversation(input); activityUuid(owner);
      if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/u.test(hash)) throw new RepositoryError('INVALID_INPUT');
      await lockOwner(tx, owner);
      const [previous] = await tx.query<{ input_hash: string; conversation_id: string }>(
        'SELECT input_hash,conversation_id FROM foxy_conversation_requests WHERE owner_id=$1::uuid AND request_id=$2::uuid', owner, request.requestId);
      if (previous) {
        if (previous.input_hash !== hash) throw new RepositoryError('CONFLICT');
        const existing = await this.get(tx, owner, previous.conversation_id);
        if (!existing) throw new RepositoryError('CONFLICT');
        if (existing.context.kind === 'CLASSROOM' && !(await tx.query(
          'SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid FOR SHARE', existing.context.classroomId, owner)).length)
          throw new RepositoryError('NOT_FOUND');
        return { created: false, conversation: existing };
      }
      const classroomId = request.context.kind === 'CLASSROOM' ? request.context.classroomId : null;
      if (classroomId && !(await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid AND archived_at IS NULL FOR SHARE', classroomId, owner)).length)
        throw new RepositoryError('NOT_FOUND');
      const id = randomUUID();
      const [row] = await tx.query<Row>(`INSERT INTO foxy_conversations AS c(id,owner_id,title,context_kind,classroom_id)
        VALUES($1::uuid,$2::uuid,$3,$4,$5::uuid) RETURNING ${columns}`, id, owner, request.title, request.context.kind, classroomId);
      if (request.carryAttachments) await carryFoxyAttachments(tx, owner, id, request.carryAttachments);
      await tx.query(`INSERT INTO foxy_conversation_requests(owner_id,request_id,input_hash,conversation_id)
        VALUES($1::uuid,$2::uuid,$3,$4::uuid)`, owner, request.requestId, hash, id);
      if (!row) throw new RepositoryError('CONFLICT');
      return { created: true, conversation: fromRow(row) };
    },
    async get(tx: SqlTransaction, owner: string, id: string) {
      activityUuid(owner); activityUuid(id);
      const [row] = await tx.query<Row>(`SELECT ${columns} FROM foxy_conversations c WHERE ${visible} AND c.id=$2::uuid`, owner, id);
      return row ? fromRow(row) : null;
    },
    async list(tx: SqlTransaction, owner: string, options: { limit: number }) {
      activityUuid(owner);
      if (!Number.isSafeInteger(options?.limit) || options.limit < 1 || options.limit > 100) throw new RepositoryError('INVALID_INPUT');
      const rows = await tx.query<Row>(`SELECT ${columns} FROM foxy_conversations c WHERE ${visible}
        ORDER BY c.updated_at DESC,c.id DESC LIMIT $2`, owner, options.limit);
      return rows.map(fromRow);
    },
    async listPage(tx: SqlTransaction, owner: string, options: { limit: number; after: { updatedAt: string; id: string } | null; q?: string; context?: string }) {
      activityUuid(owner);
      if (!Number.isSafeInteger(options?.limit) || options.limit < 1 || options.limit > 100) throw new RepositoryError('INVALID_INPUT');
      const filters = catalogFilters(options);
      const rows = await tx.query<Row & { updated_at: Date }>(`SELECT ${columns},c.updated_at FROM foxy_conversations c WHERE ${visible}
        AND ($2::timestamptz IS NULL OR (date_trunc('milliseconds',c.updated_at),c.id)<($2::timestamptz,$3::uuid))
        AND strpos(lower(c.title),lower($5))>0
        AND ($6='ALL' OR ($6='GENERAL' AND c.context_kind='GENERAL') OR c.classroom_id::text=$6)
        ORDER BY date_trunc('milliseconds',c.updated_at) DESC,c.id DESC LIMIT $4`, owner,
      options.after?.updatedAt ?? null, options.after?.id ?? null, options.limit + 1, filters.q, filters.context);
      const last = rows[options.limit - 1];
      return { items: rows.slice(0, options.limit).map(fromRow),
        next: rows.length > options.limit && last ? { updatedAt: last.updated_at.toISOString(), id: last.id } : null };
    },
    async rename(tx: SqlTransaction, owner: string, id: string, revision: string, title: string) {
      activityUuid(owner); activityUuid(id); activityRevision(revision); validateTitle(title);
      await lockConversation(tx, owner, id, revision);
      await tx.query('UPDATE foxy_conversations SET title=$3,revision=revision+1,updated_at=clock_timestamp() WHERE owner_id=$1::uuid AND id=$2::uuid', owner, id, title);
    },
    async remove(tx: SqlTransaction, owner: string, id: string, revision: string) {
      activityUuid(owner); activityUuid(id); activityRevision(revision);
      await lockConversation(tx, owner, id, revision);
      await tx.query('UPDATE foxy_conversations SET deleted_at=clock_timestamp(),revision=revision+1,updated_at=clock_timestamp() WHERE owner_id=$1::uuid AND id=$2::uuid', owner, id);
    },
  };
}
