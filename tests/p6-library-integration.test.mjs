import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, planPdf, upload, rejectSame } from './p6-integration-helpers.mjs';

test('P6 Library actual publication, immutable private material and durable explicit deletion', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext()).newPage();
      const other = await (await browser.newContext()).newPage();
      const suffix = Date.now();
      await account(page, runtime.origin, runtime.inbox, `p6-library-teacher-${suffix}@example.test`,undefined,'teacher');
      await account(student, runtime.origin, runtime.inbox, `p6-library-student-${suffix}@example.test`,undefined,'student');
      const room = await classroom(page, student);
      const detail = async () => (await api(page, 'GET', `/classrooms/${room.id}`)).body;
      const list = async actor => (await api(actor, 'GET', `/classrooms/${room.id}/library`)).body;
      const change = async operation => api(page, 'POST', `/classrooms/${room.id}/library`, { revision: (await detail()).revision, operation });
      await account(other, runtime.origin, runtime.inbox, `p6-library-other-${suffix}@example.test`, async () => {
        await rejectSame(runtime.db, () => api(other, 'GET', `/classrooms/${room.id}/library`), 403);
      },'student');
      const bytes = await planPdf('Library original immutable bytes');
      let extra, linked;
      let failed = false;
      const check = (name, operation) => t.test(name, { skip: failed ? 'Prior shared journey failed' : false }, async () => {
        try { await operation(); } catch (error) { failed = true; throw error; }
      });
      await check('actual teacher upload and explicit publish expose private extra material to current student', async () => {
        await openClassroom(page, runtime.origin);
        await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
        await page.getByRole('button',{name:'Agregar material',exact:true}).click();
        await page.getByLabel('Archivo del material', { exact: true }).setInputFiles({ name: 'extra.pdf', mimeType: 'application/pdf', buffer: bytes });
        await page.getByRole('status').filter({ hasText: 'extra.pdf' }).getByText('Archivo aprobado. Ya podés publicarlo.', { exact: true }).waitFor();
        assert.deepEqual(await list(student), []);
        await page.getByLabel('Nombre del material', { exact: true }).fill('Extra through browser');
        await page.getByRole('button', { name: 'Publicar en Biblioteca', exact: true }).click();
        await page.getByRole('article', { name: 'Extra through browser', exact: true }).waitFor();
        extra = (await list(page))[0];
        assert.equal(extra.unitId, null); assert.equal(extra.topicId, null); assert.equal(extra.ready, true);
        await openClassroom(student, runtime.origin);
        await student.getByRole('button', { name: 'Biblioteca', exact: true }).click();
        const card = student.getByRole('article', { name: 'Extra through browser', exact: true });
        await card.waitFor();
        assert.equal(await student.getByLabel('Archivo del material').count(), 0);
        assert.equal(await student.getByRole('button', { name: 'Editar datos', exact: true }).count(), 0);
        await card.getByRole('button',{name:'Abrir material: Extra through browser',exact:true}).click();
        assert.match(await student.getByRole('link',{name:'Abrir archivo',exact:true}).getAttribute('href'), /mode=preview$/);
        const preview = await api(student, 'GET', `/files/${extra.fileId}/content?mode=preview`);
        assert.equal(preview.status, 200); assert.equal(preview.digest, digest(bytes));
        assert.match(preview.headers['content-type'], /application\/pdf/);
      });
      await check('all associations and metadata changes preserve identity/bytes even with a started activity link', async () => {
        const unit = (await detail()).units[0], topic = unit.topics[0];
        for (const [title, topicId] of [['Unit material', null], ['Topic material', topic.id]]) {
          const file = await upload(page, { kind: 'classroom', id: room.id }, bytes, 'material', `${title}.pdf`);
          assert.equal((await change({ action: 'publish', title, fileId: file.id, unitId: unit.id, topicId })).status, 200);
        }
        const rows = await list(student); assert.equal(rows.length, 3);
        assert.equal(rows.filter(row => row.unitId === unit.id && row.topicId === null).length, 1);
        linked = rows.find(row => row.topicId === topic.id); assert.ok(linked);
        // A pre-existing activity/link fixture tests P6 conservation; it does not implement P7 authoring.
        const activity = randomUUID();
        await runtime.db.query(`INSERT INTO activities(id,updated_at,classroom_id,type,title,unit_id,topic_id)
          VALUES($1,now(),$2,'ASSIGNMENT','Existing linked activity',$3,$4)`, [activity, room.id, unit.id, topic.id]);
        await runtime.db.query('INSERT INTO activity_materials(activity_id,classroom_id,material_id) VALUES($1,$2,$3)', [activity, room.id, linked.id]);
        await runtime.db.query("UPDATE activities SET status='PUBLISHED',published_at=clock_timestamp(),first_started_at=clock_timestamp() WHERE id=$1", [activity]);
        await openClassroom(page,runtime.origin);await page.getByRole('button',{name:'Biblioteca',exact:true}).click();
        const card = page.getByRole('article', { name: 'Topic material', exact: true });
        await card.getByRole('button',{name:'Abrir material: Topic material',exact:true}).click();
        await page.getByRole('button',{name:'Editar datos',exact:true}).click();
        const dialog = page.getByRole('dialog', { name: 'Editar material', exact: true });
        await dialog.getByLabel('Nombre del material', { exact: true }).fill('Reorganized linked material');
        await dialog.getByLabel('Unidad del material', { exact: true }).selectOption('');
        await dialog.getByRole('button', { name: 'Guardar datos del material', exact: true }).click();
        await page.getByRole('region',{name:'Lectura de Reorganized linked material',exact:true}).waitFor();await page.getByRole('button',{name:'Volver a Biblioteca',exact:true}).click();
        const edited = (await list(student)).find(row => row.id === linked.id);
        assert.equal(edited.fileId, linked.fileId); assert.equal(edited.unitId, null); assert.equal(edited.topicId, null);
        assert.equal((await api(student, 'GET', `/files/${edited.fileId}/content`)).digest, digest(bytes));
        await rejectSame(runtime.db, () => change({ action: 'delete', id: linked.id, confirm: true }), 409);
        await rejectSame(runtime.db, async () => api(page, 'POST', `/classrooms/${room.id}/plan`, {
          revision: (await detail()).revision, operation: { action: 'deleteTopic', id: topic.id, confirm: true },
        }), 400);
        assert.equal((await runtime.db.query('SELECT material_id FROM activity_materials WHERE activity_id=$1', [activity])).rows[0].material_id, linked.id);
      });
      await check('student/foreign writes, bad associations, pending files and byte replacement are rejected unchanged', async () => {
        const revision = (await detail()).revision;
        const body = { revision, operation: { action: 'delete', id: extra.id, confirm: true } };
        await rejectSame(runtime.db, () => api(student, 'POST', `/classrooms/${room.id}/library`, body), 403);
        await rejectSame(runtime.db, () => api(other, 'GET', `/classrooms/${room.id}/library`), 403);
        await rejectSame(runtime.db, () => api(page, 'POST', `/classrooms/${room.id}/library`, body, { 'x-csrf-token': 'bad' }), 403);
        await rejectSame(runtime.db, async () => change({ action: 'edit', id: extra.id, title: 'Bad', unitId: null, topicId: (await detail()).units[0].topics[0].id }), 400);
        await rejectSame(runtime.db, () => change({ action: 'edit', id: extra.id, title: 'Replacement', fileId: linked.fileId, unitId: null, topicId: null }), 400);
        await rejectSame(runtime.db, () => change({ action: 'publish', title: 'Wrong purpose', fileId: room.fileId, unitId: null, topicId: null }), 403);
        const pending = await api(page, 'POST', '/files', { scope: { kind: 'classroom', id: room.id }, purpose: 'material', name: 'pending.pdf', bytes: bytes.length });
        assert.equal(pending.status, 201);
        await rejectSame(runtime.db, () => change({ action: 'publish', title: 'Pending denied', fileId: pending.body.id, unitId: null, topicId: null }), 409);
        const replacement = await planPdf('Different bytes');
        // Published material authorization denies every upload before byte-conflict validation.
        await rejectSame(runtime.db, () => api(page, 'PUT', `/files/${extra.fileId}/content`, { base64: replacement.toString('base64') }), 403);
        assert.equal((await api(student, 'GET', `/files/${extra.fileId}/content`)).digest, digest(bytes));
      });
      await check('confirmed deletion revokes reads immediately, survives real restart and releases quota only after actual blob removal', async () => {
        await runtime.stopLibraryDeletion();
        const usage = async () => BigInt((await api(page, 'GET', `/files/usage?kind=classroom&id=${room.id}`)).body.usedBytes);
        const before = await usage();
        const card = page.getByRole('article', { name: 'Extra through browser', exact: true });
        await card.getByRole('button',{name:'Abrir material: Extra through browser',exact:true}).click();
        await page.getByRole('button',{name:'Eliminar material',exact:true}).click();
        await page.getByRole('button', { name: 'Confirmar eliminación del material', exact: true }).click();
        await card.getByText(/Material eliminado\. El borrado del archivo está pendiente/).waitFor();
        assert.equal((await list(student)).some(row => row.id === extra.id), false);
        assert.equal((await api(student, 'GET', `/files/${extra.fileId}/content`)).status, 403);
        assert.equal((await api(page, 'GET', `/files/${extra.fileId}/content`)).status, 403);
        assert.equal(await usage(), before);
        assert.equal(digest(await runtime.privateFileBytes(extra.fileId)), digest(bytes));
        await runtime.restartData();
        const deadline = Date.now() + 15000;
        let removed = false;
        while (Date.now() < deadline) {
          removed = !!(await runtime.db.query('SELECT blob_deleted_at FROM files WHERE id=$1', [extra.fileId])).rows[0].blob_deleted_at;
          if (removed) break;
          await delay(100);
        }
        assert.equal(removed, true, 'Reconstructed actual worker must finish durable explicit deletion');
        await assert.rejects(runtime.privateFileBytes(extra.fileId), error => error.code === 'NOT_FOUND');
        assert.equal(await usage(), before - BigInt(bytes.length));
        assert.equal((await list(page)).find(row => row.id === extra.id).deletionPending, false);
        assert.equal((await api(student, 'GET', `/files/${linked.fileId}/content`)).digest, digest(bytes));
        await openClassroom(page, runtime.origin);
        await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
        await mkdir('.test-artifacts/p6-integration', { recursive: true });
        for (const width of [375, 320]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await page.screenshot({ path: `.test-artifacts/p6-integration/library-${width}.png`, fullPage: true });
        }
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
