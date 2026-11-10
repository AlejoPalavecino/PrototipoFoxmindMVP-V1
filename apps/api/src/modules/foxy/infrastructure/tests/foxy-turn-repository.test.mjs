import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../tests/agenda-database-helpers.test.mjs";
import { homeFixture } from "../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const hashA = 'a'.repeat(64), hashB = 'b'.repeat(64);
const metadata = { model: 'synthetic-model', promptVersion: 'foxy-chat-v1', schemaVersion: 'foxy-answer-v1' };
const input = (changes = {}) => ({ requestId: randomUUID(), revision: '0', purpose: 'CHAT', text: 'Hola Foxy',
  selection: { topicIds: [], sourceIds: [] }, ...changes });
const generalSnapshot = () => ({ context: { kind: 'GENERAL' }, curriculum: null, sources: [] });

test('F5A turn repository persists owner-scoped, idempotent turns with revision CAS', { timeout: 120000 }, async t => {
  const api = await Promise.all([import("../conversation-repository.ts"),import("../context-catalog.ts"),import("../assemble-grounding.ts"),import("../grounding-snapshot.ts"),import("../grounding-loader.ts"),import("../turn-repository.ts"),import("../turn-queue.ts"),import("../text-budget.ts"),import("../claim-authority.ts"),import("../durable-loader.ts"),import("../provider-input.ts"),import("../turn-completion.ts"),import("../turn-claimed-reader.ts"),import("../turn-preparation.ts"),import("../worker.ts"),import("../unit-of-work.ts"),import("../../../../bootstrap/foxy-service-factories.ts"),import("../../presentation/http.ts"),import("../citation-mapping.ts"),import("../../../../bootstrap/foxy-runtime.ts"),import("../../../../bootstrap/foxy-host.ts"),import("../turn-recovery.ts"),import("../resource-repository.ts"),import("../publication-repository.ts"),import("../publication-queue.ts"),import("../publication-file-allocator.ts"),import("../publication-authority.ts"),import("../publication-completion.ts"),import("../pdf-worker.ts"),import("../publication-worker.ts"),import("../publication-confirmation-repository.ts"),import("../../application/publication-service.ts"),import("../publication-file-reader.ts"),import("../publication-management-repository.ts"),import("../publication-cleanup.ts"),import("../../application/publication-management-service.ts"),import("../visual-configuration.ts"),import("../../../../bootstrap/foxy-visual-host-providers.ts"),import("../private-asset-read-repository.ts"),import("../private-asset-reader.ts"),import("../../application/private-asset-read-service.ts"),import("../private-asset-discard-repository.ts"),import("../../application/private-asset-discard-service.ts"),import("../creation-repository.ts"),import("../../application/creation-service.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService}));
  assert.equal(typeof api.createFoxyTurnRepository, 'function');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const check = (name, operation) => t.test(name, () => transaction(async ({ query }) => {
      const f = await homeFixture(query), tx = { query }, conversations = api.createFoxyConversationRepository();
      const create = { requestId: randomUUID(), title: 'Chat sintético', context: { kind: 'GENERAL' } };
      const { conversation } = await conversations.create(tx, f.teacherActor, create, hashA);
      const turns = api.createFoxyTurnRepository();
      await operation({ f, tx, query, conversations, conversation, turns });
    }));

    await check('enqueue creates sequence one and increments revision atomically', async ({ f, tx, conversations, conversation, turns }) => {
      const result = await turns.enqueue(tx, f.teacherActor, conversation.id, input(), generalSnapshot(), hashA, metadata);
      assert.equal(result.created, true); assert.ok(result.turn.id); assert.equal(result.turn.sequence, 1); assert.equal(result.turn.state, 'QUEUED');
      assert.equal(result.conversationRevision, '1');
      assert.equal((await conversations.get(tx, f.teacherActor, conversation.id)).revision, '1');
      const read = await turns.get(tx, f.teacherActor, conversation.id, result.turn.id);
      assert.equal(read.id, result.turn.id); assert.equal(read.sequence, 1);
      const items = await turns.list(tx, f.teacherActor, conversation.id, { afterSequence: 0, limit: 10 });
      assert.deepEqual(items.map(item => item.id), [result.turn.id]);
    });

    await check('same request and hash replays before revision CAS; different hash conflicts', async ({ f, tx, conversations, conversation, turns }) => {
      const body = input(), snapshot = generalSnapshot();
      const first = await turns.enqueue(tx, f.teacherActor, conversation.id, body, snapshot, hashA, metadata);
      const replay = await turns.enqueue(tx, f.teacherActor, conversation.id, body, snapshot, hashA, metadata);
      assert.equal(replay.created, false); assert.equal(replay.turn.id, first.turn.id); assert.equal(replay.conversationRevision, '1');
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, body, snapshot, hashB, metadata), { code: 'CONFLICT' });
      assert.equal((await turns.list(tx, f.teacherActor, conversation.id, { afterSequence: 0, limit: 10 })).length, 1);
      assert.equal((await conversations.get(tx, f.teacherActor, conversation.id)).revision, '1');
    });

    await check('different request cannot bypass stale revision or existing active turn', async ({ f, tx, conversations, conversation, turns }) => {
      await turns.enqueue(tx, f.teacherActor, conversation.id, input(), generalSnapshot(), hashA, metadata);
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, input(), generalSnapshot(), hashB, metadata), { code: 'CONFLICT' });
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, input({ revision: '1' }), generalSnapshot(), hashB, metadata), { code: 'CONFLICT' });
      assert.equal((await conversations.get(tx, f.teacherActor, conversation.id)).revision, '1');
      assert.equal((await turns.list(tx, f.teacherActor, conversation.id, { afterSequence: 0, limit: 10 })).length, 1);
    });

    await check('other owner cannot access or enqueue a turn in the conversation', async ({ f, tx, conversation, turns }) => {
      const result = await turns.enqueue(tx, f.teacherActor, conversation.id, input(), generalSnapshot(), hashA, metadata);
      assert.equal(await turns.get(tx, f.other, conversation.id, result.turn.id), null);
      assert.deepEqual(await turns.list(tx, f.other, conversation.id, { afterSequence: 0, limit: 10 }), []);
      await assert.rejects(turns.enqueue(tx, f.other, conversation.id, input({ revision: '1' }), generalSnapshot(), hashB, metadata),
        error => ['NOT_FOUND', 'FORBIDDEN'].includes(error?.code));
    });

    await check('snapshot must match fixed context and full selection with no partial data', async ({ f, tx, conversations, conversation, turns }) => {
      const wrongContext = { context: { kind: 'CLASSROOM', classroomId: f.rooms.teach.id }, curriculum: { units: [], selectedTopicIds: [] }, sources: [] };
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, input(), wrongContext, hashA, metadata));
      const missingSource = input({ selection: { topicIds: [], sourceIds: [`material:${randomUUID()}`] } });
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, missingSource, generalSnapshot(), hashA, metadata));
      assert.equal((await conversations.get(tx, f.teacherActor, conversation.id)).revision, '0');
      assert.deepEqual(await turns.list(tx, f.teacherActor, conversation.id, { afterSequence: 0, limit: 10 }), []);
    });

    await check('classroom snapshot cannot omit a selected source or selected topic', async ({ f, tx, conversations, turns }) => {
      const { conversation } = await conversations.create(tx, f.teacherActor,
        { requestId: randomUUID(), title: 'Aula', context: { kind: 'CLASSROOM', classroomId: f.rooms.teach.id } }, hashA);
      const first = `activity:${randomUUID()}`, second = `activity:${randomUUID()}`;
      const body = input({ selection: { topicIds: [f.rooms.teach.topic], sourceIds: [first, second] } });
      const source = { sourceId: first, title: 'Actividad', kind: 'ACTIVITY', text: 'Texto', files: [] };
      const partial = { context: conversation.context, curriculum: { units: [], selectedTopicIds: [f.rooms.teach.topic] }, sources: [source] };
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, body, partial, hashA, metadata));
      const missingTopic = { ...partial, curriculum: { units: [], selectedTopicIds: [] }, sources: [source, { ...source, sourceId: second }] };
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, body, missingTopic, hashA, metadata));
      assert.equal((await conversations.get(tx, f.teacherActor, conversation.id)).revision, '0');
    });

    await check('rollback removes turn and restores conversation revision in same transaction', async ({ f, tx, query, conversations, conversation, turns }) => {
      await query('SAVEPOINT before_turn');
      const result = await turns.enqueue(tx, f.teacherActor, conversation.id, input(), generalSnapshot(), hashA, metadata);
      assert.equal(result.conversationRevision, '1');
      await query('ROLLBACK TO SAVEPOINT before_turn');
      assert.equal((await conversations.get(tx, f.teacherActor, conversation.id)).revision, '0');
      assert.equal(await turns.get(tx, f.teacherActor, conversation.id, result.turn.id), null);
      assert.deepEqual(await turns.list(tx, f.teacherActor, conversation.id, { afterSequence: 0, limit: 10 }), []);
    });
  });
});
