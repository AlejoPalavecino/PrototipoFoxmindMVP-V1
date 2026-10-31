import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';

const domain = () => import('./index.ts');
const err = code => error => error?.code === code;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const classroom = { kind: 'CLASSROOM', classroomId: randomUUID() };
const curriculum = { units: [], selectedTopicIds: [] };
function fixture({ extension = 'pdf', bytes = Uint8Array.of(1, 2, 3), text = 'Contenido sintético.', pages = 1 } = {}) {
  const fileId = randomUUID(), hash = digest(bytes), sourceId = `material:${randomUUID()}`;
  const file = { fileId, digest: hash, extension, sizeBytes: bytes.length, purpose: 'material', targetId: null };
  const source = { sourceId, title: 'Fuente sintética', kind: 'MATERIAL', text: '', files: [file] };
  const parsed = { fileId, digest: hash, document: extension === 'pdf' ? { kind: 'pdf', bytes } : { kind: 'text', text },
    pageCount: extension === 'pdf' ? pages : null, warnings: extension === 'pdf' ? [] : ['DOCX_IMAGES_OMITTED'] };
  return { sourceId, fileId, file, source, parsed,
    snapshot: { context: classroom, curriculum, sources: [source] } };
}
async function assembler() {
  const { assembleFoxyGrounding } = await domain();
  assert.equal(typeof assembleFoxyGrounding, 'function');
  return assembleFoxyGrounding;
}

test('general context excludes classroom curriculum and sources', async () => {
  const assemble = await assembler(), f = fixture();
  const result = assemble({ context: { kind: 'GENERAL' }, curriculum: null, sources: [] }, []);
  assert.deepEqual(result.sources, []); assert.deepEqual(result.documents, []); assert.deepEqual(result.referenceMap, []);
  assert.throws(() => assemble({ context: { kind: 'GENERAL' }, curriculum, sources: [] }, []), err('INVALID_INPUT'));
  assert.throws(() => assemble({ context: { kind: 'GENERAL' }, curriculum: null, sources: [f.source] }, [f.parsed]), err('INVALID_INPUT'));
});

test('grounding maps distinct files with equal digests without exposing identifiers in provider content', async () => {
  const assemble = await assembler(), f = fixture(), other = fixture();
  assert.notEqual(f.fileId, other.fileId); assert.equal(f.file.digest, other.file.digest);
  const result = assemble({ ...f.snapshot, sources: [f.source, other.source] }, [f.parsed, other.parsed]);
  assert.equal(result.sources.length, 2); assert.equal(result.documents.length, 2);
  assert.deepEqual(result.sources.map(s => s.sourceKey), ['s1', 's2']);
  assert.deepEqual(result.sources.map(s => s.documentKeys), [['d1'], ['d2']]);
  assert.deepEqual(result.documents.map(d => d.documentKey), ['d1', 'd2']);
  assert.deepEqual(result.documents.map(d => d.sourceKeys), [['s1'], ['s2']]);
  assert.deepEqual(result.documents[0].document, f.parsed.document);
  assert.deepEqual(result.referenceMap, [
    { sourceKey: 's1', sourceId: f.sourceId, documentKeys: ['d1'] },
    { sourceKey: 's2', sourceId: other.sourceId, documentKeys: ['d2'] }
  ]);
  const providerContent = JSON.stringify({ sources: result.sources, documents: result.documents });
  for (const id of [f.fileId, other.fileId, f.sourceId, other.sourceId, f.file.digest])
    assert.equal(providerContent.includes(id), false);
});

test('plan source cannot use a file whose custody purpose is material', async () => {
  const assemble = await assembler(), f = fixture();
  const source = { ...f.source, sourceId: `plan:${randomUUID()}`, kind: 'PLAN' };
  assert.throws(() => assemble({ ...f.snapshot, sources: [source] }, [f.parsed]), err('FILE_NOT_READY'));
});

test('grounding rejects missing, extra and inconsistent document proofs', async () => {
  const assemble = await assembler(), f = fixture();
  assert.throws(() => assemble(f.snapshot, []), err('FILE_NOT_READY'));
  assert.throws(() => assemble(f.snapshot, [f.parsed, { ...f.parsed, fileId: randomUUID() }]), err('INVALID_INPUT'));
  assert.throws(() => assemble(f.snapshot, [{ ...f.parsed, digest: 'b'.repeat(64) }]), err('FILE_NOT_READY'));
  assert.throws(() => assemble(f.snapshot, [{ ...f.parsed, document: { kind: 'pdf', bytes: Uint8Array.of(1, 2) } }]), err('FILE_NOT_READY'));
  assert.throws(() => assemble({ ...f.snapshot, sources: [f.source, { ...f.source, sourceId: `plan:${randomUUID()}`,
    files: [{ ...f.file, sizeBytes: f.file.sizeBytes + 1 }] }] }, [f.parsed]), err('FILE_NOT_READY'));
  assert.throws(() => assemble({ ...f.snapshot, sources: [f.source, f.source] }, [f.parsed]), err('INVALID_INPUT'));
});

test('PDF and DOCX metadata must match the parsed document and preserve DOCX warning', async () => {
  const assemble = await assembler(), pdf = fixture(), docx = fixture({ extension: 'docx' });
  for (const pageCount of [null, 0, -1, 1.5]) assert.throws(() => assemble(pdf.snapshot, [{ ...pdf.parsed, pageCount }]), err('INVALID_INPUT'));
  assert.throws(() => assemble(pdf.snapshot, [{ ...pdf.parsed, document: { kind: 'text', text: 'wrong' } }]), err('FILE_NOT_READY'));
  assert.throws(() => assemble(docx.snapshot, [{ ...docx.parsed, pageCount: 1 }]), err('INVALID_INPUT'));
  assert.throws(() => assemble(docx.snapshot, [{ ...docx.parsed, warnings: [] }]), err('INVALID_INPUT'));
  const result = assemble(docx.snapshot, [docx.parsed]);
  assert.ok(result.documents[0].warnings.includes('DOCX_IMAGES_OMITTED'));
  assert.ok(result.warnings.includes('DOCX_IMAGES_OMITTED'));
});

test('limits count distinct documents, bytes, pages, DOCX characters and source text', async () => {
  const assemble = await assembler(), f = fixture(), tooMany = Array.from({ length: 7 }, () => fixture());
  const six = tooMany.slice(0, 6);
  assert.equal(assemble({ ...f.snapshot, sources: six.map(x => x.source) }, six.map(x => x.parsed)).documents.length, 6);
  assert.throws(() => assemble({ ...f.snapshot, sources: tooMany.map(x => x.source) }, tooMany.map(x => x.parsed)), err('AI_INPUT_LIMIT'));
  const tooBig = fixture({ bytes: new Uint8Array(20_000_001) });
  assert.throws(() => assemble(tooBig.snapshot, [tooBig.parsed]), err('AI_INPUT_LIMIT'));
  assert.throws(() => assemble(f.snapshot, [{ ...f.parsed, pageCount: 101 }]), err('AI_INPUT_LIMIT'));
  const docx = fixture({ extension: 'docx', text: 'x'.repeat(200_001) });
  assert.throws(() => assemble(docx.snapshot, [docx.parsed]), err('AI_INPUT_LIMIT'));
  const tooMuchText = { ...f.source, text: 'x'.repeat(100_001) };
  assert.throws(() => assemble({ ...f.snapshot, sources: [tooMuchText] }, [f.parsed]), err('AI_INPUT_LIMIT'));
});

test('grounding preserves complete curriculum structure, topic states and explicit selection', async () => {
  const assemble = await assembler(), f = fixture(), taught = randomUUID(), next = randomUUID(), pending = randomUUID();
  const selectedCurriculum = { units: [
    { id: randomUUID(), name: 'Energía', position: 0, topics: [
      { id: taught, name: 'Anterior', position: 0, status: 'TAUGHT' },
      { id: next, name: 'Próximo', position: 1, status: 'NEXT' },
      { id: pending, name: 'Futuro', position: 2, status: 'PENDING' }
    ] }
  ], selectedTopicIds: [next, pending] };
  const snapshot = { ...f.snapshot, curriculum: selectedCurriculum };
  const result = assemble(snapshot, [f.parsed]);
  assert.deepEqual(result.curriculum, selectedCurriculum);
  assert.deepEqual(result.context, snapshot.context);
});

for (const kind of ['PLAN', 'MATERIAL']) for (const count of [0, 2]) {
  test(`${kind} source rejects ${count} file descriptors without silent omission`, async () => {
    const assemble = await assembler(), f = fixture(), other = fixture();
    const purpose = kind.toLowerCase();
    const source = { ...f.source, kind, sourceId: `${purpose}:${randomUUID()}`,
      files: count ? [{ ...f.file, purpose }, { ...other.file, purpose }] : [] };
    const parsed = count ? [f.parsed, other.parsed] : [];
    assert.throws(() => assemble({ ...f.snapshot, sources: [source] }, parsed), err('FILE_NOT_READY'));
  });
}
