import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium, expect } from '@playwright/test';
import { withTeacherSupportRuntime } from '../scripts/teacher-support-test-runtime.mjs';
import { selectClassroomSection } from './p8-current-ui-helpers.mjs';
import { accepted, draftText, privateMarker, request, reportedImprovement, reportedStrength, sharingWorld, strategyText, writingFixture, writtenText } from './helpers/teacher-support-sharing-fixture.mjs';

async function openRecord(teacher, origin, classroom) {
  const { page } = teacher;
  await page.goto(`${origin}/mis-aulas?aula=${classroom.id}`);
  await selectClassroomSection(page, 'members', 'Estudiantes');
  await page.getByRole('button', { name: 'Ver ficha', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Tomás Ejemplo' })).toBeVisible();
  return dialog;
}

async function rejectWithoutValue(actor, method, path, body) {
  const response = await request(actor, method, path, body);
  assert.ok([400, 401, 403, 404, 409].includes(response.status), `${method} ${path} must reject an invalid scope`);
  const payload = JSON.stringify(response.body);
  for (const value of [privateMarker, writtenText, strategyText.trim()]) assert.ok(!payload.includes(value));
}

const correctedStrategy = 'Primero hago un esquema y después busco una idea para cada parte.';

test('Análisis de escritura a pedido y estrategia compartida por el estudiante en FoxMind real', { timeout: 190000 }, async t => {
  const fixture = writingFixture();
  await withTeacherSupportRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    try {
      const { origin, database } = runtime;
      const { teacher, student, otherTeacher, otherStudent, classroom, otherClassroom, folder, attemptId,
        recordPath, writingPath, activityId, pendingId, pending } = await sharingWorld(runtime, browser);
      const errors = [];
      for (const { page } of [teacher, student, otherTeacher, otherStudent]) page.on('pageerror', error => errors.push(error.message));
      const output = await mkdtemp(join(tmpdir(), 'foxmind-support-sharing-evidence-'));
      console.log(`Análisis y estrategia · capturas con datos sintéticos: ${output}`);
      const originalQuota = () => accepted(teacher, 'GET', '/ai-quota');
      const evidencePath = writingPath + '/evidence/' + attemptId;
      const foreignRecord = `${otherClassroom.path}/members/${student.id}/support`;
      const safeStrategy = (actor, method, body) => accepted(actor, method, folder.sharePath, body);
      let initialRecord, originalShare;

      await t.test('Oferta de análisis sin despacho ni consumo al consultar', async () => {
        initialRecord = await accepted(teacher, 'GET', recordPath);
        const result = await request(teacher, 'GET', writingPath);
        assert.equal(result.status, 200);
        assert.equal(result.headers['cache-control'], 'no-store');
        const value = result.body;
        assert.equal(value.state, 'AVAILABLE');
        assert.equal(value.report, null);
        assert.deepEqual(fixture.calls, []);
        assert.equal((await originalQuota()).consumedMicrousd, 0);
        for (const actor of [student, otherTeacher]) {
          await rejectWithoutValue(actor, 'GET', writingPath);
          await rejectWithoutValue(actor, 'POST', writingPath, {});
          await rejectWithoutValue(actor, 'GET', evidencePath);
        }
        assert.deepEqual(fixture.calls, []);
      });

      await t.test('Una acción docente genera análisis citando la entrega y carga una operación sólo a su cuota', async () => {
        await teacher.page.goto(origin + '/inicio');
        const widget = teacher.page.getByRole('region', { name: 'Semáforo de acompañamiento' });
        await widget.getByRole('button', { name: 'Ver ficha de Tomás Ejemplo en Taller de arte' }).click();
        const dialog = teacher.page.getByRole('dialog');
        await dialog.getByRole('button', { name: 'Análisis de escritura', exact: true }).click();
        await expect(dialog.getByRole('heading', { name: 'Análisis de escritura', exact: true })).toBeVisible();
        assert.equal(fixture.calls.length, 0);
        await dialog.getByRole('button', { name: 'Generar análisis', exact: true }).click();
        await expect(dialog.getByText(reportedStrength, { exact: true })).toBeVisible({ timeout: 12000 });
        await expect(dialog.getByText(reportedImprovement, { exact: true })).toBeVisible();
        for (const name of ['Volver a la ficha', 'Cerrar ficha']) {
          assert.ok(await dialog.getByRole('button', { name, exact: true }).evaluate(button => button.getBoundingClientRect().height >= 44),
            `${name} conserva una superficie de interacción de 44 px desde Inicio`);
        }
        await teacher.page.screenshot({ path: join(output, 'writing-analysis.png'), animations: 'disabled' });
        const ready = await accepted(teacher, 'GET', writingPath);
        assert.equal(ready.state, 'READY');
        assert.deepEqual(ready.report.strengths[0].sources, [{ activityId, attemptId, title: 'Luz lateral' }]);
        const calls = fixture.calls.map(call => call.phase);
        assert.deepEqual(calls, ['count', 'generate']);
        assert.deepEqual(fixture.calls[1].evidence.activities.map(item => item.ref), ['A1']);
        const serialized = JSON.stringify(fixture.calls[1].evidence);
        assert.ok(serialized.includes(writtenText));
        for (const value of [student.id, student.email, teacher.id, folder.id, privateMarker, draftText]) assert.ok(!serialized.includes(value));
        const quota = await originalQuota();
        assert.equal(quota.subjectId, teacher.id);
        assert.equal(quota.reservedMicrousd, 0);
        assert.ok(quota.consumedMicrousd > 0);
        assert.equal(quota.tools.reduce((total, tool) => total + tool.chargedOperations, 0), 1);
        assert.equal((await accepted(student, 'GET', '/ai-quota')).consumedMicrousd, 0);
        const citation = dialog.getByRole('button', { name: /^Leer entrega.*Luz lateral/ }).last();
        await citation.click();
        await expect(dialog.getByText(writtenText, { exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: 'Volver al análisis' }).click();
        await expect(citation).toBeFocused();
        await teacher.page.keyboard.press('Escape');
        const replay = await request(teacher, 'POST', writingPath, {});
        assert.ok([200, 202].includes(replay.status));
        assert.deepEqual(fixture.calls.map(call => call.phase), calls);
        assert.deepEqual((await originalQuota()).tools, quota.tools);
      });

      await t.test('El estudiante confirma el texto exacto en móvil y limita la vista al docente del aula vinculada', async () => {
        assert.deepEqual(await safeStrategy(student, 'GET'), { strategy: null });
        const privateFolder = await accepted(student, 'GET', folder.path);
        assert.ok(JSON.stringify(privateFolder).includes(privateMarker));
        for (const actor of [teacher, otherTeacher, otherStudent]) {
          await rejectWithoutValue(actor, 'GET', folder.path);
          await rejectWithoutValue(actor, 'GET', folder.sharePath);
          await rejectWithoutValue(actor, 'PUT', folder.sharePath, { classroomId: classroom.id, text: strategyText });
        }
        await rejectWithoutValue(student, 'PUT', folder.sharePath, { classroomId: otherClassroom.id, text: strategyText });
        await student.page.goto(`${origin}/carpetas-de-estudio/${folder.id}`);
        await student.page.getByRole('button', { name: 'Opciones de la carpeta' }).click();
        await student.page.getByRole('button', { name: 'Compartir estrategia' }).click();
        const dialog = student.page.getByRole('dialog', { name: 'Compartir una estrategia' });
        await dialog.getByLabel('Texto de la estrategia').fill(strategyText);
        await dialog.getByRole('radio', { name: 'Docente de Taller de arte' }).check();
        await dialog.getByRole('button', { name: 'Revisar texto' }).click();
        assert.deepEqual(await safeStrategy(student, 'GET'), { strategy: null });
        const preview = dialog.getByText(strategyText.trim(), { exact: true });
        await expect(preview).toBeVisible();
        assert.equal(await preview.textContent(), strategyText);
        await student.page.setViewportSize({ width: 320, height: 760 });
        assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1));
        await student.page.setViewportSize({ width: 390, height: 850 });
        await student.page.screenshot({ path: join(output, 'strategy-review-mobile.png'), animations: 'disabled' });
        await dialog.getByRole('button', { name: 'Confirmar y compartir' }).click();
        await expect.poll(async () => (await safeStrategy(student, 'GET')).strategy?.text).toBe(strategyText);
        originalShare = (await safeStrategy(student, 'GET')).strategy;
        const record = await accepted(teacher, 'GET', recordPath);
        assert.deepEqual(record.sharedStrategies, [{ id: originalShare.id, text: strategyText }]);
        assert.equal(record.priority, initialRecord.priority);
        for (const value of [folder.id, privateMarker]) assert.ok(!JSON.stringify(record).includes(value));
        const other = await accepted(otherTeacher, 'GET', foreignRecord);
        assert.deepEqual(other.sharedStrategies, []);
        const fiche = await openRecord(teacher, origin, classroom);
        await expect(fiche.getByRole('heading', { name: /Estrategia compartida por el estudiante/ })).toBeVisible();
        await expect(fiche.getByText(strategyText.trim(), { exact: true })).toBeVisible();
        await teacher.page.screenshot({ path: join(output, 'teacher-shared-strategy.png'), animations: 'disabled' });
      });

      await t.test('El retiro y el desvínculo revocan acceso, y un retiro obsoleto respeta el texto nuevo', async () => {
        await student.page.bringToFront();
        const changed = (await safeStrategy(student, 'PUT', { classroomId: classroom.id, text: correctedStrategy })).strategy;
        assert.notEqual(changed.id, originalShare.id);
        assert.equal((await request(student, 'DELETE', folder.sharePath + '/' + originalShare.id)).status, 409);
        assert.deepEqual((await accepted(teacher, 'GET', recordPath)).sharedStrategies, [{ id: changed.id, text: correctedStrategy }]);
        await student.page.reload();
        await student.page.getByRole('button', { name: 'Opciones de la carpeta' }).click();
        await student.page.getByRole('button', { name: 'Compartir estrategia' }).click();
        const dialog = student.page.getByRole('dialog', { name: 'Compartir una estrategia' });
        await dialog.getByRole('button', { name: 'Retirar estrategia' }).click();
        await dialog.getByRole('button', { name: 'Confirmar retiro' }).click();
        await expect.poll(async () => (await safeStrategy(student, 'GET')).strategy).toBe(null);
        assert.deepEqual((await accepted(teacher, 'GET', recordPath)).sharedStrategies, []);
        await teacher.page.bringToFront();
        await teacher.page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await expect(teacher.page.getByRole('dialog').getByRole('heading', { name: 'Estrategia compartida por el estudiante' })).toHaveCount(0);
        await safeStrategy(student, 'PUT', { classroomId: classroom.id, text: strategyText });
        const revision = (await accepted(student, 'GET', folder.path)).folder.revision;
        const updated = await accepted(student, 'PATCH', folder.path, { revision, linkedClassroomId: null });
        await accepted(student, 'PATCH', folder.path, { revision: updated.folder.revision, linkedClassroomId: classroom.id });
        assert.deepEqual(await safeStrategy(student, 'GET'), { strategy: null });
        assert.deepEqual((await accepted(teacher, 'GET', recordPath)).sharedStrategies, []);
        assert.equal((await accepted(student, 'GET', '/ai-quota')).consumedMicrousd, 0);
      });

      await t.test('Al confirmar otra entrega se invalida el análisis y se mantiene el progreso académico', async () => {
        const current = await accepted(teacher, 'GET', classroom.path);
        const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
        await accepted(teacher, 'POST', classroom.path + '/activities', {
          revision: current.revision, operation: { action: 'deadline', id: pendingId, deadline: { local: future }, allowLate: false },
        });
        await accepted(student, 'POST', pending.path + '/submit-practical', { revision: pending.revision, confirm: true }, pending.headers);
        const stale = await accepted(teacher, 'GET', writingPath);
        assert.ok(['STALE', 'INSUFFICIENT'].includes(stale.state));
        assert.equal(stale.report, null);
        await rejectWithoutValue(teacher, 'GET', evidencePath);
        const record = await accepted(teacher, 'GET', recordPath);
        assert.equal(record.studentId, student.id);
        assert.equal(fixture.calls.filter(call => call.phase === 'generate').length, 1);
        assert.equal((await database.query('SELECT count(*) AS total FROM ai_monthly_reservations WHERE owner_id=$1', [teacher.id])).rows[0].total, '1');
        assert.deepEqual(errors, []);
      });
    } finally {
      await browser.close();
    }
  }, fixture.runtimeOptions);
});
