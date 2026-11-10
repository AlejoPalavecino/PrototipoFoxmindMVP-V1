import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';

const api = () => Promise.all([import("../conversation-repository.ts"),import("../context-catalog.ts"),import("../assemble-grounding.ts"),import("../grounding-snapshot.ts"),import("../grounding-loader.ts"),import("../turn-repository.ts"),import("../turn-queue.ts"),import("../text-budget.ts"),import("../claim-authority.ts"),import("../durable-loader.ts"),import("../provider-input.ts"),import("../turn-completion.ts"),import("../turn-claimed-reader.ts"),import("../turn-preparation.ts"),import("../worker.ts"),import("../unit-of-work.ts"),import("../../../../bootstrap/foxy-service-factories.ts"),import("../../presentation/http.ts"),import("../citation-mapping.ts"),import("../../../../bootstrap/foxy-runtime.ts"),import("../../../../bootstrap/foxy-host.ts"),import("../turn-recovery.ts"),import("../resource-repository.ts"),import("../publication-repository.ts"),import("../publication-queue.ts"),import("../publication-file-allocator.ts"),import("../publication-authority.ts"),import("../publication-completion.ts"),import("../pdf-worker.ts"),import("../publication-worker.ts"),import("../publication-confirmation-repository.ts"),import("../../application/publication-service.ts"),import("../publication-file-reader.ts"),import("../publication-management-repository.ts"),import("../publication-cleanup.ts"),import("../../application/publication-management-service.ts"),import("../visual-configuration.ts"),import("../../../../bootstrap/foxy-visual-host-providers.ts"),import("../private-asset-read-repository.ts"),import("../private-asset-reader.ts"),import("../../application/private-asset-read-service.ts"),import("../private-asset-discard-repository.ts"),import("../../application/private-asset-discard-service.ts"),import("../creation-repository.ts"),import("../../application/creation-service.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService}));
function fixture(count = 2) {
  const classroomId = randomUUID(), claim = Object.freeze({}), parsed = [], docs = [];
  const sources = Array.from({ length: count }, (_, i) => {
    const bytes = Uint8Array.of(i + 1, 2, 3), digest = createHash('sha256').update(bytes).digest('hex'), fileId = randomUUID();
    const file = { fileId, digest, extension: 'pdf', sizeBytes: bytes.length, purpose: 'material', targetId: null };
    const capability = Object.freeze({}); docs.push({ capability, descriptor: { classroomId, file } });
    parsed.push({ fileId, digest, document: { kind: 'pdf', bytes }, pageCount: 1, warnings: [] });
    return { sourceId: `material:${randomUUID()}`, title: `Fuente ${i}`, kind: 'MATERIAL', text: '', files: [file] };
  });
  const snapshot = { context: { kind: 'CLASSROOM', classroomId }, curriculum: { units: [], selectedTopicIds: [] }, sources };
  return { snapshot, parsed, scope: { capability: claim, snapshot: structuredClone(snapshot), documents: docs }, claim, ownerId: randomUUID(), conversationId: randomUUID() };
}
function ports(f, { freshness = [true, true], onRead, onAuthorize } = {}) {
  const calls = [], grants = f.scope.documents.map(entry => ({ capability: entry.capability, descriptor: structuredClone(entry.descriptor) }));
  const authority = {
    authorizeClaim: async (cap, signal) => {
      calls.push({ op: 'authorizeClaim', cap, signal });
      if (cap !== f.claim || signal.aborted) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
      if (onAuthorize) await onAuthorize();
      return { ownerId: f.ownerId, conversationId: f.conversationId, snapshot: structuredClone(f.snapshot) };
    },
    authorizeDocument: async (cap, signal) => {
      calls.push({ op: 'authorizeDocument', cap, signal });
      const entry = grants.find(item => item.capability === cap);
      if (!entry || signal.aborted) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
      return { ownerId: f.ownerId, conversationId: f.conversationId, ...structuredClone(entry.descriptor) };
    },
    revalidateGrounding: async (cap, signal) => {
      calls.push({ op: 'revalidate', cap, signal });
      if (cap !== f.claim || signal.aborted) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
      return freshness.shift();
    }
  };
  const documents = { read: async (cap, signal) => {
    calls.push({ op: 'read', cap, signal });
    if (onRead) return onRead(cap, signal);
    const index = grants.findIndex(item => item.capability === cap);
    if (index < 0) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
    return f.parsed[index];
  } };
  return { authority, documents, calls };
}
async function loader(p) {
  const { createFoxyDurableLoader } = await api(); assert.equal(typeof createFoxyDurableLoader, 'function');
  return createFoxyDurableLoader({ authority: p.authority, documents: p.documents });
}

test('durable loader authorizes, checks grounding twice and reads emitted capabilities in order', async () => {
  const f = fixture(), signal = new AbortController().signal; let active = 0, maximum = 0;
  const p = ports(f, { onRead: async cap => { active++; maximum = Math.max(maximum, active); await Promise.resolve(); active--;
    const index = f.scope.documents.findIndex(item => item.capability === cap); return f.parsed[index]; } });
  const result = await (await loader(p)).load(f.scope, signal);
  assert.equal(p.calls.filter(c => c.op === 'authorizeClaim').length >= 1, true);
  const checks = p.calls.map((c, i) => c.op === 'revalidate' ? i : -1).filter(i => i >= 0);
  const reads = p.calls.map((c, i) => c.op === 'read' ? i : -1).filter(i => i >= 0);
  assert.equal(checks.length, 2); assert.equal(reads.length, 2); assert.ok(checks[0] < reads[0] && checks[1] > reads[1]);
  assert.deepEqual(p.calls.filter(c => c.op === 'read').map(c => c.cap), f.scope.documents.map(d => d.capability));
  assert.ok(p.calls.every(c => c.signal === signal)); assert.equal(maximum, 1);
  assert.equal(result.documents.length, 2); assert.deepEqual(result.referenceMap.map(x => x.sourceId), f.snapshot.sources.map(s => s.sourceId));
});

test('general context validates without document reads', async () => {
  const f = fixture(0); f.snapshot = { context: { kind: 'GENERAL' }, curriculum: null, sources: [] }; f.scope.snapshot = structuredClone(f.snapshot);
  const p = ports(f), result = await (await loader(p)).load(f.scope, new AbortController().signal);
  assert.deepEqual(result.sources, []); assert.deepEqual(result.documents, []);
  assert.equal(p.calls.filter(c => c.op === 'revalidate').length, 2); assert.equal(p.calls.some(c => c.op === 'read'), false);
});

test('forged or altered visible snapshot cannot trigger document I/O', async () => {
  for (const mode of ['claim', 'snapshot', 'missing-document', 'descriptor']) {
    const f = fixture(), p = ports(f), signal = new AbortController().signal;
    if (mode === 'claim') f.scope.capability = {};
    if (mode === 'snapshot') f.scope.snapshot.sources[0].title = 'Falsificado';
    if (mode === 'missing-document') f.scope.documents.pop();
    if (mode === 'descriptor') f.scope.documents[0].descriptor.file.fileId = randomUUID();
    await assert.rejects((await loader(p)).load(f.scope, signal));
    assert.equal(p.calls.some(c => c.op === 'read'), false, mode);
  }
});

test('document capabilities from a different owner or conversation are rejected before I/O', async () => {
  for (const field of ['ownerId', 'conversationId']) {
    const f = fixture(), p = ports(f), original = p.authority.authorizeDocument;
    p.authority.authorizeDocument = async (...args) => ({ ...await original(...args), [field]: randomUUID() });
    await assert.rejects((await loader(p)).load(f.scope, new AbortController().signal));
    assert.equal(p.calls.some(c => c.op === 'read'), false);
  }
});

test('stale grounding before or after I/O fails without a partial result', async () => {
  for (const freshness of [[false], [true, false]]) {
    const f = fixture(1), p = ports(f, { freshness: [...freshness] });
    await assert.rejects((await loader(p)).load(f.scope, new AbortController().signal), { code: 'CONFLICT' });
    assert.equal(p.calls.filter(c => c.op === 'read').length, freshness.length === 1 ? 0 : 1);
  }
});

test('authorization and document errors stop the flow with no later reads', async () => {
  const f = fixture(), forbidden = Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
  const denied = ports(f, { onAuthorize: async () => { throw forbidden; } });
  await assert.rejects((await loader(denied)).load(f.scope, new AbortController().signal), { code: 'FORBIDDEN' });
  assert.equal(denied.calls.some(c => c.op === 'read'), false);
  const failed = ports(f, { onRead: async () => { throw Object.assign(new Error('FILE_NOT_READY'), { code: 'FILE_NOT_READY' }); } });
  await assert.rejects((await loader(failed)).load(f.scope, new AbortController().signal), { code: 'FILE_NOT_READY' });
  assert.equal(failed.calls.filter(c => c.op === 'read').length, 1);
});

test('oversize selection and abort are rejected before or during document I/O', async () => {
  for (const mode of ['count', 'size']) {
    const f = fixture(mode === 'count' ? 7 : 2);
    if (mode === 'size') { f.snapshot.sources[0].files[0].sizeBytes = 10_000_001; f.snapshot.sources[1].files[0].sizeBytes = 10_000_000; f.scope.snapshot = structuredClone(f.snapshot);
      f.scope.documents[0].descriptor.file.sizeBytes = 10_000_001; f.scope.documents[1].descriptor.file.sizeBytes = 10_000_000; }
    const p = ports(f); await assert.rejects((await loader(p)).load(f.scope, new AbortController().signal), { code: 'AI_INPUT_LIMIT' });
    assert.equal(p.calls.some(c => c.op === 'read'), false);
  }
  const f = fixture(), before = new AbortController(), p = ports(f); before.abort();
  await assert.rejects((await loader(p)).load(f.scope, before.signal)); assert.equal(p.calls.some(c => c.op === 'read'), false);
  const during = new AbortController(), q = ports(f, { onRead: async () => { during.abort(); return f.parsed[0]; } });
  await assert.rejects((await loader(q)).load(f.scope, during.signal)); assert.equal(q.calls.filter(c => c.op === 'read').length, 1);
});
