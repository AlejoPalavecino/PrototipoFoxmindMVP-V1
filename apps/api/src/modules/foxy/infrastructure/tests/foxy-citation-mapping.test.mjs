import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

function fixture() {
  const classroomId = randomUUID(), materialId = randomUUID(), activityId = randomUUID();
  const material = `material:${materialId}`, activity = `activity:${activityId}`;
  const file = (purpose, targetId) => ({ fileId: randomUUID(), digest: 'a'.repeat(64), extension: 'pdf', sizeBytes: 4, purpose, targetId });
  const files = [file('material', null), file('instructions', activityId), file('instructions', activityId)];
  const snapshot = { context: { kind: 'CLASSROOM', classroomId }, curriculum: { units: [], selectedTopicIds: [] }, sources: [
    { sourceId: material, title: 'Material', kind: 'MATERIAL', text: '', files: [files[0]] },
    { sourceId: activity, title: 'Actividad', kind: 'ACTIVITY', text: 'Consigna', files: files.slice(1) } ] };
  const referenceMap = [{ sourceKey: 's1', sourceId: material, documentKeys: ['d1'] },
    { sourceKey: 's2', sourceId: activity, documentKeys: ['d2', 'd3'] }];
  const references = [{ sourceId: activity, page: 1 }, { sourceId: material, page: 2 }, { sourceId: activity, page: 1 }];
  const answer = { schemaVersion: 'foxy-answer-v1', title: 'Síntesis', markdown: 'Texto', references, warnings: [], missingInformation: [] };
  const sourceReport = [{ sourceKey: 's1', title: 'Material', kind: 'MATERIAL', documentKeys: ['d1'],
    citations: [{ sourceId: material, documentKey: 'd1', page: 2 }] },
  { sourceKey: 's2', title: 'Actividad', kind: 'ACTIVITY', documentKeys: ['d2', 'd3'],
    citations: [{ sourceId: activity, documentKey: 'd2', page: 1 }, { sourceId: activity, documentKey: 'd3', page: 1 }] }];
  return { input: { answer, sourceReport, referenceMap, snapshot }, files, material, activity };
}
async function map(input) { const api = await Promise.all([import("../conversation-repository.ts"),import("../context-catalog.ts"),import("../assemble-grounding.ts"),import("../grounding-snapshot.ts"),import("../grounding-loader.ts"),import("../turn-repository.ts"),import("../turn-queue.ts"),import("../text-budget.ts"),import("../claim-authority.ts"),import("../durable-loader.ts"),import("../provider-input.ts"),import("../turn-completion.ts"),import("../turn-claimed-reader.ts"),import("../turn-preparation.ts"),import("../worker.ts"),import("../unit-of-work.ts"),import("../../../../bootstrap/foxy-service-factories.ts"),import("../../presentation/http.ts"),import("../citation-mapping.ts"),import("../../../../bootstrap/foxy-runtime.ts"),import("../../../../bootstrap/foxy-host.ts"),import("../turn-recovery.ts"),import("../resource-repository.ts"),import("../publication-repository.ts"),import("../publication-queue.ts"),import("../publication-file-allocator.ts"),import("../publication-authority.ts"),import("../publication-completion.ts"),import("../pdf-worker.ts"),import("../publication-worker.ts"),import("../publication-confirmation-repository.ts"),import("../../application/publication-service.ts"),import("../publication-file-reader.ts"),import("../publication-management-repository.ts"),import("../publication-cleanup.ts"),import("../../application/publication-management-service.ts"),import("../visual-configuration.ts"),import("../../../../bootstrap/foxy-visual-host-providers.ts"),import("../private-asset-read-repository.ts"),import("../private-asset-reader.ts"),import("../../application/private-asset-read-service.ts"),import("../private-asset-discard-repository.ts"),import("../../application/private-asset-discard-service.ts"),import("../creation-repository.ts"),import("../../application/creation-service.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService})); assert.equal(typeof api.mapFoxyCitations, 'function'); return api.mapFoxyCitations(input); }

test('maps globally numbered files and interleaved duplicate-page citations in answer order', async () => {
  const f = fixture(), result = await map(f.input);
  assert.equal(result.length, 3);
  assert.deepEqual(result.map(c => c.citationKey), ['c1','c2','c3']);
  assert.deepEqual(result.map(c => c.sourceId), [f.activity,f.material,f.activity]);
  assert.deepEqual(result.map(c => c.file?.fileId), [f.files[1].fileId,f.files[0].fileId,f.files[2].fileId]);
  assert.deepEqual(result.map(c => c.page), [1,2,1]); assert.ok(result.every(c => c.available));
  assert.deepEqual(result.map(c => [c.sourceTitle,c.sourceKind]), [['Actividad','ACTIVITY'],['Material','MATERIAL'],['Actividad','ACTIVITY']]);
});

test('inconsistent mapping, missing evidence or altered page never guesses a file', async () => {
  const mutations = [
    x => { x.referenceMap[1].documentKeys = ['d1','d3']; },
    x => { x.snapshot.sources[1].files.pop(); },
    x => { x.sourceReport[1].citations[0].documentKey = 'd999'; },
    x => { x.sourceReport[1].citations[0].page = 8; },
    x => { x.sourceReport[1].citations.shift(); },
    x => { x.snapshot.sources[1].sourceId = `activity:${randomUUID()}`; },
  ];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f.input); const result = await map(f.input);
    assert.equal(result[0].citationKey, 'c1'); assert.equal(result[0].available, false); assert.equal(result[0].file, null);
  }
});

test('unavailable mapping does not leak a source or file from another citation', async () => {
  const f = fixture(); f.input.sourceReport[1].citations[0].sourceId = f.material;
  const result = await map(f.input); assert.equal(result[0].available, false); assert.equal(result[0].file, null);
  assert.notEqual(result[0].sourceId, f.material);
});

test('a text-only source citation with no document and no page remains valid', async () => {
  const f = fixture(), source = f.input.snapshot.sources[1], mapping = f.input.referenceMap[1], report = f.input.sourceReport[1];
  source.files = []; mapping.documentKeys = []; report.documentKeys = [];
  report.citations = [{ sourceId: f.activity, documentKey: null, page: null }];
  f.input.answer.references = [{ sourceId: f.activity, page: null }];
  const [citation] = await map(f.input); assert.equal(citation.citationKey, 'c1');
  assert.equal(citation.available, true); assert.equal(citation.file, null); assert.equal(citation.page, null);
});

test('duplicate source UUIDs differing only by case fail closed for every citation', async () => {
  const f = fixture(), source = f.input.snapshot.sources[1], upper = `activity:${source.sourceId.slice(9).toUpperCase()}`;
  f.input.snapshot.sources = [source, { ...structuredClone(source), sourceId: upper }];
  f.input.referenceMap = [{ sourceKey: 's1', sourceId: f.activity, documentKeys: ['d1', 'd2'] },
    { sourceKey: 's2', sourceId: upper, documentKeys: ['d1', 'd2'] }];
  f.input.sourceReport = [{ sourceKey: 's1', title: source.title, kind: source.kind, documentKeys: ['d1', 'd2'],
    citations: [{ sourceId: f.activity, documentKey: 'd1', page: 1 }] },
  { sourceKey: 's2', title: source.title, kind: source.kind, documentKeys: ['d1', 'd2'],
    citations: [{ sourceId: upper, documentKey: 'd1', page: 1 }] }];
  f.input.answer.references = [{ sourceId: f.activity, page: 1 }, { sourceId: upper, page: 1 }];
  const result = await map(f.input); assert.equal(result.length, 2);
  for (const citation of result) { assert.equal(citation.available, false); assert.equal(citation.file, null); }
});
