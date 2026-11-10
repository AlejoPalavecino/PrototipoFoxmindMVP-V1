import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { office } from './p4-fixtures.mjs';
import { withAiDatabase, rollbackCase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';
const filesApi = () => Promise.all([import("../.build/api/apps/api/src/modules/files/infrastructure/service.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/activity-source-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/approved-plan-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/durable-plan-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/docx-text.js"),import("../.build/api/apps/api/src/bootstrap/files-files.module.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/cleanup-worker.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/access.js"),import("../.build/api/apps/api/src/modules/files/presentation/http.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/storage.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/scanner.js"),import("../.build/api/apps/api/src/modules/files/domain/errors.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/store.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/promotion.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/configuration.js"),import("../.build/api/apps/api/src/bootstrap/files-host.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/grading-ai-attachment-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/durable-grading-ai-attachment-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/durable-grading-ai-instruction-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-document-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-durable-document-reader.js"),import("../.build/api/apps/api/src/bootstrap/files-foxy-publication-composition.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-private-image-inspector.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-private-asset-files.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-publication-raster-source.js")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24]) => Object.freeze({FileService: m0.FileService,createDurableActivitySourceReader: m1.createDurableActivitySourceReader,createApprovedPlanReader: m2.createApprovedPlanReader,createDurableApprovedPlanReader: m3.createDurableApprovedPlanReader,extractDocxPlanDocument: m4.extractDocxPlanDocument,FilesModule: m5.FilesModule,FileCleanupWorker: m6.FileCleanupWorker,createFileAccess: m7.createFileAccess,createFilesHandler: m8.createFilesHandler,S3Storage: m9.S3Storage,ClamdScanner: m10.ClamdScanner,FileError: m11.FileError,FileStore: m12.FileStore,FileIdentityError: m12.FileIdentityError,promoteDraftPlan: m13.promoteDraftPlan,createFileInfrastructure: m14.createFileInfrastructure,readFilesConfiguration: m14.readFilesConfiguration,installFilesTransport: m15.installFilesTransport,createIdentityFileAccess: m15.createIdentityFileAccess,FileHostLifecycle: m15.FileHostLifecycle,createGradingAiAttachmentReader: m16.createGradingAiAttachmentReader,createDurableGradingAiAttachmentReader: m17.createDurableGradingAiAttachmentReader,createDurableGradingAiInstructionReader: m18.createDurableGradingAiInstructionReader,createFoxyDocumentReader: m19.createFoxyDocumentReader,createDurableFoxyDocumentReader: m20.createDurableFoxyDocumentReader,createDurableFoxyPublicationFiles: m21.createDurableFoxyPublicationFiles,createFoxyPrivateImageInspector: m22.createFoxyPrivateImageInspector,createFoxyPrivateAssetFiles: m23.createFoxyPrivateAssetFiles,createDurableFoxyPublicationRasterSource: m24.createDurableFoxyPublicationRasterSource}));
const word = () => office('docx', [], entries => entries.map(entry => entry.name === 'word/document.xml' ? { ...entry,
  bytes: Buffer.from('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Exposición: luz acumulada durante un intervalo.</w:t></w:r></w:p></w:body></w:document>') } : entry));
async function addSource(f, bytes, { kind = 'plan', extension = 'pdf', size = bytes.length, version = 1 } = {}) {
  const fileId = randomUUID(), id = randomUUID(), digest = createHash('sha256').update(bytes).digest('hex');
  const mime = extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  await f.pool.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,
    size_bytes,validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,$5,$6,$7,$8,'APPROVED','CLEAN',now(),now())`,
  [fileId, f.room, f.teacher, `synthetic/${fileId}`, `source.${extension}`, extension, mime, size]);
  await f.pool.query(`INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',$3,now())`, [randomUUID(), fileId, size]);
  await f.pool.query(`INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest)
    VALUES($1,$2,'ready',$3,$3,$3)`, [fileId, kind, digest]);
  if (kind === 'plan') await f.pool.query(`INSERT INTO study_plan_versions(id,classroom_id,version_number,file_id,uploaded_by_id) VALUES($1,$2,$3,$4,$5)`, [id, f.room, version, fileId, f.teacher]);
  else await f.pool.query(`INSERT INTO materials(id,classroom_id,title,file_id,created_by_id) VALUES($1,$2,'Synthetic material',$3,$4)`, [id, f.room, fileId, f.teacher]);
  return { ownerId: f.teacher, classroomId: f.room, sourceId: `${kind}:${id}`, fileId, digest };
}

test('A2 actual approved activity source reader reads private PDF/DOCX with capability and custody checks', { timeout: 120000 }, async t => {
  const { createDurableActivitySourceReader, FileService, createFileAccess } = await filesApi();
  assert.equal(typeof createDurableActivitySourceReader, 'function');
  await withAiDatabase(async ({ pool }) => {
    const pdf = await PDFDocument.create(); pdf.addPage(); pdf.addPage(); const pdfBytes = Buffer.from(await pdf.save());
    const setup = async local => {
      const f = await fixture(local), stored = new Map(); let reads = 0, allowed = true;
      const files = new FileService({ database: f.database, draftQuotaBytes: 100000000n,
        access: createFileAccess({ authenticate: async (_tx, req) => req.actor, authorizeAttemptWrite: async () => {} }),
        storage: { get: async key => { reads++; const id = key.split('/').at(-1); return stored.get(id); } }, scanner: { scan: async () => {} } });
      const grants = [], reader = createDurableActivitySourceReader({ files, authorize: async grant => {
        if (!allowed || !grants.some(x => Object.keys(x).every(key => x[key] === grant[key]))) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
      } });
      const add = async (bytes, options) => { const grant = await addSource(f, bytes, options); grants.push(grant); stored.set(grant.fileId, bytes); return grant; };
      return { f, reader, add, stored, reads: () => reads, revoke: () => { allowed = false; } };
    };
    await t.test('latest plan PDF and material Word retain source identity, pages/text and mandatory image warning', () => rollbackCase(pool, async local => {
      const x = await setup(local), pdf = await x.add(pdfBytes), docx = await x.add(word(), { kind: 'material', extension: 'docx' });
      const signal = new AbortController().signal;
      const result = await x.reader.read(pdf, signal);
      assert.equal(result.sourceId, pdf.sourceId); assert.equal(result.pageCount, 2); assert.equal(result.document.kind, 'pdf');
      assert.deepEqual(Buffer.from(result.document.bytes), pdfBytes);
      const text = await x.reader.read(docx, signal);
      assert.equal(text.sourceId, docx.sourceId); assert.equal(text.pageCount, null); assert.equal(text.document.kind, 'text');
      assert.match(text.document.text, /Exposición: luz acumulada/); assert.deepEqual(text.warnings, ['DOCX_IMAGES_OMITTED']);
    }));
    await t.test('foreign or revoked durable grant cannot fetch private bytes', () => rollbackCase(pool, async local => {
      const x = await setup(local), grant = await x.add(pdfBytes), signal = new AbortController().signal;
      await assert.rejects(x.reader.read({ ...grant, ownerId: x.f.stranger }, signal), { code: 'FORBIDDEN' });
      x.revoke(); await assert.rejects(x.reader.read(grant, signal), { code: 'FORBIDDEN' }); assert.equal(x.reads(), 0);
    }));
    await t.test('deleted material, scan downgrade and changed bytes are never returned as model input', () => rollbackCase(pool, async local => {
      const x = await setup(local), grant = await x.add(pdfBytes, { kind: 'material' }), signal = new AbortController().signal;
      await local.pool.query('UPDATE materials SET deleted_at=now() WHERE file_id=$1', [grant.fileId]);
      await assert.rejects(x.reader.read(grant, signal)); assert.equal(x.reads(), 0);
      // Deletion is intentionally irreversible: use a different material for the independent custody scenario.
      const scanned = await x.add(pdfBytes, { kind: 'material' });
      await local.pool.query("UPDATE files SET scan_status='PENDING' WHERE id=$1", [scanned.fileId]);
      await assert.rejects(x.reader.read(scanned, signal)); assert.equal(x.reads(), 0);
      await local.pool.query("UPDATE files SET scan_status='CLEAN' WHERE id=$1", [scanned.fileId]);
      x.stored.set(scanned.fileId, Buffer.from('changed')); await assert.rejects(x.reader.read(scanned, signal));
    }));
    await t.test('superseded plan and over-limit declared file are rejected before reading storage', () => rollbackCase(pool, async local => {
      const x = await setup(local), old = await x.add(pdfBytes), current = await x.add(pdfBytes, { version: 2 }), signal = new AbortController().signal;
      await assert.rejects(x.reader.read(old, signal)); assert.equal(x.reads(), 0);
      assert.equal((await x.reader.read(current, signal)).pageCount, 2);
      const big = await x.add(pdfBytes, { kind: 'material', size: 20000001 });
      const before = x.reads(); await assert.rejects(x.reader.read(big, signal)); assert.equal(x.reads(), before);
    }));
    await t.test('PDF page cap is enforced on actual parsed pages instead of trusting metadata', () => rollbackCase(pool, async local => {
      const x = await setup(local), large = await PDFDocument.create(); for (let i = 0; i < 101; i++) large.addPage();
      const grant = await x.add(Buffer.from(await large.save()));
      await assert.rejects(x.reader.read(grant, new AbortController().signal), { code: 'AI_INPUT_LIMIT' });
    }));
    await t.test('catalog exposes current plan and same-room materials with explicit unsupported/size reasons', () => rollbackCase(pool, async local => {
      const { ActivityAiService } = await Promise.all([import("../apps/api/src/modules/activities/infrastructure/activity-ai/service.ts"),import("../apps/api/src/modules/activities/infrastructure/activity-ai/worker.ts"),import("../apps/api/src/modules/activities/infrastructure/activity-ai/provenance.ts")]).then(([m0,m1,m2]) => Object.freeze({ActivityAiService: m0.ActivityAiService,ActivityAiWorker: m1.ActivityAiWorker,validateActivityGeneration: m2.validateActivityGeneration}));
      const x = await setup(local), prior = await x.add(pdfBytes), current = await x.add(pdfBytes, { version: 2 });
      const large = await x.add(pdfBytes, { kind: 'material', size: 50000000 });
      const unsupported = await x.add(Buffer.from('synthetic unsupported format'), { kind: 'material', extension: 'pptx' });
      const usable = await x.add(word(), { kind: 'material', extension: 'docx' });
      const service = new ActivityAiService({ ...x.f.options, reader: x.reader });
      const catalog = await service.sources(x.f.T, x.f.room), byId = new Map(catalog.sources.map(item => [item.sourceId, item]));
      assert.equal(byId.has(prior.sourceId), false); assert.equal(byId.get(current.sourceId).available, true);
      assert.equal(byId.get(large.sourceId).available, false); assert.equal(byId.get(large.sourceId).reason, 'AI_INPUT_LIMIT');
      assert.equal(byId.get(unsupported.sourceId).available, false); assert.equal(byId.get(unsupported.sourceId).reason, 'UNSUPPORTED_FORMAT');
      assert.equal(byId.get(usable.sourceId).available, true); assert.equal(byId.get(usable.sourceId).kind, 'material');
      assert.equal(typeof byId.get(large.sourceId).sizeBytes, 'number'); assert.equal(x.reads(), 0);
      await assert.rejects(service.sources(x.f.S, x.f.room), { code: 'FORBIDDEN' });
    }));
  });
});
