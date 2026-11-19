import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium, expect } from '@playwright/test';
import { withTeacherSupportRuntime } from '../scripts/teacher-support-test-runtime.mjs';
import { api } from './p4-integration-helpers.mjs';
import { selectClassroomSection } from './p8-current-ui-helpers.mjs';
import { seedPlan } from './helpers/plan-fixture.mjs';

const text = 'Moví la lámpara hacia la izquierda para destacar la textura.';
const instructions = 'Explicá qué cambiaste y por qué.';
const feedback = 'Explicaste el efecto. En la próxima, compará con otra posición.';
const originalHome = '/inicio';
const rubric = [
  { name: 'Decisión de iluminación', description: 'Identifica la dirección de la luz.', weight: 50 },
  { name: 'Explicación del efecto', description: 'Explica qué detalle se hace más visible.', weight: 50 },
];
const rubricMarks = [{ criterionIndex: 0, score: '10' }, { criterionIndex: 1, score: '6.70' }];

async function seedUser(database, firstName, role) {
  const id = randomUUID(), email = `${id}@example.test`;
  await database.query(`INSERT INTO users
    (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,$3,'Ejemplo','synthetic',now(),$4)`, [id, email, firstName, role]);
  return { id };
}

async function seedAccount(database, origin, browser, firstName, role, width) {
  const { id } = await seedUser(database, firstName, role);
  const token = randomBytes(32).toString('base64url');
  const { sessionTokenDigest } = await import('../.build/api/apps/api/src/modules/identity/accounts/infrastructure/security/verifiers.js');
  await database.query(`INSERT INTO sessions(id,updated_at,user_id,token_hash,expires_at)
    VALUES($1,now(),$2,$3,now()+interval '1 hour')`, [randomUUID(), id, sessionTokenDigest(token)]);
  const context = await browser.newContext({ viewport: { width, height: 880 }, reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'foxmind_session', value: token, url: origin, httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.goto(origin + '/sign-in');
  return { id, page };
}

async function checked(page, method, path, body, headers) {
  const response = await api(page, method, path, body, headers);
  assert.equal(response.status, 200, `${method} ${path} returned ${response.body?.error?.code ?? response.status}`);
  return response.body;
}

async function seedClassroom(database, teacher, name, students) {
  const id = randomUUID();
  await database.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
    VALUES($1,now(),$2,$3,'Arte','A',2026,'UTC','explore',100000000)`, [id, teacher.id, name]);
  for (const student of students) {
    const enrollment = randomUUID();
    await database.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, id, student.id]);
    await database.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method)
      VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), enrollment, id]);
  }
  const query = database.query.bind(database);
  await seedPlan(query, id, { action: 'addUnit', name: 'Composición' });
  const { rows: [{ id: unitId }] } = await query('SELECT id FROM units WHERE classroom_id=$1', [id]);
  await seedPlan(query, id, { action: 'addTopic', unitId, name: 'Iluminación' });
  const { rows: [{ id: topicId }] } = await query('SELECT id FROM topics WHERE unit_id=$1', [unitId]);
  return { id, name, unitId, topicId, path: `/classrooms/${id}` };
}

async function publish(teacher, room, title, evaluationRubric = []) {
  const change = async operation => checked(teacher, 'POST', room.path + '/activities', {
    revision: (await checked(teacher, 'GET', room.path)).revision, operation,
  });
  const { id } = await change({ action: 'create', type: 'ASSIGNMENT' });
  await change({ action: 'save', id, payload: {
    title, unitId: room.unitId, topicId: room.topicId, instructions,
    attachmentRequired: false, instructionFileIds: [], materialIds: [], deadline: null, allowLate: false, questions: [], evaluationRubric,
  } });
  await change({ action: 'publish', id });
  return id;
}

async function deliverAndGrade(teacher, student, room, activityId, { publishedFeedback = feedback, score = '8.35', marks } = {}) {
  const start = await checked(student, 'POST', `${room.path}/activities/${activityId}/start`, {});
  const attempt = `${room.path}/attempts/${start.attempt.id}`;
  const editor = { 'x-attempt-editor': start.editor.token, 'x-attempt-epoch': start.editor.epoch };
  const saved = await checked(student, 'POST', attempt + '/practical-response', {
    revision: start.attempt.revision, text,
  }, editor);
  const receipt = await checked(student, 'POST', attempt + '/submit-practical', { revision: saved.revision, confirm: true }, editor);
  const grade = await checked(teacher, 'POST', attempt + '/grading', {
    revision: (await checked(teacher, 'GET', room.path)).revision, overallGrade: score, overallFeedback: publishedFeedback, questions: [], ...(marks ? { rubricMarks: marks } : {}),
  });
  await checked(teacher, 'POST', attempt + '/publish-grade', { revision: grade.revision, confirm: true });
  return receipt;
}

async function expectNoOverflow(locator) {
  assert.equal(await locator.evaluate(element => element.scrollWidth > element.clientWidth + 1), false);
}

test('Acompañamiento real desde Inicio y Estudiantes con controles de acceso y retiro', { timeout: 160000 }, async t => {
  await withTeacherSupportRuntime(async ({ origin, apiOrigin, database }) => {
    const browser = await chromium.launch({ headless: true });
    const errors = [];
    try {
      const teacher = await seedAccount(database, origin, browser, 'Belén', 'teacher', 1350);
      const student = await seedAccount(database, origin, browser, 'Tomás', 'student', 390);
      const outsider = await seedAccount(database, origin, browser, 'Diana', 'teacher', 1350);
      const classmates = [];
      for (const name of ['Irene', 'Francisco', 'Julia']) classmates.push(await seedUser(database, name, 'student'));
      const room = await seedClassroom(database, teacher, 'Taller de iluminación', [student, ...classmates]);
      const otherRoom = await seedClassroom(database, teacher, 'Taller sin actividad', [student]);
      const foreignRoom = await seedClassroom(database, outsider, 'Aula ajena', [student]);
      for (const { page } of [teacher, student, outsider]) page.on('pageerror', error => errors.push(error.message));
      const delivered = await publish(teacher.page, room, 'Uso de la luz', rubric);
      const receipt = await deliverAndGrade(teacher.page, student.page, room, delivered, { marks: rubricMarks });
      const attemptId = receipt.id;
      const second = await publish(teacher.page, room, 'Composición y contraste');
      await deliverAndGrade(teacher.page, student.page, room, second, { publishedFeedback: null, score: '6' });
      const pending = await publish(teacher.page, room, 'Análisis de sombras');
      // Advance fixture deadlines into the past after real publication and submission.
      await database.query(`UPDATE activities SET deadline_at=clock_timestamp()-interval '2 days'
        WHERE id=ANY($1::uuid[])`, [[delivered, second, pending]]);
      const listPath = '/classrooms/teacher-support';
      const recordPath = `${room.path}/members/${student.id}/support`;
      const evidencePath = recordPath + '/evidence/' + attemptId;

      const scratch = await mkdtemp(join(tmpdir(), 'foxmind-support-e2e-evidence-'));
      console.log(`Semáforo · capturas con datos sintéticos: ${scratch}`);

      await t.test('backend and Next admit only the current owner and scope attempt evidence to its student and classroom', async () => {
        const result = await fetch(apiOrigin + '/api/v1' + listPath);
        assert.equal(result.status, 401, 'La ruta de acompañamiento tiene que autenticar');
        const list = await api(teacher.page, 'GET', listPath);
        assert.equal(list.status, 200);
        assert.deepEqual(list.body.counts, { high: 3, medium: 1, low: 0 });
        assert.deepEqual(list.body.items.map(item => item.priority), ['high', 'high', 'high', 'medium']);
        assert.ok(list.body.classrooms.every(classroom => classroom.id !== foreignRoom.id));
        const evidence = await api(teacher.page, 'GET', evidencePath);
        assert.equal(evidence.status, 200);
        assert.ok(Number.isFinite(Date.parse(receipt.submittedAt)));
        assert.equal(evidence.body.submittedAt, receipt.submittedAt, 'La entrega conserva la fecha del recibo del estudiante');
        assert.equal(evidence.headers['cache-control'], 'no-store');
        assert.ok(JSON.stringify(evidence.body).includes(text));
        assert.ok(!JSON.stringify(evidence.body).includes('example.test'));
        for (const path of [recordPath, evidencePath]) {
          for (const actor of [student, outsider]) {
            const denied = await api(actor.page, 'GET', path);
            assert.ok([403, 404].includes(denied.status));
            assert.equal(JSON.stringify(denied.body).includes(text), false);
          }
        }
        for (const path of [`${room.path}/members/${classmates[0].id}/support/evidence/${attemptId}`,
          `${otherRoom.path}/members/${student.id}/support/evidence/${attemptId}`,
          `${foreignRoom.path}/members/${student.id}/support`]) {
          const denied = await api(teacher.page, 'GET', path);
          assert.ok([403, 404].includes(denied.status));
          assert.equal(JSON.stringify(denied.body).includes(text), false);
        }
        const filtered = await api(teacher.page, 'GET', listPath + '?classroomId=' + foreignRoom.id);
        assert.ok([403, 404].includes(filtered.status));
      });

      await t.test('desktop dashboard filters, opens the shared record, reads the evidence and restores both focus targets', async () => {
        const page = teacher.page;
        await page.goto(origin + originalHome);
        const widget = page.getByRole('region', { name: 'Semáforo de acompañamiento' });
        const originButton = widget.getByRole('button', { name: 'Ver ficha de Tomás Ejemplo en Taller de iluminación' });
        const filter = widget.getByRole('button', { name: 'Filtrar por aula' });
        await expect(filter).toHaveText('Todas mis aulas');
        const expand = widget.getByRole('button', { name: 'Ver todos' });
        await expect(expand).toBeVisible({ timeout: 12000 });
        assert.ok(await expand.evaluate(button => button.getBoundingClientRect().height >= 44));
        await expand.click();
        await expect(originButton).toBeVisible();
        await expect(widget.getByText('Sin evidencia suficiente')).toHaveCount(0);
        assert.ok(await originButton.evaluate(button => {
          const nameLabel = button.closest('article').querySelector('strong');
          const name = nameLabel.getBoundingClientRect();
          const classroom = nameLabel.nextElementSibling.getBoundingClientRect();
          return classroom.top >= name.bottom - 1 || classroom.left >= name.right + 4;
        }), 'El nombre y aula se distinguen aunque compartan fila');
        await widget.scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(scratch, 'desktop-dashboard.png'), animations: 'disabled' });
        await filter.click();
        await expect(page.getByRole('dialog', { name: 'Filtrar por aula' })).toBeVisible();
        await page.screenshot({ path: join(scratch, 'desktop-classroom-picker.png'), animations: 'disabled' });
        await page.getByRole('dialog').getByRole('button', { name: /^Taller sin actividad/ }).click();
        await expect(widget.getByText(/no hay estudiantes con prioridad asignada/i)).toBeVisible();
        await expect(originButton).toHaveCount(0);
        await expect(filter).toHaveText('Taller sin actividad');
        await filter.click();
        await page.getByRole('dialog').getByRole('button', { name: /^Taller de iluminación/ }).click();
        await widget.getByRole('button', { name: 'Ver todos' }).click();
        await originButton.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByRole('heading', { name: 'Tomás Ejemplo' })).toBeVisible();
        await expect(dialog.getByText('Prioridad media')).toBeVisible();
        await expect(dialog.getByText('Análisis de sombras', { exact: false }).first()).toBeVisible();
        await expect(dialog.getByText('7,18', { exact: false }).first()).toBeVisible();
        await expect(dialog.getByText(/Decisión de iluminación · Puntaje máximo/)).toBeVisible();
        await expect(dialog.getByText(/Explicación del efecto · Menor puntaje/)).toBeVisible();
        await expectNoOverflow(dialog);
        await page.screenshot({ path: join(scratch, 'desktop-record.png'), animations: 'disabled' });
        await dialog.getByRole('button', { name: 'Leer entrega' }).first().click();
        await expect(dialog.getByText(instructions, { exact: true })).toBeVisible();
        assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true, 'El foco se mantiene dentro de la lectura');
        await expect(dialog.getByText(text, { exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: 'Volver a la ficha' }).click();
        await expect(dialog.getByRole('button', { name: 'Leer entrega' }).first()).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(originButton).toBeFocused();
        await expect(filter).toHaveText('Taller de iluminación');
      });

      await t.test('mobile classroom uses the same fiche and student home omits the teacher widget', async () => {
        const page = teacher.page;
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${origin}/mis-aulas?aula=${room.id}`);
        await selectClassroomSection(page, 'members', 'Estudiantes');
        const row = page.getByRole('listitem').filter({ hasText: 'Tomás Ejemplo' });
        await row.getByRole('button', { name: 'Ver ficha', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByRole('heading', { name: 'Tomás Ejemplo' })).toBeVisible();
        await expect(dialog.getByRole('region', { name: 'Notas por actividad' }).getByRole('meter')).toHaveCount(2);
        await expectNoOverflow(dialog);
        await page.screenshot({ path: join(scratch, 'mobile-record.png'), animations: 'disabled' });
        await dialog.getByRole('button', { name: 'Leer entrega' }).first().click();
        await expect(dialog.getByText(text, { exact: true })).toBeVisible();
        await expectNoOverflow(dialog);
        await page.screenshot({ path: join(scratch, 'mobile-evidence.png'), animations: 'disabled' });
        await page.setViewportSize({ width: 320, height: 760 });
        await expectNoOverflow(dialog);
        await dialog.getByRole('button', { name: 'Volver a la ficha' }).click();
        await expect(dialog.getByRole('heading', { name: 'Tomás Ejemplo' })).toBeVisible();
        await expectNoOverflow(dialog);
        await page.keyboard.press('Escape');
        await student.page.goto(origin + originalHome);
        await expect(student.page.getByRole('heading', { name: /Tomás/ }).first()).toBeVisible();
        await expect(student.page.getByRole('region', { name: 'Semáforo de acompañamiento' })).toHaveCount(0);
      });

      await t.test('extending a deadline removes its pending reason on the next read', async () => {
        const roomState = await checked(teacher.page, 'GET', room.path);
        const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
        await checked(teacher.page, 'POST', room.path + '/activities', {
          revision: roomState.revision,
          operation: { action: 'deadline', id: pending, deadline: { local: future }, allowLate: false },
        });
        const after = await checked(teacher.page, 'GET', recordPath);
        assert.equal(after.priority, 'low');
        assert.deepEqual(after.pending, []);
        assert.equal(after.performance.average, '7.18');
      });

      await t.test('membership removal on another tab invalidates the open record and cleans the dashboard', async () => {
        const page = teacher.page;
        await page.goto(origin + originalHome);
        const widget = page.getByRole('region', { name: 'Semáforo de acompañamiento' });
        await widget.getByRole('button', { name: 'Ver todos' }).click();
        await widget.getByRole('button', { name: 'Ver ficha de Tomás Ejemplo en Taller de iluminación' }).click();
        const dialog = page.getByRole('dialog');
        const read = dialog.getByRole('button', { name: 'Leer entrega' }).first();
        await expect(read).toBeVisible();
        const otherTab = await page.context().newPage();
        try {
          await otherTab.goto(origin + originalHome);
          await checked(otherTab, 'POST', room.path + `/members/${student.id}/remove`, {});
        } finally { await otherTab.close(); }
        await read.click();
        await expect(dialog.getByRole('alert')).toContainText('ya no está disponible');
        await expect(dialog.getByText(text, { exact: true })).toHaveCount(0);
        for (const path of [recordPath, evidencePath]) {
          const response = await api(page, 'GET', path);
          assert.ok([403, 404].includes(response.status));
          assert.equal(JSON.stringify(response.body).includes(text), false);
        }
        await page.keyboard.press('Escape');
        await expect(widget.getByText('Tomás Ejemplo')).toHaveCount(0);
        assert.deepEqual(errors, []);
      });
    } finally {
      await browser.close();
    }
  });
});
