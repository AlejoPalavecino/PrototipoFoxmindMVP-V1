import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../tests/agenda-database-helpers.test.mjs";
import { homeFixture } from "../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const input = (changes = {}) => ({ requestId: randomUUID(), title: 'Conversación sintética', context: { kind: 'GENERAL' }, ...changes });
const hashA = 'a'.repeat(64), hashB = 'b'.repeat(64);
const isCode = expected => error => expected.includes(error?.code);

// The helper creates an exclusively owned temporary PostgreSQL container, applies migrations,
// verifies its name ends in _test and rolls each case back. No retained database is used.
test('F2 real repository: idempotency, owner isolation, fixed context and revision CAS', { timeout: 120000 }, async t => {
  const { createFoxyConversationRepository } = await Promise.all([import("../conversation-repository.ts"),import("../context-catalog.ts"),import("../assemble-grounding.ts"),import("../grounding-snapshot.ts"),import("../grounding-loader.ts"),import("../turn-repository.ts"),import("../turn-queue.ts"),import("../text-budget.ts"),import("../claim-authority.ts"),import("../durable-loader.ts"),import("../provider-input.ts"),import("../turn-completion.ts"),import("../turn-claimed-reader.ts"),import("../turn-preparation.ts"),import("../worker.ts"),import("../unit-of-work.ts"),import("../../../../bootstrap/foxy-service-factories.ts"),import("../../presentation/http.ts"),import("../citation-mapping.ts"),import("../../../../bootstrap/foxy-runtime.ts"),import("../../../../bootstrap/foxy-host.ts"),import("../turn-recovery.ts"),import("../resource-repository.ts"),import("../publication-repository.ts"),import("../publication-queue.ts"),import("../publication-file-allocator.ts"),import("../publication-authority.ts"),import("../publication-completion.ts"),import("../pdf-worker.ts"),import("../publication-worker.ts"),import("../publication-confirmation-repository.ts"),import("../../application/publication-service.ts"),import("../publication-file-reader.ts"),import("../publication-management-repository.ts"),import("../publication-cleanup.ts"),import("../../application/publication-management-service.ts"),import("../visual-configuration.ts"),import("../../../../bootstrap/foxy-visual-host-providers.ts"),import("../private-asset-read-repository.ts"),import("../private-asset-reader.ts"),import("../../application/private-asset-read-service.ts"),import("../private-asset-discard-repository.ts"),import("../../application/private-asset-discard-service.ts"),import("../creation-repository.ts"),import("../../application/creation-service.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService}));
  assert.equal(typeof createFoxyConversationRepository, 'function');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const check = (name, operation) => t.test(name, () => transaction(async ({ query }) => {
      const fixture = await homeFixture(query);
      const tx = { query }, repository = createFoxyConversationRepository();
      await operation({ fixture, tx, repository, query });
    }));

    await check('same owner and request/hash replay one conversation; changed hash conflicts', async ({ fixture: f, tx, repository: r }) => {
      const request = input();
      const first = await r.create(tx, f.teacherActor, request, hashA);
      assert.equal(first.created, true); assert.ok(first.conversation.id);
      assert.equal(first.conversation.title, request.title); assert.deepEqual(first.conversation.context, request.context);
      const replay = await r.create(tx, f.teacherActor, request, hashA);
      assert.equal(replay.created, false); assert.equal(replay.conversation.id, first.conversation.id);
      await assert.rejects(r.create(tx, f.teacherActor, request, hashB), isCode(['CONFLICT']));
      const other = await r.create(tx, f.other, request, hashA);
      assert.equal(other.created, true); assert.notEqual(other.conversation.id, first.conversation.id);
    });

    await check('only owner can retrieve, list, rename or remove; revisions detect stale writes', async ({ fixture: f, tx, repository: r }) => {
      const request = input({ context: { kind: 'CLASSROOM', classroomId: f.rooms.teach.id } });
      const { conversation } = await r.create(tx, f.teacherActor, request, hashA);
      const id = conversation.id, revision = conversation.revision;
      assert.deepEqual((await r.get(tx, f.teacherActor, id)).context, request.context);
      assert.equal(await r.get(tx, f.other, id), null);
      assert.equal((await r.list(tx, f.other, { limit: 10 })).some(item => item.id === id), false);
      await assert.rejects(r.rename(tx, f.other, id, revision, 'Ajena'), isCode(['NOT_FOUND']));
      await assert.rejects(r.remove(tx, f.other, id, revision), isCode(['NOT_FOUND']));
      await r.rename(tx, f.teacherActor, id, revision, 'Renombrada');
      const changed = await r.get(tx, f.teacherActor, id);
      assert.equal(changed.title, 'Renombrada'); assert.notEqual(changed.revision, revision);
      assert.deepEqual(changed.context, request.context);
      await assert.rejects(r.rename(tx, f.teacherActor, id, revision, 'Obsoleta'), isCode(['CONFLICT']));
      await assert.rejects(r.remove(tx, f.teacherActor, id, revision), isCode(['CONFLICT']));
      await r.remove(tx, f.teacherActor, id, changed.revision);
      assert.equal(await r.get(tx, f.teacherActor, id), null);
      assert.equal((await r.list(tx, f.teacherActor, { limit: 10 })).some(item => item.id === id), false);
    });

    await check('logical removal retains an owner-bound record', async ({ fixture: f, tx, repository: r, query }) => {
      const { conversation } = await r.create(tx, f.teacherActor, input(), hashA);
      await r.remove(tx, f.teacherActor, conversation.id, conversation.revision);
      const rows = await query('SELECT owner_id, deleted_at FROM foxy_conversations WHERE id=$1::uuid', conversation.id);
      assert.equal(rows.length, 1); assert.equal(rows[0].owner_id, f.teacherActor); assert.ok(rows[0].deleted_at);
    });

    await check('classroom belongs to conversation owner', async ({ fixture: f, tx, repository: r }) => {
      const foreign = input({ context: { kind: 'CLASSROOM', classroomId: f.rooms.foreign.id } });
      await assert.rejects(r.create(tx, f.teacherActor, foreign, hashA), isCode(['NOT_FOUND', 'FORBIDDEN', 'INVALID_INPUT', '23503']));
    });
  });
});
