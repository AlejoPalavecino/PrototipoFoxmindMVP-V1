import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, rejectSame } from './p6-integration-helpers.mjs';

test('P6 actual Muro, scoped notifications, moderation and retained history', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext()).newPage();
      const other = await (await browser.newContext()).newPage();
      const suffix = Date.now();
      const teacher = await account(page, runtime.origin, runtime.inbox, `p6-wall-teacher-${suffix}@example.test`, undefined, "teacher");
      const learner = await account(student, runtime.origin, runtime.inbox, `p6-wall-student-${suffix}@example.test`, undefined, "student");
      const room = await classroom(page, student);
      await account(other, runtime.origin, runtime.inbox, `p6-wall-other-${suffix}@example.test`, async () => {
        await rejectSame(runtime.db, () => api(other, 'GET', `/classrooms/${room.id}/wall`), 403);
      }, "student");
      const wall = async actor => (await api(actor, 'GET', `/classrooms/${room.id}/wall`)).body;
      const notifications = async actor => (await api(actor, 'GET', '/classrooms/notifications')).body;
      const change = async (actor, operation) => api(actor, 'POST', `/classrooms/${room.id}/wall`, { revision: (await wall(page)).revision, operation });
      const noticeBody = 'Notice <img src=x onerror="window.__p6executed=true">\nSecond line';
      const queryBody = 'Student query through browser';
      let notice, query, teacherReply, studentNotification;
      let failed = false;
      const check = (name, operation) => t.test(name, { skip: failed ? 'Prior shared journey failed' : false }, async () => {
        try { await operation(); } catch (error) { failed = true; throw error; }
      });
      await check('real teacher notice and student query select classroom roles and render literal text', async () => {
        await openClassroom(page, runtime.origin);
        await page.getByRole('button', { name: 'Muro', exact: true }).click();
        await page.getByRole('button', { name: 'Publicar aviso', exact: true }).click();
        await page.getByRole('dialog', { name: 'Una idea para tu grupo', exact: true }).getByLabel('T铆tulo', { exact: true }).fill('Aviso de prueba');
        await page.getByRole('dialog', { name: 'Una idea para tu grupo', exact: true }).getByRole('textbox', { name: 'Tu mensaje', exact: true }).fill(noticeBody);
        await page.getByRole('dialog', { name: 'Una idea para tu grupo', exact: true }).getByRole('button', { name: 'Publicar mensaje', exact: true }).click();
        await page.getByText('Aviso publicado en el aula.', { exact: true }).waitFor();
        notice = (await wall(page)).posts.find(post => post.body === noticeBody);
        assert.ok(notice); assert.equal(notice.type, 'NOTICE');
        assert.equal(await page.getByRole('region', { name: 'Muro del aula' }).locator('img[onerror]').count(), 0);
        assert.equal(await page.evaluate(() => window.__p6executed), undefined);
        await openClassroom(student, runtime.origin);
        await student.getByRole('button', { name: 'Muro', exact: true }).click();
        await student.getByRole('button', { name: 'Hacer una consulta', exact: true }).click();
        await student.getByRole('dialog', { name: 'Tu pregunta tiene lugar', exact: true }).getByLabel('T铆tulo', { exact: true }).fill('Consulta de prueba');
        await student.getByRole('dialog', { name: 'Tu pregunta tiene lugar', exact: true }).getByRole('textbox', { name: 'Tu mensaje', exact: true }).fill(queryBody);
        await student.getByRole('dialog', { name: 'Tu pregunta tiene lugar', exact: true }).getByRole('button', { name: 'Publicar mensaje', exact: true }).click();
        await student.getByText('Consulta publicada en el aula.', { exact: true }).waitFor();
        const result = await wall(student);
        query = result.posts.find(post => post.body === queryBody);
        assert.equal(query.type, 'QUERY');
        assert.deepEqual(result.posts.map(post => post.id), [query.id, notice.id]);
        assert.equal(result.posts.some(post => Object.hasOwn(post, 'email')), false);
        assert.ok(result.posts.every(post => post.authorName && post.initials));
        assert.equal((await notifications(student)).filter(item => item.eventType === 'WALL_NOTICE').length, 1);
        assert.equal((await notifications(page)).filter(item => item.eventType === 'WALL_QUERY').length, 1);
      });
      await check('grouped UI replies notify the publication author only and preserve ordering', async () => {
        const thread = student.locator(`[data-wall-id="${notice.id}"]`);
        await thread.getByRole('button', { name: 'Responder publicaci贸n', exact: true }).click();
        await student.getByRole('dialog', {name:'Continuar la conversaci髇',exact:true}).getByLabel('Tu respuesta', { exact: true }).fill('Student reply to notice');
        await student.getByRole('dialog', {name:'Continuar la conversaci髇',exact:true}).getByRole('button', { name: 'Publicar mensaje', exact: true }).click();
        await student.getByText('Respuesta publicada.', { exact: true }).waitFor();
        assert.equal((await change(page, { action: 'reply', postId: notice.id, body: 'Teacher self reply' })).status, 200);
        assert.equal((await change(page, { action: 'reply', postId: query.id, body: 'Teacher reply to query' })).status, 200);
        assert.equal((await change(student, { action: 'reply', postId: query.id, body: 'Student self reply' })).status, 200);
        const result = await wall(page);
        assert.deepEqual(result.posts.find(post => post.id === notice.id).replies.map(reply => reply.body), ['Student reply to notice', 'Teacher self reply']);
        teacherReply = result.posts.find(post => post.id === query.id).replies.find(reply => reply.body === 'Teacher reply to query');
        assert.equal((await notifications(page)).length, 2);
        assert.equal((await notifications(student)).length, 2);
        assert.equal((await runtime.db.query('SELECT count(*)::int AS n FROM notifications WHERE recipient_id=$1', [teacher.id])).rows[0].n, 2);
        assert.equal((await runtime.db.query('SELECT count(*)::int AS n FROM notifications WHERE recipient_id=$1', [learner.id])).rows[0].n, 2);
      });
      await check('notification center marks read and opens the authorized real thread', async () => {
        await page.getByRole('button', { name: /^Notificaciones/ }).click();
        const dialog = page.getByRole('dialog', { name: 'Notificaciones', exact: true });
        const row = dialog.locator('li').filter({ hasText: 'Nueva consulta de estudiante' });
        await row.getByRole('button', { name: 'Marcar como le铆da', exact: true }).click();
        await row.getByText(/Le铆da/).waitFor();
        assert.ok((await notifications(page)).find(item => item.postId === query.id && item.eventType === 'WALL_QUERY').readAt);
        await dialog.getByRole('button', { name: /Cerrar/ }).click();
        studentNotification = (await notifications(student)).find(item => item.postId === notice.id && item.eventType === 'WALL_NOTICE');
        await student.getByRole('button', { name: /^Notificaciones/ }).click();
        await student.getByRole('dialog', { name: 'Notificaciones', exact: true }).locator('li')
          .filter({ hasText: 'Nuevo aviso del docente' }).getByRole('button', { name: 'Abrir conversaci贸n', exact: true }).click();
        await student.waitForFunction(id => document.activeElement?.dataset.wallId === id, notice.id);
        assert.ok((await notifications(student)).find(item => item.id === studentNotification.id).readAt);
      });
      await check('authors can edit, teachers cannot rewrite students, and confirmed moderation retains replies', async () => {
        await openClassroom(page, runtime.origin);
        await page.getByRole('button', { name: 'Muro', exact: true }).click();
        const thread = page.locator(`[data-wall-id="${query.id}"]`);
        await thread.waitFor();
        assert.equal(await thread.getByRole('button', { name: 'Editar publicaci贸n', exact: true }).count(), 0);
        await rejectSame(runtime.db, () => change(page, { action: 'editPost', id: query.id, body: 'Teacher rewrite denied' }), 403);
        assert.equal((await change(student, { action: 'editPost', id: query.id, body: 'Edited student query' })).status, 200);
        await rejectSame(runtime.db, () => change(page, { action: 'removePost', id: query.id, confirm: false }), 400);
        await openClassroom(page, runtime.origin);
        await page.getByRole('button', { name: 'Muro', exact: true }).click();
        await thread.getByRole('button', { name: 'Eliminar publicaci贸n', exact: true }).click();
        await page.getByRole('dialog', { name: 'Eliminar publicaci贸n', exact: true }).getByRole('button', { name: 'Cancelar', exact: true }).click();
        assert.equal((await wall(page)).posts.find(post => post.id === query.id).body, 'Edited student query');
        await thread.getByRole('button', { name: 'Eliminar publicaci贸n', exact: true }).click();
        await page.getByRole('button', { name: 'Confirmar eliminaci贸n', exact: true }).click();
        await thread.getByText('Contenido eliminado', { exact: true }).waitFor();
        const removed = (await wall(student)).posts.find(post => post.id === query.id);
        assert.equal(removed.body, null); assert.ok(removed.removedAt);
        assert.equal(removed.replies.length, 2);
        assert.equal(removed.replies.find(reply => reply.id === teacherReply.id).body, 'Teacher reply to query');
        await rejectSame(runtime.db, () => change(other, { action: 'publish', body: 'Foreign publication' }), 403);
        const body = { revision: (await wall(page)).revision, operation: { action: 'publish', body: 'Invalid CSRF' } };
        await rejectSame(runtime.db, () => api(page, 'POST', `/classrooms/${room.id}/wall`, body, { 'x-csrf-token': 'invalid' }), 403);
      });
      await check('exclusive roles retain classroom ownership boundaries; real restart preserves threads and notification reads', async () => {
        const foreignTeacher = await (await browser.newContext()).newPage();
        await account(foreignTeacher, runtime.origin, runtime.inbox, `p6-wall-foreign-teacher-${suffix}@example.test`, undefined, 'teacher');
        const second = await classroom(foreignTeacher, student, 'Second role classroom');
        const state = (await api(student, 'GET', `/classrooms/${second.id}/wall`)).body;
        assert.equal((await api(student, 'POST', `/classrooms/${second.id}/wall`, { revision: state.revision, operation: { action: 'publish', body: 'Student query in another teacher classroom' } })).status, 200);
        const secondWall = (await api(student, 'GET', `/classrooms/${second.id}/wall`)).body;
        assert.equal(secondWall.posts[0].type, 'QUERY');
        assert.equal((await api(student, 'GET', `/classrooms/${second.id}`)).body.role, 'student');
        await rejectSame(runtime.db, () => api(page, 'GET', `/classrooms/${second.id}/wall`), 403);
        await rejectSame(runtime.db, () => api(page, 'POST', `/classrooms/${second.id}/wall`, { revision: secondWall.revision, operation: { action: 'publish', body: 'Foreign teacher denied' } }), 403);
        let secondRead = await api(foreignTeacher, 'GET', `/classrooms/${second.id}`);
        console.log('P6 foreign classroom archive prerequisite', JSON.stringify({ status: secondRead.status, code: secondRead.body?.error?.code ?? null, retryAfter: secondRead.headers?.['retry-after'] ?? null }));
        if (secondRead.status === 429) {
          assert.equal(secondRead.body?.error?.code, 'RATE_LIMITED');
          const raw = secondRead.headers?.['retry-after']; assert.match(raw ?? '', /^\d+$/);
          const seconds = Number(raw); assert.ok(Number.isSafeInteger(seconds) && seconds >= 1 && seconds <= 60);
          console.log(`P6 foreign owner metadata GET honors Retry-After=${seconds}s once`);
          await delay(seconds * 1000);
          secondRead = await api(foreignTeacher, 'GET', `/classrooms/${second.id}`);
        }
        assert.equal(secondRead.status, 200, 'Foreign classroom owner metadata must be admitted before testing student denial');
        const secondDetail = secondRead.body;
        assert.equal(typeof secondDetail.revision, 'string'); assert.match(secondDetail.revision, /^\d+$/);
        await rejectSame(runtime.db, () => api(student, 'POST', `/classrooms/${second.id}/archive`, { revision: secondDetail.revision, archived: true }), 403);
        const beforeWall = await wall(page), beforeNotifications = await notifications(page);
        await runtime.restartData();
        assert.deepEqual(await wall(page), beforeWall);
        assert.deepEqual(await notifications(page), beforeNotifications);
        assert.deepEqual((await api(student, 'GET', `/classrooms/${second.id}/wall`)).body, secondWall);
        await openClassroom(page, runtime.origin);
        await page.getByRole('button', { name: 'Muro', exact: true }).click();
        await mkdir('.test-artifacts/p6-integration', { recursive: true });
        for (const width of [375, 320]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await page.screenshot({ path: `.test-artifacts/p6-integration/wall-${width}.png`, fullPage: true });
        }
      });
      await check('archive leaves content readable and personal flags usable, while departure revokes all target access', async () => {
        const state = (await api(page, 'GET', `/classrooms/${room.id}`)).body;
        assert.equal((await api(page, 'POST', `/classrooms/${room.id}/archive`, { revision: state.revision, archived: true })).status, 200);
        await rejectSame(runtime.db, () => change(page, { action: 'publish', body: 'Archived denied' }), 409);
        const revision = (await api(page, 'GET', `/classrooms/${room.id}`)).body.revision;
        const personal = (await notifications(page)).find(item => item.classroomId === room.id);
        assert.equal((await api(page, 'POST', `/classrooms/notifications/${personal.id}/read`, {})).status, 200);
        assert.equal((await api(page, 'GET', `/classrooms/${room.id}`)).body.revision, revision);
        assert.equal((await api(page, 'POST', `/classrooms/${room.id}/archive`, { revision, archived: false })).status, 200);
        assert.equal((await api(student, 'POST', `/classrooms/${room.id}/leave`, {})).status, 200);
        await rejectSame(runtime.db, () => api(student, 'POST', `/classrooms/notifications/${studentNotification.id}/open`, {}), 403);
        await rejectSame(runtime.db, () => api(student, 'GET', `/classrooms/${room.id}/wall`), 403);
        await rejectSame(runtime.db, () => api(student, 'GET', `/classrooms/${room.id}/library`), 403);
        await rejectSame(runtime.db, () => api(student, 'GET', `/files/${room.fileId}/content`), 403);
        assert.equal((await notifications(student)).some(item => item.classroomId === room.id), false);
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
