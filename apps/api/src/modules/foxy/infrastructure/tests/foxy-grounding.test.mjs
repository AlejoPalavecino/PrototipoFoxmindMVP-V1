import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';

const domain = () => Promise.all([import("../conversation-repository.ts"),import("../context-catalog.ts"),import("../assemble-grounding.ts"),import("../grounding-snapshot.ts"),import("../grounding-loader.ts"),import("../turn-repository.ts"),import("../turn-queue.ts"),import("../text-budget.ts"),import("../claim-authority.ts"),import("../durable-loader.ts"),import("../provider-input.ts"),import("../turn-completion.ts"),import("../turn-claimed-reader.ts"),import("../turn-preparation.ts"),import("../worker.ts"),import("../unit-of-work.ts"),import("../../../../bootstrap/foxy-service-factories.ts"),import("../../presentation/http.ts"),import("../citation-mapping.ts"),import("../../../../bootstrap/foxy-runtime.ts"),import("../../../../bootstrap/foxy-host.ts"),import("../turn-recovery.ts"),import("../resource-repository.ts"),import("../publication-repository.ts"),import("../publication-queue.ts"),import("../publication-file-allocator.ts"),import("../publication-authority.ts"),import("../publication-completion.ts"),import("../pdf-worker.ts"),import("../publication-worker.ts"),import("../publication-confirmation-repository.ts"),import("../../application/publication-service.ts"),import("../publication-file-reader.ts"),import("../publication-management-repository.ts"),import("../publication-cleanup.ts"),import("../../application/publication-management-service.ts"),import("../visual-configuration.ts"),import("../../../../bootstrap/foxy-visual-host-providers.ts"),import("../private-asset-read-repository.ts"),import("../private-asset-reader.ts"),import("../../application/private-asset-read-service.ts"),import("../private-asset-discard-repository.ts"),import("../../application/private-asset-discard-service.ts"),import("../creation-repository.ts"),import("../../application/creation-service.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService}));
const err = code => error => error?.code === code;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const classroom = { kind: 'CLASSROOM', classroomId: randomUUID() };
const curriculum = { units: [], selectedTopicIds: [] };
function fixture({ extension = 'pdf', bytes = Uint8Array.of(1, 2, 3), text = 'Contenido sintético.', pages = 1 } = {}) {
  const fileId = randomUUID(), hash = digest(bytes), sourceId = `material:${randomUUID()}`;
  const file = { fileId, digest: hash, extension, sizeBytes: bytes.length, purpose: 'material', targetId: null };
  const source = { sourceId, title: 'Fuente sintética', kind: 'MATERIAL', text: '', files: [file] };
  const parsed = { fileId, digest: hash, document: extension === 'pdf' ? { kind: 'pdf', bytes } : { kind: 'text', text },
    pageCount: extension === 'pdf' ? pages : null, warnings: extension === 'pdf' ? [] : ['DOCX_IMAGES_OMITTED'] };
  return { sourceId, fileId, file, source, parsed,
    snapshot: { context: classroom, curriculum, sources: [source] } };
}
async function assembler() {
  const { assembleFoxyGrounding } = await domain();
  assert.equal(typeof assembleFoxyGrounding, 'function');
  return assembleFoxyGrounding;
}

test('general context excludes classroom curriculum and sources', async () => {
  const assemble = await assembler(), f = fixture();
  const result = assemble({ context: { kind: 'GENERAL' }, curriculum: null, sources: [] }, []);
  assert.deepEqual(result.sources, []); assert.deepEqual(result.documents, []); assert.deepEqual(result.referenceMap, []);
  assert.throws(() => assemble({ context: { kind: 'GENERAL' }, curriculum, sources: [] }, []), err('INVALID_INPUT'));
  assert.throws(() => assemble({ context: { kind: 'GENERAL' }, curriculum: null, sources: [f.source] }, [f.parsed]), err('INVALID_INPUT'));
});

test('grounding maps distinct files with equal digests without exposing identifiers in provider content', async () => {
  const assemble = await assembler(), f = fixture(), other = fixture();
  assert.notEqual(f.fileId, other.fileId); assert.equal(f.file.digest, other.file.digest);
  const result = assemble({ ...f.snapshot, sources: [f.source, other.source] }, [f.parsed, other.parsed]);
  assert.equal(result.sources.length, 2); assert.equal(result.documents.length, 2);
  assert.deepEqual(result.sources.map(s => s.sourceKey), ['s1', 's2']);
  assert.deepEqual(result.sources.map(s => s.documentKeys), [['d1'], ['d2']]);
  assert.deepEqual(result.documents.map(d => d.documentKey), ['d1', 'd2']);
  assert.deepEqual(result.documents.map(d => d.sourceKeys), [['s1'], ['s2']]);
  assert.deepEqual(result.documents[0].document, f.parsed.document);
  assert.deepEqual(result.referenceMap, [
    { sourceKey: 's1', sourceId: f.sourceId, documentKeys: ['d1'] },
    { sourceKey: 's2', sourceId: other.sourceId, documentKeys: ['d2'] }
  ]);
  const providerContent = JSON.stringify({ sources: result.sources, documents: result.documents });
  for (const id of [f.fileId, other.fileId, f.sourceId, other.sourceId, f.file.digest])
    assert.equal(providerContent.includes(id), false);
});

test('plan source cannot use a file whose custody purpose is material', async () => {
  const assemble = await assembler(), f = fixture();
  const source = { ...f.source, sourceId: `plan:${randomUUID()}`, kind: 'PLAN' };
  assert.throws(() => assemble({ ...f.snapshot, sources: [source] }, [f.parsed]), err('FILE_NOT_READY'));
});

test('grounding rejects missing, extra and inconsistent document proofs', async () => {
  const assemble = await assembler(), f = fixture();
  assert.throws(() => assemble(f.snapshot, []), err('FILE_NOT_READY'));
  assert.throws(() => assemble(f.snapshot, [f.parsed, { ...f.parsed, fileId: randomUUID() }]), err('INVALID_INPUT'));
  assert.throws(() => assemble(f.snapshot, [{ ...f.parsed, digest: 'b'.repeat(64) }]), err('FILE_NOT_READY'));
  assert.throws(() => assemble(f.snapshot, [{ ...f.parsed, document: { kind: 'pdf', bytes: Uint8Array.of(1, 2) } }]), err('FILE_NOT_READY'));
  assert.throws(() => assemble({ ...f.snapshot, sources: [f.source, { ...f.source, sourceId: `plan:${randomUUID()}`,
    files: [{ ...f.file, sizeBytes: f.file.sizeBytes + 1 }] }] }, [f.parsed]), err('FILE_NOT_READY'));
  assert.throws(() => assemble({ ...f.snapshot, sources: [f.source, f.source] }, [f.parsed]), err('INVALID_INPUT'));
});

test('PDF and DOCX metadata must match the parsed document and preserve DOCX warning', async () => {
  const assemble = await assembler(), pdf = fixture(), docx = fixture({ extension: 'docx' });
  for (const pageCount of [null, 0, -1, 1.5]) assert.throws(() => assemble(pdf.snapshot, [{ ...pdf.parsed, pageCount }]), err('INVALID_INPUT'));
  assert.throws(() => assemble(pdf.snapshot, [{ ...pdf.parsed, document: { kind: 'text', text: 'wrong' } }]), err('FILE_NOT_READY'));
  assert.throws(() => assemble(docx.snapshot, [{ ...docx.parsed, pageCount: 1 }]), err('INVALID_INPUT'));
  assert.throws(() => assemble(docx.snapshot, [{ ...docx.parsed, warnings: [] }]), err('INVALID_INPUT'));
  const result = assemble(docx.snapshot, [docx.parsed]);
  assert.ok(result.documents[0].warnings.includes('DOCX_IMAGES_OMITTED'));
  assert.ok(result.warnings.includes('DOCX_IMAGES_OMITTED'));
});

test('limits count distinct documents, bytes, pages, DOCX characters and source text', async () => {
  const assemble = await assembler(), f = fixture(), tooMany = Array.from({ length: 7 }, () => fixture());
  const six = tooMany.slice(0, 6);
  assert.equal(assemble({ ...f.snapshot, sources: six.map(x => x.source) }, six.map(x => x.parsed)).documents.length, 6);
  assert.throws(() => assemble({ ...f.snapshot, sources: tooMany.map(x => x.source) }, tooMany.map(x => x.parsed)), err('AI_INPUT_LIMIT'));
  const tooBig = fixture({ bytes: new Uint8Array(20_000_001) });
  assert.throws(() => assemble(tooBig.snapshot, [tooBig.parsed]), err('AI_INPUT_LIMIT'));
  assert.throws(() => assemble(f.snapshot, [{ ...f.parsed, pageCount: 101 }]), err('AI_INPUT_LIMIT'));
  const docx = fixture({ extension: 'docx', text: 'x'.repeat(200_001) });
  assert.throws(() => assemble(docx.snapshot, [docx.parsed]), err('AI_INPUT_LIMIT'));
  const tooMuchText = { ...f.source, text: 'x'.repeat(100_001) };
  assert.throws(() => assemble({ ...f.snapshot, sources: [tooMuchText] }, [f.parsed]), err('AI_INPUT_LIMIT'));
});

test('grounding preserves complete curriculum structure, topic states and explicit selection', async () => {
  const assemble = await assembler(), f = fixture(), taught = randomUUID(), next = randomUUID(), pending = randomUUID();
  const selectedCurriculum = { units: [
    { id: randomUUID(), name: 'Energía', position: 0, topics: [
      { id: taught, name: 'Anterior', position: 0, status: 'TAUGHT' },
      { id: next, name: 'Próximo', position: 1, status: 'NEXT' },
      { id: pending, name: 'Futuro', position: 2, status: 'PENDING' }
    ] }
  ], selectedTopicIds: [next, pending] };
  const snapshot = { ...f.snapshot, curriculum: selectedCurriculum };
  const result = assemble(snapshot, [f.parsed]);
  assert.deepEqual(result.curriculum, selectedCurriculum);
  assert.deepEqual(result.context, snapshot.context);
});

for (const kind of ['PLAN', 'MATERIAL']) for (const count of [0, 2]) {
  test(`${kind} source rejects ${count} file descriptors without silent omission`, async () => {
    const assemble = await assembler(), f = fixture(), other = fixture();
    const purpose = kind.toLowerCase();
    const source = { ...f.source, kind, sourceId: `${purpose}:${randomUUID()}`,
      files: count ? [{ ...f.file, purpose }, { ...other.file, purpose }] : [] };
    const parsed = count ? [f.parsed, other.parsed] : [];
    assert.throws(() => assemble({ ...f.snapshot, sources: [source] }, parsed), err('FILE_NOT_READY'));
  });
}
