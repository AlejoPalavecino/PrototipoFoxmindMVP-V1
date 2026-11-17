import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAiDatabase, aiFixture, rollbackCase, transactionDatabase } from './classroom-ai-database.test.mjs';

const ai = () => Promise.all([import("../apps/api/src/modules/curriculum/generation/infrastructure/ai/service.ts"),import("../apps/api/src/modules/curriculum/generation/infrastructure/ai/worker.ts")]).then(([m0,m1]) => Object.freeze({ClassroomAiService: m0.ClassroomAiService,ClassroomAiWorker: m1.ClassroomAiWorker}));
const units = [{ name: 'Luz', topics: [{ name: 'Exposición' }] }];
const configuration = { model: 'gemini-test-fixture', maxInputTokens: 100000, maxOutputTokens: 16384,
  deadlineMs: 1000, maxDispatches: 2, maxJobAgeMs: 300000, maxConcurrency: 2,
  dailyActorRequests: 5, dailyGlobalRequests: 20, dailyBudgetUsd: 10,
  inputUsdPerMillion: 1, outputUsdPerMillion: 2 };
function ports(database, fixture, override = {}) {
  const calls = [];
  return { database, configuration, calls, authenticate: async (_tx, request) => {
    if (!request?.actor) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
    return request.actor;
  }, reader: {
    snapshot: async (_tx, _req, draftId, fileId) => {
      if (draftId !== fixture.draftId || fileId !== fixture.fileId) throw Object.assign(new Error('FILE_NOT_READY'), { code: 'FILE_NOT_READY' });
      return { fileId, digest: fixture.digest, extension: 'pdf', sizeBytes: 14 };
    },
    read: async () => { calls.push('read'); return { kind: 'pdf', bytes: Uint8Array.from([37, 80, 68, 70]) }; },
  }, provider: {
    countStudyPlanTokens: async () => { calls.push('count'); return 20; },
    extractStudyPlan: async () => { calls.push('extract'); return { json: { units, warnings: [] }, inputTokens: 20, outputTokens: 30 }; },
  }, ...override };
}
const rejects = (operation, code) => assert.rejects(operation, { code });

test('C3 PostgreSQL source identity, private access and nonblocking start', { timeout: 120000 }, async t => {
  const { ClassroomAiService } = await ai();
  await withAiDatabase(async ({ pool }) => {
    await t.test('start is durable and reopens same source despite later unrelated revisions, no provider calls', async () => rollbackCase(pool, async local => {
      const f = await aiFixture(local.pool), p = ports(local.database, f), service = new ClassroomAiService(p);
      const first = await service.start(f.request, f.draftId, f.start);
      assert.equal(first.created, true); assert.equal(first.view.state, 'QUEUED');
      assert.equal(first.view.planFileId, f.fileId); assert.equal(first.view.proposal, null);
      await local.pool.query('UPDATE classroom_drafts SET revision=revision+1 WHERE id=$1', [f.draftId]);
      const second = await new ClassroomAiService(p).start(f.request, f.draftId, f.start);
      assert.equal(second.created, false); assert.equal(second.view.id, first.view.id);
      assert.equal((await service.get(f.request, f.draftId, first.view.id)).id, first.view.id);
      assert.deepEqual(p.calls, []);
      assert.equal((await local.pool.query('SELECT count(*)::int AS n FROM classroom_curriculum_extractions')).rows[0].n, 1);
    }));
    await t.test('foreign and missing draft/job expose equal denial; no unit mutation', async () => rollbackCase(pool, async local => {
      const f = await aiFixture(local.pool), service = new ClassroomAiService(ports(local.database, f));
      const { view } = await service.start(f.request, f.draftId, f.start);
      await rejects(service.get({ actor: f.strangerId }, f.draftId, view.id), 'FORBIDDEN');
      await rejects(service.get({ actor: f.strangerId }, randomUUID(), randomUUID()), 'FORBIDDEN');
      await rejects(service.start({ actor: f.strangerId }, f.draftId, f.start), 'FORBIDDEN');
      await rejects(service.start({}, f.draftId, f.start), 'FORBIDDEN');
      assert.deepEqual((await local.pool.query('SELECT payload FROM classroom_drafts WHERE id=$1', [f.draftId])).rows[0].payload, f.payload);
    }));
    await t.test('unverified actor, stale creation revision and wrong plan cannot enqueue', async () => rollbackCase(pool, async local => {
      const f = await aiFixture(local.pool), p = ports(local.database, f), service = new ClassroomAiService(p);
      await rejects(service.start(f.request, f.draftId, { ...f.start, revision: '0' }), 'CONFLICT');
      await rejects(service.start(f.request, f.draftId, { ...f.start, planFileId: randomUUID() }), 'CONFLICT');
      await local.pool.query('UPDATE users SET email_verified_at=NULL WHERE id=$1', [f.ownerId]);
      await rejects(service.start(f.request, f.draftId, f.start), 'FORBIDDEN');
      assert.deepEqual(p.calls, []);
      assert.equal((await local.pool.query('SELECT count(*)::int n FROM classroom_curriculum_extractions')).rows[0].n, 0);
    }));
  });
});

test('C3 DOCX limitation warning is supplied by the server even when provider omits it', { timeout: 120000 }, async () => {
  const { ClassroomAiService, ClassroomAiWorker } = await ai();
  await withAiDatabase(async ({ pool, database }) => {
    const f = await aiFixture(pool), p = ports(database, f);
    p.reader.snapshot = async () => ({ fileId: f.fileId, digest: f.digest, extension: 'docx', sizeBytes: 14 });
    p.reader.read = async () => ({ kind: 'text', text: 'Unidad Luz; tema Exposición' });
    const service = new ClassroomAiService(p), { view } = await service.start(f.request, f.draftId, f.start);
    await new ClassroomAiWorker(p).runOnce();
    const ready = await service.get(f.request, f.draftId, view.id);
    assert.equal(ready.state, 'READY');
    assert.deepEqual(ready.proposal.warnings, ['DOCX_IMAGES_OMITTED']);
  });
});

test('C3/C4 worker proposal persistence and atomic reviewed apply', { timeout: 120000 }, async t => {
  const { ClassroomAiService, ClassroomAiWorker } = await ai();
  await withAiDatabase(async ({ pool }) => {
    const f = await aiFixture(pool), active = { count: 0 }, database = transactionDatabase(pool, active);
    const p = ports(database, f);
    for (const method of ['countStudyPlanTokens', 'extractStudyPlan']) {
      const original = p.provider[method]; p.provider[method] = async input => { assert.equal(active.count, 0, 'No provider I/O under transaction'); return original(input); };
    }
    const originalRead = p.reader.read; p.reader.read = async (...args) => { assert.equal(active.count, 0, 'No private bytes I/O under transaction'); return originalRead(...args); };
    let service = new ClassroomAiService(p);
    const { view } = await service.start(f.request, f.draftId, f.start);
    await t.test('two workers claim at most one dispatch and save proposal separately from manual units', async () => {
      const results = await Promise.all([new ClassroomAiWorker(p).runOnce(), new ClassroomAiWorker(p).runOnce()]);
      assert.equal(results.filter(Boolean).length, 1);
      service = new ClassroomAiService(p);
      const ready = await service.get(f.request, f.draftId, view.id);
      assert.equal(ready.state, 'READY'); assert.deepEqual(ready.proposal, { units, warnings: [] });
      assert.equal(p.calls.filter(x => x === 'extract').length, 1);
      assert.deepEqual((await pool.query('SELECT payload FROM classroom_drafts WHERE id=$1', [f.draftId])).rows[0].payload, f.payload);
    });
    await t.test('stale apply cannot overwrite manual data and exact idempotent apply returns current draft', async () => {
      await pool.query(`UPDATE classroom_drafts SET revision=revision+1,payload=jsonb_set(payload,'{subject}','"Actualizada"') WHERE id=$1`, [f.draftId]);
      const requestId = randomUUID(), edited = [{ name: 'Revisada por docente', topics: [{ name: 'Tema corregido' }] }];
      await rejects(service.apply(f.request, f.draftId, view.id, { revision: '1', requestId, units: edited }), 'CONFLICT');
      const applied = await service.apply(f.request, f.draftId, view.id, { revision: '2', requestId, units: edited });
      assert.equal(applied.extractionId, view.id); assert.equal(applied.appliedRevision, '3');
      assert.deepEqual(applied.draft.payload.units, edited); assert.equal(applied.draft.payload.subject, 'Actualizada');
      assert.equal((await service.get(f.request, f.draftId, view.id)).state, 'APPLIED');
      await pool.query(`UPDATE classroom_drafts SET revision=revision+1,payload=jsonb_set(payload,'{name}','"Edición posterior"') WHERE id=$1`, [f.draftId]);
      const replay = await service.apply(f.request, f.draftId, view.id, { revision: '2', requestId, units: edited });
      assert.equal(replay.appliedRevision, '3'); assert.equal(replay.draft.revision, '4');
      assert.equal(replay.draft.payload.name, 'Edición posterior');
      await rejects(service.apply(f.request, f.draftId, view.id, { revision: '2', requestId, units }), 'CONFLICT');
      await rejects(service.apply(f.request, f.draftId, view.id, { revision: '4', requestId: randomUUID(), units }), 'CONFLICT');
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM classrooms')).rows[0].n, 0);
    });
  });
});
