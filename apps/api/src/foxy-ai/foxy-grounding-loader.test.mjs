import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';

const api = () => import('./index.ts');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const request = { session: 'synthetic-request' }, conversationId = randomUUID();
function fixture(count = 2) {
  const context = { kind: 'CLASSROOM', classroomId: randomUUID() };
  const parsed = [], sources = Array.from({ length: count }, (_, i) => {
    const bytes = Uint8Array.of(i + 1, 2, 3), digest = hash(bytes), fileId = randomUUID();
    const file = { fileId, digest, extension: 'pdf', sizeBytes: bytes.length, purpose: 'material', targetId: null };
    parsed.push({ fileId, digest, document: { kind: 'pdf', bytes }, pageCount: 1, warnings: [] });
    return { sourceId: `material:${randomUUID()}`, title: `Fuente ${i}`, kind: 'MATERIAL', text: '', files: [file] };
  });
  return { snapshot: { context, curriculum: { units: [], selectedTopicIds: [] }, sources }, parsed };
}
function ports({ outcomes = [true, true], read, revalidate } = {}) {
  const calls = [], snapshots = { revalidate: async (...args) => {
    calls.push({ op: 'revalidate', args });
    return revalidate ? revalidate(...args) : outcomes.shift();
  } }, documents = { read: async (...args) => { calls.push({ op: 'read', args }); return read(...args); } };
  return { snapshots, documents, calls };
}
async function loader(p) {
  const { FoxyGroundingLoader } = await api();
  assert.equal(typeof FoxyGroundingLoader, 'function');
  return new FoxyGroundingLoader({ snapshots: p.snapshots, documents: p.documents });
}

test('loads selected documents sequentially between initial and final snapshot revalidation', async () => {
  const f = fixture(), controller = new AbortController(); let active = 0, maximum = 0;
  const p = ports({ read: async (_request, descriptor, signal) => {
    active++; maximum = Math.max(maximum, active); await Promise.resolve(); active--;
    assert.equal(signal, controller.signal); return f.parsed.find(item => item.fileId === descriptor.file.fileId);
  } });
  const service = await loader(p), result = await service.load(request, conversationId, f.snapshot, controller.signal);
  assert.deepEqual(p.calls.map(call => call.op), ['revalidate', 'read', 'read', 'revalidate']);
  for (const call of p.calls.filter(item => item.op === 'revalidate')) assert.deepEqual(call.args, [request, conversationId, f.snapshot]);
  for (const [i, call] of p.calls.filter(item => item.op === 'read').entries())
    assert.deepEqual(call.args, [request, { classroomId: f.snapshot.context.classroomId, file: f.snapshot.sources[i].files[0] }, controller.signal]);
  assert.equal(maximum, 1); assert.equal(result.documents.length, 2);
  assert.deepEqual(result.referenceMap.map(item => item.sourceId), f.snapshot.sources.map(source => source.sourceId));
});

test('general context revalidates without reading files', async () => {
  const snapshot = { context: { kind: 'GENERAL' }, curriculum: null, sources: [] };
  const p = ports({ read: () => { throw new Error('unexpected read'); } }), service = await loader(p), signal = new AbortController().signal;
  const result = await service.load(request, conversationId, snapshot, signal);
  assert.deepEqual(p.calls.map(call => call.op), ['revalidate', 'revalidate']);
  assert.deepEqual(result.sources, []); assert.deepEqual(result.documents, []); assert.deepEqual(result.context, snapshot.context);
});

test('stale snapshot before or after I/O fails closed without returning a result', async () => {
  const f = fixture(1), signal = new AbortController().signal;
  for (const outcomes of [[false], [true, false]]) {
    const p = ports({ outcomes: [...outcomes], read: async () => f.parsed[0] }), service = await loader(p);
    await assert.rejects(service.load(request, conversationId, f.snapshot, signal), { code: 'CONFLICT' });
    assert.equal(p.calls.filter(call => call.op === 'read').length, outcomes.length === 1 ? 0 : 1);
  }
});

test('permission and document read errors propagate and no later document is read', async () => {
  const f = fixture(), signal = new AbortController().signal, forbidden = Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
  const denied = ports({ revalidate: async () => { throw forbidden; }, read: async () => { throw new Error('unexpected read'); } });
  await assert.rejects((await loader(denied)).load(request, conversationId, f.snapshot, signal), { code: 'FORBIDDEN' });
  assert.equal(denied.calls.some(call => call.op === 'read'), false);
  const unavailable = Object.assign(new Error('FILE_NOT_READY'), { code: 'FILE_NOT_READY' });
  const failed = ports({ read: async () => { throw unavailable; } });
  await assert.rejects((await loader(failed)).load(request, conversationId, f.snapshot, signal), { code: 'FILE_NOT_READY' });
  assert.equal(failed.calls.filter(call => call.op === 'read').length, 1);
  assert.equal(failed.calls.filter(call => call.op === 'revalidate').length, 1);
});

test('file count and aggregate size are rejected before document I/O', async () => {
  const signal = new AbortController().signal;
  for (const tooLarge of [false, true]) {
    const f = fixture(tooLarge ? 2 : 7);
    if (tooLarge) { f.snapshot.sources[0].files[0].sizeBytes = 10_000_001; f.snapshot.sources[1].files[0].sizeBytes = 10_000_000; }
    const p = ports({ read: async () => { throw new Error('unexpected read'); } });
    await assert.rejects((await loader(p)).load(request, conversationId, f.snapshot, signal), { code: 'AI_INPUT_LIMIT' });
    assert.equal(p.calls.some(call => call.op === 'read'), false);
  }
});

test('aborted signal rejects without continuing further document reads', async () => {
  const f = fixture(), before = new AbortController(); before.abort();
  const p = ports({ read: async () => { throw new Error('unexpected read'); } });
  await assert.rejects((await loader(p)).load(request, conversationId, f.snapshot, before.signal));
  assert.equal(p.calls.some(call => call.op === 'read'), false);
  const during = new AbortController(), q = ports({ read: async () => { during.abort(); return f.parsed[0]; } });
  await assert.rejects((await loader(q)).load(request, conversationId, f.snapshot, during.signal));
  assert.equal(q.calls.filter(call => call.op === 'read').length, 1);
});

test('assembler validates documents only after final snapshot revalidation', async () => {
  const f = fixture(1), signal = new AbortController().signal;
  const p = ports({ outcomes: [true, false], read: async () => ({ ...f.parsed[0], digest: 'b'.repeat(64) }) });
  await assert.rejects((await loader(p)).load(request, conversationId, f.snapshot, signal), { code: 'CONFLICT' });
  assert.deepEqual(p.calls.map(call => call.op), ['revalidate', 'read', 'revalidate']);
});
