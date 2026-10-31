import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';

const api = () => import('./index.ts');
function fixture(count = 2) {
  const classroomId = randomUUID(), claim = Object.freeze({}), parsed = [], docs = [];
  const sources = Array.from({ length: count }, (_, i) => {
    const bytes = Uint8Array.of(i + 1, 2, 3), digest = createHash('sha256').update(bytes).digest('hex'), fileId = randomUUID();
    const file = { fileId, digest, extension: 'pdf', sizeBytes: bytes.length, purpose: 'material', targetId: null };
    const capability = Object.freeze({}); docs.push({ capability, descriptor: { classroomId, file } });
    parsed.push({ fileId, digest, document: { kind: 'pdf', bytes }, pageCount: 1, warnings: [] });
    return { sourceId: `material:${randomUUID()}`, title: `Fuente ${i}`, kind: 'MATERIAL', text: '', files: [file] };
  });
  const snapshot = { context: { kind: 'CLASSROOM', classroomId }, curriculum: { units: [], selectedTopicIds: [] }, sources };
  return { snapshot, parsed, scope: { capability: claim, snapshot: structuredClone(snapshot), documents: docs }, claim, ownerId: randomUUID(), conversationId: randomUUID() };
}
function ports(f, { freshness = [true, true], onRead, onAuthorize } = {}) {
  const calls = [], grants = f.scope.documents.map(entry => ({ capability: entry.capability, descriptor: structuredClone(entry.descriptor) }));
  const authority = {
    authorizeClaim: async (cap, signal) => {
      calls.push({ op: 'authorizeClaim', cap, signal });
      if (cap !== f.claim || signal.aborted) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
      if (onAuthorize) await onAuthorize();
      return { ownerId: f.ownerId, conversationId: f.conversationId, snapshot: structuredClone(f.snapshot) };
    },
    authorizeDocument: async (cap, signal) => {
      calls.push({ op: 'authorizeDocument', cap, signal });
      const entry = grants.find(item => item.capability === cap);
      if (!entry || signal.aborted) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
      return { ownerId: f.ownerId, conversationId: f.conversationId, ...structuredClone(entry.descriptor) };
    },
    revalidateGrounding: async (cap, signal) => {
      calls.push({ op: 'revalidate', cap, signal });
      if (cap !== f.claim || signal.aborted) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
      return freshness.shift();
    }
  };
  const documents = { read: async (cap, signal) => {
    calls.push({ op: 'read', cap, signal });
    if (onRead) return onRead(cap, signal);
    const index = grants.findIndex(item => item.capability === cap);
    if (index < 0) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
    return f.parsed[index];
  } };
  return { authority, documents, calls };
}
async function loader(p) {
  const { createFoxyDurableLoader } = await api(); assert.equal(typeof createFoxyDurableLoader, 'function');
  return createFoxyDurableLoader({ authority: p.authority, documents: p.documents });
}

test('durable loader authorizes, checks grounding twice and reads emitted capabilities in order', async () => {
  const f = fixture(), signal = new AbortController().signal; let active = 0, maximum = 0;
  const p = ports(f, { onRead: async cap => { active++; maximum = Math.max(maximum, active); await Promise.resolve(); active--;
    const index = f.scope.documents.findIndex(item => item.capability === cap); return f.parsed[index]; } });
  const result = await (await loader(p)).load(f.scope, signal);
  assert.equal(p.calls.filter(c => c.op === 'authorizeClaim').length >= 1, true);
  const checks = p.calls.map((c, i) => c.op === 'revalidate' ? i : -1).filter(i => i >= 0);
  const reads = p.calls.map((c, i) => c.op === 'read' ? i : -1).filter(i => i >= 0);
  assert.equal(checks.length, 2); assert.equal(reads.length, 2); assert.ok(checks[0] < reads[0] && checks[1] > reads[1]);
  assert.deepEqual(p.calls.filter(c => c.op === 'read').map(c => c.cap), f.scope.documents.map(d => d.capability));
  assert.ok(p.calls.every(c => c.signal === signal)); assert.equal(maximum, 1);
  assert.equal(result.documents.length, 2); assert.deepEqual(result.referenceMap.map(x => x.sourceId), f.snapshot.sources.map(s => s.sourceId));
});

test('general context validates without document reads', async () => {
  const f = fixture(0); f.snapshot = { context: { kind: 'GENERAL' }, curriculum: null, sources: [] }; f.scope.snapshot = structuredClone(f.snapshot);
  const p = ports(f), result = await (await loader(p)).load(f.scope, new AbortController().signal);
  assert.deepEqual(result.sources, []); assert.deepEqual(result.documents, []);
  assert.equal(p.calls.filter(c => c.op === 'revalidate').length, 2); assert.equal(p.calls.some(c => c.op === 'read'), false);
});

test('forged or altered visible snapshot cannot trigger document I/O', async () => {
  for (const mode of ['claim', 'snapshot', 'missing-document', 'descriptor']) {
    const f = fixture(), p = ports(f), signal = new AbortController().signal;
    if (mode === 'claim') f.scope.capability = {};
    if (mode === 'snapshot') f.scope.snapshot.sources[0].title = 'Falsificado';
    if (mode === 'missing-document') f.scope.documents.pop();
    if (mode === 'descriptor') f.scope.documents[0].descriptor.file.fileId = randomUUID();
    await assert.rejects((await loader(p)).load(f.scope, signal));
    assert.equal(p.calls.some(c => c.op === 'read'), false, mode);
  }
});

test('document capabilities from a different owner or conversation are rejected before I/O', async () => {
  for (const field of ['ownerId', 'conversationId']) {
    const f = fixture(), p = ports(f), original = p.authority.authorizeDocument;
    p.authority.authorizeDocument = async (...args) => ({ ...await original(...args), [field]: randomUUID() });
    await assert.rejects((await loader(p)).load(f.scope, new AbortController().signal));
    assert.equal(p.calls.some(c => c.op === 'read'), false);
  }
});

test('stale grounding before or after I/O fails without a partial result', async () => {
  for (const freshness of [[false], [true, false]]) {
    const f = fixture(1), p = ports(f, { freshness: [...freshness] });
    await assert.rejects((await loader(p)).load(f.scope, new AbortController().signal), { code: 'CONFLICT' });
    assert.equal(p.calls.filter(c => c.op === 'read').length, freshness.length === 1 ? 0 : 1);
  }
});

test('authorization and document errors stop the flow with no later reads', async () => {
  const f = fixture(), forbidden = Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
  const denied = ports(f, { onAuthorize: async () => { throw forbidden; } });
  await assert.rejects((await loader(denied)).load(f.scope, new AbortController().signal), { code: 'FORBIDDEN' });
  assert.equal(denied.calls.some(c => c.op === 'read'), false);
  const failed = ports(f, { onRead: async () => { throw Object.assign(new Error('FILE_NOT_READY'), { code: 'FILE_NOT_READY' }); } });
  await assert.rejects((await loader(failed)).load(f.scope, new AbortController().signal), { code: 'FILE_NOT_READY' });
  assert.equal(failed.calls.filter(c => c.op === 'read').length, 1);
});

test('oversize selection and abort are rejected before or during document I/O', async () => {
  for (const mode of ['count', 'size']) {
    const f = fixture(mode === 'count' ? 7 : 2);
    if (mode === 'size') { f.snapshot.sources[0].files[0].sizeBytes = 10_000_001; f.snapshot.sources[1].files[0].sizeBytes = 10_000_000; f.scope.snapshot = structuredClone(f.snapshot);
      f.scope.documents[0].descriptor.file.sizeBytes = 10_000_001; f.scope.documents[1].descriptor.file.sizeBytes = 10_000_000; }
    const p = ports(f); await assert.rejects((await loader(p)).load(f.scope, new AbortController().signal), { code: 'AI_INPUT_LIMIT' });
    assert.equal(p.calls.some(c => c.op === 'read'), false);
  }
  const f = fixture(), before = new AbortController(), p = ports(f); before.abort();
  await assert.rejects((await loader(p)).load(f.scope, before.signal)); assert.equal(p.calls.some(c => c.op === 'read'), false);
  const during = new AbortController(), q = ports(f, { onRead: async () => { during.abort(); return f.parsed[0]; } });
  await assert.rejects((await loader(q)).load(f.scope, during.signal)); assert.equal(q.calls.filter(c => c.op === 'read').length, 1);
});
