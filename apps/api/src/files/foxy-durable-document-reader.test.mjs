import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { FileService } from './service.ts';
import { office } from '../../../../tests/p4-fixtures.mjs';

const api = () => import('./foxy-durable-document-reader.ts');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function pdfBytes() { const pdf = await PDFDocument.create(); pdf.addPage(); return Buffer.from(await pdf.save()); }
function docxBytes() { return office('docx', [], entries => entries.map(entry => entry.name === 'word/document.xml' ? { ...entry,
  bytes: Buffer.from('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Contenido sintético docente.</w:t></w:r></w:p></w:body></w:document>') } : entry)); }
function fixture(bytes, extension = 'pdf') {
  const ownerId = randomUUID(), classroomId = randomUUID(), fileId = randomUUID(), digest = sha(bytes), capability = Object.freeze({});
  const file = { fileId, digest, extension, sizeBytes: bytes.length, purpose: 'material', targetId: null };
  const state = { allowed: true, reads: 0, calls: [], content: bytes, row: { id: fileId, classroom_id: classroomId,
    classroom_draft_id: null, uploaded_by_id: ownerId, original_name: `synthetic.${extension}`, extension,
    detected_mime_type: 'application/octet-stream', storage_key: 'synthetic/file', size_bytes: BigInt(bytes.length),
    validation_status: 'APPROVED', scan_status: 'CLEAN', upload_status: 'COMPLETED', phase: 'ready', purpose: 'material',
    target_id: null, digest, validated_digest: digest, scanned_digest: digest, blob_deleted_at: null } };
  const database = { $transaction: async fn => fn({ $queryRawUnsafe: async (sql, ...args) => {
    if (/FROM files f/u.test(sql)) return args.includes(fileId) ? [{ ...state.row }] : [];
    if (/FROM users/u.test(sql)) return [{ email_verified_at: new Date('2026-01-01') }];
    if (/FROM classrooms/u.test(sql)) return [{ storage_quota_bytes: 1000000n, teacher_id: ownerId, archived_at: null }];
    throw new Error('Unexpected synthetic database query');
  } }) };
  const files = new FileService({ database, draftQuotaBytes: 1000000n,
    access: { authenticate: async () => { throw new Error('HTTP credentials must not be reused'); },
      authorize: async () => { throw new Error('HTTP credentials must not be reused'); } },
    storage: { get: async () => { state.reads++; return state.content; } }, scanner: { scan: async () => {} } });
  const authorizeDocument = async (cap, signal, tx) => {
    state.calls.push({ cap, signal, tx });
    if (cap !== capability || signal.aborted || !state.allowed) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
    return { ownerId, classroomId, file: { ...file } };
  };
  return { ownerId, classroomId, fileId, file, capability, state, files, authorizeDocument };
}
async function create(f) {
  const { createDurableFoxyDocumentReader } = await api(); assert.equal(typeof createDurableFoxyDocumentReader, 'function');
  return createDurableFoxyDocumentReader({ files: f.files, authorizeDocument: f.authorizeDocument });
}

test('durable reader derives identity and descriptor from capability for synthetic PDF and DOCX', async () => {
  for (const [bytes, extension] of [[await pdfBytes(), 'pdf'], [docxBytes(), 'docx']]) {
    const f = fixture(bytes, extension), signal = new AbortController().signal, reader = await create(f);
    const result = await reader.read(f.capability, signal);
    assert.equal(result.fileId, f.fileId); assert.equal(result.digest, f.file.digest); assert.equal(f.state.reads, 1);
    if (extension === 'pdf') { assert.equal(result.document.kind, 'pdf'); assert.equal(result.pageCount, 1); assert.deepEqual(Buffer.from(result.document.bytes), bytes); }
    else { assert.equal(result.document.kind, 'text'); assert.match(result.document.text, /Contenido sintético docente/); assert.equal(result.pageCount, null); assert.ok(result.warnings.includes('DOCX_IMAGES_OMITTED')); }
    assert.ok(f.state.calls.length >= 2);
    assert.ok(f.state.calls.every(call => call.cap === f.capability && call.signal === signal));
    assert.ok(f.state.calls.some(call => call.tx), 'file access must revalidate authority in transaction');
  }
});

test('forged capability, revoked authority and abort fail before reading storage', async () => {
  const bytes = await pdfBytes();
  for (const mode of ['forged', 'clone', 'revoked', 'abort']) {
    const f = fixture(bytes), controller = new AbortController(), reader = await create(f);
    if (mode === 'revoked') f.state.allowed = false;
    if (mode === 'abort') controller.abort();
    const capability = mode === 'forged' ? {} : mode === 'clone' ? { ...f.capability } : f.capability;
    await assert.rejects(reader.read(capability, controller.signal)); assert.equal(f.state.reads, 0);
  }
});

test('file access cannot be redirected to a different row or modified descriptor', async () => {
  const bytes = await pdfBytes();
  const mutations = [row => { row.classroom_id = randomUUID(); }, row => { row.purpose = 'plan'; },
    row => { row.target_id = randomUUID(); }, row => { row.digest = 'b'.repeat(64); },
    row => { row.scan_status = 'PENDING'; }, row => { row.blob_deleted_at = new Date(); }];
  for (const mutate of mutations) {
    const f = fixture(bytes), reader = await create(f); mutate(f.state.row);
    await assert.rejects(reader.read(f.capability, new AbortController().signal)); assert.equal(f.state.reads, 0);
  }
  const f = fixture(bytes), reader = await create(f), override = { classroomId: randomUUID(), file: { ...f.file, fileId: randomUUID() } };
  const result = await reader.read(f.capability, new AbortController().signal, override);
  assert.equal(result.fileId, f.fileId); assert.equal(f.state.reads, 1);
});

test('revocation during storage read and bytes changed after authorization prevent result', async () => {
  const bytes = await pdfBytes();
  const revoked = fixture(bytes), originalGet = revoked.files.storage.get;
  revoked.files.storage.get = async (...args) => { const result = await originalGet(...args); revoked.state.allowed = false; return result; };
  await assert.rejects((await create(revoked)).read(revoked.capability, new AbortController().signal)); assert.equal(revoked.state.reads, 1);
  const changed = fixture(bytes); changed.state.content = Buffer.from(bytes); changed.state.content[changed.state.content.length - 1] ^= 1;
  await assert.rejects((await create(changed)).read(changed.capability, new AbortController().signal)); assert.equal(changed.state.reads, 1);
});
