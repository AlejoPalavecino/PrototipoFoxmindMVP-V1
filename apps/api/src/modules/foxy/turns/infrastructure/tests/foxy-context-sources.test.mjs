import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { homeFixture } from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";
import { FoxyContextCatalogService } from "../context-catalog.ts";

const hash = 'a'.repeat(64);
const call = kind => ({ kind, limit: 50, after: null });
function host(query, actorId) {
  const tx = { query }, actor = { id: actorId, account_role: 'teacher' };
  return {
    run: async (_request, write, fn) => { assert.equal(write, false); return fn(tx, actor); },
    classroom: async (_tx, user, id, write, teacherOnly) => {
      assert.equal(write, false); assert.equal(teacherOnly, true);
      const [row] = await query('SELECT * FROM classrooms WHERE id=$1::uuid', id);
      if (!row || row.teacher_id !== user.id) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
      return row;
    }
  };
}
async function file(query, room, { purpose = 'material', extension = 'pdf', clean = true, targetId = null } = {}) {
  const id = randomUUID(), digest = 'a'.repeat(64);
  await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
    validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,$5,$6,$7,14,'APPROVED',$8::"ScanStatus",now(),now())`,
  id, room.id, room.teacher, `synthetic-foxy/${id}`, `synthetic.${extension}`, extension,
  extension === 'pdf' ? 'application/pdf' : extension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'image/png', clean ? 'CLEAN' : 'PENDING');
  await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',14,now())", randomUUID(), id);
  await query(`INSERT INTO file_custodies(file_id,purpose,target_id,phase,digest,validated_digest,scanned_digest)
    VALUES($1,$2,$3,'ready',$4,$4,$4)`, id, purpose, targetId, digest);
  return id;
}
async function seedPlan(query, room, version, extension = 'pdf') {
  const id = randomUUID(), fileId = await file(query, room, { purpose: 'plan', extension });
  await query(`INSERT INTO study_plan_versions(id,updated_at,classroom_id,version_number,file_id,uploaded_by_id)
    VALUES($1,now(),$2,$3,$4,$5)`, id, room.id, version, fileId, room.teacher);
  return id;
}
async function seedMaterial(query, room, extension = 'pdf', clean = true) {
  const id = randomUUID(), fileId = await file(query, room, { extension, clean: true });
  await query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,unit_id,topic_id,created_by_id)
    VALUES($1,now(),$2,'Material sintético',$3,$4,$5,$6)`, id, room.id, fileId, room.unit, room.topic, room.teacher);
  if (!clean) await query("UPDATE files SET scan_status='PENDING' WHERE id=$1", fileId);
  return id;
}

test('general context returns no sources without querying classroom', async () => {
  const teacher = randomUUID(), conversationId = randomUUID();
  const context = { run: async (_request, write, fn) => { assert.equal(write, false); return fn({ query: () => { throw new Error('unexpected SQL'); } }, { id: teacher, account_role: 'teacher' }); },
    classroom: () => { throw new Error('unexpected classroom read'); } };
  const service = new FoxyContextCatalogService(context, { get: async () => ({ context: { kind: 'GENERAL' } }) });
  assert.equal(typeof service.sources, 'function');
  const result = await service.sources({}, conversationId, call('PLAN'));
  assert.deepEqual(result.context, { kind: 'GENERAL' }); assert.deepEqual(result.items, []); assert.equal(result.next, null);
});

test('source catalogue filters and pages private classroom records in an isolated PostgreSQL transaction', { timeout: 120000 }, async () => {
  assert.equal(typeof FoxyContextCatalogService.prototype.sources, 'function');
  const { createFoxyConversationRepository } = await Promise.all([import("../../../conversations/infrastructure/conversation-repository.ts"),import("../context-catalog.ts"),import("../assemble-grounding.ts"),import("../grounding-snapshot.ts"),import("../grounding-loader.ts"),import("../turn-repository.ts"),import("../turn-queue.ts"),import("../text-budget.ts"),import("../claim-authority.ts"),import("../durable-loader.ts"),import("../../../domain/provider-input.ts"),import("../turn-completion.ts"),import("../turn-claimed-reader.ts"),import("../turn-preparation.ts"),import("../worker.ts"),import("../../../conversations/infrastructure/unit-of-work.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../presentation/http.ts"),import("../../../citations/infrastructure/citation-mapping.ts"),import("../../../../../bootstrap/foxy-runtime.ts"),import("../../../../../bootstrap/foxy-host.ts"),import("../turn-recovery.ts"),import("../../../resources/infrastructure/resource-repository.ts"),import("../../../publications/infrastructure/publication-repository.ts"),import("../../../publications/infrastructure/publication-queue.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../publications/infrastructure/pdf-worker.ts"),import("../../../publications/infrastructure/publication-worker.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../publications/application/publication-service.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../publications/infrastructure/publication-cleanup.ts"),import("../../../publications/application/publication-management-service.ts"),import("../../../visuals/infrastructure/visual-configuration.ts"),import("../../../../../bootstrap/foxy-visual-host-providers.ts"),import("../../../private-assets/infrastructure/private-asset-read-repository.ts"),import("../../../private-assets/infrastructure/private-asset-reader.ts"),import("../../../private-assets/application/private-asset-read-service.ts"),import("../../../private-assets/infrastructure/private-asset-discard-repository.ts"),import("../../../private-assets/application/private-asset-discard-service.ts"),import("../../../resources/infrastructure/creation-repository.ts"),import("../../../resources/application/creation-service.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService}));
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    await transaction(async ({ query }) => {
      const f = await homeFixture(query), tx = { query }, repo = createFoxyConversationRepository();
      const request = { requestId: randomUUID(), title: 'Fuentes', context: { kind: 'CLASSROOM', classroomId: f.rooms.teach.id } };
      const { conversation } = await repo.create(tx, f.teacherActor, request, hash);
      const service = new FoxyContextCatalogService(host(query, f.teacherActor), repo);
      const oldPlan = await seedPlan(query, f.rooms.teach, 1), newPlan = await seedPlan(query, f.rooms.teach, 2, 'docx');
      await seedPlan(query, f.rooms.foreign, 1);
      const pdf = await seedMaterial(query, f.rooms.teach), word = await seedMaterial(query, f.rooms.teach, 'docx');
      const pending = await seedMaterial(query, f.rooms.teach, 'pdf', false), unsupported = await seedMaterial(query, f.rooms.teach, 'png');
      const deleted = await seedMaterial(query, f.rooms.teach); await query('UPDATE materials SET deleted_at=now() WHERE id=$1::uuid', deleted);
      await seedMaterial(query, f.rooms.foreign);
      const published = await f.activity('teach'), draft = await f.activity('teach', { status: 'DRAFT' }), foreign = await f.activity('foreign');
      const attachment = await file(query, f.rooms.teach, { purpose: 'instructions', targetId: published.id });
      await query('INSERT INTO activity_instruction_files(activity_id,classroom_id,file_id) VALUES($1,$2,$3)', published.id, f.rooms.teach.id, attachment);
      await query("UPDATE files SET scan_status='PENDING' WHERE id=$1", attachment);
      await query("UPDATE activities SET ai_grading_rubric='SENTINELA_PRIVADA' WHERE id=$1", published.id);
      const page = async (kind, after = null, limit = 50) => service.sources({}, conversation.id, { kind, after, limit });
      const plans = (await page('PLAN')).items;
      assert.deepEqual(new Set(plans.map(x => x.sourceId)), new Set([`plan:${oldPlan}`, `plan:${newPlan}`]));
      assert.equal(plans.find(x => x.sourceId === `plan:${oldPlan}`).currentPlan, false);
      assert.equal(plans.find(x => x.sourceId === `plan:${newPlan}`).currentPlan, true);
      assert.equal(plans.find(x => x.sourceId === `plan:${newPlan}`).planVersion, 2);
      const materials = (await page('MATERIAL')).items;
      assert.deepEqual(new Set(materials.map(x => x.sourceId)), new Set([pdf, word, pending, unsupported].map(id => `material:${id}`)));
      for (const id of [pdf, word]) {
        const item = materials.find(x => x.sourceId === `material:${id}`);
        assert.equal(item.available, true); assert.equal(item.unitId, f.rooms.teach.unit); assert.deepEqual(item.topicIds, [f.rooms.teach.topic]);
      }
      assert.equal(materials.find(x => x.sourceId === `material:${pending}`).reason, 'FILE_NOT_READY');
      assert.equal(materials.find(x => x.sourceId === `material:${unsupported}`).reason, 'UNSUPPORTED_FORMAT');
      const activities = (await page('ACTIVITY')).items;
      assert.deepEqual(activities.map(x => x.sourceId), [`activity:${published.id}`]);
      assert.equal(activities[0].documentCount, 1); assert.equal(activities[0].available, false);
      assert.equal(activities[0].reason, 'FILE_NOT_READY');
      assert.equal(JSON.stringify(activities).includes('SENTINELA_PRIVADA'), false);
      assert.equal(JSON.stringify(activities).includes(draft.id), false); assert.equal(JSON.stringify(activities).includes(foreign.id), false);
      const ids = []; let after = null;
      for (let n = 0; n < 5; n++) {
        const result = await page('MATERIAL', after, 1); ids.push(...result.items.map(x => x.sourceId));
        if (!result.next) break; after = result.next;
      }
      assert.equal(ids.length, 4); assert.equal(new Set(ids).size, 4);
      const otherService = new FoxyContextCatalogService(host(query, f.other), repo);
      await assert.rejects(otherService.sources({}, conversation.id, call('PLAN')), { code: 'FORBIDDEN' });
    });
  });
});

// These cases exercise the same owned temporary PostgreSQL helper, each in its own rollback.
test('source catalogue exposes canonical cursors, source metadata and complete activity content status', { timeout: 120000 }, async t => {
  const { createFoxyConversationRepository } = await Promise.all([import("../../../conversations/infrastructure/conversation-repository.ts"),import("../context-catalog.ts"),import("../assemble-grounding.ts"),import("../grounding-snapshot.ts"),import("../grounding-loader.ts"),import("../turn-repository.ts"),import("../turn-queue.ts"),import("../text-budget.ts"),import("../claim-authority.ts"),import("../durable-loader.ts"),import("../../../domain/provider-input.ts"),import("../turn-completion.ts"),import("../turn-claimed-reader.ts"),import("../turn-preparation.ts"),import("../worker.ts"),import("../../../conversations/infrastructure/unit-of-work.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../presentation/http.ts"),import("../../../citations/infrastructure/citation-mapping.ts"),import("../../../../../bootstrap/foxy-runtime.ts"),import("../../../../../bootstrap/foxy-host.ts"),import("../turn-recovery.ts"),import("../../../resources/infrastructure/resource-repository.ts"),import("../../../publications/infrastructure/publication-repository.ts"),import("../../../publications/infrastructure/publication-queue.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../publications/infrastructure/pdf-worker.ts"),import("../../../publications/infrastructure/publication-worker.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../publications/application/publication-service.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../publications/infrastructure/publication-cleanup.ts"),import("../../../publications/application/publication-management-service.ts"),import("../../../visuals/infrastructure/visual-configuration.ts"),import("../../../../../bootstrap/foxy-visual-host-providers.ts"),import("../../../private-assets/infrastructure/private-asset-read-repository.ts"),import("../../../private-assets/infrastructure/private-asset-reader.ts"),import("../../../private-assets/application/private-asset-read-service.ts"),import("../../../private-assets/infrastructure/private-asset-discard-repository.ts"),import("../../../private-assets/application/private-asset-discard-service.ts"),import("../../../resources/infrastructure/creation-repository.ts"),import("../../../resources/application/creation-service.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService}));
  const { parseFoxySourceQuery } = await import("../../../../../../../../src/core/domain/index.ts");
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const check = (name, operation) => t.test(name, () => transaction(async ({ query }) => {
      const f = await homeFixture(query), tx = { query }, repo = createFoxyConversationRepository();
      const request = { requestId: randomUUID(), title: 'Fuentes', context: { kind: 'CLASSROOM', classroomId: f.rooms.teach.id } };
      const { conversation } = await repo.create(tx, f.teacherActor, request, hash);
      const service = new FoxyContextCatalogService(host(query, f.teacherActor), repo);
      const page = (kind, after = null, limit = 50) => service.sources({}, conversation.id, { kind, after, limit });
      await operation({ f, query, page });
    }));

    await check('cursor is canonical createdAt/id and pages descending with stable UUID tie break', async ({ f, query, page }) => {
      const ids = [await seedMaterial(query, f.rooms.teach), await seedMaterial(query, f.rooms.teach), await seedMaterial(query, f.rooms.teach)];
      const older = '2026-01-01T10:00:00.000Z', newer = '2026-01-02T10:00:00.000Z';
      await query('UPDATE materials SET created_at=$2::timestamptz WHERE id=$1::uuid', ids[0], older);
      for (const id of ids.slice(1)) await query('UPDATE materials SET created_at=$2::timestamptz WHERE id=$1::uuid', id, newer);
      const expected = [...ids.slice(1)].sort().reverse().concat(ids[0]);
      const seen = []; let after = null;
      for (let n = 0; n < 3; n++) {
        const result = await page('MATERIAL', after, 1);
        assert.equal(result.items.length, 1);
        seen.push(result.items[0].sourceId.slice('material:'.length));
        if (n < 2) {
          assert.deepEqual(Object.keys(result.next).sort(), ['createdAt', 'id']);
          assert.deepEqual(parseFoxySourceQuery({ kind: 'MATERIAL', limit: 1, after: result.next }).after, result.next);
          assert.equal(result.next.id, seen.at(-1));
          assert.equal(result.next.createdAt, n === 0 ? newer : newer);
        } else assert.equal(result.next, null);
        after = result.next;
      }
      assert.deepEqual(seen, expected);
    });

    await check('millisecond cursors do not skip records created within the same millisecond', async ({ f, query, page }) => {
      const ids = [await seedMaterial(query, f.rooms.teach), await seedMaterial(query, f.rooms.teach), await seedMaterial(query, f.rooms.teach)];
      for (const [n, id] of ids.entries()) await query('UPDATE materials SET created_at=$2::timestamptz WHERE id=$1::uuid', id,
        `2026-01-02T10:00:00.123${String(n + 1).padStart(3, '0')}Z`);
      const seen = []; let after = null;
      for (let n = 0; n < 4; n++) {
        const result = await page('MATERIAL', after, 1);
        seen.push(...result.items.map(item => item.sourceId));
        if (!result.next) break;
        after = result.next;
      }
      assert.deepEqual(new Set(seen), new Set(ids.map(id => `material:${id}`)));
      assert.equal(seen.length, 3);
    });

    await check('items expose kind, timestamps and metadata without losing legacy topics', async ({ f, query, page }) => {
      const plan = await seedPlan(query, f.rooms.teach, 1), material = await seedMaterial(query, f.rooms.teach);
      const activity = await f.activity('teach');
      await query("UPDATE activities SET instructions_text='Consigna sintética' WHERE id=$1::uuid", activity.id);
      const [p] = (await page('PLAN')).items, [m] = (await page('MATERIAL')).items, [a] = (await page('ACTIVITY')).items;
      assert.equal(p.sourceId, `plan:${plan}`); assert.equal(p.kind, 'PLAN'); assert.equal(p.planVersion, 1); assert.equal(p.currentPlan, true);
      assert.equal(p.extension, 'pdf'); assert.equal(String(p.sizeBytes), '14'); assert.equal(p.documentCount, 1); assert.equal(p.publishedAt, null);
      assert.equal(m.sourceId, `material:${material}`); assert.equal(m.kind, 'MATERIAL'); assert.equal(m.extension, 'pdf');
      assert.equal(String(m.sizeBytes), '14'); assert.equal(m.documentCount, 1); assert.equal(m.planVersion, null); assert.equal(m.currentPlan, null);
      assert.equal(a.sourceId, `activity:${activity.id}`); assert.equal(a.kind, 'ACTIVITY');
      assert.equal(a.unitId, f.rooms.teach.unit); assert.deepEqual(a.topicIds, [f.rooms.teach.topic]);
      assert.equal(a.extension, null); assert.equal(a.sizeBytes, null); assert.equal(a.documentCount, 0);
      assert.equal(a.planVersion, null); assert.equal(a.currentPlan, null);
      for (const item of [p, m, a]) assert.equal(new Date(item.createdAt).toISOString(), item.createdAt);
      assert.equal(new Date(a.publishedAt).toISOString(), a.publishedAt);
    });

    await check('published activity without instructions, questions or files reports EMPTY_CONTENT', async ({ f, page }) => {
      const empty = await f.activity('teach');
      const item = (await page('ACTIVITY')).items.find(x => x.sourceId === `activity:${empty.id}`);
      assert.ok(item); assert.equal(item.available, false); assert.equal(item.reason, 'EMPTY_CONTENT');
    });

    await check('source endpoint rejects limit outside the canonical 1..50 range', async ({ page }) => {
      await assert.rejects(page('PLAN', null, 51), { code: 'INVALID_INPUT' });
    });
  });
});
