import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api } from './p4-integration-helpers.mjs';
import { classroom } from './p6-integration-helpers.mjs';

async function request(page, method, path, body, headers = {}) {
  let result = await api(page, method, path, body, headers);
  if (result.status === 429) { const seconds = Number(result.headers['retry-after']); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
    console.log(`Notification fixture honors actual Retry-After=${seconds}s once`); await delay(seconds * 1000); result = await api(page, method, path, body, headers); }
  return result;
}
const ok = async (...args) => { const result = await request(...args); assert.equal(result.status, 200, `${args[1]} ${args[2]}`); return result.body; };

test('P7 actual academic notification events navigate mobile activities/history and preserve legacy WALL targets', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const owner = spawnSync('docker', ['ps', '--filter', `publish=${runtime.db.connectionParameters.port}`, '--format', '{{.Label "foxmind.p4.owner"}}'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    assert.equal(owner.status, 0); console.log(`Notifications actual disposable owner: ${owner.stdout.trim()}`);
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p7-notifications-')); console.log(`Notifications retained browser evidence: ${scratch}`);
    const browser = await chromium.launch({ headless: true });
    try {
      const teacher = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext({ viewport: { width: 320, height: 812 } })).newPage();
      const lateStudent = await (await browser.newContext()).newPage(), errors = [];
      for (const page of [teacher, student, lateStudent]) page.on('pageerror', e => errors.push(e.message));
      const suffix = Date.now();
      await account(teacher, runtime.origin, runtime.inbox, `notify-teacher-${suffix}@example.test`);
      await account(student, runtime.origin, runtime.inbox, `notify-student-${suffix}@example.test`);
      await account(lateStudent, runtime.origin, runtime.inbox, `notify-late-${suffix}@example.test`);
      const room = await classroom(teacher, student, 'P7 notification classroom'), detail = await ok(teacher, 'GET', `/classrooms/${room.id}`);
      const mailCount = async () => Number((await (await fetch(`${runtime.inbox}/api/v1/messages`)).json()).total);
      const initialMail = await mailCount();
      const change = async operation => ok(teacher, 'POST', `/classrooms/${room.id}/activities`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation });
      const { id } = await change({ action: 'create', type: 'QUESTIONNAIRE' }), path = `/classrooms/${room.id}/activities/${id}`;
      const payload = { title: 'Notification questionnaire', unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id,
        instructions: 'Notification destination', attachmentRequired: false, instructionFileIds: [], materialIds: [], deadline: null, allowLate: false,
        questions: [{ type: 'DEVELOPMENT', prompt: 'Notification question', points: '2', scoringRule: null, options: [] }] };
      const notifications = page => ok(page, 'GET', '/classrooms/notifications');
      const openNotice = async (page, label) => {
        await page.getByRole('button', { name: /^Notificaciones/ }).click();
        const row = page.getByRole('listitem').filter({ has: page.getByText(label, { exact: true }) });
        const action = label === 'Nuevo aviso del docente' ? 'Abrir conversación' : 'Ver actividad';
        await row.getByRole('button', { name: action, exact: true }).click();
      };
      let failed = false; const check = (name, fn) => t.test(name, { skip: failed ? 'Earlier actual notification prerequisite failed' : false }, async () => { try { await fn(); } catch (e) { failed = true; throw e; } });
      await check('private save is silent; publication opens actual mobile activity with visible current tab, no attempted start or leaked keys', async () => {
        await change({ action: 'save', id, payload }); assert.equal((await notifications(student)).length, 0);
        await change({ action: 'publish', id });
        await student.goto(`${runtime.origin}/mis-aulas`); await openNotice(student, 'Nueva actividad publicada');
        await student.getByRole('button', { name: 'Comenzar', exact: true }).waitFor();
        const nav = await student.getByRole('button', { name: 'Actividades', exact: true }).evaluate(button => {
          const rect = button.getBoundingClientRect(), parent = button.closest('nav').getBoundingClientRect(); return { current: button.getAttribute('aria-current'), left: rect.left, right: rect.right, parentLeft: parent.left, parentRight: parent.right }; });
        assert.equal(nav.current, 'page'); assert.ok(nav.left >= nav.parentLeft - 1 && nav.right <= nav.parentRight + 1);
        assert.equal((await ok(student, 'GET', path + '/session')).attempt, null);
        assert.ok(!/"(?:correct|scoringRule|editor_token_hash)"/.test(JSON.stringify(await ok(student, 'GET', path + '/session'))));
        await student.screenshot({ path: join(scratch, 'publication-mobile-320.png'), fullPage: true });
      });
      await check('actual changes including content-save path notify per transition, noop/save/start/autosave/transfer do not notify', async () => {
        const revised = { ...payload, deadline: { local: '2030-01-01T18:00' } };
        await change({ action: 'save', id, payload: revised }); await change({ action: 'save', id, payload: revised });
        assert.equal((await notifications(student)).filter(n => n.eventType === 'ACTIVITY_DEADLINE_CHANGED').length, 1);
        await change({ action: 'deadline', id, deadline: { local: '2030-01-02T18:00' }, allowLate: false });
        assert.equal((await notifications(student)).filter(n => n.eventType === 'ACTIVITY_DEADLINE_CHANGED').length, 2);
        let state = await ok(student, 'POST', path + '/start', {}), h = { 'x-attempt-editor': state.editor.token, 'x-attempt-epoch': state.editor.epoch };
        await ok(student, 'POST', `/classrooms/${room.id}/attempts/${state.attempt.id}/answer`, { revision: state.attempt.revision, questionId: state.activity.questions[0].id, text: 'Answer', optionIds: [] }, h);
        state = await ok(student, 'GET', path + '/session');
        await ok(student, 'POST', `/classrooms/${room.id}/attempts/${state.attempt.id}/submit-answers`, { revision: state.attempt.revision, confirm: true, confirmIncomplete: false }, h);
        const received = (await notifications(teacher)).find(n => n.eventType === 'SUBMISSION_RECEIVED'); assert.ok(received);
        await teacher.goto(`${runtime.origin}/mis-aulas`); await openNotice(teacher, 'Nueva entrega recibida');
        await teacher.getByRole('region', { name: 'Intento histórico confirmado' }).getByText('Ver mis respuestas y archivos', { exact: true }).click();
        await teacher.getByRole('region', { name: 'Intento histórico confirmado' }).getByText('Answer', { exact: true }).waitFor();
        await teacher.getByRole('region', { name: 'Intento histórico confirmado' }).getByRole('button', { name: 'Volver al historial', exact: true }).click();
        await teacher.getByRole('button', { name: 'Habilitar otro intento', exact: true }).click(); await teacher.getByRole('button', { name: 'Confirmar nuevo intento', exact: true }).click();
        await student.goto(`${runtime.origin}/mis-aulas`); await openNotice(student, 'Nuevo intento habilitado');
        await student.getByRole('region', { name: 'Intento histórico confirmado' }).getByRole('button', { name: 'Volver a mis intentos', exact: true }).click();
        await student.getByText('Reentrega pendiente: todavía no es una nueva entrega recibida.', { exact: true }).waitFor();
        await student.getByRole('button', { name: 'Continuar borrador', exact: true }).click(); await student.getByRole('button', { name: 'Continuar en esta pestaña', exact: true }).click();
        await student.getByRole('button', { name: 'Confirmar transferencia', exact: true }).click();
        assert.equal((await notifications(teacher)).filter(n => n.eventType === 'SUBMISSION_RECEIVED').length, 1);
      });
      await check('individual first authorization notifies only current target; withdrawn/private destinations and departed recipients are inaccessible', async () => {
        const expired = (await change({ action: 'create', type: 'QUESTIONNAIRE' })).id;
        await change({ action: 'save', id: expired, payload: { ...payload, title: 'Expired consultation', deadline: { local: '2020-01-01T18:00' } } });
        await change({ action: 'publish', id: expired });
        const preview = await ok(lateStudent, 'POST', '/classrooms/codes/preview', { code: room.code }); await ok(lateStudent, 'POST', '/classrooms/codes/confirm', { confirmation: preview.confirmation });
        const lateId = (await runtime.db.query('SELECT id FROM users WHERE email=$1', [`notify-late-${suffix}@example.test`])).rows[0].id;
        await ok(teacher, 'POST', `/classrooms/${room.id}/activities/${expired}/authorize-first`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, studentId: lateId, deadline: { local: '2030-01-03T18:00' } });
        const enabled = (await notifications(lateStudent)).find(n => n.eventType === 'FIRST_SUBMISSION_ENABLED'); assert.ok(enabled);
        assert.equal((await notifications(student)).filter(n => n.eventType === 'FIRST_SUBMISSION_ENABLED').length, 0);
        await change({ action: 'withdraw', id: expired }); assert.equal((await request(lateStudent, 'POST', `/classrooms/notifications/${enabled.id}/open`, {})).status, 403);
        await change({ action: 'publish', id: expired }); assert.ok((await notifications(lateStudent)).some(n => n.eventType === 'ACTIVITY_PUBLISHED'));
        await ok(lateStudent, 'POST', `/classrooms/${room.id}/leave`, {}); assert.equal((await notifications(lateStudent)).length, 0);
        assert.equal((await request(lateStudent, 'POST', `/classrooms/notifications/${enabled.id}/read`, {})).status, 403);
      });
      await check('legacy wall notification still opens Muro on mobile, marks read, and academic events send no email', async () => {
        await ok(teacher, 'POST', `/classrooms/${room.id}/wall`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation: { action: 'publish', body: 'Preserved wall target' } });
        await student.goto(`${runtime.origin}/mis-aulas`); await openNotice(student, 'Nuevo aviso del docente');
        await student.getByText('Preserved wall target', { exact: true }).waitFor();
        assert.equal(await student.getByRole('button', { name: 'Muro', exact: true }).getAttribute('aria-current'), 'page');
        const wall = (await notifications(student)).find(n => n.eventType === 'WALL_NOTICE'); assert.ok(wall.readAt);
        assert.deepEqual(Object.keys(wall).sort(), ['id', 'classroomId', 'classroomName', 'eventType', 'postId', 'replyId', 'createdAt', 'readAt'].sort());
        assert.equal(await mailCount(), initialMail); assert.deepEqual(errors, []);
        await student.screenshot({ path: join(scratch, 'wall-preserved-mobile-320.png'), fullPage: true });
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
