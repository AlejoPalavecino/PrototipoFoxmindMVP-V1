import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';

const api = () => Promise.all([import("../conversation-repository.ts"),import("../context-catalog.ts"),import("../assemble-grounding.ts"),import("../grounding-snapshot.ts"),import("../grounding-loader.ts"),import("../turn-repository.ts"),import("../turn-queue.ts"),import("../text-budget.ts"),import("../claim-authority.ts"),import("../durable-loader.ts"),import("../provider-input.ts"),import("../turn-completion.ts"),import("../turn-claimed-reader.ts"),import("../turn-preparation.ts"),import("../worker.ts"),import("../unit-of-work.ts"),import("../../../../bootstrap/foxy-service-factories.ts"),import("../../presentation/http.ts"),import("../citation-mapping.ts"),import("../../../../bootstrap/foxy-runtime.ts"),import("../../../../bootstrap/foxy-host.ts"),import("../turn-recovery.ts"),import("../resource-repository.ts"),import("../publication-repository.ts"),import("../publication-queue.ts"),import("../publication-file-allocator.ts"),import("../publication-authority.ts"),import("../publication-completion.ts"),import("../pdf-worker.ts"),import("../publication-worker.ts"),import("../publication-confirmation-repository.ts"),import("../../application/publication-service.ts"),import("../publication-file-reader.ts"),import("../publication-management-repository.ts"),import("../publication-cleanup.ts"),import("../../application/publication-management-service.ts"),import("../visual-configuration.ts"),import("../../../../bootstrap/foxy-visual-host-providers.ts"),import("../private-asset-read-repository.ts"),import("../private-asset-reader.ts"),import("../../application/private-asset-read-service.ts"),import("../private-asset-discard-repository.ts"),import("../../application/private-asset-discard-service.ts"),import("../creation-repository.ts"),import("../../application/creation-service.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService}));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const request = { session: 'synthetic-request' }, conversationId = randomUUID();
function fixture(count = 2) {
  const context = { kind: 'CLASSROOM', classroomId: randomUUID() };
  const parsed = [], sources = Array.from({ length: count }, (_, i) => {
    const bytes = Uint8Array.of(i + 1, 2, 3), digest = hash(bytes), fileId = randomUUID();
    const file = { fileId, digest, extension: 'pdf', sizeBytes: bytes.length, purpose: 'material', targetId: null };
    parsed.push({ fileId, digest, document: { kind: 'pdf', bytes }, pageCount: 1, warnings: [] });
    return { sourceId: `material:${randomUUID()}`, title: `Fuente ${i}`, kind: 'MATERIAL', text: '', files: [file] };
  });
  return { snapshot: { context, curriculum: { units: [], selectedTopicIds: [] }, sources }, parsed };
}
function ports({ outcomes = [true, true], read, revalidate } = {}) {
  const calls = [], snapshots = { revalidate: async (...args) => {
    calls.push({ op: 'revalidate', args });
    return revalidate ? revalidate(...args) : outcomes.shift();
  } }, documents = { read: async (...args) => { calls.push({ op: 'read', args }); return read(...args); } };
  return { snapshots, documents, calls };
}
async function loader(p) {
  const { FoxyGroundingLoader } = await api();
  assert.equal(typeof FoxyGroundingLoader, 'function');
  return new FoxyGroundingLoader({ snapshots: p.snapshots, documents: p.documents });
}

test('loads selected documents sequentially between initial and final snapshot revalidation', async () => {
  const f = fixture(), controller = new AbortController(); let active = 0, maximum = 0;
  const p = ports({ read: async (_request, descriptor, signal) => {
    active++; maximum = Math.max(maximum, active); await Promise.resolve(); active--;
    assert.equal(signal, controller.signal); return f.parsed.find(item => item.fileId === descriptor.file.fileId);
  } });
  const service = await loader(p), result = await service.load(request, conversationId, f.snapshot, controller.signal);
  assert.deepEqual(p.calls.map(call => call.op), ['revalidate', 'read', 'read', 'revalidate']);
  for (const call of p.calls.filter(item => item.op === 'revalidate')) assert.deepEqual(call.args, [request, conversationId, f.snapshot]);
  for (const [i, call] of p.calls.filter(item => item.op === 'read').entries())
    assert.deepEqual(call.args, [request, { classroomId: f.snapshot.context.classroomId, file: f.snapshot.sources[i].files[0] }, controller.signal]);
  assert.equal(maximum, 1); assert.equal(result.documents.length, 2);
  assert.deepEqual(result.referenceMap.map(item => item.sourceId), f.snapshot.sources.map(source => source.sourceId));
});

test('general context revalidates without reading files', async () => {
  const snapshot = { context: { kind: 'GENERAL' }, curriculum: null, sources: [] };
  const p = ports({ read: () => { throw new Error('unexpected read'); } }), service = await loader(p), signal = new AbortController().signal;
  const result = await service.load(request, conversationId, snapshot, signal);
  assert.deepEqual(p.calls.map(call => call.op), ['revalidate', 'revalidate']);
  assert.deepEqual(result.sources, []); assert.deepEqual(result.documents, []); assert.deepEqual(result.context, snapshot.context);
});

test('stale snapshot before or after I/O fails closed without returning a result', async () => {
  const f = fixture(1), signal = new AbortController().signal;
  for (const outcomes of [[false], [true, false]]) {
    const p = ports({ outcomes: [...outcomes], read: async () => f.parsed[0] }), service = await loader(p);
    await assert.rejects(service.load(request, conversationId, f.snapshot, signal), { code: 'CONFLICT' });
    assert.equal(p.calls.filter(call => call.op === 'read').length, outcomes.length === 1 ? 0 : 1);
  }
});

test('permission and document read errors propagate and no later document is read', async () => {
  const f = fixture(), signal = new AbortController().signal, forbidden = Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
  const denied = ports({ revalidate: async () => { throw forbidden; }, read: async () => { throw new Error('unexpected read'); } });
  await assert.rejects((await loader(denied)).load(request, conversationId, f.snapshot, signal), { code: 'FORBIDDEN' });
  assert.equal(denied.calls.some(call => call.op === 'read'), false);
  const unavailable = Object.assign(new Error('FILE_NOT_READY'), { code: 'FILE_NOT_READY' });
  const failed = ports({ read: async () => { throw unavailable; } });
  await assert.rejects((await loader(failed)).load(request, conversationId, f.snapshot, signal), { code: 'FILE_NOT_READY' });
  assert.equal(failed.calls.filter(call => call.op === 'read').length, 1);
  assert.equal(failed.calls.filter(call => call.op === 'revalidate').length, 1);
});

test('file count and aggregate size are rejected before document I/O', async () => {
  const signal = new AbortController().signal;
  for (const tooLarge of [false, true]) {
    const f = fixture(tooLarge ? 2 : 7);
    if (tooLarge) { f.snapshot.sources[0].files[0].sizeBytes = 10_000_001; f.snapshot.sources[1].files[0].sizeBytes = 10_000_000; }
    const p = ports({ read: async () => { throw new Error('unexpected read'); } });
    await assert.rejects((await loader(p)).load(request, conversationId, f.snapshot, signal), { code: 'AI_INPUT_LIMIT' });
    assert.equal(p.calls.some(call => call.op === 'read'), false);
  }
});

test('aborted signal rejects without continuing further document reads', async () => {
  const f = fixture(), before = new AbortController(); before.abort();
  const p = ports({ read: async () => { throw new Error('unexpected read'); } });
  await assert.rejects((await loader(p)).load(request, conversationId, f.snapshot, before.signal));
  assert.equal(p.calls.some(call => call.op === 'read'), false);
  const during = new AbortController(), q = ports({ read: async () => { during.abort(); return f.parsed[0]; } });
  await assert.rejects((await loader(q)).load(request, conversationId, f.snapshot, during.signal));
  assert.equal(q.calls.filter(call => call.op === 'read').length, 1);
});

test('assembler validates documents only after final snapshot revalidation', async () => {
  const f = fixture(1), signal = new AbortController().signal;
  const p = ports({ outcomes: [true, false], read: async () => ({ ...f.parsed[0], digest: 'b'.repeat(64) }) });
  await assert.rejects((await loader(p)).load(request, conversationId, f.snapshot, signal), { code: 'CONFLICT' });
  assert.deepEqual(p.calls.map(call => call.op), ['revalidate', 'read', 'revalidate']);
});
