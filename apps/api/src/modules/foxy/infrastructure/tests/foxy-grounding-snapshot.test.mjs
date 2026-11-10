import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../tests/agenda-database-helpers.test.mjs";
import { homeFixture } from "../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const hash = 'a'.repeat(64), request = { synthetic: true };
const selection = (changes = {}) => ({ topicIds: [], sourceIds: [], ...changes });
function host(query, actorId, role = 'teacher') {
  const tx = { query }, actor = { id: actorId, account_role: role };
  return {
    run: async (_request, write, operation) => { assert.equal(write, false); return operation(tx, actor); },
    classroom: async (_tx, user, id, write, teacherOnly) => {
      assert.equal(write, false); assert.equal(teacherOnly, true);
      const [row] = await query('SELECT * FROM classrooms WHERE id=$1::uuid', id);
      if (!row || row.teacher_id !== user.id) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
      return row;
    }
  };
}
async function file(query, room, purpose, targetId = null) {
  const id = randomUUID(), digest = 'a'.repeat(64);
  await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
    validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'synthetic.pdf','pdf','application/pdf',14,'APPROVED','CLEAN',now(),now())`,
  id, room.id, room.teacher, `synthetic-foxy-snapshot/${id}`);
  await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',14,now())", randomUUID(), id);
  await query(`INSERT INTO file_custodies(file_id,purpose,target_id,phase,digest,validated_digest,scanned_digest)
    VALUES($1,$2,$3,'ready',$4,$4,$4)`, id, purpose, targetId, digest);
  return id;
}
async function plan(query, room, version) {
  const id = randomUUID(), fileId = await file(query, room, 'plan');
  await query('INSERT INTO study_plan_versions(id,updated_at,classroom_id,version_number,file_id,uploaded_by_id) VALUES($1,now(),$2,$3,$4,$5)',
    id, room.id, version, fileId, room.teacher);
  return { id, fileId };
}
async function material(query, room) {
  const id = randomUUID(), fileId = await file(query, room, 'material');
  await query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,unit_id,topic_id,created_by_id)
    VALUES($1,now(),$2,'Material sintético',$3,$4,$5,$6)`, id, room.id, fileId, room.unit, room.topic, room.teacher);
  return { id, fileId };
}
async function serviceClass() {
  const api = await Promise.all([import("../conversation-repository.ts"),import("../context-catalog.ts"),import("../assemble-grounding.ts"),import("../grounding-snapshot.ts"),import("../grounding-loader.ts"),import("../turn-repository.ts"),import("../turn-queue.ts"),import("../text-budget.ts"),import("../claim-authority.ts"),import("../durable-loader.ts"),import("../provider-input.ts"),import("../turn-completion.ts"),import("../turn-claimed-reader.ts"),import("../turn-preparation.ts"),import("../worker.ts"),import("../unit-of-work.ts"),import("../../../../bootstrap/foxy-service-factories.ts"),import("../../presentation/http.ts"),import("../citation-mapping.ts"),import("../../../../bootstrap/foxy-runtime.ts"),import("../../../../bootstrap/foxy-host.ts"),import("../turn-recovery.ts"),import("../resource-repository.ts"),import("../publication-repository.ts"),import("../publication-queue.ts"),import("../publication-file-allocator.ts"),import("../publication-authority.ts"),import("../publication-completion.ts"),import("../pdf-worker.ts"),import("../publication-worker.ts"),import("../publication-confirmation-repository.ts"),import("../../application/publication-service.ts"),import("../publication-file-reader.ts"),import("../publication-management-repository.ts"),import("../publication-cleanup.ts"),import("../../application/publication-management-service.ts"),import("../visual-configuration.ts"),import("../../../../bootstrap/foxy-visual-host-providers.ts"),import("../private-asset-read-repository.ts"),import("../private-asset-reader.ts"),import("../../application/private-asset-read-service.ts"),import("../private-asset-discard-repository.ts"),import("../../application/private-asset-discard-service.ts"),import("../creation-repository.ts"),import("../../application/creation-service.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService}));
  assert.equal(typeof api.FoxyGroundingSnapshotService, 'function');
  return api;
}

test('general snapshot rejects source selection and never queries classroom', async () => {
  const { FoxyGroundingSnapshotService } = await serviceClass(), teacher = randomUUID(), id = randomUUID();
  const context = { run: async (_req, write, fn) => { assert.equal(write, false); return fn({ query: () => { throw new Error('unexpected DB'); } }, { id: teacher, account_role: 'teacher' }); },
    classroom: () => { throw new Error('unexpected classroom read'); } };
  const service = new FoxyGroundingSnapshotService(context, { get: async () => ({ context: { kind: 'GENERAL' } }) });
  const snapshot = await service.capture(request, id, selection());
  assert.deepEqual(snapshot, { context: { kind: 'GENERAL' }, curriculum: null, sources: [] });
  await assert.rejects(service.capture(request, id, selection({ sourceIds: [`material:${randomUUID()}`] })), { code: 'INVALID_INPUT' });
  await assert.rejects(service.capture(request, id, selection({ topicIds: [randomUUID()] })), { code: 'INVALID_INPUT' });
});

test('snapshot and revalidation use exclusively owned synthetic PostgreSQL', { timeout: 120000 }, async t => {
  const { FoxyGroundingSnapshotService, createFoxyConversationRepository } = await serviceClass();
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const check = (name, operation) => t.test(name, () => transaction(async ({ query }) => {
      const f = await homeFixture(query), repo = createFoxyConversationRepository(), tx = { query };
      const input = { requestId: randomUUID(), title: 'Fuentes sintéticas', context: { kind: 'CLASSROOM', classroomId: f.rooms.teach.id } };
      const { conversation } = await repo.create(tx, f.teacherActor, input, hash);
      const service = new FoxyGroundingSnapshotService(host(query, f.teacherActor), repo);
      await operation({ f, query, repo, conversation, service });
    }));

    await check('captures ordered historical plans, classroom materials, topics and sanitized activity', async ({ f, query, conversation, service }) => {
      const older = await plan(query, f.rooms.teach, 1), newer = await plan(query, f.rooms.teach, 2), guide = await material(query, f.rooms.teach);
      const activity = await f.activity('teach'), question = randomUUID();
      await query("UPDATE activities SET instructions_text='CONSIGNA_VISIBLE',ai_grading_rubric='RUBRICA_PRIVADA' WHERE id=$1", activity.id);
      await query(`INSERT INTO questions(id,updated_at,activity_id,type,prompt,position,available_points,scoring_rule)
        VALUES($1,now(),$2,'SINGLE_CHOICE','PREGUNTA_VISIBLE',0,2,'EXACT')`, question, activity.id);
      await query(`INSERT INTO question_options(id,updated_at,question_id,text,position,is_correct)
        VALUES($1,now(),$2,'OPCION_VISIBLE',0,true),($3,now(),$2,'OTRA_OPCION',1,false)`, randomUUID(), question, randomUUID());
      const attached = await file(query, f.rooms.teach, 'instructions', activity.id);
      await query('INSERT INTO activity_instruction_files(activity_id,classroom_id,file_id) VALUES($1,$2,$3)', activity.id, f.rooms.teach.id, attached);
      const picked = selection({ topicIds: [f.rooms.teach.topic], sourceIds: [`plan:${older.id}`, `material:${guide.id}`, `activity:${activity.id}`, `plan:${newer.id}`] });
      const snapshot = await service.capture(request, conversation.id, picked);
      assert.deepEqual(snapshot.context, { kind: 'CLASSROOM', classroomId: f.rooms.teach.id });
      assert.deepEqual(snapshot.curriculum.selectedTopicIds, picked.topicIds);
      assert.ok(snapshot.curriculum.units.some(unit => unit.id === f.rooms.teach.unit && unit.topics.some(topic => topic.id === f.rooms.teach.topic)));
      assert.deepEqual(snapshot.sources.map(source => source.sourceId), picked.sourceIds);
      assert.deepEqual(snapshot.sources.map(source => source.files.map(item => item.fileId)), [[older.fileId], [guide.fileId], [attached], [newer.fileId]]);
      const activitySource = snapshot.sources[2], rendered = JSON.stringify(activitySource);
      for (const visible of ['CONSIGNA_VISIBLE', 'PREGUNTA_VISIBLE', 'OPCION_VISIBLE', 'OTRA_OPCION']) assert.ok(rendered.includes(visible));
      for (const privateValue of ['RUBRICA_PRIVADA', 'is_correct', 'isCorrect', 'student_activities']) assert.equal(rendered.includes(privateValue), false);
      assert.equal(await service.revalidate(request, conversation.id, snapshot), true);
    });

    await check('rejects foreign or partial selections, unpublished sources and pending files', async ({ f, query, conversation, service }) => {
      const good = await material(query, f.rooms.teach), foreign = await material(query, f.rooms.foreign);
      const draft = await f.activity('teach', { status: 'DRAFT' });
      for (const pick of [selection({ topicIds: [f.rooms.foreign.topic] }),
        selection({ sourceIds: [`material:${good.id}`, `material:${foreign.id}`] }),
        selection({ sourceIds: [`material:${good.id}`, `material:${randomUUID()}`] }),
        selection({ sourceIds: [`activity:${draft.id}`] })]) await assert.rejects(service.capture(request, conversation.id, pick));
      await query("UPDATE files SET scan_status='PENDING' WHERE id=$1::uuid", good.fileId);
      await assert.rejects(service.capture(request, conversation.id, selection({ sourceIds: [`material:${good.id}`] })), { code: 'FILE_NOT_READY' });
    });

    await check('revalidation detects content changes but ignores unrelated classroom revision alone', async ({ f, query, conversation, service }) => {
      const guide = await material(query, f.rooms.teach);
      const snapshot = await service.capture(request, conversation.id, selection({ sourceIds: [`material:${guide.id}`] }));
      await query('UPDATE classrooms SET revision=revision+1 WHERE id=$1::uuid', f.rooms.teach.id);
      assert.equal(await service.revalidate(request, conversation.id, snapshot), true);
      await query("UPDATE materials SET title='Nombre modificado' WHERE id=$1::uuid", guide.id);
      assert.equal(await service.revalidate(request, conversation.id, snapshot), false);
    });

    for (const includeValid of [false, true]) await check(`published empty activity is rejected with${includeValid ? '' : 'out'} a valid source`, async ({ f, query, conversation, service }) => {
      const guide = await material(query, f.rooms.teach), empty = await f.activity('teach');
      const valid = selection({ sourceIds: [`material:${guide.id}`] });
      const baseline = await service.capture(request, conversation.id, valid);
      assert.deepEqual(baseline.sources.map(source => source.sourceId), valid.sourceIds);
      const sourceIds = includeValid ? [...valid.sourceIds, `activity:${empty.id}`] : [`activity:${empty.id}`];
      await assert.rejects(service.capture(request, conversation.id, selection({ sourceIds })));
    });

    await check('teacher role, conversation ownership and active classroom are enforced again', async ({ f, query, repo, conversation, service }) => {
      const snapshot = await service.capture(request, conversation.id, selection());
      const foreign = new FoxyGroundingSnapshotService(host(query, f.other), repo);
      await assert.rejects(foreign.capture(request, conversation.id, selection()), { code: 'FORBIDDEN' });
      await assert.rejects(foreign.revalidate(request, conversation.id, snapshot), { code: 'FORBIDDEN' });
      const student = new FoxyGroundingSnapshotService(host(query, f.teacherActor, 'student'), repo);
      await assert.rejects(student.capture(request, conversation.id, selection()), { code: 'FORBIDDEN' });
      await query('UPDATE classrooms SET archived_at=now() WHERE id=$1::uuid', f.rooms.teach.id);
      await assert.rejects(service.capture(request, conversation.id, selection()));
    });
  });
});
