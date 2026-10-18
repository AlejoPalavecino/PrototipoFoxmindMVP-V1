import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, planPdf } from './p6-integration-helpers.mjs';

async function request(page, method, path, body, headers = {}) {
  let result = await api(page, method, path, body, headers);
  if (result.status === 429) { const seconds = Number(result.headers['retry-after']); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
    console.log(`History fixture honors actual Retry-After=${seconds}s once`); await delay(seconds * 1000); result = await api(page, method, path, body, headers); }
  return result;
}
const ok = async (...args) => { const result = await request(...args); assert.equal(result.status, 200, `${args[1]} ${args[2]}`); return result.body; };
const editorHeaders = editor => ({ 'x-attempt-editor': editor.token, 'x-attempt-epoch': editor.epoch });

test('P7 actual teacher reopen/student prefill-transfer-revise-submit preserve original question and private-file history', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const owner = spawnSync('docker', ['ps', '--filter', `publish=${runtime.db.connectionParameters.port}`, '--format', '{{.Label "foxmind.p4.owner"}}'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    assert.equal(owner.status, 0); console.log(`History actual disposable owner: ${owner.stdout.trim()}`);
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p7-history-')); console.log(`History retained browser evidence: ${scratch}`);
    const browser = await chromium.launch({ headless: true });
    try {
      const teacher = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
      const errors = []; for (const page of [teacher, student]) page.on('pageerror', e => errors.push(e.message));
      const suffix = Date.now(); await account(teacher, runtime.origin, runtime.inbox, `history-teacher-${suffix}@example.test`);
      await account(student, runtime.origin, runtime.inbox, `history-student-${suffix}@example.test`);
      const room = await classroom(teacher, student, 'P7 history classroom'), detail = await ok(teacher, 'GET', `/classrooms/${room.id}`);
      const change = async operation => ok(teacher, 'POST', `/classrooms/${room.id}/activities`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation });
      const activities = [];
      for (const type of ['QUESTIONNAIRE', 'ASSIGNMENT', 'EVALUATION']) {
        const { id } = await change({ action: 'create', type }), title = `History ${type}`;
        await change({ action: 'save', id, payload: { title, unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id,
          instructions: 'Original immutable instructions', attachmentRequired: type === 'ASSIGNMENT', instructionFileIds: [], materialIds: [], deadline: null, allowLate: false,
          questions: type === 'ASSIGNMENT' ? [] : [{ type: 'DEVELOPMENT', prompt: 'Retained question', points: '2', scoringRule: null, options: [] }] } });
        await change({ action: 'publish', id });
        let state = await ok(student, 'POST', `/classrooms/${room.id}/activities/${id}/start`, {}), editor = state.editor;
        if (type === 'ASSIGNMENT') {
          const bytes = await planPdf('Immutable original work');
          const allocated = await request(student, 'POST', '/files', { scope: { kind: 'classroom', id: room.id }, purpose: 'attachment', targetId: state.attempt.id, name: 'retained-original.pdf', bytes: bytes.length }, editorHeaders(editor));
          assert.equal(allocated.status, 201); assert.equal((await request(student, 'PUT', `/files/${allocated.body.id}/content`, { base64: bytes.toString('base64') }, editorHeaders(editor))).body.ready, true);
        } else await ok(student, 'POST', `/classrooms/${room.id}/attempts/${state.attempt.id}/answer`, { revision: state.attempt.revision, questionId: state.activity.questions[0].id, text: 'Original answer\n😀', optionIds: [] }, editorHeaders(editor));
        state = await ok(student, 'GET', `/classrooms/${room.id}/activities/${id}/session`);
        await ok(student, 'POST', `/classrooms/${room.id}/attempts/${state.attempt.id}/${type === 'ASSIGNMENT' ? 'submit-practical' : 'submit-answers'}`,
          { revision: state.attempt.revision, confirm: true, ...(type === 'ASSIGNMENT' ? {} : { confirmIncomplete: false }) }, editorHeaders(editor));
        const original = state.attempt.id, grade = crypto.randomUUID();
        const obligation = (await runtime.db.query('SELECT student_activity_id FROM attempts WHERE id=$1', [original])).rows[0].student_activity_id;
        await runtime.db.query(`INSERT INTO attempt_grades(id,updated_at,attempt_id,student_activity_id,activity_id,graded_by_id,final_grade,is_published,published_at)
          VALUES($1,now(),$2,$3,$4,$5,8,true,now())`, [grade, original, obligation, id, detail.teacherId ?? (await runtime.db.query('SELECT teacher_id FROM classrooms WHERE id=$1', [room.id])).rows[0].teacher_id]);
        await runtime.db.query('UPDATE student_activities SET effective_grade_id=$2 WHERE id=$1', [obligation, grade]);
        activities.push({ id, title, type, original, obligation, grade });
      }
      const originalHash = async activity => digest(JSON.stringify(await Promise.all([
        runtime.db.query('SELECT to_jsonb(a) value FROM attempts a WHERE id=$1', [activity.original]),
        runtime.db.query('SELECT to_jsonb(a) value FROM answers a WHERE attempt_id=$1 ORDER BY id', [activity.original]),
        runtime.db.query('SELECT to_jsonb(a) value FROM attempt_attachments a WHERE attempt_id=$1 ORDER BY file_id', [activity.original]),
        runtime.db.query('SELECT to_jsonb(c) value FROM file_custodies c WHERE file_id IN (SELECT file_id FROM attempt_attachments WHERE attempt_id=$1) ORDER BY file_id', [activity.original]),
      ]).then(results => results.map(r => r.rows))));
      let failed = false; const check = (name, fn) => t.test(name, { skip: failed ? 'Earlier actual history prerequisite failed' : false }, async () => { try { await fn(); } catch (e) { failed = true; throw e; } });
      const actualActivities = process.env.P7_HISTORY_TARGETED === '1' ? activities.filter(a => a.type !== 'QUESTIONNAIRE') : activities;
      for (const activity of actualActivities) await check(`${activity.type} real teacher reopen confirmation → student history/prefill transfer → revised explicit delivery`, async () => {
        const before = await originalHash(activity);
        await openClassroom(teacher, runtime.origin, 'P7 history classroom'); await teacher.getByRole('button', { name: 'Actividades', exact: true }).click();
        await teacher.getByRole('article', { name: activity.title, exact: true }).getByRole('button', { name: 'Ver entregas recibidas', exact: true }).click();
        await teacher.getByRole('button', { name: 'Habilitar otro intento', exact: true }).click();
        await teacher.getByRole('button', { name: 'Confirmar nuevo intento', exact: true }).click();
        await teacher.getByText('Reentrega pendiente', { exact: false }).waitFor();
        assert.equal(await originalHash(activity), before);
        await openClassroom(student, runtime.origin, 'P7 history classroom');
        await student.getByRole('button', { name: 'Actividades', exact: true }).click();
        await student.getByRole('article', { name: activity.title, exact: true }).getByRole('button', { name: 'Ver mis intentos', exact: true }).click();
        await student.getByText('Reentrega pendiente: todavía no es una nueva entrega recibida.', { exact: true }).waitFor();
        await student.getByRole('button', { name: 'Consultar intento 1', exact: true }).click();
        if (activity.type !== 'ASSIGNMENT') await student.getByRole('region', { name: 'Intento histórico confirmado' }).getByText('Original answer', { exact: false }).waitFor();
        await student.getByRole('button', { name: 'Continuar borrador', exact: true }).click();
        await student.getByRole('button', { name: 'Transferir edición a esta pestaña', exact: true }).click();
        await student.getByRole('button', { name: 'Confirmar transferencia', exact: true }).click();
        if (activity.type === 'ASSIGNMENT') {
          await student.getByRole('button', { name: 'Quitar retained-original.pdf', exact: true }).click();
          const bytes = await planPdf('Revised second delivery');
          await student.getByLabel('Seleccionar archivo del trabajo', { exact: true }).setInputFiles({ name: 'revised-work.pdf', mimeType: 'application/pdf', buffer: bytes });
          const uploaded = student.waitForResponse(r => /\/files\/[^/]+\/content$/.test(new URL(r.url()).pathname) && r.request().method() === 'PUT');
          await student.getByRole('button', { name: 'Subir archivo privado', exact: true }).click(); assert.equal((await uploaded).status(), 200);
          await student.getByRole('button', { name: 'Quitar revised-work.pdf', exact: true }).waitFor();
          await student.getByRole('button', { name: 'Enviar trabajo práctico', exact: true }).click();
          await student.getByRole('button', { name: 'Confirmar envío del trabajo', exact: true }).click();
        } else {
          const input = student.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true });
          assert.equal(await input.inputValue(), 'Original answer\n😀'); await input.fill('Revised answer with preserved original');
          await student.getByRole('button', { name: 'Enviar respuestas', exact: true }).click();
          await student.getByRole('button', { name: 'Confirmar envío de respuestas', exact: true }).click();
        }
        await student.getByText('Entregado · solo consulta', { exact: false }).waitFor();
        assert.equal(await originalHash(activity), before);
        assert.equal((await runtime.db.query('SELECT effective_grade_id FROM student_activities WHERE id=$1', [activity.obligation])).rows[0].effective_grade_id, activity.grade);
        const history = await ok(student, 'GET', `/classrooms/${room.id}/activities/${activity.id}/history`); assert.deepEqual(history.attempts.map(a => [a.number, a.status]), [[2, 'SUBMITTED'], [1, 'SUBMITTED']]);
        await student.screenshot({ path: join(scratch, `${activity.type.toLowerCase()}-submitted-mobile.png`), fullPage: true });
      });
      await check('real restart preserves new and original history and effective pointers without issuing editor capabilities', async () => {
        await runtime.restartApi();
        for (const activity of actualActivities) { const result = await ok(student, 'GET', `/classrooms/${room.id}/activities/${activity.id}/history`); assert.equal(result.attempts.length, 2); }
        assert.deepEqual(errors, []);
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
