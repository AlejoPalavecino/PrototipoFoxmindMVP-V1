import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../tests/agenda-database-helpers.test.mjs";
import { homeFixture } from "../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const hash = 'a'.repeat(64), metadata = { model: 'synthetic', promptVersion: 'foxy-chat-v1', schemaVersion: 'foxy-answer-v1' };
const cfg = { maxConcurrency: 1, deadlineMs: 30000, maxJobAgeMs: 300000, dailyActorRequests: 5, dailyGlobalRequests: 20,
  maxOutputTokens: 100, inputUsdPerMillion: 2, outputUsdPerMillion: 3, dailyBudgetUsd: 1 };
function contextHost(query, owner) {
  const tx = { query }, actor = { id: owner, account_role: 'teacher' };
  return { run: async (_request, _write, fn) => fn(tx, actor), classroom: async (_tx, user, id, write, teacherOnly) => {
    assert.equal(write, false); assert.equal(teacherOnly, true);
    const [row] = await query('SELECT * FROM classrooms WHERE id=$1::uuid', id);
    if (!row || row.teacher_id !== user.id) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
    return row;
  } };
}
async function addMaterial(query, room) {
  const id = randomUUID(), fileId = randomUUID(), digest = 'a'.repeat(64);
  await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
    validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'synthetic.pdf','pdf','application/pdf',14,'APPROVED','CLEAN',now(),now())`,
  fileId, room.id, room.teacher, `synthetic-authority/${fileId}`);
  await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',14,now())", randomUUID(), fileId);
  await query("INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest) VALUES($1,'material','ready',$2,$2,$2)", fileId, digest);
  await query("INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id) VALUES($1,now(),$2,'Fuente sintética',$3,$4)", id, room.id, fileId, room.teacher);
  return { id, fileId };
}
async function setup(api, query, f, { general = false } = {}) {
  const tx = { query }, conversations = api.createFoxyConversationRepository(), turns = api.createFoxyTurnRepository();
  const context = general ? { kind: 'GENERAL' } : { kind: 'CLASSROOM', classroomId: f.rooms.teach.id };
  const material = general ? null : await addMaterial(query, f.rooms.teach);
  const { conversation } = await conversations.create(tx, f.teacherActor, { requestId: randomUUID(), title: 'Autoridad', context }, hash);
  const selection = { topicIds: general ? [] : [f.rooms.teach.topic], sourceIds: material ? [`material:${material.id}`] : [] };
  const snapshots = new api.FoxyGroundingSnapshotService(contextHost(query, f.teacherActor), conversations);
  const snapshot = await snapshots.capture({}, conversation.id, selection);
  const { turn } = await turns.enqueue(tx, f.teacherActor, conversation.id,
    { requestId: randomUUID(), revision: '0', purpose: 'CHAT', text: 'Pregunta', selection }, snapshot, hash, metadata);
  let calls = 0; const database = { $transaction: async fn => { calls++; return fn({ $queryRawUnsafe: query }); } };
  const queue = api.createFoxyTurnQueue({ database, configuration: cfg }), lease = await queue.claim();
  assert.equal(lease.turnId, turn.id);
  const authority = api.createFoxyClaimAuthority({ database, maxJobAgeMs: cfg.maxJobAgeMs });
  return { tx, authority, database, lease, snapshot, material, calls: () => calls };
}

test('claim authority binds opaque capabilities to a live lease and selected documents', { timeout: 120000 }, async t => {
  const api = await Promise.all([import("../conversation-repository.ts"),import("../context-catalog.ts"),import("../assemble-grounding.ts"),import("../grounding-snapshot.ts"),import("../grounding-loader.ts"),import("../turn-repository.ts"),import("../turn-queue.ts"),import("../text-budget.ts"),import("../claim-authority.ts"),import("../durable-loader.ts"),import("../provider-input.ts"),import("../turn-completion.ts"),import("../turn-claimed-reader.ts"),import("../turn-preparation.ts"),import("../worker.ts"),import("../unit-of-work.ts"),import("../../../../bootstrap/foxy-service-factories.ts"),import("../../presentation/http.ts"),import("../citation-mapping.ts"),import("../../../../bootstrap/foxy-runtime.ts"),import("../../../../bootstrap/foxy-host.ts"),import("../turn-recovery.ts"),import("../resource-repository.ts"),import("../publication-repository.ts"),import("../publication-queue.ts"),import("../publication-file-allocator.ts"),import("../publication-authority.ts"),import("../publication-completion.ts"),import("../pdf-worker.ts"),import("../publication-worker.ts"),import("../publication-confirmation-repository.ts"),import("../../application/publication-service.ts"),import("../publication-file-reader.ts"),import("../publication-management-repository.ts"),import("../publication-cleanup.ts"),import("../../application/publication-management-service.ts"),import("../visual-configuration.ts"),import("../../../../bootstrap/foxy-visual-host-providers.ts"),import("../private-asset-read-repository.ts"),import("../private-asset-reader.ts"),import("../../application/private-asset-read-service.ts"),import("../private-asset-discard-repository.ts"),import("../../application/private-asset-discard-service.ts"),import("../creation-repository.ts"),import("../../application/creation-service.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService})); assert.equal(typeof api.createFoxyClaimAuthority, 'function');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const check = (name, operation) => t.test(name, () => transaction(async ({ query }) => {
      const f = await homeFixture(query), fixture = await setup(api, query, f);
      await operation({ f, query, ...fixture });
    }));

    await check('scope exposes only database-derived snapshot and selected document grant', async ({ f, authority, lease, snapshot, material }) => {
      const signal = new AbortController().signal, scope = await authority.open(lease, signal);
      assert.deepEqual(scope.snapshot, snapshot); assert.equal(scope.documents.length, 1);
      assert.equal(scope.documents[0].descriptor.classroomId, f.rooms.teach.id);
      assert.equal(scope.documents[0].descriptor.file.fileId, material.fileId);
      const claim = await authority.authorizeClaim(scope.capability, signal);
      assert.equal(claim.ownerId, f.teacherActor); assert.equal(claim.conversationId, lease.conversationId); assert.deepEqual(claim.snapshot, snapshot);
      const document = await authority.authorizeDocument(scope.documents[0].capability, signal);
      assert.equal(document.ownerId, f.teacherActor); assert.equal(document.conversationId, lease.conversationId);
      assert.equal(document.classroomId, f.rooms.teach.id); assert.equal(document.file.fileId, material.fileId);
    });

    await check('forgery, clones and capabilities from another authority instance are rejected', async ({ authority, database, lease }) => {
      const signal = new AbortController().signal, scope = await authority.open(lease, signal);
      const other = api.createFoxyClaimAuthority({ database, maxJobAgeMs: cfg.maxJobAgeMs });
      for (const cap of [{}, { ...scope.capability }]) await assert.rejects(authority.authorizeClaim(cap, signal));
      for (const cap of [{}, { ...scope.documents[0].capability }]) await assert.rejects(authority.authorizeDocument(cap, signal));
      await assert.rejects(other.authorizeClaim(scope.capability, signal));
      await assert.rejects(other.authorizeDocument(scope.documents[0].capability, signal));
      await assert.rejects(authority.authorizeDocument(scope.capability, signal));
      await assert.rejects(authority.authorizeClaim(scope.documents[0].capability, signal));
    });

    await check('mutating returned scope cannot alter the stored snapshot or document authorization', async ({ authority, lease }) => {
      const signal = new AbortController().signal, scope = await authority.open(lease, signal);
      const originalSnapshot = structuredClone(scope.snapshot), originalFile = structuredClone(scope.documents[0].descriptor.file);
      const claimCap = scope.capability, documentCap = scope.documents[0].capability;
      // Freezing the returned object or returning a defensive copy are both valid.
      for (const mutate of [
        () => { scope.snapshot.sources[0].files[0].digest = 'b'.repeat(64); },
        () => { scope.snapshot.sources[0].files[0].fileId = randomUUID(); },
        () => { scope.documents[0].descriptor.file.fileId = randomUUID(); },
        () => { scope.documents[0].descriptor.file.digest = 'c'.repeat(64); },
        () => { scope.snapshot.sources.length = 0; }
      ]) { try { mutate(); } catch (error) { assert.ok(error instanceof TypeError); } }
      const claim = await authority.authorizeClaim(claimCap, signal);
      const document = await authority.authorizeDocument(documentCap, signal);
      assert.deepEqual(claim.snapshot, originalSnapshot); assert.deepEqual(document.file, originalFile);
    });

    await check('aborting the signal passed to open cannot be bypassed with a fresh signal', async ({ authority, lease }) => {
      const original = new AbortController(), scope = await authority.open(lease, original.signal);
      const fresh = new AbortController().signal; original.abort();
      await assert.rejects(authority.authorizeClaim(scope.capability, fresh));
      await assert.rejects(authority.authorizeDocument(scope.documents[0].capability, fresh));
    });

    await check('injected transaction is reused without opening a nested transaction', async ({ authority, lease, tx, calls }) => {
      const signal = new AbortController().signal, scope = await authority.open(lease, signal), before = calls();
      await authority.authorizeClaim(scope.capability, signal, tx);
      await authority.authorizeDocument(scope.documents[0].capability, signal, tx);
      assert.equal(calls(), before);
    });

    for (const mode of ['abort', 'close', 'nonce', 'expired', 'unverified', 'deleted', 'archived', 'changed-source']) await check(`${mode} revokes a previously issued capability`, async ({ f, query, authority, lease, material }) => {
      const controller = new AbortController(), scope = await authority.open(lease, controller.signal);
      if (mode === 'abort') controller.abort();
      if (mode === 'close') authority.close(scope);
      if (mode === 'nonce') await query('UPDATE foxy_turns SET lease_nonce=$2::uuid WHERE id=$1::uuid', lease.turnId, randomUUID());
      if (mode === 'expired') await query("UPDATE foxy_turns SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid", lease.turnId);
      if (mode === 'unverified') await query('UPDATE users SET email_verified_at=NULL WHERE id=$1::uuid', f.teacherActor);
      if (mode === 'deleted') await query('UPDATE foxy_conversations SET deleted_at=now() WHERE id=$1::uuid', lease.conversationId);
      if (mode === 'archived') await query('UPDATE classrooms SET archived_at=now() WHERE id=$1::uuid', f.rooms.teach.id);
      if (mode === 'changed-source') await query("UPDATE materials SET title='Fuente modificada' WHERE id=$1::uuid", material.id);
      await assert.rejects(authority.authorizeClaim(scope.capability, controller.signal));
      await assert.rejects(authority.authorizeDocument(scope.documents[0].capability, controller.signal));
    });

    await check('open rejects a forged owner, conversation or nonce before issuing capabilities', async ({ f, authority, lease }) => {
      const signal = new AbortController().signal;
      for (const forged of [{ ...lease, ownerId: f.other }, { ...lease, conversationId: randomUUID() }, { ...lease, leaseNonce: randomUUID() }])
        await assert.rejects(authority.open(forged, signal));
      const aborted = new AbortController(); aborted.abort(); await assert.rejects(authority.open(lease, aborted.signal));
    });

    await t.test('general scope has no document capabilities', () => transaction(async ({ query }) => {
      const f = await homeFixture(query), { authority, lease } = await setup(api, query, f, { general: true });
      const signal = new AbortController().signal, scope = await authority.open(lease, signal);
      assert.deepEqual(scope.snapshot, { context: { kind: 'GENERAL' }, curriculum: null, sources: [] });
      assert.deepEqual(scope.documents, []);
      await assert.rejects(authority.authorizeDocument({}, signal));
    }));
  });
});
