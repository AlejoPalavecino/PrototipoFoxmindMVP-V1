import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { transactionDatabase } from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import { homeFixture } from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

async function fixture(pool, changes = {}) {
  const api = await Promise.all([import("../../../conversations/infrastructure/conversation-repository.ts"),import("../../../turns/infrastructure/context-catalog.ts"),import("../../../turns/infrastructure/assemble-grounding.ts"),import("../../../turns/infrastructure/grounding-snapshot.ts"),import("../../../turns/infrastructure/grounding-loader.ts"),import("../../../turns/infrastructure/turn-repository.ts"),import("../../../turns/infrastructure/turn-queue.ts"),import("../../../turns/infrastructure/text-budget.ts"),import("../../../turns/infrastructure/claim-authority.ts"),import("../../../turns/infrastructure/durable-loader.ts"),import("../../../domain/provider-input.ts"),import("../../../turns/infrastructure/turn-completion.ts"),import("../../../turns/infrastructure/turn-claimed-reader.ts"),import("../../../turns/infrastructure/turn-preparation.ts"),import("../../../turns/infrastructure/worker.ts"),import("../../../conversations/infrastructure/unit-of-work.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../presentation/http.ts"),import("../citation-mapping.ts"),import("../../../../../bootstrap/foxy-runtime.ts"),import("../../../../../bootstrap/foxy-host.ts"),import("../../../turns/infrastructure/turn-recovery.ts"),import("../../../resources/infrastructure/resource-repository.ts"),import("../../../publications/infrastructure/publication-repository.ts"),import("../../../publications/infrastructure/publication-queue.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../publications/infrastructure/pdf-worker.ts"),import("../../../publications/infrastructure/publication-worker.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../publications/application/publication-service.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../publications/infrastructure/publication-cleanup.ts"),import("../../../publications/application/publication-management-service.ts"),import("../../../visuals/infrastructure/visual-configuration.ts"),import("../../../../../bootstrap/foxy-visual-host-providers.ts"),import("../../../private-assets/infrastructure/private-asset-read-repository.ts"),import("../../../private-assets/infrastructure/private-asset-reader.ts"),import("../../../private-assets/application/private-asset-read-service.ts"),import("../../../private-assets/infrastructure/private-asset-discard-repository.ts"),import("../../../private-assets/application/private-asset-discard-service.ts"),import("../../../resources/infrastructure/creation-repository.ts"),import("../../../resources/application/creation-service.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService})), query = async (sql, ...args) => (await pool.query(sql,args)).rows, f = await homeFixture(query);
  const room = f.rooms.teach, activity = await f.activity('teach');
  await query("UPDATE activities SET instructions_text='Consigna' WHERE id=$1::uuid", activity.id);
  const documents = [];
  for (const label of ['primero', 'segundo']) {
    const id = randomUUID(), bytes = Buffer.from(`%PDF-${label}-synthetic`), digest = createHash('sha256').update(bytes).digest('hex');
    await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
      validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,$5,'pdf','application/pdf',$6,'APPROVED','CLEAN',now(),now())`,
      id, room.id, room.teacher, `synthetic/${id}`, `${label}.pdf`, bytes.length);
    await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',$3,now())", randomUUID(), id, bytes.length);
    await query("INSERT INTO file_custodies(file_id,purpose,target_id,phase,digest,validated_digest,scanned_digest) VALUES($1,'instructions',$2,'ready',$3,$3,$3)", id, activity.id, digest);
    await query('INSERT INTO activity_instruction_files(activity_id,classroom_id,file_id) VALUES($1,$2,$3)', activity.id, room.id, id);
    documents.push({ id, bytes, digest });
  }
  const uow = api.createFoxyUnitOfWork({ database: transactionDatabase(pool), authenticate: async (_tx, req) => { if (req.revoked) throw Object.assign(Error('AUTH_REQUIRED'), { code:'AUTH_REQUIRED' }); return req.id; } });
  const owner = { id: f.teacherActor }, conversations = api.createFoxyConversationRepository(), turns = api.createFoxyTurnRepository();
  const { conversation } = await uow.run(owner, true, (tx, actor) => conversations.create(tx, actor.id,
    { requestId: randomUUID(), title:'Chat', context:{ kind:'CLASSROOM', classroomId:room.id } }, 'a'.repeat(64)));
  const turnService = api.createFoxyTurnService({ uow, conversations, turns, configuration:{ enabled:true, model:'synthetic' } });
  const sourceId = `activity:${activity.id}`, sent = await turnService.send(owner, conversation.id,
    { requestId:randomUUID(), revision:'0', purpose:'CHAT', text:'Hola', selection:{ topicIds:[], sourceIds:[sourceId] } });
  const [row] = await query('SELECT snapshot FROM foxy_turns WHERE id=$1::uuid', sent.turn.id), snapshotFiles = row.snapshot.sources[0].files;
  const cited = snapshotFiles[1], chosen = documents.find(d => d.id === cited.fileId);
  const answer = { schemaVersion:'foxy-answer-v1', title:'Resumen', markdown:'Texto', references:[{sourceId,page:1}], warnings:[], missingInformation:[] };
  const referenceMap = [{ sourceKey:'s1', sourceId, documentKeys:['d1','d2'] }];
  const report = [{ sourceKey:'s1', title:row.snapshot.sources[0].title, kind:'ACTIVITY', documentKeys:['d1','d2'], citations:[{sourceId,documentKey:'d2',page:1}] }];
  await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map=$3::jsonb,source_report=$4::jsonb WHERE id=$1::uuid", sent.turn.id, JSON.stringify(answer), JSON.stringify(referenceMap), JSON.stringify(report));
  const calls = [], files = { read: async (request, id, mode) => { calls.push({ request,id,mode }); if (changes.onRead) await changes.onRead({ query, f, activity, chosen });
    return { bytes: changes.bytes ?? chosen.bytes, headers: { 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Content-Type':'application/pdf' } }; } };
  const citations = api.createFoxyCitationService({ uow, files });
  return { citations, owner, conversation, turnId:sent.turn.id, chosen, documents, calls, query, f, activity };
}

test('authorized citation reads exactly its second PDF with safe headers', { timeout:120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const f = await fixture(pool); assert.equal(typeof f.citations.readFile, 'function');
    const result = await f.citations.readFile(f.owner, f.conversation.id, f.turnId, 'c1', 'preview');
    assert.deepEqual(Buffer.from(result.bytes), f.chosen.bytes); assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].request, f.owner); assert.equal(f.calls[0].id, f.chosen.id); assert.equal(f.calls[0].mode, 'preview');
    assert.equal(result.headers['Cache-Control'], 'no-store'); assert.equal(result.headers['X-Content-Type-Options'], 'nosniff');
    assert.equal(result.headers.Location, undefined);
    await assert.rejects(f.citations.readFile(f.owner, f.conversation.id, f.turnId, f.documents[0].id, 'preview'));
    assert.equal(f.calls.length, 1);
  });
});

test('revocation before or during file read and historical byte mismatch return no bytes', { timeout:120000 }, async () => {
  for (const cause of ['before','during','digest','size']) await withAgendaDatabase(async ({ pool }) => {
    const changes = cause === 'during' ? { onRead: async ({ query, chosen }) => query("UPDATE files SET scan_status='ERROR' WHERE id=$1::uuid", chosen.id) }
      : cause === 'digest' ? { bytes: Buffer.from('invalid-synthetic') } : cause === 'size' ? { bytes: Buffer.alloc(1) } : {};
    const f = await fixture(pool, changes); assert.equal(typeof f.citations.readFile, 'function');
    if (cause === 'before') await f.query("UPDATE files SET scan_status='ERROR' WHERE id=$1::uuid", f.chosen.id);
    await assert.rejects(f.citations.readFile(f.owner, f.conversation.id, f.turnId, 'c1', 'download'));
    assert.equal(f.calls.length, cause === 'before' ? 0 : 1);
  });
});
