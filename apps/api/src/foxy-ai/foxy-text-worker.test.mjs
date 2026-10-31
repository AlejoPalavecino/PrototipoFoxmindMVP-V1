import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const lease = { turnId: randomUUID(), ownerId: randomUUID(), conversationId: randomUUID(), leaseNonce: randomUUID() };
const configuration = { model: 'synthetic', maxInputTokens: 1000, deadlineMs: 10000, maxJobAgeMs: 300000 };
const response = { schemaVersion: 'foxy-text-response-v1', status: 'READY', title: 'Resumen', markdown: 'Texto',
  references: [], warnings: ['Aviso'], missingInformation: [] };
const grounding = { context: { kind: 'GENERAL' }, curriculum: null, sources: [], documents: [], referenceMap: [], warnings: ['Fuente'] };
function fixture(settings = {}) {
  const calls = [], capability = {}, scope = { capability, snapshot: { context: { kind: 'GENERAL' }, curriculum: null, sources: [] }, documents: [] };
  const hit = (op, ...args) => calls.push({ op, args });
  const database = { $transaction: async fn => { hit('transaction'); if (settings.dbError) throw Error('db'); return fn({ $queryRawUnsafe: async () => [] }); } };
  const queue = { claim: async () => { hit('claim'); return settings.idle ? null : lease; } };
  const turns = { loadClaimed: async () => { hit('turn'); return { purpose: 'SUMMARY', message: 'Resumí',
    metadata: { model: 'synthetic', promptVersion: 'foxy-chat-v2', schemaVersion: 'foxy-answer-v1' } }; } };
  const authority = { open: async () => { hit('open'); return scope; }, close: s => hit('close', s),
    authorizeClaim: async (...args) => { hit('authorize', ...args); return { ...lease, snapshot: scope.snapshot }; },
    revalidateGrounding: async (...args) => { hit('revalidate', ...args); return !settings.staleBefore; } };
  const loader = { load: async () => { hit('load'); if (settings.abortBefore) throw Object.assign(Error('timeout'), { code: 'AI_TIMEOUT' }); return grounding; } };
  const budget = { reserve: async (...args) => { hit('reserve', ...args); return settings.reservation ?? 'RESERVED'; } };
  const provider = { countTokens: async () => { hit('count'); return 20; }, generate: async () => { hit('generate');
    if (settings.abortAfter) throw Object.assign(Error('timeout'), { code: 'PROVIDER_OUTCOME_UNKNOWN' });
    return { json: settings.invalid ? { ...response, references: [{ sourceKey: 's999', documentKey: null, page: null }] } : response,
      inputTokens: 20, outputTokens: 10 }; } };
  const completion = { finish: async (...args) => { hit('finish', ...args); return !settings.lost; } };
  return { calls, scope, options: { database, queue, authority, loader, turns, budget, completion, provider, configuration } };
}
async function run(f) { const api = await import('./worker.ts'); assert.equal(typeof api.createFoxyTextWorker, 'function');
  return api.createFoxyTextWorker(f.options).runOnce(); }
const names = f => f.calls.map(x => x.op);
const result = f => f.calls.find(x => x.op === 'finish')?.args[1];

test('idle worker does not open or dispatch', async () => {
  const f = fixture({ idle: true }); assert.equal(await run(f), false); assert.deepEqual(names(f), ['claim']);
});

test('success preflights, revalidates and reserves before one dispatch, then finishes and closes', async () => {
  const f = fixture(); assert.equal(await run(f), true); const n = names(f);
  for (const op of ['claim','turn','open','load','count','transaction','revalidate','reserve','generate','finish','close']) assert.ok(n.includes(op), op);
  assert.ok(n.indexOf('count') < n.indexOf('reserve') && n.indexOf('revalidate') < n.indexOf('reserve') && n.indexOf('reserve') < n.indexOf('generate'));
  assert.equal(n.filter(x => x === 'generate').length, 1); assert.equal(result(f).state, 'READY');
  assert.ok(result(f).answer.warnings.includes('Aviso')); assert.equal(f.calls.at(-1).op, 'close');
});

for (const [reservation, code] of [['NO_BUDGET','AI_BUDGET_EXCEEDED'], ['ALREADY_DISPATCHED','PROVIDER_OUTCOME_UNKNOWN']])
  test(`${reservation} never dispatches`, async () => { const f = fixture({ reservation }); await run(f);
    assert.equal(names(f).includes('generate'), false); assert.equal(result(f).state, 'FAILED'); assert.equal(result(f).errorCode, code);
    assert.equal(names(f).filter(x => x === 'close').length, 1); });

test('stale grounding and abort before dispatch never call provider generation', async () => {
  for (const options of [{ staleBefore: true }, { abortBefore: true }, { reservation: 'NOT_CURRENT' }, { dbError: true }]) {
    const f = fixture(options); try { await run(f); } catch {} assert.equal(names(f).includes('generate'), false);
    assert.equal(names(f).filter(x => x === 'close').length, 1);
  }
});

test('uncertain dispatch and invalid output are terminal without retry', async () => {
  for (const [options, code] of [[{ abortAfter: true }, 'PROVIDER_OUTCOME_UNKNOWN'], [{ invalid: true }, 'INVALID_AI_OUTPUT']]) {
    const f = fixture(options); await run(f); assert.equal(names(f).filter(x => x === 'generate').length, 1);
    assert.equal(result(f).state, 'FAILED'); assert.equal(result(f).errorCode, code); assert.equal(names(f).filter(x => x === 'close').length, 1);
  }
});

test('lost lease on completion never triggers a second dispatch', async () => {
  const f = fixture({ lost: true }); await run(f); assert.equal(names(f).filter(x => x === 'generate').length, 1);
  assert.equal(names(f).filter(x => x === 'finish').length, 1); assert.equal(names(f).filter(x => x === 'close').length, 1);
});

test('a citation identifies the exact authorized PDF when an activity has two documents', async () => {
  const f = fixture(), classroomId = randomUUID(), sourceId = `activity:${randomUUID()}`;
  f.scope.snapshot = { context: { kind: 'CLASSROOM', classroomId }, curriculum: null, sources: [] };
  const document = key => ({ documentKey: key, sourceKeys: ['s1'], document: { kind: 'pdf', bytes: Uint8Array.of(37, 80, 68, 70) }, pageCount: 2, warnings: [] });
  const grounded = { context: { kind: 'CLASSROOM', classroomId }, curriculum: { units: [], selectedTopicIds: [] },
    sources: [{ sourceKey: 's1', title: 'Actividad', kind: 'ACTIVITY', text: 'Consigna', documentKeys: ['d1', 'd2'] }],
    documents: [document('d1'), document('d2')], referenceMap: [{ sourceKey: 's1', sourceId, documentKeys: ['d1', 'd2'] }], warnings: [] };
  f.options.loader.load = async () => grounded;
  f.options.provider.generate = async () => ({ json: { ...response, references: [{ sourceKey: 's1', documentKey: 'd2', page: 1 }] }, inputTokens: 20, outputTokens: 10 });
  await run(f); const outcome = result(f); assert.equal(outcome.state, 'READY');
  const findCitation = value => value && typeof value === 'object' &&
    ((value.sourceId === sourceId && value.documentKey === 'd2' && value.page === 1) || Object.values(value).some(findCitation));
  assert.ok(findCitation(outcome.answer) || findCitation(outcome.referenceMap) || findCitation(outcome.sourceReport),
    'persisted answer or private metadata must bind the authorized source to the cited document and page');
});
