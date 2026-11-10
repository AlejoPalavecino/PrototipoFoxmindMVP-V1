import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../tests/agenda-database-helpers.test.mjs";
import { transactionDatabase } from "../../../../../../../tests/classroom-ai-database.test.mjs";
import { homeFixture } from "../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const hash = 'a'.repeat(64), metadata = { model: 'synthetic', promptVersion: 'foxy-chat-v1', schemaVersion: 'foxy-answer-v1' };
const configuration = { maxConcurrency: 1, deadlineMs: 30000, maxDispatches: 2, maxJobAgeMs: 300000,
  dailyActorRequests: 5, dailyGlobalRequests: 20, maxOutputTokens: 200, inputUsdPerMillion: 1, outputUsdPerMillion: 1, dailyBudgetUsd: 1 };
async function enqueue(api, query, owner, context = { kind: 'GENERAL' }) {
  const tx = { query }, conversationRepo = api.createFoxyConversationRepository(), turnRepo = api.createFoxyTurnRepository();
  const { conversation } = await conversationRepo.create(tx, owner, { requestId: randomUUID(), title: 'Cola', context }, hash);
  const input = { requestId: randomUUID(), revision: '0', purpose: 'CHAT', text: 'Consulta sintética', selection: { topicIds: [], sourceIds: [] } };
  const snapshot = { context, curriculum: context.kind === 'GENERAL' ? null : { units: [], selectedTopicIds: [] }, sources: [] };
  const { turn } = await turnRepo.enqueue(tx, owner, conversation.id, input, snapshot, hash, metadata);
  return { conversation, turn };
}
async function otherRunning(kind, f, query, owner, room) {
  const id = randomUUID(), nonce = randomUUID();
  if (kind === 'extraction') {
    const [draft] = await query('SELECT id FROM classroom_drafts WHERE owner_id=$1::uuid LIMIT 1', owner), fileId = randomUUID();
    await query(`INSERT INTO files(id,updated_at,classroom_draft_id,uploaded_by_id,storage_key,original_name,extension,size_bytes)
      VALUES($1,now(),$2,$3,$4,'synthetic.pdf','pdf',5)`, fileId, draft.id, owner, `test-foxy-queue/${fileId}`);
    await query(`INSERT INTO classroom_curriculum_extractions(id,owner_id,draft_id,file_id,source_digest,base_revision,schema_version,prompt_version,model,state,lease_nonce,lease_until)
      VALUES($1,$2,$3,$4,$5,0,'study-plan-v1','synthetic','synthetic','RUNNING',$6,now()+interval '1 minute')`, id, owner, draft.id, fileId, hash, nonce);
  } else if (kind === 'activity') {
    await query(`INSERT INTO activity_ai_generations(id,owner_id,classroom_id,unit_id,type,base_revision,request_hash,input_payload,curriculum_snapshot,source_snapshot,schema_version,prompt_version,model,state,lease_nonce,lease_until)
      VALUES($1,$2,$3,$4,'ASSIGNMENT',0,$5,'{}','{}','[]','activity-proposal-v1','synthetic','synthetic','RUNNING',$6,now()+interval '1 minute')`,
    id, owner, room.id, room.unit, hash, nonce);
  } else if (kind === 'student') {
    await query(`INSERT INTO student_ai_reports(id,enrollment_id,classroom_id,owner_id,evidence_hash,state,lease_nonce,lease_until)
      VALUES($1,$2,$3,$4,'synthetic','RUNNING',$5,now()+interval '1 minute')`, id, room.enrollment, room.id, owner, nonce);
  } else {
    const activity = await f.activity(room === f.rooms.teach ? 'teach' : 'foreign'), attempt = await f.attempt(activity);
    await query(`INSERT INTO grading_ai_jobs(id,classroom_id,activity_id,attempt_id,owner_id,rubric_snapshot,epoch,state,lease_nonce,lease_until)
      VALUES($1,$2,$3,$4,$5,'Sintético',0,'RUNNING',$6,now()+interval '1 minute')`, id, room.id, activity.id, attempt, owner, nonce);
  }
}

test('F5C queue admission, identity and expiration with synthetic PostgreSQL', { timeout: 120000 }, async t => {
  const api = await Promise.all([import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/conversation-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/context-catalog.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/assemble-grounding.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/grounding-snapshot.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/grounding-loader.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/turn-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/turn-queue.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/text-budget.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/claim-authority.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/durable-loader.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/provider-input.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/turn-completion.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/turn-claimed-reader.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/turn-preparation.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/worker.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/unit-of-work.js"),import("../../../../../../../.build/api/apps/api/src/bootstrap/foxy-service-factories.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/presentation/http.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/citation-mapping.js"),import("../../../../../../../.build/api/apps/api/src/bootstrap/foxy-runtime.js"),import("../../../../../../../.build/api/apps/api/src/bootstrap/foxy-host.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/turn-recovery.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/resource-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-queue.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-file-allocator.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-authority.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-completion.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/pdf-worker.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-worker.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-confirmation-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/application/publication-service.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-file-reader.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-management-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-cleanup.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/application/publication-management-service.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/visual-configuration.js"),import("../../../../../../../.build/api/apps/api/src/bootstrap/foxy-visual-host-providers.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/private-asset-read-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/private-asset-reader.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/application/private-asset-read-service.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/private-asset-discard-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/application/private-asset-discard-service.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/creation-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/application/creation-service.js")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService})); assert.equal(typeof api.createFoxyTurnQueue, 'function');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const check = (name, operation) => t.test(name, () => transaction(async ({ query }) => {
      const f = await homeFixture(query), database = { $transaction: fn => fn({ $queryRawUnsafe: query }) };
      await operation({ f, query, database });
    }));
    for (const kind of ['extraction', 'activity', 'student', 'grading']) for (const scope of ['global', 'owner']) {
      await check(`${kind} running enforces ${scope} admission`, async ({ f, query, database }) => {
        await enqueue(api, query, f.teacherActor);
        const other = scope === 'global' ? f.other : f.teacherActor, room = scope === 'global' ? f.rooms.foreign : f.rooms.teach;
        await otherRunning(kind, f, query, other, room);
        const q = api.createFoxyTurnQueue({ database, configuration: { ...configuration, maxConcurrency: scope === 'global' ? 1 : 2 } });
        assert.equal(await q.claim(), null);
      });
    }
    await check('claim issues unique nonce and current rejects a replaced nonce', async ({ f, query, database }) => {
      const created = await enqueue(api, query, f.teacherActor), q = api.createFoxyTurnQueue({ database, configuration });
      const lease = await q.claim(); assert.equal(lease.turnId, created.turn.id); assert.equal(lease.ownerId, f.teacherActor);
      assert.equal(lease.conversationId, created.conversation.id); assert.ok(lease.leaseNonce);
      assert.equal(await q.claim(), null); assert.equal(await q.current(lease), true);
      const replacement = randomUUID(); await query('UPDATE foxy_turns SET lease_nonce=$2::uuid WHERE id=$1::uuid', lease.turnId, replacement);
      assert.equal(await q.current(lease), false); assert.equal(await q.current({ ...lease, leaseNonce: replacement }), true);
    });
    for (const dispatched of [false, true]) await check(`expired ${dispatched ? 'dispatched' : 'undispatched'} lease recovery`, async ({ f, query, database }) => {
      const created = await enqueue(api, query, f.teacherActor), q = api.createFoxyTurnQueue({ database, configuration });
      const lease = await q.claim(); assert.equal(lease.turnId, created.turn.id);
      if (dispatched) assert.equal(await api.createFoxyTextBudget({ configuration }).reserve({ query }, lease, 100), 'RESERVED');
      await query("UPDATE foxy_turns SET lease_until=now()-interval '1 second' WHERE id=$1::uuid", lease.turnId);
      assert.equal(await q.current(lease), false); assert.equal(await q.recoverExpired(), 1);
      const [row] = await query('SELECT state,error_code,lease_nonce,lease_until FROM foxy_turns WHERE id=$1::uuid', lease.turnId);
      assert.equal(row.state, dispatched ? 'FAILED' : 'QUEUED');
      assert.equal(row.error_code, dispatched ? 'PROVIDER_OUTCOME_UNKNOWN' : null);
      assert.equal(row.lease_nonce, null); assert.equal(row.lease_until, null);
      const retry = await q.claim();
      if (dispatched) assert.equal(retry, null); else assert.equal(retry.turnId, lease.turnId);
      assert.equal(await q.current(lease), false);
    });
    await check('expired queued work becomes FAILED and permits a later turn in its conversation', async ({ f, query, database }) => {
      const job = await enqueue(api, query, f.teacherActor), q = api.createFoxyTurnQueue({ database, configuration });
      await query("UPDATE foxy_turns SET created_at=clock_timestamp()-interval '10 minutes' WHERE id=$1::uuid", job.turn.id);
      await q.recoverExpired();
      const [expired] = await query('SELECT state,error_code FROM foxy_turns WHERE id=$1::uuid', job.turn.id);
      assert.equal(expired.state, 'FAILED'); assert.equal(expired.error_code, 'AI_TIMEOUT');
      const repo = api.createFoxyTurnRepository(), body = { requestId: randomUUID(), revision: '1', purpose: 'CHAT', text: 'Nueva consulta', selection: { topicIds: [], sourceIds: [] } };
      const snapshot = { context: { kind: 'GENERAL' }, curriculum: null, sources: [] };
      const next = await repo.enqueue({ query }, f.teacherActor, job.conversation.id, body, snapshot, hash, metadata);
      assert.equal(next.turn.sequence, 2); assert.equal((await q.claim()).turnId, next.turn.id);
    });
    for (const dispatched of [false, true]) await check(`claim recovers expired ${dispatched ? 'dispatched' : 'undispatched'} Foxy work before admission`, async ({ f, query, database }) => {
      const old = await enqueue(api, query, f.teacherActor), q = api.createFoxyTurnQueue({ database, configuration });
      const lease = await q.claim(); assert.equal(lease.turnId, old.turn.id);
      if (dispatched) assert.equal(await api.createFoxyTextBudget({ configuration }).reserve({ query }, lease, 100), 'RESERVED');
      await query("UPDATE foxy_turns SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid", lease.turnId);
      const newer = await enqueue(api, query, f.other);
      const recovered = await q.claim(); assert.ok(recovered);
      const [row] = await query('SELECT state,error_code,lease_nonce FROM foxy_turns WHERE id=$1::uuid', lease.turnId);
      if (dispatched) {
        assert.equal(row.state, 'FAILED'); assert.equal(row.error_code, 'PROVIDER_OUTCOME_UNKNOWN');
        assert.equal(recovered.turnId, newer.turn.id);
      } else {
        assert.equal(recovered.turnId, lease.turnId); assert.equal(row.state, 'RUNNING');
        assert.notEqual(recovered.leaseNonce, lease.leaseNonce);
      }
      assert.equal(await q.current(lease), false);
    });
    for (const mode of ['unverified', 'deleted', 'archived']) await check(`revoked ${mode} prevents claim`, async ({ f, query, database }) => {
      const job = await enqueue(api, query, f.teacherActor, { kind: 'CLASSROOM', classroomId: f.rooms.teach.id });
      if (mode === 'unverified') await query('UPDATE users SET email_verified_at=NULL WHERE id=$1::uuid', f.teacherActor);
      if (mode === 'deleted') await query('UPDATE foxy_conversations SET deleted_at=now() WHERE id=$1::uuid', job.conversation.id);
      if (mode === 'archived') await query('UPDATE classrooms SET archived_at=now() WHERE id=$1::uuid', f.rooms.teach.id);
      const q = api.createFoxyTurnQueue({ database, configuration }); assert.equal(await q.claim(), null);
    });
    await check('database rejects changes to teacher role and classroom owner', async ({ f, query, database }) => {
      const job = await enqueue(api, query, f.teacherActor, { kind: 'CLASSROOM', classroomId: f.rooms.teach.id });
      await query('SAVEPOINT role_guard');
      await assert.rejects(query("UPDATE users SET account_role='student' WHERE id=$1::uuid", f.teacherActor));
      await query('ROLLBACK TO SAVEPOINT role_guard');
      await query('SAVEPOINT owner_guard');
      await assert.rejects(query('UPDATE classrooms SET teacher_id=$2::uuid WHERE id=$1::uuid', f.rooms.teach.id, f.other));
      await query('ROLLBACK TO SAVEPOINT owner_guard');
      const q = api.createFoxyTurnQueue({ database, configuration });
      assert.equal((await q.claim()).turnId, job.turn.id);
    });
    for (const mode of ['unverified', 'deleted', 'archived']) await check(`revoked ${mode} invalidates an active lease`, async ({ f, query, database }) => {
      const job = await enqueue(api, query, f.teacherActor, { kind: 'CLASSROOM', classroomId: f.rooms.teach.id });
      const q = api.createFoxyTurnQueue({ database, configuration }), lease = await q.claim();
      assert.equal(lease.turnId, job.turn.id); assert.equal(await q.current(lease), true);
      if (mode === 'unverified') await query('UPDATE users SET email_verified_at=NULL WHERE id=$1::uuid', f.teacherActor);
      if (mode === 'deleted') await query('UPDATE foxy_conversations SET deleted_at=now() WHERE id=$1::uuid', job.conversation.id);
      if (mode === 'archived') await query('UPDATE classrooms SET archived_at=now() WHERE id=$1::uuid', f.rooms.teach.id);
      assert.equal(await q.current(lease), false);
    });
  });
});

test('two concurrent claims return at most one lease', { timeout: 120000 }, async () => {
  const api = await Promise.all([import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/conversation-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/context-catalog.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/assemble-grounding.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/grounding-snapshot.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/grounding-loader.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/turn-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/turn-queue.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/text-budget.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/claim-authority.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/durable-loader.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/provider-input.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/turn-completion.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/turn-claimed-reader.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/turn-preparation.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/worker.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/unit-of-work.js"),import("../../../../../../../.build/api/apps/api/src/bootstrap/foxy-service-factories.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/presentation/http.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/citation-mapping.js"),import("../../../../../../../.build/api/apps/api/src/bootstrap/foxy-runtime.js"),import("../../../../../../../.build/api/apps/api/src/bootstrap/foxy-host.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/turn-recovery.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/resource-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-queue.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-file-allocator.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-authority.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-completion.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/pdf-worker.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-worker.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-confirmation-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/application/publication-service.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-file-reader.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-management-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/publication-cleanup.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/application/publication-management-service.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/visual-configuration.js"),import("../../../../../../../.build/api/apps/api/src/bootstrap/foxy-visual-host-providers.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/private-asset-read-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/private-asset-reader.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/application/private-asset-read-service.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/private-asset-discard-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/application/private-asset-discard-service.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/infrastructure/creation-repository.js"),import("../../../../../../../.build/api/apps/api/src/modules/foxy/application/creation-service.js")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService})); assert.equal(typeof api.createFoxyTurnQueue, 'function');
  await withAgendaDatabase(async ({ pool }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const database = transactionDatabase(pool), query = async (sql, ...args) => (await pool.query(sql, args)).rows;
    const f = await homeFixture(query);
    const created = await database.$transaction(raw => enqueue(api, raw.$queryRawUnsafe, f.teacherActor));
    const q1 = api.createFoxyTurnQueue({ database, configuration }), q2 = api.createFoxyTurnQueue({ database, configuration });
    const claims = (await Promise.all([q1.claim(), q2.claim()])).filter(Boolean);
    assert.equal(claims.length, 1); assert.equal(claims[0].turnId, created.turn.id);
  });
});
