import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../tests/agenda-database-helpers.test.mjs";
import { transactionDatabase } from "../../../../../../../tests/classroom-ai-database.test.mjs";
import { homeFixture } from "../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const input = (context = { kind: 'GENERAL' }) => ({ requestId: randomUUID(), title: 'Conversación', context });
const isCode = (...codes) => error => codes.includes(error?.code);
const visible = value => { assert.deepEqual(Object.keys(value).sort(), ['context','id','revision','title']); };
async function setup(pool) {
  const api = await Promise.all([import("../conversation-repository.ts"),import("../context-catalog.ts"),import("../assemble-grounding.ts"),import("../grounding-snapshot.ts"),import("../grounding-loader.ts"),import("../turn-repository.ts"),import("../turn-queue.ts"),import("../text-budget.ts"),import("../claim-authority.ts"),import("../durable-loader.ts"),import("../provider-input.ts"),import("../turn-completion.ts"),import("../turn-claimed-reader.ts"),import("../turn-preparation.ts"),import("../worker.ts"),import("../unit-of-work.ts"),import("../../../../bootstrap/foxy-service-factories.ts"),import("../../presentation/http.ts"),import("../citation-mapping.ts"),import("../../../../bootstrap/foxy-runtime.ts"),import("../../../../bootstrap/foxy-host.ts"),import("../turn-recovery.ts"),import("../resource-repository.ts"),import("../publication-repository.ts"),import("../publication-queue.ts"),import("../publication-file-allocator.ts"),import("../publication-authority.ts"),import("../publication-completion.ts"),import("../pdf-worker.ts"),import("../publication-worker.ts"),import("../publication-confirmation-repository.ts"),import("../../application/publication-service.ts"),import("../publication-file-reader.ts"),import("../publication-management-repository.ts"),import("../publication-cleanup.ts"),import("../../application/publication-management-service.ts"),import("../visual-configuration.ts"),import("../../../../bootstrap/foxy-visual-host-providers.ts"),import("../private-asset-read-repository.ts"),import("../private-asset-reader.ts"),import("../../application/private-asset-read-service.ts"),import("../private-asset-discard-repository.ts"),import("../../application/private-asset-discard-service.ts"),import("../creation-repository.ts"),import("../../application/creation-service.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService})); assert.equal(typeof api.createFoxyConversationService, 'function');
  const query = async (sql, ...args) => (await pool.query(sql, args)).rows, f = await homeFixture(query);
  const database = transactionDatabase(pool), authenticate = async (_tx, request) => {
    if (request.revoked) throw Object.assign(Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' }); return request.id;
  };
  const uow = api.createFoxyUnitOfWork({ database, authenticate });
  const service = api.createFoxyConversationService({ uow, conversations: api.createFoxyConversationRepository() });
  return { f, service, query, owner: { id: f.teacherActor }, other: { id: f.other }, student: { id: f.pupil } };
}

test('conversation service creates general context idempotently and returns only public fields', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const { service, owner } = await setup(pool), request = input();
    const first = await service.create(owner, request); assert.equal(first.created, true); visible(first.conversation);
    const replay = await service.create(owner, { context: { kind: 'GENERAL' }, title: request.title, requestId: request.requestId });
    assert.equal(replay.created, false); assert.equal(replay.conversation.id, first.conversation.id);
    await assert.rejects(service.create(owner, { ...request, title: 'Distinto' }), isCode('CONFLICT'));
    const view = await service.get(owner, first.conversation.id); visible(view); assert.deepEqual(view.context, request.context);
    assert.ok((await service.list(owner, { limit: 20 })).items.some(c => c.id === view.id));
  });
});

test('classroom context requires an active classroom owned by the teacher', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { f, service, owner, student } = await setup(pool);
    const created = await service.create(owner, input({ kind: 'CLASSROOM', classroomId: f.rooms.teach.id }));
    assert.deepEqual(created.conversation.context, { kind: 'CLASSROOM', classroomId: f.rooms.teach.id });
    for (const classroomId of [f.rooms.foreign.id, f.rooms.archived.id, randomUUID()])
      await assert.rejects(service.create(owner, input({ kind: 'CLASSROOM', classroomId })), isCode('FORBIDDEN', 'NOT_FOUND', 'CONFLICT'));
    await assert.rejects(service.create(student, input()), isCode('FORBIDDEN'));
    await assert.rejects(service.create({ ...owner, revoked: true }, input()), isCode('AUTH_REQUIRED', 'FORBIDDEN'));
  });
});

test('owner isolation, revision CAS, and confirmed logical deletion', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { service, owner, other } = await setup(pool);
    const { conversation: c } = await service.create(owner, input());
    await assert.rejects(service.get(other, c.id), isCode('NOT_FOUND', 'FORBIDDEN'));
    assert.equal((await service.list(other, { limit: 20 })).items.some(item => item.id === c.id), false);
    await assert.rejects(service.rename(other, c.id, { revision: c.revision, title: 'Ajena' }), isCode('NOT_FOUND', 'FORBIDDEN'));
    const renamed = await service.rename(owner, c.id, { revision: c.revision, title: 'Nueva' }); visible(renamed);
    assert.equal(renamed.title, 'Nueva'); assert.notEqual(renamed.revision, c.revision);
    await assert.rejects(service.rename(owner, c.id, { revision: c.revision, title: 'Obsoleta' }), isCode('CONFLICT'));
    await assert.rejects(service.remove(owner, c.id, { revision: renamed.revision, confirm: false }), isCode('INVALID_INPUT'));
    assert.equal((await service.get(owner, c.id)).title, 'Nueva');
    await service.remove(owner, c.id, { revision: renamed.revision, confirm: true });
    await assert.rejects(service.get(owner, c.id), isCode('NOT_FOUND', 'FORBIDDEN'));
  });
});

test('conversation pages use stable millisecond timestamp and ID cursors without cross-owner leakage', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { service, owner, other, query } = await setup(pool), own = [];
    for (let i = 0; i < 5; i++) own.push((await service.create(owner, input())).conversation.id);
    const foreign = (await service.create(other, input())).conversation.id;
    for (let i = 0; i < own.length; i++) await query(`UPDATE foxy_conversations SET updated_at=$2::timestamptz WHERE id=$1::uuid`,
      own[i], i < 4 ? '2026-01-01T00:00:00.123456Z' : '2026-01-01T00:00:00.122999Z');
    const found = []; let after = null;
    for (let page = 0; page < 4; page++) {
      const result = await service.list(owner, { limit: 2, after });
      assert.ok(Array.isArray(result.items)); assert.ok(result.items.length <= 2);
      for (const item of result.items) { visible(item); found.push(item.id); }
      after = result.next; if (after === null) break;
      assert.match(after.updatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
      assert.ok(own.includes(after.id));
    }
    assert.equal(after, null); assert.equal(found.length, 5); assert.equal(new Set(found).size, 5);
    assert.deepEqual(new Set(found), new Set(own)); assert.equal(found.includes(foreign), false);
    assert.deepEqual(found.slice(0, 4), own.slice(0, 4).sort().reverse());
    for (const bad of [{ updatedAt: '2026-02-30T00:00:00.000Z', id: own[0] },
      { updatedAt: '2026-01-01T00:00:00Z', id: own[0] }, { updatedAt: '2026-01-01T00:00:00.000Z', id: 'bad' },
      { updatedAt: '2026-01-01T00:00:00.000Z', id: own[0], extra: true }])
      await assert.rejects(service.list(owner, { limit: 2, after: bad }), isCode('INVALID_INPUT'));
  });
});

test('idempotent classroom creation replays after archive without resurrecting a deleted conversation', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { service, owner, f, query } = await setup(pool);
    const request = input({ kind: 'CLASSROOM', classroomId: f.rooms.teach.id });
    const first = await service.create(owner, request);
    await query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1::uuid', f.rooms.teach.id);
    const replay = await service.create(owner, request);
    assert.equal(replay.created, false); assert.equal(replay.conversation.id, first.conversation.id);
    await assert.rejects(service.create(owner, input(request.context)), isCode('FORBIDDEN', 'NOT_FOUND', 'CONFLICT'));
    const [count] = await query('SELECT count(*)::int AS n FROM foxy_conversations WHERE owner_id=$1::uuid', f.teacherActor);
    assert.equal(count.n, 1);
    await service.remove(owner, first.conversation.id, { revision: first.conversation.revision, confirm: true });
    await assert.rejects(service.create(owner, request), isCode('CONFLICT', 'NOT_FOUND', 'FORBIDDEN'));
    const [deleted] = await query('SELECT deleted_at FROM foxy_conversations WHERE id=$1::uuid', first.conversation.id);
    assert.ok(deleted.deleted_at);
  });
});
