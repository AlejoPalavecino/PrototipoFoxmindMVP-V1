import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PDFDocument } from 'pdf-lib';
import pg from 'pg';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { withP4Services } from '../scripts/p4-services.mjs';
import { PrismaClient } from '../.build/api/.generated/prisma/client.js';
import { FileService } from '../.build/api/apps/api/src/files/service.js';
import { S3Storage } from '../.build/api/apps/api/src/files/storage.js';
import { ClamdScanner } from '../.build/api/apps/api/src/files/scanner.js';
import { FileError } from '../.build/api/apps/api/src/files/errors.js';
import { createFilesHandler } from '../.build/api/apps/api/src/files/http.js';
import { zip, office } from './p4-fixtures.mjs';
import { verifyRecordAccess } from './p4-record-access.mjs';

test('P4 real private storage, scanner and durable upload lifecycle', { timeout: 240000 }, async t => {
  await withP4Services(async runtime => {
    const sql = new pg.Client({ connectionString: runtime.databaseUrl, connectionTimeoutMillis: 1000, query_timeout: 5000 });
    await sql.connect();
    let prisma;
    try {
      for (const migration of (await readdir('prisma/migrations')).sort()) {
        if (/^\d+_/.test(migration)) await sql.query(await readFile(`prisma/migrations/${migration}/migration.sql`, 'utf8'));
      }
      const users = Array.from({ length: 4 }, () => randomUUID()), sessions = users.map(() => randomUUID());
      for (let n = 0; n < users.length; n++) {
        await sql.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
          VALUES($1,now(),$2,$2,'Fixture','P4','not-a-login-password',CASE WHEN $3 THEN now() ELSE NULL END)`,
          [users[n], `p4-${n}@example.invalid`, n !== 3]);
        await sql.query(`INSERT INTO sessions(id,updated_at,user_id,token_hash,expires_at) VALUES($1,now(),$2,$3,now()+interval '1 hour')`,
          [sessions[n], users[n], `p4-fixture-${n}`]);
      }
      const classroom = randomUUID(), otherClassroom = randomUUID(), draft = randomUUID();
      for (const [id, teacher] of [[classroom, users[0]], [otherClassroom, users[2]]]) {
        await sql.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
          VALUES($1,now(),$2,'P4 fixture','Testing','A',2026,'America/Argentina/Buenos_Aires','fixture',100000000)`, [id, teacher]);
      }
      await sql.query(`INSERT INTO classroom_drafts(id,updated_at,owner_id) VALUES($1,now(),$2)`, [draft, users[0]]);
      prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: runtime.databaseUrl, max: 5,
        connectionTimeoutMillis: 1500, query_timeout: 3000, statement_timeout: 3000 }) });
      // Controlled test-only session/record port. This is not the production P3 integration.
      const access = {
        async authenticate(tx, request, action) {
          if (request && typeof request === 'object') {
            if (action === 'upload' && (request.headers.origin !== 'http://p4.test' || request.headers['x-p4-csrf'] !== 'fixture')) throw new FileError('FORBIDDEN');
            request = request.headers['x-p4-session'];
          }
          if (typeof request !== 'string') throw new FileError('FORBIDDEN');
          const [row] = await tx.query(`SELECT user_id FROM sessions WHERE id=$1::uuid AND revoked_at IS NULL AND expires_at>clock_timestamp()`, request);
          if (!row) throw new FileError('FORBIDDEN'); return row.user_id;
        },
        async authorize(tx, userId, target) {
          const table = target.scope.kind === 'classroom' ? 'classrooms' : 'classroom_drafts';
          const column = target.scope.kind === 'classroom' ? 'teacher_id' : 'owner_id';
          const [row] = await tx.query(`SELECT ${column} AS owner FROM ${table} WHERE id=$1::uuid`, target.scope.id);
          if (row?.owner !== userId) throw new FileError('FORBIDDEN');
        },
      };
      const storage = new S3Storage(runtime.s3, 'foxmind-private');
      const scanner = new ClamdScanner(runtime.scannerHost, runtime.scannerPort);
      const options = { database: prisma, access, storage, scanner, draftQuotaBytes: 100000000n };
      const service = new FileService(options), actor = sessions[0], scope = { kind: 'classroom', id: classroom };
      const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = Buffer.from(await pdf.save());
      const intent = { purpose: 'material', name: 'material.pdf', bytes: bytes.length };
      let confirmed;

      await t.test('real S3 rejects anonymous retrieval and actual ClamAV detects the standard test signature', async () => {
        const key = `p4/${randomUUID()}/blob`;
        await storage.put(key, Buffer.from('safe component bytes'));
        await assert.rejects(storage.put(key, Buffer.from('replacement')), { code: 'UPLOAD_CONFLICT' });
        assert.equal((await storage.get(key, 100)).toString(), 'safe component bytes');
        const response = await fetch(`${runtime.endpoint}/foxmind-private/${key}`);
        assert.equal(response.status, 403); await response.body?.cancel();
        const signature = Buffer.from('WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo=', 'base64');
        await assert.rejects(scanner.scan(signature), { code: 'FILE_REJECTED' });
        await scanner.scan(bytes); await storage.remove(key);
      });
      await t.test('reserve, quarantine, real validation/scan, restart, read and duplicate completion', async () => {
        const start = await service.begin(actor, scope, intent);
        await assert.rejects(service.read(actor, start.id), { code: 'FILE_NOT_READY' });
        confirmed = await service.receive(actor, start.id, bytes);
        assert.equal(confirmed.ready, true);
        const restarted = new FileService(options);
        assert.deepEqual((await restarted.read(actor, start.id)).bytes, bytes);
        assert.equal((await restarted.receive(actor, start.id, bytes)).ready, true);
        assert.equal((await service.usage(actor, scope)).usedBytes, BigInt(bytes.length));
        await assert.rejects(service.receive(actor, start.id, Buffer.alloc(bytes.length)), { code: 'UPLOAD_CONFLICT' });
      });
      await t.test('wrong user/classroom, unverified account and revoked session cannot operate', async () => {
        for (const session of [sessions[1], sessions[2], sessions[3]]) {
          await assert.rejects(service.read(session, confirmed.id), { code: 'FORBIDDEN' });
          await assert.rejects(service.begin(session, scope, intent), { code: 'FORBIDDEN' });
        }
        await assert.rejects(service.begin(actor, { kind: 'classroom', id: otherClassroom }, intent), { code: 'FORBIDDEN' });
        await sql.query('UPDATE sessions SET revoked_at=now() WHERE id=$1', [sessions[1]]);
        await assert.rejects(service.usage(sessions[1], scope), { code: 'FORBIDDEN' });
      });
      await t.test('concurrent reservation cannot exceed quota, and archived writes preserve existing reads', async () => {
        await sql.query('UPDATE classrooms SET storage_quota_bytes=$1 WHERE id=$2', [bytes.length * 2, classroom]);
        const results = await Promise.allSettled([service.begin(actor, scope, intent), service.begin(actor, scope, intent)]);
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(results.find(r => r.status === 'rejected').reason.code, 'QUOTA_EXCEEDED');
        assert.equal((await service.usage(actor, scope)).usedBytes, BigInt(bytes.length * 2));
        await sql.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', [classroom]);
        await assert.rejects(service.begin(actor, scope, intent), { code: 'FORBIDDEN' });
        assert.deepEqual((await service.read(actor, confirmed.id)).bytes, bytes);
        await sql.query('UPDATE classrooms SET archived_at=NULL,storage_quota_bytes=100000000 WHERE id=$1', [classroom]);
      });
      await t.test('scanner outage keeps bytes private and same-byte retry can recover', async () => {
        const start = await service.begin(actor, scope, intent);
        const unavailable = new FileService({ ...options, scanner: { async scan() { throw new FileError('SERVICE_UNAVAILABLE'); } } });
        await assert.rejects(unavailable.receive(actor, start.id, bytes), { code: 'SERVICE_UNAVAILABLE' });
        assert.equal((await service.status(actor, start.id)).ready, false);
        await assert.rejects(service.read(actor, start.id), { code: 'FILE_NOT_READY' });
        assert.equal((await service.receive(actor, start.id, bytes)).ready, true);
      });
      await t.test('permission revocation while scanning cannot produce a ready file', async () => {
        const start = await service.begin(actor, scope, intent);
        const revoked = new FileService({ ...options, scanner: { async scan(input) {
          await scanner.scan(input);
          await sql.query('UPDATE sessions SET revoked_at=now() WHERE id=$1', [actor]);
        } } });
        await assert.rejects(revoked.receive(actor, start.id, bytes), { code: 'FORBIDDEN' });
        await sql.query('UPDATE sessions SET revoked_at=NULL WHERE id=$1', [actor]);
        assert.equal((await service.status(actor, start.id)).ready, false);
        assert.equal((await service.receive(actor, start.id, bytes)).ready, true);
      });
      await t.test('rejected contents never become usable; storage replacement is caught on retrieval', async () => {
        const bad = Buffer.alloc(bytes.length, 65), start = await service.begin(actor, scope, intent);
        await assert.rejects(service.receive(actor, start.id, bad), { code: 'FILE_REJECTED' });
        assert.equal((await service.status(actor, start.id)).ready, false);
        const key = `p4/${confirmed.id}/blob`;
        await runtime.s3.send(new PutObjectCommand({ Bucket: 'foxmind-private', Key: key, Body: bad }));
        await assert.rejects(service.read(actor, confirmed.id), { code: 'FILE_NOT_READY' });
        await runtime.s3.send(new PutObjectCommand({ Bucket: 'foxmind-private', Key: key, Body: bytes }));
      });
      await t.test('cleanup reclaims only old incomplete uploads and preserves confirmed drafts/history', async () => {
        const draftScope = { kind: 'draft', id: draft };
        const saved = await service.begin(actor, draftScope, { ...intent, purpose: 'plan' });
        await service.receive(actor, saved.id, bytes);
        const incomplete = await service.begin(actor, draftScope, { ...intent, purpose: 'plan' });
        await sql.query(`UPDATE uploads SET last_activity_at=now()-interval '25 hours' WHERE file_id IN($1,$2)`, [saved.id, incomplete.id]);
        const before = await service.usage(actor, draftScope);
        const result = await service.cleanup(100);
        assert.ok(result.deleted >= 1);
        assert.equal((await service.usage(actor, draftScope)).usedBytes, before.usedBytes - BigInt(bytes.length));
        assert.deepEqual((await service.read(actor, saved.id)).bytes, bytes);
        assert.equal((await service.status(actor, incomplete.id)).ready, false);
        assert.equal((await service.cleanup(100)).deleted, 0);
      });
      await t.test('infected ZIP remains rejected after actual content validation and real malware scanning', async () => {
        const signature = Buffer.from('WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo=', 'base64');
        const infected = zip([{ name: 'test.txt', bytes: signature }]);
        const start = await service.begin(actor, scope, { purpose: 'material', name: 'test.zip', bytes: infected.length });
        await assert.rejects(service.receive(actor, start.id, infected), { code: 'FILE_REJECTED' });
        const status = await service.status(actor, start.id);
        assert.equal(status.validation, 'APPROVED'); assert.equal(status.scan, 'REJECTED'); assert.equal(status.ready, false);
      });
      await t.test('pending deletion blocks racing confirmation; failed deletion keeps quota until retry', async () => {
        const start = await service.begin(actor, scope, intent);
        await sql.query(`UPDATE uploads SET last_activity_at=now()-interval '25 hours' WHERE file_id=$1`, [start.id]);
        const before = await service.usage(actor, scope);
        let entered, release;
        const gate = new Promise(resolve => { entered = resolve; }), wait = new Promise(resolve => { release = resolve; });
        const cleaning = new FileService({ ...options, storage: { put: (...a) => storage.put(...a), get: (...a) => storage.get(...a),
          async remove() { entered(); await wait; throw new FileError('SERVICE_UNAVAILABLE'); } } });
        const pending = cleaning.cleanup(100); await gate;
        await assert.rejects(service.receive(actor, start.id, bytes), { code: 'UPLOAD_CONFLICT' });
        release(); const result = await pending;
        assert.equal(result.failed, 1); assert.equal(result.deleted, 0);
        assert.equal((await service.usage(actor, scope)).usedBytes, before.usedBytes);
        await sql.query(`UPDATE file_custodies SET lease_until=now()-interval '1 second' WHERE file_id=$1`, [start.id]);
        assert.equal((await service.cleanup(100)).deleted, 1);
        assert.equal((await service.usage(actor, scope)).usedBytes, before.usedBytes - BigInt(bytes.length));
      });
      await t.test('active completion lease excludes cleanup, and completed bytes remain retained', async () => {
        const start = await service.begin(actor, scope, intent);
        await sql.query(`UPDATE uploads SET last_activity_at=now()-interval '25 hours' WHERE file_id=$1`, [start.id]);
        let entered, release;
        const gate = new Promise(resolve => { entered = resolve; }), wait = new Promise(resolve => { release = resolve; });
        const completing = new FileService({ ...options, scanner: { async scan(input) { await scanner.scan(input); entered(); await wait; } } });
        const pending = completing.receive(actor, start.id, bytes); await gate;
        assert.equal((await service.cleanup(100)).deleted, 0);
        release(); assert.equal((await pending).ready, true);
        assert.deepEqual((await service.read(actor, start.id)).bytes, bytes);
      });
      await t.test('actual scanner unavailability keeps quarantine and can recover without a new reservation', async () => {
        const name = runtime.names.find(name => name.endsWith('-scan'));
        const start = await service.begin(actor, scope, intent);
        const limited = new FileService({ ...options, scanner: new ClamdScanner(runtime.scannerHost, runtime.scannerPort, 200) });
        assert.equal(spawnSync('docker', ['pause', name], { timeout: 5000 }).status, 0);
        try { await assert.rejects(limited.receive(actor, start.id, bytes), { code: 'SERVICE_UNAVAILABLE' }); }
        finally { assert.equal(spawnSync('docker', ['unpause', name], { timeout: 5000 }).status, 0); }
        assert.equal((await service.status(actor, start.id)).ready, false);
        assert.equal((await service.receive(actor, start.id, bytes)).ready, true);
      });
      await t.test('PDF/image preview uses private headers; Office preview remains an authorized download', async () => {
        const pdf = await service.read(actor, confirmed.id, 'preview');
        assert.match(pdf.headers['Content-Disposition'], /^inline;/);
        assert.equal(pdf.headers['Cache-Control'], 'no-store'); assert.equal(pdf.headers['X-Content-Type-Options'], 'nosniff');
        const bytes = office('docx'), start = await service.begin(actor, scope, { purpose: 'material', name: "O'Reilly.docx", bytes: bytes.length });
        await service.receive(actor, start.id, bytes);
        const document = await service.read(actor, start.id, 'preview');
        assert.match(document.headers['Content-Disposition'], /^attachment;/);
        assert.match(document.headers['Content-Disposition'], /O%27Reilly/);
      });
      await t.test('opt-in HTTP transfer/status/download validates shapes and forwards security context', async () => {
        const handler = createFilesHandler(service);
        const server = createServer((request, response) => handler(request, response, () => { response.statusCode = 404; response.end(); }));
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const base = `http://127.0.0.1:${server.address().port}`;
        const headers = { 'x-p4-session': actor, origin: 'http://p4.test', 'x-p4-csrf': 'fixture', 'content-type': 'application/json' };
        try {
          const create = await fetch(`${base}/files`, { method: 'POST', headers, body: JSON.stringify({ scope, ...intent }) });
          assert.equal(create.status, 201); const start = await create.json();
          const put = await fetch(`${base}/files/${start.id}/content`, { method: 'PUT', headers: { ...headers, 'content-type': 'application/octet-stream' }, body: bytes });
          assert.equal(put.status, 200); assert.equal((await put.json()).ready, true);
          const download = await fetch(`${base}/files/${start.id}/content?mode=preview`, { headers });
          assert.equal(download.status, 200); assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
          const wrong = await fetch(`${base}/files`, { method: 'POST', headers: { ...headers, origin: 'http://wrong.test' }, body: JSON.stringify({ scope, ...intent }) });
          assert.equal(wrong.status, 403); await wrong.body.cancel();
          const extras = await fetch(`${base}/files`, { method: 'POST', headers, body: JSON.stringify({ scope, ...intent, ownerId: users[2] }) });
          assert.equal(extras.status, 400); await extras.body.cancel();
          const repeated = await fetch(`${base}/files/${start.id}/content?mode=download&mode=preview`, { headers });
          assert.equal(repeated.status, 400); await repeated.body.cancel();
          // Use node:http since fetch disallows bodies on GET.
          const { request } = await import('node:http');
          const status = await new Promise((resolve, reject) => {
            const outgoing = request(`${base}/files/${start.id}`, { method: 'GET', headers: { ...headers, 'content-length': '1' } }, response => {
              response.resume(); response.on('end', () => resolve(response.statusCode));
            }); outgoing.on('error', reject); outgoing.end('x');
          });
          assert.equal(status, 400);
        } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
      });
      await t.test('database readiness proof cannot pass through SQL NULL semantics', async () => {
        const start = await service.begin(actor, scope, intent);
        await sql.query('BEGIN');
        try {
          await assert.rejects(sql.query(`UPDATE file_custodies SET phase='ready',digest=$2 WHERE file_id=$1`,
            [start.id, 'a'.repeat(64)]), { code: '23514' });
        } finally { await sql.query('ROLLBACK'); }
      });
      await t.test('domain links require actual upload, validation and scan readiness in addition to custody phase', async () => {
        const start = await service.begin(actor, scope, intent), digest = 'a'.repeat(64);
        await sql.query('BEGIN');
        try {
          await sql.query(`UPDATE file_custodies SET phase='ready',digest=$2,validated_digest=$2,scanned_digest=$2 WHERE file_id=$1`, [start.id, digest]);
          await assert.rejects(sql.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id)
            VALUES($1,now(),$2,'Blocked link',$3,$4)`, [randomUUID(), classroom, start.id, users[0]]), { code: '23514' });
        } finally { await sql.query('ROLLBACK'); }
      });
      await t.test('admitted metadata is snapshotted before asynchronous authentication', async () => {
        const mutable = { ...intent }, expected = mutable.bytes;
        const isolated = new FileService({ ...options, access: { ...access, async authenticate(...args) {
          mutable.bytes = 50_000_001; return access.authenticate(...args);
        } } });
        const start = await isolated.begin(actor, scope, mutable);
        assert.equal(start.sizeBytes, expected);
      });
      await verifyRecordAccess(t, { sql, options, users, sessions, classroom, bytes });
    } finally { await prisma?.$disconnect(); await sql.end(); }
  });
});
