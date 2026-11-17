import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { FileService } from '../apps/api/src/modules/files/custody/infrastructure/service.ts';

const create = async options => (await import("../apps/api/src/modules/files/custody/infrastructure/durable-grading-ai-attachment-reader.ts")).createDurableGradingAiAttachmentReader(options);
const ownerId = '11111111-1111-4111-8111-111111111111', classroomId = '22222222-2222-4222-8222-222222222222';
const attemptId = '33333333-3333-4333-8333-333333333333', fileId = '44444444-4444-4444-8444-444444444444';
const studentId = '55555555-5555-4555-8555-555555555555';
const originId = '66666666-6666-4666-8666-666666666666';
const bytes = Buffer.from('documento sintético');
const digest = createHash('sha256').update(bytes).digest('hex');
const grant = { ownerId, classroomId, attemptId, fileId, digest };
const signal = () => new AbortController().signal;
function fixture() {
  const state = { linked: true, originValid: true, allowed: true, reads: 0, parsed: 0, content: bytes,
    row: { id: fileId, classroom_id: classroomId, classroom_draft_id: null, uploaded_by_id: studentId,
      original_name: 'entrega.pdf', extension: 'pdf', detected_mime_type: 'application/pdf', storage_key: 'private', size_bytes: BigInt(bytes.length),
      validation_status: 'APPROVED', scan_status: 'CLEAN', upload_status: 'COMPLETED', phase: 'ready', purpose: 'attachment',
      target_id: attemptId, digest, validated_digest: digest, scanned_digest: digest, blob_deleted_at: null } };
  const database = { $transaction: async fn => fn({ $queryRawUnsafe: async (sql, ...args) => {
    if (sql.includes('attempt_attachments')) return state.linked && args.includes(attemptId) && args.includes(fileId) && (state.row.target_id === attemptId || !/\bJOIN\s+attempts\b/i.test(sql) || state.originValid) ? [{ file_id: fileId, id: fileId, attempt_id: attemptId }] : [];
    if (/\bFROM\s+attempts\b/i.test(sql)) return state.originValid && args.includes(originId) ? [{ id: originId, student_id: studentId, classroom_id: classroomId }] : [];
    if (sql.includes('FROM files f')) return args.includes(fileId) ? [{ ...state.row }] : [];
    if (sql.includes('FROM users')) return [{ email_verified_at: new Date('2026-01-01') }];
    if (sql.includes('FROM classrooms')) return [{ storage_quota_bytes: 1000000n, teacher_id: ownerId, archived_at: null }];
    throw new Error('consulta no prevista');
  } }) };
  const files = new FileService({ database, draftQuotaBytes: 1000000n,
    access: { authenticate: async () => { throw new Error('No se debe reutilizar una sesión HTTP'); }, authorize: async () => { throw new Error('Sin acceso HTTP'); } },
    storage: { get: async () => { state.reads++; return state.content; } }, scanner: { scan: async () => {} } });
  const authorize = async g => { if (!state.allowed || g.ownerId !== ownerId || g.classroomId !== classroomId || g.attemptId !== attemptId || g.fileId !== fileId || g.digest !== digest) throw new Error('FORBIDDEN'); };
  const parse = async (_bytes, extension) => { state.parsed++; return { kind: extension, text: 'texto', warnings: [] }; };
  return { state, options: { files, authorize, parse } };
}

test('FileService lee solo adjunto ligado y limpio del job autorizado', async () => {
  const f = fixture(), reader = await create(f.options);
  assert.deepEqual(await reader.read(grant, signal()), { kind: 'pdf', text: 'texto', warnings: [] });
  assert.equal(f.state.reads, 1); assert.equal(f.state.parsed, 1);
});

test('docente ajeno o job revocado no obtiene bytes', async () => {
  const f = fixture(), reader = await create(f.options);
  await assert.rejects(reader.read({ ...grant, ownerId: studentId }, signal()));
  f.state.allowed = false; await assert.rejects(reader.read(grant, signal())); assert.equal(f.state.reads, 0);
});

test('archivo ajeno al intento o custodia pendiente/rechazada no llega al proveedor', async () => {
  for (const mutate of [s => { s.linked = false; }, s => { s.row.scan_status = 'PENDING'; }, s => { s.row.validation_status = 'REJECTED'; },
    s => { s.row.phase = 'receiving'; }, s => { s.row.purpose = 'material'; }, s => { s.row.classroom_id = studentId; },
    s => { s.row.blob_deleted_at = new Date(); }, s => { s.row.scanned_digest = '0'.repeat(64); }]) {
    const f = fixture(), reader = await create(f.options); mutate(f.state);
    await assert.rejects(reader.read(grant, signal())); assert.equal(f.state.reads, 0); assert.equal(f.state.parsed, 0);
  }
});

test('alteración de bytes o revocación durante lectura impide resultado', async () => {
  const f = fixture(), reader = await create(f.options); f.state.content = Buffer.from('contenido alterado');
  await assert.rejects(reader.read(grant, signal())); assert.equal(f.state.parsed, 0);
  const g = fixture(), oldGet = g.options.files.storage.get;
  g.options.files.storage.get = async (...args) => { const result = await oldGet(...args); g.state.allowed = false; return result; };
  const guarded = await create(g.options); await assert.rejects(guarded.read(grant, signal())); assert.equal(g.state.parsed, 0);
});


test('reentrega acepta un adjunto vinculado que conserva custodia de intento anterior del mismo alumno, actividad y aula', async () => {
  const f = fixture(); f.state.row.target_id = originId;
  const reader = await create(f.options);
  assert.deepEqual(await reader.read(grant, signal()), { kind: 'pdf', text: 'texto', warnings: [] });
  assert.equal(f.state.reads, 1);
});

test('reentrega rechaza custodia original perteneciente a otro alumno, actividad o aula', async () => {
  const f = fixture(); f.state.row.target_id = originId; f.state.originValid = false;
  const reader = await create(f.options);
  await assert.rejects(reader.read(grant, signal())); assert.equal(f.state.reads, 0);
});
