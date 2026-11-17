import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAiDatabase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';
const ai = () => Promise.all([import("../apps/api/src/modules/activities/generation/infrastructure/activity-ai/service.ts"),import("../apps/api/src/modules/activities/generation/infrastructure/activity-ai/worker.ts"),import("../apps/api/src/modules/activities/generation/infrastructure/activity-ai/provenance.ts")]).then(([m0,m1,m2]) => Object.freeze({ActivityAiService: m0.ActivityAiService,ActivityAiWorker: m1.ActivityAiWorker,validateActivityGeneration: m2.validateActivityGeneration}));

test('A2/A3 all selected sources reach token preflight and generation in order without silent omission', { timeout: 120000 }, async () => {
  const { ActivityAiService, ActivityAiWorker } = await ai();
  await withAiDatabase(async local => {
    const f = await fixture(local), second = `material:${randomUUID()}`, sourceIds = [f.sourceId, second];
    const contents = new Map(sourceIds.map((sourceId, i) => [sourceId, { sourceId, document: { kind: 'text', text: `Concepto sintético ${i}` }, pageCount: null, warnings: ['DOCX_IMAGES_OMITTED'] }]));
    f.start.sourceIds = sourceIds; f.start.acknowledgedWarnings = ['DOCX_IMAGES_OMITTED'];
    f.options.reader.snapshot = async (_tx, _req, _room, sourceId) => ({ sourceId, fileId: sourceId === f.sourceId ? f.fileId : randomUUID(), digest: 'a'.repeat(64), extension: 'docx', sizeBytes: 100 });
    // Stable identities across every authorization boundary are part of the fixture contract.
    const snapshots = new Map(); const snapshot = f.options.reader.snapshot;
    f.options.reader.snapshot = async (...args) => { const sourceId = args[3]; if (!snapshots.has(sourceId)) snapshots.set(sourceId, await snapshot(...args)); return snapshots.get(sourceId); };
    f.options.reader.read = async grant => contents.get(grant.sourceId);
    const proposal = { ...f.proposal, evidence: f.proposal.evidence.map(x => ({ ...x, references: [{ sourceId: f.sourceId, page: null }] })) };
    const seen = [];
    f.options.provider.countActivityTokens = async input => { seen.push(['count', input.sources]); return 20; };
    f.options.provider.generateActivity = async input => { seen.push(['generate', input.sources]); return { json: { status: 'READY', proposal }, inputTokens: 20, outputTokens: 30 }; };
    const service = new ActivityAiService(f.options), { view } = await service.start(f.T, f.room, f.start);
    await new ActivityAiWorker(f.options).runOnce();
    const ready = await service.get(f.T, f.room, view.id); assert.equal(ready.state, 'READY');
    assert.deepEqual(seen.map(([kind]) => kind), ['count', 'generate']);
    for (const [, sources] of seen) assert.deepEqual(sources.map(x => x.sourceId), sourceIds);
    assert.ok(ready.proposal.warnings.includes('DOCX_IMAGES_OMITTED'));
    assert.equal(ready.sourceReport.length, 2);
    for (const item of ready.sourceReport) { assert.equal(Object.hasOwn(item, 'text'), false); assert.equal(Object.hasOwn(item, 'bytes'), false); }
  });
});

test('A2/A3 aggregate bytes, PDF pages and DOCX characters fail before generation with no truncation', { timeout: 120000 }, async t => {
  const { ActivityAiService, ActivityAiWorker } = await ai();
  for (const bound of ['bytes', 'pages', 'text']) await t.test(bound, () => withAiDatabase(async local => {
    const f = await fixture(local), sourceIds = [f.sourceId, `material:${randomUUID()}`], extension = bound === 'text' ? 'docx' : 'pdf';
    const ids = sourceIds.map(() => randomUUID()); f.start.sourceIds = sourceIds;
    if (extension === 'docx') f.start.acknowledgedWarnings = ['DOCX_IMAGES_OMITTED'];
    f.options.reader.snapshot = async (_tx, _req, _room, sourceId) => ({ sourceId, fileId: ids[sourceIds.indexOf(sourceId)],
      digest: 'a'.repeat(64), extension, sizeBytes: bound === 'bytes' ? 10000001 : 100 });
    f.options.reader.read = async grant => ({ sourceId: grant.sourceId, document: bound === 'text'
      ? { kind: 'text', text: 'x'.repeat(100001) } : { kind: 'pdf', bytes: Uint8Array.from([37, 80, 68, 70]) },
    pageCount: bound === 'pages' ? 51 : extension === 'pdf' ? 1 : null, warnings: extension === 'docx' ? ['DOCX_IMAGES_OMITTED'] : [] });
    const service = new ActivityAiService(f.options);
    let started;
    try { started = await service.start(f.T, f.room, f.start); }
    catch (error) { assert.equal(error.code, 'AI_INPUT_LIMIT'); assert.equal(f.calls.filter(x => x === 'generate').length, 0); return; }
    await new ActivityAiWorker(f.options).runOnce();
    const result = await service.get(f.T, f.room, started.view.id);
    assert.equal(result.state, 'FAILED'); assert.equal(result.error, 'AI_INPUT_LIMIT');
    assert.equal(f.calls.filter(x => x === 'generate').length, 0);
  }));
});

test('A2/A3 Word image omission must be acknowledged before enqueueing or source disclosure', { timeout: 120000 }, async () => {
  const { ActivityAiService } = await ai();
  await withAiDatabase(async local => {
    const f = await fixture(local); f.state.extension = 'docx';
    await assert.rejects(new ActivityAiService(f.options).start(f.T, f.room, f.start), { code: 'INVALID_INPUT' });
    assert.deepEqual(f.calls, []);
  });
});
