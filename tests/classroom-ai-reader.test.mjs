import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { withAiDatabase, aiFixture, rollbackCase } from './classroom-ai-database.test.mjs';

test('C2 approved private reader enforces real file custody and durable claim boundary on PostgreSQL', { timeout: 120000 }, async t => {
  const { FileService, createDurableApprovedPlanReader } = await import('../.build/api/apps/api/src/files/index.js');
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
  const { FileService, createDurableApprovedPlanReader } = await import('../.build/api/apps/api/src/files/index.js');
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
