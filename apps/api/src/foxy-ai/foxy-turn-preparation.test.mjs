import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const api = () => import('./turn-preparation.ts');
const configuration = { model: 'synthetic-model', maxInputTokens: 100000 };
const lease = { turnId: randomUUID(), ownerId: randomUUID(), conversationId: randomUUID(), leaseNonce: randomUUID() };
function data() {
  const classroomId = randomUUID(), unitId = randomUUID(), topicId = randomUUID(), sourceId = `material:${randomUUID()}`;
  const grounding = { context: { kind: 'CLASSROOM', classroomId },
    curriculum: { units: [{ id: unitId, name: 'Unidad', topics: [{ id: topicId, name: 'Tema', status: 'NEXT' }] }], selectedTopicIds: [topicId] },
    sources: [{ sourceKey: 's1', title: 'Material', kind: 'MATERIAL', text: 'Contenido de muestra', documentKeys: ['d1'] }],
    documents: [{ documentKey: 'd1', sourceKeys: ['s1'], document: { kind: 'pdf', bytes: Uint8Array.of(37, 80, 68, 70) }, pageCount: 1, warnings: [] }],
    referenceMap: [{ sourceKey: 's1', sourceId, documentKeys: ['d1'] }], warnings: [] };
  return { grounding, ids: [classroomId, unitId, topicId, sourceId, lease.ownerId, lease.conversationId, lease.turnId, lease.leaseNonce] };
}
function fixture({ payload, count = 12, openError, loadError, groundingError, onCount } = {}) {
  const calls = [], scope = { capability: Object.freeze({}), snapshot: {}, documents: [] }, f = data();
  const value = payload ?? { purpose: 'SUMMARY', message: 'Resumí', metadata: { model: 'synthetic-model', promptVersion: 'foxy-chat-v2', schemaVersion: 'foxy-answer-v1' } };
  const turns = { loadClaimed: async actualLease => { calls.push(['turn', actualLease]); if (loadError) throw loadError; return value; } };
  const authority = { open: async (actualLease, signal) => { calls.push(['open', actualLease, signal]); if (openError) throw openError; return scope; },
    close: actualScope => { calls.push(['close', actualScope]); } };
  const loader = { load: async (actualScope, signal) => { calls.push(['grounding', actualScope, signal]); if (groundingError) throw groundingError; return f.grounding; } };
  const provider = { countTokens: async projected => { calls.push(['count', projected]); if (onCount) await onCount(); return count; } };
  return { calls, scope, turns, authority, loader, provider, value, ...f };
}
async function preparation(f) {
  const { createFoxyTurnPreparation } = await api(); assert.equal(typeof createFoxyTurnPreparation, 'function');
  return createFoxyTurnPreparation({ turns: f.turns, authority: f.authority, loader: f.loader, provider: f.provider, configuration });
}

test('prepares a claimed turn once with versioned metadata and private-free provider input', async () => {
  const f = fixture(), signal = new AbortController().signal, result = await (await preparation(f)).prepare(lease, signal);
  assert.equal(result.scope, f.scope); assert.equal(result.count, 12); assert.equal(result.input.signal, signal);
  assert.equal(result.input.mode, 'CLASSROOM'); assert.equal(result.input.purpose, 'SUMMARY'); assert.equal(result.input.message, 'Resumí');
  assert.deepEqual(result.input.curriculum.units[0].topics, [{ name: 'Tema', status: 'NEXT', selected: true }]);
  const exposed = JSON.stringify({ ...result.input, signal: null });
  for (const id of f.ids) assert.equal(exposed.includes(id), false);
  assert.equal(exposed.includes('referenceMap'), false); assert.equal(exposed.includes('sourceId'), false);
  assert.equal(f.calls.filter(call => call[0] === 'count').length, 1); assert.equal(f.calls.some(call => call[0] === 'close'), false);
  assert.deepEqual(f.calls.find(call => call[0] === 'turn'), ['turn', lease]);
  assert.deepEqual(f.calls.find(call => call[0] === 'open'), ['open', lease, signal]);
  assert.deepEqual(f.calls.find(call => call[0] === 'grounding'), ['grounding', f.scope, signal]);
});

test('incompatible model, prompt or stored answer schema fails before counting and closes scope', async () => {
  const base = { purpose: 'CHAT', message: 'Hola', metadata: { model: 'synthetic-model', promptVersion: 'foxy-chat-v2', schemaVersion: 'foxy-answer-v1' } };
  for (const metadata of [{ ...base.metadata, model: 'different-model' }, { ...base.metadata, promptVersion: 'other' },
    { ...base.metadata, schemaVersion: 'foxy-text-response-v1' }, { ...base.metadata, schemaVersion: 'other' }]) {
    const f = fixture({ payload: { ...base, metadata } }); await assert.rejects((await preparation(f)).prepare(lease, new AbortController().signal));
    assert.equal(f.calls.some(call => call[0] === 'count'), false);
    if (f.calls.some(call => call[0] === 'open')) assert.ok(f.calls.some(call => call[0] === 'close' && call[1] === f.scope));
  }
});

test('unavailable lease or stale grounding fails without provider count and closes any opened scope', async () => {
  for (const setting of [{ openError: Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }) },
    { loadError: Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }) },
    { groundingError: Object.assign(new Error('CONFLICT'), { code: 'CONFLICT' }) }]) {
    const f = fixture(setting); await assert.rejects((await preparation(f)).prepare(lease, new AbortController().signal));
    assert.equal(f.calls.some(call => call[0] === 'count'), false);
    if (f.calls.some(call => call[0] === 'open') && !setting.openError) assert.ok(f.calls.some(call => call[0] === 'close' && call[1] === f.scope));
  }
});

test('invalid or excessive count cannot be dispatched and closes the opened scope', async () => {
  for (const count of [0, -1, 1.5, NaN, null, 100001]) {
    const f = fixture({ count }); await assert.rejects((await preparation(f)).prepare(lease, new AbortController().signal));
    assert.equal(f.calls.filter(call => call[0] === 'count').length, 1);
    assert.ok(f.calls.some(call => call[0] === 'close' && call[1] === f.scope));
  }
});

test('abort before work or during preflight fails without returning an open scope', async () => {
  const before = new AbortController(); before.abort(); const f = fixture();
  await assert.rejects((await preparation(f)).prepare(lease, before.signal));
  assert.equal(f.calls.filter(call => ['open', 'turn', 'grounding', 'count'].includes(call[0])).length, 0);
  const during = new AbortController(), g = fixture({ onCount: async () => during.abort() });
  await assert.rejects((await preparation(g)).prepare(lease, during.signal));
  assert.ok(g.calls.some(call => call[0] === 'close' && call[1] === g.scope));
});
