import { isDeepStrictEqual } from 'node:util';
import type { SqlDatabase, SqlTransaction } from '../../../../src/core/domain/index.ts';
import type { FoxyPublicationLease } from './publication-queue.ts';

type Snapshot = { title: string; markdown: string };
type State = { lease: FoxyPublicationLease; snapshot: Snapshot; signal: AbortSignal; closed: boolean };
type FileGrant = { state: State; file: FileDescriptor };
type FileDescriptor = { fileId: string; digest: string; sizeBytes: number; pageCount: number; rendererVersion: string };
type Row = { snapshot_title: string; snapshot_markdown: string; file_id: string | null; artifact_digest: string | null;
  artifact_size_bytes: number | null; artifact_page_count: number | null; renderer_version: string | null };
function forbidden(): never { throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }); }
function fileDescriptor(row: Row): FileDescriptor {
  if (!row.file_id || !row.artifact_digest || !row.artifact_size_bytes || !row.artifact_page_count || !row.renderer_version) return forbidden();
  return { fileId: row.file_id, digest: row.artifact_digest, sizeBytes: row.artifact_size_bytes,
    pageCount: row.artifact_page_count, rendererVersion: row.renderer_version };
}
async function check(tx: SqlTransaction, lease: FoxyPublicationLease): Promise<Row> {
  const [row] = await tx.query<Row>(`SELECT p.snapshot_title,p.snapshot_markdown,p.file_id,p.artifact_digest,p.artifact_size_bytes,
    p.artifact_page_count,p.renderer_version FROM foxy_publications p
    JOIN users u ON u.id=p.owner_id AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL
    JOIN classrooms a ON a.id=p.classroom_id AND a.teacher_id=p.owner_id AND a.archived_at IS NULL
    JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id AND r.revision=p.resource_revision
    JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id AND c.deleted_at IS NULL
    WHERE p.id=$1::uuid AND p.owner_id=$2::uuid AND p.classroom_id=$3::uuid AND p.lease_nonce=$4::uuid
    AND p.state='PREPARING' AND p.lease_until>clock_timestamp()
    AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms source WHERE source.id=c.classroom_id AND source.teacher_id=p.owner_id))`,
  lease.publicationId, lease.ownerId, lease.classroomId, lease.leaseNonce);
  if (!row) return forbidden();
  return row;
}
export function createFoxyPublicationAuthority(options: { database: SqlDatabase }) {
  const claims = new WeakMap<object, State>(), files = new WeakMap<object, FileGrant>(), scopes = new WeakMap<object, State>();
  const transact = <T>(fn: (tx: SqlTransaction) => Promise<T>) => options.database.$transaction(
    raw => fn({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }), { maxWait: 2000, timeout: 6000 });
  async function verify(state: State, signal: AbortSignal, tx?: SqlTransaction): Promise<Row> {
    if (state.closed || state.signal.aborted || signal.aborted || signal !== state.signal) return forbidden();
    const row = tx ? await check(tx, state.lease) : await transact(active => check(active, state.lease));
    if (state.closed || signal.aborted || !isDeepStrictEqual(state.snapshot, { title: row.snapshot_title, markdown: row.snapshot_markdown })) return forbidden();
    return row;
  }
  async function verifyFile(state: State, signal: AbortSignal, tx?: SqlTransaction): Promise<FileDescriptor> {
    const run = async (active: SqlTransaction) => {
      const file = fileDescriptor(await verify(state, signal, active));
      const [row] = await active.query(`SELECT f.id FROM files f JOIN uploads u ON u.file_id=f.id
        JOIN file_custodies c ON c.file_id=f.id AND c.purpose='material' AND c.target_id IS NULL
        WHERE f.id=$1::uuid AND f.classroom_id=$2::uuid AND f.uploaded_by_id=$3::uuid
        AND f.extension='pdf' AND f.size_bytes=$4`, file.fileId, state.lease.classroomId, state.lease.ownerId, file.sizeBytes);
      if (!row || state.closed || signal.aborted) return forbidden();
      return file;
    };
    return tx ? run(tx) : transact(run);
  }
  return {
    async open(lease: FoxyPublicationLease, signal: AbortSignal) {
      if (!lease || signal.aborted) return forbidden();
      const copy = { publicationId: lease.publicationId, ownerId: lease.ownerId, classroomId: lease.classroomId, leaseNonce: lease.leaseNonce };
      const row = await transact(tx => check(tx, copy));
      if (signal.aborted) return forbidden();
      const state: State = { lease: copy, snapshot: { title: row.snapshot_title, markdown: row.snapshot_markdown }, signal, closed: false };
      const capability = Object.freeze({}), scope = { capability, snapshot: { ...state.snapshot } };
      claims.set(capability, state); scopes.set(scope, state); return scope;
    },
    async authorize(capability: object, signal: AbortSignal, tx?: SqlTransaction) {
      const state = capability && claims.get(capability); if (!state) return forbidden();
      await verify(state, signal, tx); return { ...state.lease, snapshot: { ...state.snapshot } };
    },
    async existingFile(capability: object, signal: AbortSignal, tx?: SqlTransaction) {
      const state = capability && claims.get(capability); if (!state) return forbidden();
      const inspect = async (active: SqlTransaction) => {
        const row = await verify(state, signal, active);
        if (row.file_id === null) return null;
        const descriptor = await verifyFile(state, signal, active), fileCapability = Object.freeze({});
        files.set(fileCapability, { state, file: { ...descriptor } });
        return { capability: fileCapability, descriptor: { ...descriptor } };
      };
      return tx ? inspect(tx) : transact(inspect);
    },
    async createFileCapability(capability: object, signal: AbortSignal, tx?: SqlTransaction) {
      const state = capability && claims.get(capability); if (!state) return forbidden();
      const descriptor = await verifyFile(state, signal, tx);
      const fileCapability = Object.freeze({}); files.set(fileCapability, { state, file: { ...descriptor } });
      return { capability: fileCapability, descriptor: { ...descriptor } };
    },
    async authorizeFile(capability: object, signal: AbortSignal, tx?: SqlTransaction) {
      const grant = capability && files.get(capability); if (!grant) return forbidden();
      const current = await verifyFile(grant.state, signal, tx);
      if (!isDeepStrictEqual(current, grant.file)) return forbidden();
      return { ...grant.state.lease, ...current };
    },
    close(scope: object): void { const state = scope && scopes.get(scope); if (state) state.closed = true; },
  };
}
