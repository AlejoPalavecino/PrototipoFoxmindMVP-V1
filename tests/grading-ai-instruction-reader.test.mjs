import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { FileService } from '../apps/api/src/files/service.ts';

const create = async opts => (await import('../apps/api/src/files/durable-grading-ai-instruction-reader.ts')).createDurableGradingAiInstructionReader(opts);
const ownerId = '11111111-1111-4111-8111-111111111111', classroomId = '22222222-2222-4222-8222-222222222222';
const attemptId = '33333333-3333-4333-8333-333333333333', fileId = '44444444-4444-4444-8444-444444444444';
const activityId = '55555555-5555-4555-8555-555555555555';
const bytes = Buffer.from('consigna sintética');
const digest = createHash('sha256').update(bytes).digest('hex');
const grant = { ownerId, classroomId, activityId, attemptId, fileId, digest };
const signal = () => new AbortController().signal;
function fixture() {
  const state = { linked: true, allowed: true, reads: 0, parses: 0, contents: bytes,
    row: { id: fileId, classroom_id: classroomId, classroom_draft_id: null, uploaded_by_id: ownerId,
      original_name: 'consigna.pdf', extension: 'pdf', detected_mime_type: 'application/pdf', storage_key: 'private', size_bytes: BigInt(bytes.length),
      validation_status: 'APPROVED', scan_status: 'CLEAN', upload_status: 'COMPLETED', phase: 'ready', purpose: 'instructions',
      target_id: activityId, digest, validated_digest: digest, scanned_digest: digest, blob_deleted_at: null } };
  const database = { $transaction: async fn => fn({ $queryRawUnsafe: async (sql, ...args) => {
    if (sql.includes('activity_instruction_files')) return state.linked && args.includes(activityId) && args.includes(fileId)
      ? [{ file_id: fileId, id: fileId, activity_id: activityId, classroom_id: classroomId }] : [];
    if (sql.includes('FROM files f')) return args.includes(fileId) ? [{ ...state.row }] : [];
    if (sql.includes('FROM users')) return [{ email_verified_at: new Date('2026-01-01') }];
    if (sql.includes('FROM classrooms')) return [{ storage_quota_bytes: 1000000n, teacher_id: ownerId, archived_at: null }];
    if (sql.includes('FROM attempts')) return args.includes(attemptId) && args.includes(activityId) ? [{ id: attemptId, activity_id: activityId }] : [];
    throw new Error('consulta no prevista');
  } }) };
  const files = new FileService({ database, draftQuotaBytes: 1000000n,
    access: { authenticate: async () => { throw new Error('No se debe reutilizar sesión HTTP'); }, authorize: async () => { throw new Error('Sin acceso HTTP'); } },
    storage: { get: async () => { state.reads++; return state.contents; } }, scanner: { scan: async () => {} } });
  const authorize = async g => { if (!state.allowed || Object.keys(grant).some(key => g[key] !== grant[key])) throw new Error('FORBIDDEN'); };
  const parse = async (_bytes, extension) => { state.parses++; return { kind: extension, text: 'Consigna', warnings: [] }; };
  return { state, options: { files, authorize, parse } };
}

test('lee consigna ligada a la actividad del job docente usando FileService', async () => {
  const f = fixture(), reader = await create(f.options);
  assert.deepEqual(await reader.read(grant, signal()), { kind: 'pdf', text: 'Consigna', warnings: [] });
  assert.equal(f.state.reads, 1); assert.equal(f.state.parses, 1);
});

test('docente, aula, actividad, intento o job ajenos se rechazan antes de lectura', async () => {
  for (const key of ['ownerId', 'classroomId', 'activityId', 'attemptId', 'fileId']) {
    const f = fixture(), reader = await create(f.options);
    await assert.rejects(reader.read({ ...grant, [key]: '66666666-6666-4666-8666-666666666666' }, signal()));
    assert.equal(f.state.reads, 0);
  }
  const f = fixture(), reader = await create(f.options); f.state.allowed = false;
  await assert.rejects(reader.read(grant, signal())); assert.equal(f.state.reads, 0);
});

test('archivo no vinculado, custodia o tipo inseguro se rechazan antes de descarga', async () => {
  for (const mutate of [s => { s.linked = false; }, s => { s.row.purpose = 'attachment'; }, s => { s.row.target_id = attemptId; },
    s => { s.row.scan_status = 'PENDING'; }, s => { s.row.validation_status = 'REJECTED'; }, s => { s.row.phase = 'receiving'; },
    s => { s.row.blob_deleted_at = new Date(); }, s => { s.row.scanned_digest = '0'.repeat(64); }, s => { s.row.extension = 'zip'; }]) {
    const f = fixture(), reader = await create(f.options); mutate(f.state);
    await assert.rejects(reader.read(grant, signal())); assert.equal(f.state.reads, 0); assert.equal(f.state.parses, 0);
  }
});

test('bytes alterados o revocación en vuelo nunca devuelven consigna', async () => {
  const f = fixture(), reader = await create(f.options); f.state.contents = Buffer.from('modificado');
  await assert.rejects(reader.read(grant, signal())); assert.equal(f.state.parses, 0);
  const g = fixture(), original = g.options.files.storage.get;
  g.options.files.storage.get = async (...args) => { const result = await original(...args); g.state.allowed = false; return result; };
  const checked = await create(g.options); await assert.rejects(checked.read(grant, signal())); assert.equal(g.state.parses, 0);
});

test('vínculo revocado durante lectura no entrega documento', async () => {
  const f = fixture(), original = f.options.files.storage.get;
  f.options.files.storage.get = async (...args) => { const result = await original(...args); f.state.linked = false; return result; };
  const reader = await create(f.options); await assert.rejects(reader.read(grant, signal()));
});
