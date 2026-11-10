import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { openClassroom, planPdf, upload, rejectSame } from './p6-integration-helpers.mjs';
import { selectClassroomSection } from './p9-journey-helpers-current.mjs';

async function prepareManualActivity(page, type, title) {
  await page.getByRole('button', { name: 'Crear actividad', exact: true }).click();
  await page.getByRole('dialog', { name: 'Crear actividad', exact: true })
    .getByRole('button', { name: 'Crear manualmente', exact: true }).click();
  const editor = page.getByRole('region', { name: 'Editar actividad', exact: true });
  await editor.getByLabel('Tipo de actividad', { exact: true }).selectOption(type);
  await editor.getByLabel('Título de la actividad', { exact: true }).fill(title);
  await editor.getByLabel('Unidad de la actividad', { exact: true }).selectOption({ label: 'First unit' });
  await editor.getByRole('group', { name: 'Temas del plan', exact: true })
    .getByRole('checkbox', { name: 'First topic', exact: true }).check();
  await editor.getByLabel('Objetivo de aprendizaje', { exact: true }).fill('Justificar las respuestas con evidencia.');
  await editor.getByLabel('Criterio 1', { exact: true }).fill('Evidencia y claridad');
  await editor.getByLabel('Descripción del criterio 1', { exact: true }).fill('Explicaciones fundamentadas y comprensibles.');
  await editor.getByLabel('Ponderación del criterio 1 (%)', { exact: true }).fill('100');
  return editor;
}

test('P7 T1 real P3 sessions, authoring UI, private ready instructions and safe published activities', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p7-authoring-'));
    console.log(`P7 retained browser evidence: ${scratch}`);
    try {
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext()).newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const suffix = Date.now();
      await account(page, runtime.origin, runtime.inbox, `p7-author-${suffix}@example.test`, undefined, "teacher");
      await account(student, runtime.origin, runtime.inbox, `p7-reader-${suffix}@example.test`, undefined, "student");
      const draft = await api(page, 'POST', '/classrooms/drafts', {}); assert.equal(draft.status, 200);
      const plan = await upload(page, { kind: 'draft', id: draft.body.id }, await planPdf());
      const saved = await api(page, 'PATCH', `/classrooms/drafts/${draft.body.id}`, { revision: draft.body.revision,
        payload: { name: 'P7 authoring classroom', subject: 'Science', division: 'A', academicYear: 2026, timezone: 'America/New_York',
          coverKey: 'explore', planFileId: plan.id, units: [{ name: 'First unit', topics: [{ name: 'First topic' }] }] } });
      assert.equal(saved.status, 200);
      const room = await api(page, 'POST', `/classrooms/drafts/${draft.body.id}/publish`, { revision: saved.body.revision }); assert.equal(room.status, 200);
      const roomId = room.body.id;
      const code = await api(student, 'POST', '/classrooms/codes/preview', { code: room.body.code }); assert.equal(code.status, 200);
      assert.equal((await api(student, 'POST', '/classrooms/codes/confirm', { confirmation: code.body.confirmation })).status, 200);
      const detail = async () => {
        let response = await api(page, 'GET', `/classrooms/${roomId}`);
        if (response.status === 429) {
          const seconds = Number(response.headers['retry-after']);
          assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60, 'Actual bounded Retry-After required');
          console.log(`P7 fixture respects actual detail Retry-After=${seconds}s once`);
          await delay(seconds * 1000);
          response = await api(page, 'GET', `/classrooms/${roomId}`);
        }
        assert.equal(response.status, 200, 'A failed prerequisite must not become an incomplete mutation payload');
        assert.match(response.body.revision, /^\d+$/);
        return response.body;
      };
      const change = async operation => api(page, 'POST', `/classrooms/${roomId}/activities`, { revision: (await detail()).revision, operation });
      let assignment, instructions, instructionDigest;
      const downloadInstructions = async (actor, role) => {
        const link = actor.getByRole('link', { name: 'Descargar instructions.pdf', exact: true });
        const href = new URL(await link.getAttribute('href'), runtime.origin);
        assert.equal(href.origin, runtime.origin);
        assert.equal(href.pathname, `/api/v1/files/${instructions}/content`);
        assert.deepEqual([...href.searchParams], [['mode', 'download']]);
        assert.equal(href.hash, '');
        const downloading = actor.waitForEvent('download').then(download => ({ download }), error => ({ error }));
        try {
          await link.click();
          const outcome = await downloading;
          if (outcome.error) throw outcome.error;
          const { download } = outcome;
          assert.equal(download.suggestedFilename(), 'instructions.pdf');
          const destination = join(scratch, `${role}-instructions.pdf`);
          await download.saveAs(destination);
          assert.equal(await download.failure(), null);
          assert.equal(digest(await readFile(destination)), instructionDigest, `${role} browser download must preserve the supplied bytes`);
        } finally { await downloading; }
      };
      let failed = false;
      const check = (name, operation) => t.test(name, { skip: failed ? 'Prior shared authoring journey failed' : false }, async () => {
        try { await operation(); } catch (error) { failed = true; throw error; }
      });
      await check('teacher private assignment editor explicitly resolves gaps/overlap and persists real scanned instructions', async () => {
        await openClassroom(page, runtime.origin, 'P7 authoring classroom');
        await selectClassroomSection(page, 'activities', 'Actividades');
        await prepareManualActivity(page, 'ASSIGNMENT', 'Browser assignment');
        await page.getByLabel('Consignas', { exact: true }).fill('Read carefully.\nPreserve this second line.');
        await page.getByLabel('Fecha y hora del aula', { exact: true }).fill('2026-03-08T02:30');
        await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
        await page.getByText('Esta hora no existe por el cambio de horario.', { exact: false }).waitFor();
        await page.getByLabel('Fecha y hora del aula', { exact: true }).fill('2026-11-01T01:30');
        await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
        await page.getByLabel('Ocurrencia de la hora repetida', { exact: true }).waitFor();
        assert.equal(await page.getByLabel('Ocurrencia de la hora repetida').locator('option').count(), 3);
        await page.getByLabel('Ocurrencia de la hora repetida').selectOption('-300');
        await page.getByRole('button', { name: 'Continuar a revisión', exact: true }).click();
        await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
        await page.getByText('Borrador privado guardado.', { exact: true }).waitFor();
        const list = (await api(page, 'GET', `/classrooms/${roomId}/activities`)).body.activities;
        assignment = list[0].id;
        assert.equal((await api(student, 'GET', `/classrooms/${roomId}/activities`)).body.activities.length, 0);
        let state = (await api(page, 'GET', `/classrooms/${roomId}/activities/${assignment}/preview`)).body.activity;
        assert.equal(state.instructions, 'Read carefully.\nPreserve this second line.');
        assert.equal(state.deadlineAt, '2026-11-01T06:30:00.000Z');
        // The approved editor has no instruction-upload control, including in baseline 29fda64.
        // Exercise the real public upload/scan/link boundary and its browser download instead.
        const bytes = await planPdf('Assignment instructions');
        instructionDigest = digest(bytes);
        const allocated = await api(page, 'POST', '/files', { scope: { kind: 'classroom', id: roomId },
          purpose: 'instructions', targetId: assignment, name: 'instructions.pdf', bytes: bytes.length });
        assert.equal(allocated.status, 201);
        const ready = await api(page, 'PUT', `/files/${allocated.body.id}/content`, { base64: bytes.toString('base64') });
        assert.equal(ready.status, 200); assert.equal(ready.body.ready, true);
        assert.equal((await change({ action: 'save', id: assignment, payload: {
          title: state.title, unitId: state.unitId, topicIds: state.topicIds, objective: state.objective,
          instructions: state.instructions, evaluationRubric: state.evaluationRubric, attachmentRequired: state.attachmentRequired,
          instructionFileIds: [allocated.body.id], materialIds: [], questions: [],
          // DST conversion above is already persisted and asserted. Open a future window for the separate first-reading case.
          deadline: { local: '2031-01-01T12:00' }, allowLate: state.allowLate,
        } })).status, 200);
        state = (await api(page, 'GET', `/classrooms/${roomId}/activities/${assignment}/preview`)).body.activity;
        instructions = state.instructionFiles[0].id;
        assert.equal(instructions, allocated.body.id); assert.equal(state.instructionFiles[0].ready, true);
        assert.equal((await api(page, 'GET', `/files/${instructions}/content`)).digest, digest(bytes));
        await rejectSame(runtime.db, () => api(student, 'GET', `/files/${instructions}/content`), 403);
        await openClassroom(page, runtime.origin, 'P7 authoring classroom');
        await selectClassroomSection(page, 'activities', 'Actividades');
      });
      await check('preview starts no attempt, publication is explicit and the actual student consultation remains key-free', async () => {
        const article = page.getByRole('article', { name: 'Browser assignment', exact: true });
        await article.getByRole('button', { name: 'Abrir Browser assignment', exact: true }).click();
        await page.getByRole('region', { name: 'Vista previa docente', exact: true }).getByText('Read carefully.\nPreserve this second line.', { exact: true }).waitFor();
        await downloadInstructions(page, 'teacher');
        assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempts')).rows[0].n, 0);
        assert.equal((await runtime.db.query('SELECT first_started_at FROM activities WHERE id=$1', [assignment])).rows[0].first_started_at, null);
        await page.getByRole('button', { name: 'Revisar para asignar', exact: true }).click();
        assert.equal((await api(student, 'GET', `/classrooms/${roomId}/activities`)).body.activities.length, 0);
        await page.getByRole('button', { name: 'Asignar al aula', exact: true }).click();
        await page.getByText('Actividad asignada a P7 authoring classroom.', { exact: true }).waitFor();
        assert.equal((await api(student, 'GET', `/files/${instructions}/content`)).status, 403,
          'Eligible assignment instructions require the explicit first-opening start boundary');
        await openClassroom(student, runtime.origin, 'P7 authoring classroom');
        await selectClassroomSection(student, 'activities', 'Actividades');
        await student.getByRole('article', { name: 'Browser assignment', exact: true }).getByRole('button', { name: 'Abrir Browser assignment', exact: true }).click();
        await student.getByRole('button', { name: 'Ver consigna', exact: true }).click();
        await downloadInstructions(student, 'student');
        assert.equal(await student.getByRole('button', { name: 'Guardar actividad', exact: true }).count(), 0);
      });
      await check('questionnaire/evaluation browser editors cover all question types and invalid questions remain visibly unsaved', async () => {
        // The other actor's first start legitimately changed the classroom revision.
        await page.getByRole('button', { name: 'Volver a actividades', exact: true }).click();
        const refreshed = Promise.all([`/api/v1/classrooms/${roomId}`, `/api/v1/classrooms/${roomId}/activities`]
          .map(path => page.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === 'GET')));
        await openClassroom(page, runtime.origin, 'P7 authoring classroom');
        await selectClassroomSection(page, 'activities', 'Actividades');
        for (const response of await refreshed) assert.equal(response.status(), 200);
        for (const [type, name] of [['QUESTIONNAIRE', 'Browser questionnaire'], ['EVALUATION', 'Browser evaluation']]) {
          await prepareManualActivity(page, type, name);
          await page.getByLabel('Consignas', { exact: true }).fill('Respondé cada pregunta y justificá tu elección.');
          for (const [index, qtype] of ['DEVELOPMENT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE'].entries()) {
            await page.getByRole('button', { name: 'Agregar pregunta', exact: true }).click();
            const group = page.getByRole('group', { name: `Pregunta ${index + 1}`, exact: true });
            await group.getByLabel('Tipo de pregunta', { exact: true }).selectOption(qtype);
            await group.getByLabel('Consigna de la pregunta', { exact: true }).fill(`Question ${index + 1}`);
            await group.getByLabel('Puntos disponibles', { exact: true }).fill(index === 0 ? '0' : '2.50');
            if (qtype !== 'DEVELOPMENT') {
              await group.getByLabel('Opción 1', { exact: true }).fill('Option A');
              await group.getByLabel('Opción 2', { exact: true }).fill('Option B');
              if (qtype === 'MULTIPLE_CHOICE') await group.getByLabel('Regla de puntuación', { exact: true }).selectOption('PARTIAL');
            }
          }
          // A local draft is persisted only on the first explicit save, even when its questions fail validation.
          const created = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/${roomId}/activities`
            && response.request().method() === 'POST' && response.request().postDataJSON()?.operation?.action === 'create');
          await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
          assert.equal((await created).status(), 200, 'Current teacher revision must create the requested draft');
          await page.getByText('Los cambios no confirmados permanecen en este editor', { exact: false }).waitFor();
          const before = (await api(page, 'GET', `/classrooms/${roomId}/activities`)).body.activities.find(a => a.type === type);
          assert.equal((await api(page, 'GET', `/classrooms/${roomId}/activities/${before.id}/preview`)).body.activity.questions.length, 0);
          assert.equal(await page.getByRole('group', { name: 'Pregunta 1', exact: true }).getByLabel('Puntos disponibles', { exact: true }).inputValue(), '0');
          await page.getByRole('group', { name: 'Pregunta 1', exact: true }).getByLabel('Puntos disponibles', { exact: true }).fill('1.25');
          await page.getByRole('button', { name: 'Continuar a revisión', exact: true }).click();
          await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
          await page.getByText('Borrador privado guardado.', { exact: true }).waitFor();
          await page.getByRole('button', { name: 'Revisar para asignar', exact: true }).click();
          const publicationResponse = () => page.waitForResponse(response => {
            const path = new URL(response.url()).pathname;
            return (path === '/api/v1/auth/csrf' && response.status() === 429)
              || (path === `/api/v1/classrooms/${roomId}/activities` && response.request().method() === 'POST'
                && (response.status() === 429 || response.request().postDataJSON()?.operation?.action === 'publish'));
          });
          let publication = publicationResponse();
          await page.getByRole('button', { name: 'Asignar al aula', exact: true }).click();
          let response = await publication;
          if (response.status() === 429) {
            const seconds = Number(response.headers()['retry-after']);
            assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60, 'Actual bounded publication Retry-After required');
            console.log(`P7 fixture respects actual publication Retry-After=${seconds}s once`);
            await delay(seconds * 1000);
            publication = publicationResponse();
            await page.getByRole('button', { name: 'Asignar al aula', exact: true }).click();
            response = await publication;
          }
          assert.equal(response.status(), 200, 'Publication mutation must be confirmed before expecting its notice');
          await page.getByText('Actividad asignada a P7 authoring classroom.', { exact: true }).waitFor();
          const safe = await api(student, 'GET', `/classrooms/${roomId}/activities/${before.id}`);
          assert.equal(safe.status, 200); assert.equal(safe.body.activity.questions.length, 3);
          for (const q of safe.body.activity.questions) {
            assert.equal(Object.hasOwn(q, 'scoringRule'), false);
            for (const option of q.options) assert.equal(Object.hasOwn(option, 'correct'), false);
          }
          await page.getByRole('button', { name: 'Volver a actividades', exact: true }).click();
        }
      });
      await check('real-session guards and persistence retain P3/P4/P6 boundaries; responsive selected Activities remains visible', async () => {
        await rejectSame(runtime.db, async () => api(student, 'POST', `/classrooms/${roomId}/activities`, { revision: (await detail()).revision, operation: { action: 'withdraw', id: assignment } }), 403);
        await rejectSame(runtime.db, () => change({ action: 'withdraw', id: '00000000-0000-4000-8000-000000000000' }), 403);
        const snapshot = (await api(page, 'GET', `/classrooms/${roomId}/activities`)).body;
        await runtime.restartData();
        assert.deepEqual((await api(page, 'GET', `/classrooms/${roomId}/activities`)).body, snapshot);
        await page.setViewportSize({ width: 320, height: 900 });
        await selectClassroomSection(page, 'activities', 'Actividades');
        const selected = await page.getByRole('navigation', { name: 'Secciones del aula', exact: true }).getByRole('button', { name: 'Actividades', exact: true }).evaluate(element => {
          const box = element.getBoundingClientRect(), parent = element.closest('nav').getBoundingClientRect();
          return { selected: element.getAttribute('aria-current'), visible: box.width > 0 && box.left >= parent.left - 1 && box.right <= parent.right + 1 && box.left >= 0 && box.right <= innerWidth };
        });
        assert.equal(selected.selected, 'page'); assert.equal(selected.visible, true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.screenshot({ path: join(scratch, 'activities-320.png'), fullPage: true });
        assert.deepEqual(errors, []);
        assert.equal((await api(page, 'POST', `/classrooms/${roomId}/archive`, { revision: (await detail()).revision, archived: true })).status, 200);
        await rejectSame(runtime.db, () => change({ action: 'create', type: 'ASSIGNMENT' }), 409);
        assert.equal((await api(student, 'GET', `/files/${instructions}/content`)).status, 200);
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});

test('ARQ-07 restores an authorized activity link across reload and browser history', { timeout: 330000 }, async () => {
  await withP4IntegrationRuntime(async runtime => {
    const { sessionTokenDigest } = await Promise.all([import("../.build/api/apps/api/src/modules/identity/domain/security/errors.js"),import("../.build/api/apps/api/src/modules/identity/domain/security/inputs.js"),import("../.build/api/apps/api/src/modules/identity/infrastructure/security/verifiers.js"),import("../.build/api/apps/api/src/modules/identity/infrastructure/security/configuration.js"),import("../.build/api/apps/api/src/modules/identity/infrastructure/security/passwords.js"),import("../.build/api/apps/api/src/modules/identity/infrastructure/security/sessions.js"),import("../.build/api/apps/api/src/modules/identity/presentation/session-cookies.js")]).then(([m0,m1,m2,m3,m4,m5,m6]) => Object.freeze({IdentitySecurityError: m0.IdentitySecurityError,validatePassword: m1.validatePassword,validateName: m1.validateName,validateBodyShape: m1.validateBodyShape,assertBodySize: m1.assertBodySize,generateVerifier: m2.generateVerifier,parseVerifier: m2.parseVerifier,accountTokenDigest: m2.accountTokenDigest,sessionTokenDigest: m2.sessionTokenDigest,readIdentityConfiguration: m3.readIdentityConfiguration,createPasswordService: m4.createPasswordService,IDENTITY_POLICY: m5.IDENTITY_POLICY,newSessionWindow: m5.newSessionWindow,sessionIsActive: m5.sessionIsActive,refreshSessionWindow: m5.refreshSessionWindow,sessionCookie: m6.sessionCookie,clearSessionCookie: m6.clearSessionCookie}));
    const teacher = randomUUID(), room = randomUUID(), unit = randomUUID(), topic = randomUUID(), token = randomBytes(32).toString('base64url');
    await runtime.db.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Docente','Fixture','fixture-only',now(),'teacher')`, [teacher, `${teacher}@example.test`]);
    await runtime.db.query(`INSERT INTO sessions(id,updated_at,user_id,token_hash,expires_at)
      VALUES($1,now(),$2,$3,now()+interval '1 hour')`, [randomUUID(), teacher, sessionTokenDigest(token)]);
    await runtime.db.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Aula enlace','Ciencias','A',2026,'UTC','explore',100000000)`, [room, teacher]);
    await runtime.db.query('INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,$3,0)', [unit, room, 'Unidad']);
    await runtime.db.query('INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,$4,0)', [topic, room, unit, 'Tema']);
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 320, height: 900 } });
      await context.addCookies([{ name: 'foxmind_session', value: token, url: runtime.origin, httpOnly: true, sameSite: 'Lax' }]);
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${runtime.origin}/mis-aulas`);
      const change = async operation => {
        const detail = await api(page, 'GET', `/classrooms/${room}`); assert.equal(detail.status, 200);
        const result = await api(page, 'POST', `/classrooms/${room}/activities`, { revision: detail.body.revision, operation });
        assert.equal(result.status, 200, operation.action);
        return result.body;
      };
      const { id } = await change({ action: 'create', type: 'ASSIGNMENT' });
      await change({ action: 'save', id, payload: { title: 'Actividad enlazada', unitId: unit, topicId: topic,
        instructions: 'Compará los ejemplos.', attachmentRequired: false, instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false } });
      await change({ action: 'publish', id });
      const target = `${runtime.origin}/mis-aulas?aula=${room}&actividad=${id}`;
      // Activity previews are pages in the approved UI, not dismissible dialogs.
      const preview = page.getByRole('region', { name: 'Vista previa docente', exact: true });
      await page.goto(target);
      await preview.waitFor();
      await preview.getByText('Compará los ejemplos.', { exact: true }).waitFor();
      await page.reload();
      await preview.waitFor();
      await preview.getByText('Compará los ejemplos.', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.getByRole('button', { name: 'Volver a actividades', exact: true }).click();
      await preview.waitFor({ state: 'hidden' });
      assert.equal(await page.locator('[data-classroom-tab="activities"]').isVisible(), true);
      await page.getByRole('region', { name: 'Actividades del aula', exact: true }).getByRole('heading', { name: 'Actividades', exact: true }).waitFor();
      await page.getByRole('article', { name: 'Actividad enlazada', exact: true }).waitFor();
      const exit = page.getByRole('button', { name: 'Mis aulas', exact: true });
      await exit.focus(); await exit.press('Enter');
      await page.waitForURL(`${runtime.origin}/mis-aulas`);
      await preview.waitFor({ state: 'hidden' });
      await page.goBack(); await page.waitForURL(target); await preview.waitFor();
      await page.goForward(); await page.waitForURL(`${runtime.origin}/mis-aulas`); await preview.waitFor({ state: 'hidden' });
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  }, { classrooms: true });
});
