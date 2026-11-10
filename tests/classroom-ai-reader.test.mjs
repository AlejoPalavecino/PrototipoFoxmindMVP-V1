import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { withAiDatabase, aiFixture, rollbackCase } from './classroom-ai-database.test.mjs';

test('C2 approved private reader enforces real file custody and durable claim boundary on PostgreSQL', { timeout: 120000 }, async t => {
  const { FileService, createDurableApprovedPlanReader } = await Promise.all([import("../.build/api/apps/api/src/modules/files/infrastructure/service.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/activity-source-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/approved-plan-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/durable-plan-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/docx-text.js"),import("../.build/api/apps/api/src/bootstrap/files-files.module.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/cleanup-worker.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/access.js"),import("../.build/api/apps/api/src/modules/files/presentation/http.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/storage.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/scanner.js"),import("../.build/api/apps/api/src/modules/files/domain/errors.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/store.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/promotion.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/configuration.js"),import("../.build/api/apps/api/src/bootstrap/files-host.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/grading-ai-attachment-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/durable-grading-ai-attachment-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/durable-grading-ai-instruction-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-document-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-durable-document-reader.js"),import("../.build/api/apps/api/src/bootstrap/files-foxy-publication-composition.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-private-image-inspector.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-private-asset-files.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-publication-raster-source.js")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24]) => Object.freeze({FileService: m0.FileService,createDurableActivitySourceReader: m1.createDurableActivitySourceReader,createApprovedPlanReader: m2.createApprovedPlanReader,createDurableApprovedPlanReader: m3.createDurableApprovedPlanReader,extractDocxPlanDocument: m4.extractDocxPlanDocument,FilesModule: m5.FilesModule,FileCleanupWorker: m6.FileCleanupWorker,createFileAccess: m7.createFileAccess,createFilesHandler: m8.createFilesHandler,S3Storage: m9.S3Storage,ClamdScanner: m10.ClamdScanner,FileError: m11.FileError,FileStore: m12.FileStore,FileIdentityError: m12.FileIdentityError,promoteDraftPlan: m13.promoteDraftPlan,createFileInfrastructure: m14.createFileInfrastructure,readFilesConfiguration: m14.readFilesConfiguration,installFilesTransport: m15.installFilesTransport,createIdentityFileAccess: m15.createIdentityFileAccess,FileHostLifecycle: m15.FileHostLifecycle,createGradingAiAttachmentReader: m16.createGradingAiAttachmentReader,createDurableGradingAiAttachmentReader: m17.createDurableGradingAiAttachmentReader,createDurableGradingAiInstructionReader: m18.createDurableGradingAiInstructionReader,createFoxyDocumentReader: m19.createFoxyDocumentReader,createDurableFoxyDocumentReader: m20.createDurableFoxyDocumentReader,createDurableFoxyPublicationFiles: m21.createDurableFoxyPublicationFiles,createFoxyPrivateImageInspector: m22.createFoxyPrivateImageInspector,createFoxyPrivateAssetFiles: m23.createFoxyPrivateAssetFiles,createDurableFoxyPublicationRasterSource: m24.createDurableFoxyPublicationRasterSource}));
  assert.equal(typeof createDurableApprovedPlanReader, 'function');
  await withAiDatabase(async ({ pool }) => {
    const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = Buffer.from(await pdf.save());
    const digest = createHash('sha256').update(bytes).digest('hex');
    const setup = async local => {
      const f = await aiFixture(local.pool, { bytes }); let reads = 0, allowed = true, stored = bytes;
      const service = new FileService({ database: local.database, draftQuotaBytes: 1000000n,
        access: { authenticate: async () => f.ownerId, authorize: async () => {} },
        storage: { get: async () => { reads++; if (!stored) throw Object.assign(new Error('FILE_NOT_READY'), { code: 'FILE_NOT_READY' }); return stored; } }, scanner: { scan: async () => {} } });
      const grant = { ownerId: f.ownerId, draftId: f.draftId, fileId: f.fileId, digest };
      const reader = createDurableApprovedPlanReader({ files: service, authorize: async input => {
        if (!allowed || input.ownerId !== grant.ownerId || input.draftId !== grant.draftId || input.fileId !== grant.fileId || input.digest !== digest)
          throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
      } });
      return { f, service, reader, grant, reads: () => reads, deny: () => { allowed = false; }, tamper: () => { stored = Buffer.from('changed'); }, missing: () => { stored = null; } };
    };
    await t.test('snapshot and bytes are source-bound; revoked claim and foreign actor fail before storage', async () => rollbackCase(pool, async local => {
      const x = await setup(local), signal = new AbortController().signal;
      await local.database.$transaction(async raw => {
        const snapshot = await x.reader.snapshotWorker({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }, x.grant, signal);
        assert.equal(snapshot.fileId, x.f.fileId); assert.equal(snapshot.digest, digest);
      });
      const document = await x.reader.read(x.grant, signal);
      assert.equal(document.kind, 'pdf'); assert.deepEqual(Buffer.from(document.bytes), bytes);
      const before = x.reads();
      await assert.rejects(x.reader.read({ ...x.grant, ownerId: x.f.strangerId }, signal), { code: 'FORBIDDEN' });
      x.deny(); await assert.rejects(x.reader.read(x.grant, signal), { code: 'FORBIDDEN' });
      assert.equal(x.reads(), before);
    }));
    await t.test('pending/rejected/error custody and missing blob never yield private input', async () => rollbackCase(pool, async local => {
      const x = await setup(local), signal = new AbortController().signal;
      for (const sql of ["UPDATE files SET scan_status='PENDING' WHERE id=$1", "UPDATE files SET scan_status='REJECTED' WHERE id=$1",
        "UPDATE files SET scan_status='ERROR' WHERE id=$1"]) {
        await local.pool.query(sql, [x.f.fileId]);
        await assert.rejects(x.reader.read(x.grant, signal), { code: 'FILE_NOT_READY' });
      }
      assert.equal(x.reads(), 0);
      await local.pool.query("UPDATE files SET scan_status='CLEAN' WHERE id=$1", [x.f.fileId]);
      x.missing(); await assert.rejects(x.reader.read(x.grant, signal), { code: 'FILE_NOT_READY' });
    }));
    await t.test('post-scan digest change and another draft reject without approving any document', async () => rollbackCase(pool, async local => {
      const x = await setup(local), signal = new AbortController().signal;
      await assert.rejects(local.database.$transaction(raw => raw.$queryRawUnsafe('UPDATE file_custodies SET scanned_digest=$2 WHERE file_id=$1', x.f.fileId, 'a'.repeat(64))), { code: '23514' });
      x.tamper();
      await assert.rejects(x.reader.read(x.grant, signal), { code: 'FILE_NOT_READY' });
      assert.equal(x.reads(), 1);
      await assert.rejects(x.reader.read({ ...x.grant, draftId: randomUUID() }, signal), { code: 'FORBIDDEN' });
    }));
  });
});

test('C2 two independently authorized durable grants can read concurrently without sharing one busy slot', { timeout: 120000 }, async () => {
  const { FileService, createDurableApprovedPlanReader } = await Promise.all([import("../.build/api/apps/api/src/modules/files/infrastructure/service.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/activity-source-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/approved-plan-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/durable-plan-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/docx-text.js"),import("../.build/api/apps/api/src/bootstrap/files-files.module.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/cleanup-worker.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/access.js"),import("../.build/api/apps/api/src/modules/files/presentation/http.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/storage.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/scanner.js"),import("../.build/api/apps/api/src/modules/files/domain/errors.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/store.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/promotion.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/configuration.js"),import("../.build/api/apps/api/src/bootstrap/files-host.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/grading-ai-attachment-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/durable-grading-ai-attachment-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/durable-grading-ai-instruction-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-document-reader.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-durable-document-reader.js"),import("../.build/api/apps/api/src/bootstrap/files-foxy-publication-composition.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-private-image-inspector.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-private-asset-files.js"),import("../.build/api/apps/api/src/modules/files/infrastructure/foxy-publication-raster-source.js")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24]) => Object.freeze({FileService: m0.FileService,createDurableActivitySourceReader: m1.createDurableActivitySourceReader,createApprovedPlanReader: m2.createApprovedPlanReader,createDurableApprovedPlanReader: m3.createDurableApprovedPlanReader,extractDocxPlanDocument: m4.extractDocxPlanDocument,FilesModule: m5.FilesModule,FileCleanupWorker: m6.FileCleanupWorker,createFileAccess: m7.createFileAccess,createFilesHandler: m8.createFilesHandler,S3Storage: m9.S3Storage,ClamdScanner: m10.ClamdScanner,FileError: m11.FileError,FileStore: m12.FileStore,FileIdentityError: m12.FileIdentityError,promoteDraftPlan: m13.promoteDraftPlan,createFileInfrastructure: m14.createFileInfrastructure,readFilesConfiguration: m14.readFilesConfiguration,installFilesTransport: m15.installFilesTransport,createIdentityFileAccess: m15.createIdentityFileAccess,FileHostLifecycle: m15.FileHostLifecycle,createGradingAiAttachmentReader: m16.createGradingAiAttachmentReader,createDurableGradingAiAttachmentReader: m17.createDurableGradingAiAttachmentReader,createDurableGradingAiInstructionReader: m18.createDurableGradingAiInstructionReader,createFoxyDocumentReader: m19.createFoxyDocumentReader,createDurableFoxyDocumentReader: m20.createDurableFoxyDocumentReader,createDurableFoxyPublicationFiles: m21.createDurableFoxyPublicationFiles,createFoxyPrivateImageInspector: m22.createFoxyPrivateImageInspector,createFoxyPrivateAssetFiles: m23.createFoxyPrivateAssetFiles,createDurableFoxyPublicationRasterSource: m24.createDurableFoxyPublicationRasterSource}));
  await withAiDatabase(async ({ pool, database }) => {
    const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = Buffer.from(await pdf.save());
    const fixtures = await Promise.all([aiFixture(pool, { bytes }), aiFixture(pool, { bytes })]);
    const grants = fixtures.map(f => ({ ownerId: f.ownerId, draftId: f.draftId, fileId: f.fileId, digest: f.digest }));
    let release, entered, reads = 0;
    const gate = new Promise(resolve => { release = resolve; }), firstRead = new Promise(resolve => { entered = resolve; });
    const files = new FileService({ database, draftQuotaBytes: 1000000n,
      access: { authenticate: async () => { throw Error('HTTP identity is not a durable claim'); }, authorize: async () => {} },
      storage: { get: async () => { reads++; entered(); await gate; return bytes; } }, scanner: { scan: async () => {} } });
    const reader = createDurableApprovedPlanReader({ files, authorize: async input => {
      assert.ok(grants.some(grant => Object.keys(grant).every(key => grant[key] === input[key])));
    } });
    const first = reader.read(grants[0], new AbortController().signal);
    await firstRead;
    const second = reader.read(grants[1], new AbortController().signal);
    // Observe rejections immediately while holding the first storage read open.
    const outcomes = Promise.allSettled([first, second]);
    await new Promise(resolve => setImmediate(resolve)); release();
    const results = await outcomes;
    assert.deepEqual(results.map(result => result.status), ['fulfilled', 'fulfilled'],
      JSON.stringify(results.map(result => result.status === 'rejected' ? result.reason.code : 'fulfilled')));
    assert.equal(reads, 2);
    for (const result of results) assert.deepEqual(Buffer.from(result.value.bytes), bytes);
  });
});
