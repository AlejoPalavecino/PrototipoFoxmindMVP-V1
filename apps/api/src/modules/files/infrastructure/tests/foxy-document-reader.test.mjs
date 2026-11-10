import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { office } from '../../../../../../../tests/p4-fixtures.mjs';

const api = () => import('../foxy-document-reader.ts');
const request = { syntheticSession: true }, room = randomUUID();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function pdfBytes() { const pdf = await PDFDocument.create(); pdf.addPage(); return Buffer.from(await pdf.save()); }
function docxBytes() { return office('docx', [], entries => entries.map(entry => entry.name === 'word/document.xml' ? { ...entry,
  bytes: Buffer.from('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Contenido sintético docente.</w:t></w:r></w:p></w:body></w:document>') } : entry)); }
function fixture(bytes, extension = 'pdf') {
  const fileId = randomUUID(), digest = sha(bytes);
  const file = { fileId, digest, extension, sizeBytes: bytes.length, purpose: 'material', targetId: null };
  const row = { id: fileId, classroom_id: room, classroom_draft_id: null, uploaded_by_id: randomUUID(), original_name: `archivo.${extension}`,
    extension, detected_mime_type: 'application/octet-stream', storage_key: 'synthetic/key', size_bytes: BigInt(bytes.length),
    validation_status: 'APPROVED', scan_status: 'CLEAN', upload_status: 'COMPLETED', rejection_code: null,
    purpose: 'material', target_id: null, phase: 'ready', digest, validated_digest: digest, scanned_digest: digest, blob_deleted_at: null };
  return { descriptor: { classroomId: room, file }, row, bytes };
}
function double(f, { mutate, readBytes, deniedAfterRead = false, abortAfterRead } = {}) {
  const calls = [], tx = {}, changed = { read: false };
  const files = { store: {
    transaction: async fn => { calls.push({ op: 'transaction' }); return fn(tx); },
    loadAuthorized: async (actualTx, actualRequest, id, action) => {
      calls.push({ op: 'authorize', actualTx, actualRequest, id, action, afterRead: changed.read });
      if (deniedAfterRead && changed.read) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
      return mutate ? mutate({ ...f.row }) : { ...f.row };
    }
  }, read: async (actualRequest, id, mode) => {
    calls.push({ op: 'read', actualRequest, id, mode }); changed.read = true;
    abortAfterRead?.abort(); return { bytes: readBytes ?? f.bytes };
  } };
  return { files, calls, tx };
}
async function create(f) {
  const { createFoxyDocumentReader } = await api(); assert.equal(typeof createFoxyDocumentReader, 'function');
  return createFoxyDocumentReader({ files: f.files });
}

test('authorized PDF and DOCX read preserve request, page/text and mandatory warning', async () => {
  for (const [bytes, extension] of [[await pdfBytes(), 'pdf'], [docxBytes(), 'docx']]) {
    const f = fixture(bytes, extension), d = double(f), signal = new AbortController().signal, reader = await create(d);
    const result = await reader.read(request, f.descriptor, signal);
    assert.equal(result.fileId, f.descriptor.file.fileId); assert.equal(result.digest, f.descriptor.file.digest);
    if (extension === 'pdf') { assert.equal(result.document.kind, 'pdf'); assert.equal(result.pageCount, 1); assert.deepEqual(Buffer.from(result.document.bytes), bytes); }
    else { assert.equal(result.document.kind, 'text'); assert.match(result.document.text, /Contenido sintético docente/); assert.equal(result.pageCount, null); assert.ok(result.warnings.includes('DOCX_IMAGES_OMITTED')); }
    const auths = d.calls.filter(c => c.op === 'authorize'); assert.ok(auths.length >= 2);
    for (const auth of auths) { assert.equal(auth.actualRequest, request); assert.equal(auth.id, f.descriptor.file.fileId); assert.equal(auth.action, 'read'); }
    const read = d.calls.find(c => c.op === 'read'); assert.equal(read.actualRequest, request); assert.equal(read.id, f.descriptor.file.fileId);
    assert.ok(auths.some(auth => auth.afterRead));
  }
});

test('scope, custody and ready metadata mismatches never return bytes', async () => {
  const bytes = await pdfBytes(), signal = new AbortController().signal;
  const mutations = [row => ({ ...row, classroom_id: randomUUID() }), row => ({ ...row, classroom_draft_id: randomUUID() }),
    row => ({ ...row, purpose: 'plan' }), row => ({ ...row, target_id: randomUUID() }),
    row => ({ ...row, digest: 'b'.repeat(64) }), row => ({ ...row, size_bytes: row.size_bytes + 1n }),
    row => ({ ...row, extension: 'docx' }), row => ({ ...row, phase: 'reserved' }),
    row => ({ ...row, scan_status: 'PENDING' }), row => ({ ...row, validation_status: 'PENDING' }),
    row => ({ ...row, upload_status: 'STARTED' }), row => ({ ...row, blob_deleted_at: new Date() })];
  for (const mutate of mutations) {
    const f = fixture(bytes), d = double(f, { mutate }), reader = await create(d);
    await assert.rejects(reader.read(request, f.descriptor, signal));
    assert.equal(d.calls.some(call => call.op === 'read'), false);
  }
});

test('content digest and size are rechecked even if file service returns bytes', async () => {
  const bytes = await pdfBytes(), f = fixture(bytes), altered = Buffer.from(bytes); altered[altered.length - 1] ^= 1;
  for (const readBytes of [altered, bytes.subarray(1)]) {
    const d = double(f, { readBytes });
    await assert.rejects((await create(d)).read(request, f.descriptor, new AbortController().signal), { code: 'FILE_NOT_READY' });
  }
});

test('revoked access after bytes are read prevents returning parsed material', async () => {
  const f = fixture(await pdfBytes()), d = double(f, { deniedAfterRead: true });
  await assert.rejects((await create(d)).read(request, f.descriptor, new AbortController().signal), { code: 'FORBIDDEN' });
  assert.ok(d.calls.some(c => c.op === 'authorize' && c.afterRead));
});

test('aborted work never starts I/O or returns a parsed document after read', async () => {
  const f = fixture(await pdfBytes()), before = new AbortController(); before.abort();
  const d = double(f); await assert.rejects((await create(d)).read(request, f.descriptor, before.signal));
  assert.equal(d.calls.length, 0);
  const during = new AbortController(), later = double(f, { abortAfterRead: during });
  await assert.rejects((await create(later)).read(request, f.descriptor, during.signal));
});
