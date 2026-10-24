import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { office } from './p4-fixtures.mjs';
import { crc32, deflateRawSync } from 'node:zlib';

const files = () => import('../.build/api/apps/api/src/files/index.js');
const xml = body => `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`;
const docx = (body, extra = []) => office('docx', extra, entries => entries.map(entry => entry.name === 'word/document.xml' ? { ...entry, bytes: Buffer.from(xml(body)) } : entry));
function compressedBomb() {
  const bytes = Buffer.alloc(32000001, 65), compressed = deflateRawSync(bytes), name = Buffer.from('word/document.xml');
  const local = Buffer.alloc(30), central = Buffer.alloc(46), end = Buffer.alloc(22), checksum = crc32(bytes);
  local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
  local.writeUInt32LE(checksum, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(bytes.length, 22); local.writeUInt16LE(name.length, 26);
  central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10);
  central.writeUInt32LE(checksum, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(bytes.length, 24); central.writeUInt16LE(name.length, 28);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + name.length, 12); end.writeUInt32LE(local.length + name.length + compressed.length, 16);
  return Buffer.concat([local, name, compressed, central, name, end]);
}

test('C2 DOCX extracts paragraphs/tables as inert Unicode text with image limitation warning', async () => {
  const { extractDocxPlanDocument } = await files();
  const bytes = docx('<w:p><w:r><w:t>Unidad 1: Luz 🦊</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Exposición</w:t></w:r></w:p></w:tc></w:tr></w:tbl>');
  const result = await extractDocxPlanDocument(bytes);
  assert.equal(result.document.kind, 'text');
  assert.ok(result.document.text.includes('Unidad 1: Luz 🦊'));
  assert.ok(result.document.text.includes('Exposición'));
  assert.deepEqual(result.warnings, ['DOCX_IMAGES_OMITTED']);
});

test('C2 invalid archives, external XML/entities and excessive DOCX input fail closed', async () => {
  const { extractDocxPlanDocument } = await files();
  const oversized = docx(`<w:p><w:r><w:t>${'a'.repeat(200001)}</w:t></w:r></w:p>`);
  const external = office('docx', [], entries => entries.map(entry => entry.name === 'word/document.xml'
    ? { ...entry, bytes: Buffer.from('<!DOCTYPE w:document [<!ENTITY external SYSTEM "https://example.invalid/private">]>' + xml('<w:p>&external;</w:p>')) } : entry));
  for (const bytes of [Buffer.from('not zip'), oversized, external]) {
    await assert.rejects(extractDocxPlanDocument(bytes), error => ['AI_INPUT_LIMIT', 'INVALID_AI_OUTPUT', 'FILE_NOT_READY'].includes(error.code));
  }
});

test('C2 durable reader reauthorizes private file and verifies source digest around I/O', async () => {
  const { createApprovedPlanReader } = await files();
  const observed = [];
  const input = { ownerId: randomUUID(), draftId: randomUUID(), fileId: randomUUID() };
  const request = { durableGrant: 'synthetic-only' };
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create(); pdf.addPage();
  const validBytes = Buffer.from(await pdf.save());
  const validInput = { ...input, digest: createHash('sha256').update(validBytes).digest('hex') };
  const validReader = createApprovedPlanReader({ authorize: async (grant, signal) => {
    observed.push('authorize'); assert.deepEqual(grant, validInput); assert.ok(signal instanceof AbortSignal); return request;
  }, files: { read: async (req, id) => {
    observed.push('read'); assert.equal(req, request); assert.equal(id, input.fileId);
    return { bytes: validBytes, headers: { 'Content-Type': 'application/pdf' } };
  } } });
  const result = await validReader.read(validInput, new AbortController().signal);
  assert.equal(result.kind, 'pdf'); assert.deepEqual(Buffer.from(result.bytes), validBytes);
  assert.deepEqual(observed, ['authorize', 'read', 'authorize']);
});

test('C2 denied/missing authorization and tampered bytes never yield a model document', async () => {
  const { createApprovedPlanReader } = await files();
  assert.throws(() => createApprovedPlanReader({ files: { read() {} } }));
  const input = { ownerId: randomUUID(), draftId: randomUUID(), fileId: randomUUID(), digest: '0'.repeat(64) };
  let reads = 0;
  const reader = createApprovedPlanReader({ authorize: async () => { throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }); },
    files: { read: async () => { reads++; } } });
  await assert.rejects(reader.read(input, new AbortController().signal), { code: 'FORBIDDEN' });
  assert.equal(reads, 0);
  const tampered = createApprovedPlanReader({ authorize: async () => ({}), files: { read: async () => ({ bytes: Buffer.from('changed'), headers: { 'Content-Type': 'application/pdf' } }) } });
  await assert.rejects(tampered.read(input, new AbortController().signal), { code: 'FILE_NOT_READY' });
});

test('C2 ZIP metadata bombs, excessive entry count and canceled parsing are bounded', async () => {
  const { extractDocxPlanDocument } = await files();
  const bomb = compressedBomb();
  const entries = office('docx', Array.from({ length: 998 }, (_, i) => ({ name: `word/extra-${i}.xml`, bytes: Buffer.from('<x/>') })));
  for (const bytes of [bomb, entries]) await assert.rejects(extractDocxPlanDocument(bytes), { code: 'AI_INPUT_LIMIT' });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(extractDocxPlanDocument(docx('<w:p/>'), controller.signal), { code: 'FILE_NOT_READY' });
});

test('C2 PDF over 100 pages or 20 MB cannot become model input', async () => {
  const { createApprovedPlanReader } = await files();
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create(); for (let i = 0; i < 101; i++) pdf.addPage();
  for (const bytes of [Buffer.from(await pdf.save()), Buffer.alloc(20000001)]) {
    const input = { ownerId: randomUUID(), draftId: randomUUID(), fileId: randomUUID(), digest: createHash('sha256').update(bytes).digest('hex') };
    const reader = createApprovedPlanReader({ authorize: async () => ({}), files: { read: async () => ({ bytes, headers: { 'Content-Type': 'application/pdf' } }) } });
    await assert.rejects(reader.read(input, new AbortController().signal), { code: 'AI_INPUT_LIMIT' });
  }
});
