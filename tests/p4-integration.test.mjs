import { readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest, fileSnapshot } from './p4-integration-helpers.mjs';
import { office, zip } from './p4-fixtures.mjs';

test('P4 integrated browser, persisted P3 sessions and actual private services', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const { origin, inbox } = runtime; let db = runtime.db;
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const peerContext = await browser.newContext(), peer = await peerContext.newPage();
    const anonymous = await browser.newContext(), guest = await anonymous.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const draft = randomUUID(), classroom = randomUUID(), enrollment = randomUUID(), period = randomUUID();
    let owner, student, ready;
    const doc = await PDFDocument.create(); doc.addPage();
    const bytes = Buffer.concat([Buffer.from(await doc.save()), Buffer.from(`\n%${randomBytes(17000).toString('hex')}\n`)]);
    const scope = { kind: 'draft', id: draft };
    const intent = { scope, purpose: 'plan', name: 'plan.pdf', bytes: bytes.length };
    const begin = (value = intent) => api(page, 'POST', '/files', value);
    const put = (id, content = bytes) => api(page, 'PUT', `/files/${id}/content`, { base64: content.toString('base64') });
    const rejectUnchanged = async operation => {
      const before = await fileSnapshot(db); const result = await operation();
      assert.ok(result.status >= 400, 'Rejected operation must not report success');
      assert.equal(await fileSnapshot(db), before, 'Rejected command leaves file data unchanged');
      return result;
    };
    try {
      await t.test('real registration and captured verification gate file writes', async () => {
        await guest.goto(`${origin}/sign-in`);
        assert.equal((await api(guest, 'GET', '/files/usage?kind=draft&id=' + draft)).status, 401);
        owner = await account(page, origin, inbox, `p4-owner-${Date.now()}@example.test`, async () => {
          const rejected = await rejectUnchanged(() => begin()); assert.equal(rejected.status, 403);
        }, "teacher");
        student = await account(peer, origin, inbox, `p4-student-${Date.now()}@example.test`, undefined, "student");
        await db.query('INSERT INTO classroom_drafts(id,updated_at,owner_id) VALUES($1,now(),$2)', [draft, owner.id]);
        await db.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
          VALUES($1,now(),$2,'P4 owned fixture','Testing','A',2026,'America/Argentina/Buenos_Aires','fixture',100000000)`, [classroom, owner.id]);
        await db.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, classroom, student.id]);
        await db.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')`, [period, enrollment, classroom]);
      assert.deepEqual(runtime.migrations, readdirSync('prisma/migrations').filter(name => /^\d+_/.test(name)).sort());
      assert.deepEqual(runtime.migrations.filter(name => ['202610230001_agenda_events', '202610230001_classroom_ai', '202610240001_agenda_event_color', '202610250001_activity_topics', '202610250002_activity_ai'].includes(name)), [
        '202610230001_agenda_events',
        '202610230001_classroom_ai',
        '202610240001_agenda_event_color',
        '202610250001_activity_topics',
        '202610250002_activity_ai',
      ]);
      });
      await t.test('actual file picker uploads more than16KiB through Next and real scan', async () => {
        await page.goto(`${origin}/files?kind=draft&id=${draft}&purpose=plan`);
        await page.locator('input[type=file]').setInputFiles({ name: 'plan.pdf', mimeType: 'application/pdf', buffer: bytes });
        // The client may show selection, but no successful upload exists before explicit submission.
        assert.equal((await db.query('SELECT count(*)::int AS n FROM files')).rows[0].n, 0);
        const created = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/files');
        await page.getByRole('button', { name: 'Subir archivo', exact: true }).click();
        const response = await created; assert.equal(response.status(), 201); ready = (await response.json()).id;
        await page.getByText('Archivo listo', { exact: true }).first().waitFor({ timeout: 30000 });
        const row = (await db.query(`SELECT f.validation_status::text,f.scan_status::text,c.phase,c.digest,c.validated_digest,c.scanned_digest
          FROM files f JOIN file_custodies c ON c.file_id=f.id WHERE f.id=$1`, [ready])).rows[0];
        assert.deepEqual(row, { validation_status: 'APPROVED', scan_status: 'CLEAN', phase: 'ready', digest: digest(bytes), validated_digest: digest(bytes), scanned_digest: digest(bytes) });
        const preview = await api(page, 'GET', `/files/${ready}/content?mode=preview`);
        assert.equal(preview.status, 200); assert.equal(preview.digest, digest(bytes)); assert.equal(preview.length, bytes.length);
        assert.match(preview.headers['content-disposition'], /^inline/);
        const download = await api(page, 'GET', `/files/${ready}/content`); assert.equal(download.digest, digest(bytes));
        assert.match(download.headers['content-disposition'], /^attachment/);
        await mkdir('.test-artifacts/p4-integration', { recursive: true });
        const previewResponse = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/files/${ready}/content` && new URL(response.url()).searchParams.get('mode') === 'preview');
        await page.getByRole('button', { name: 'Previsualizar archivo', exact: true }).click();
        assert.equal((await previewResponse).status(), 200);
        await page.getByTitle('Vista previa del archivo', { exact: true }).waitFor();
        const browserDownload = page.waitForEvent('download');
        await page.getByRole('link', { name: 'Descargar archivo', exact: true }).click();
        await (await browserDownload).saveAs('.test-artifacts/p4-integration/plan.pdf');
        assert.equal(digest(await readFile('.test-artifacts/p4-integration/plan.pdf')), digest(bytes));
        await page.screenshot({ path: '.test-artifacts/p4-integration/files-1280.png', fullPage: true });
        await page.setViewportSize({ width: 375, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.screenshot({ path: '.test-artifacts/p4-integration/files-375.png', fullPage: true });
        await page.setViewportSize({ width: 1280, height: 900 });
      });
      await t.test('same bytes complete idempotently, replacement and private peer access fail without mutations', async () => {
        const usage = await api(page, 'GET', `/files/usage?kind=draft&id=${draft}`);
        assert.equal((await put(ready)).status, 200);
        assert.deepEqual((await api(page, 'GET', `/files/usage?kind=draft&id=${draft}`)).body, usage.body);
        await rejectUnchanged(() => put(ready, Buffer.alloc(bytes.length, 65)));
        assert.equal((await rejectUnchanged(() => api(peer, 'GET', `/files/${ready}/content`))).status, 403);
      });
      await t.test('CSRF, Origin, quota, extension and size denials preserve file data', async () => {
        assert.equal((await rejectUnchanged(() => api(page, 'POST', '/files', intent, { 'x-csrf-token': 'invalid' }))).status, 403);
        const csrf = (await api(page, 'GET', '/auth/csrf')).body.csrfToken;
        const before = await fileSnapshot(db);
        const wrongOrigin = await context.request.post(`${origin}/api/v1/files`, { headers: { origin: 'http://wrong.invalid', 'x-csrf-token': csrf }, data: intent });
        assert.equal(wrongOrigin.status(), 403); assert.equal(await fileSnapshot(db), before);
        assert.equal((await rejectUnchanged(() => begin({ ...intent, bytes: 500001 }))).status, 409);
        assert.equal((await rejectUnchanged(() => begin({ ...intent, bytes: 20000001 }))).status, 413);
        assert.equal((await rejectUnchanged(() => begin({ ...intent, name: 'plan.exe' }))).status, 415);
      });
      await t.test('pending, spoofed, encrypted and infected bytes never become readable', async () => {
        const materialScope = { kind: 'classroom', id: classroom };
        const cases = [
          ['spoof.pdf', Buffer.from('Not a PDF')],
          ['encrypted.zip', zip([{ name: 'private.txt', encrypted: true }])],
          ['infected.zip', zip([{ name: 'eicar.txt', bytes: Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*') }])],
        ];
        for (const [name, content] of cases) {
          const reserved = await begin({ scope: materialScope, purpose: 'material', name, bytes: content.length }); assert.equal(reserved.status, 201);
          const id = reserved.body.id;
          assert.equal((await api(page, 'GET', `/files/${id}/content`)).status, 409);
          assert.equal((await put(id, content)).status, 422);
          const status = await api(page, 'GET', `/files/${id}`); assert.equal(status.body.ready, false);
          assert.equal((await api(page, 'GET', `/files/${id}/content`)).status, 409);
        }
      });
      await t.test('current real membership and archive guards protect actual linked records', async () => {
        const content = office('docx');
        const material = await begin({ scope: { kind: 'classroom', id: classroom }, purpose: 'material', name: 'reading.docx', bytes: content.length });
        assert.equal(material.status, 201); assert.equal((await put(material.body.id, content)).status, 200);
        assert.equal((await api(peer, 'GET', `/files/${material.body.id}/content`)).status, 403);
        await db.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id) VALUES($1,now(),$2,'Fixture',$3,$4)`, [randomUUID(), classroom, material.body.id, owner.id]);
        const allowed = await api(peer, 'GET', `/files/${material.body.id}/content?mode=preview`); assert.equal(allowed.status, 200);
        assert.match(allowed.headers['content-disposition'], /^attachment/);
        await db.query("UPDATE membership_periods SET ended_at=now(),end_reason='REMOVED',ended_by_id=$2 WHERE id=$1", [period, owner.id]);
        assert.equal((await rejectUnchanged(() => api(peer, 'GET', `/files/${material.body.id}/content`))).status, 403);
        await db.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', [classroom]);
        assert.equal((await rejectUnchanged(() => begin({ ...intent, scope: { kind: 'classroom', id: classroom } }))).status, 403);
        assert.equal((await api(page, 'GET', `/files/${material.body.id}/content`)).status, 200);
      });
      await t.test('real scanner timeout remains quarantined and retry recovers the same bytes', async () => {
        const pending = await begin(); assert.equal(pending.status, 201);
        runtime.pauseScanner();
        try { const failed = await put(pending.body.id); assert.equal(failed.status, 503); }
        finally { runtime.resumeScanner(); }
        assert.equal((await api(page, 'GET', `/files/${pending.body.id}`)).body.ready, false);
        assert.equal((await api(page, 'GET', `/files/${pending.body.id}/content`)).status, 409);
        assert.equal((await put(pending.body.id)).status, 200);
      });
      await t.test('real logout revokes file reads and restart preserves ready bytes', async () => {
        await runtime.restartApi(); assert.equal((await api(page, 'GET', `/files/${ready}/content`)).digest, digest(bytes));
        await runtime.restartData(); db = runtime.db;
        assert.equal((await api(page, 'GET', `/files/${ready}/content`)).digest, digest(bytes));
        assert.equal((await api(page, 'POST', '/auth/logout', {})).status, 204);
        assert.equal((await rejectUnchanged(() => api(page, 'GET', `/files/${ready}/content`))).status, 401);
        assert.deepEqual(errors, []);
      });
    } finally { await browser.close(); }
  });
});
