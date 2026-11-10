import { startBrowserAttempt } from './helpers/browser-admission-step.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { withJourney, createActivity, openActivity, session, ok, request, rootOf,
  academicTables, academicHash, assertReadyFile, selectClassroomSection } from './p9-journey-helpers-current.mjs';
import { tableHash } from './p8-grading-helpers.mjs';
import { planPdf, openClassroom } from './p6-integration-helpers.mjs';
import { digest } from './p4-integration-helpers.mjs';

// Service fault cases use separate owned fixtures so earlier upload traffic cannot
// consume the next actor's admission budget before the intended fault is reached.
for (const isolatedService of ['storage', 'scanner']) {
test(`P9 first actual DB unsaved-answer and ${isolatedService} manual recovery`, { timeout: 330000 }, async () => {
  await withJourney(`service-recovery-${isolatedService}`, async world => {
    const { runtime, S, room, scratch } = world, page = S.page;
    const evidence = { events: [], uploads: [], snapshots: {} };
    const flush = () => writeFile(join(scratch, 'safe-service-recovery.json'), `${JSON.stringify(evidence, null, 2)}\n`);
    const event = (stage, data = {}) => { evidence.events.push({ at: new Date().toISOString(), stage, ...data }); };
    const baselineIds = (await runtime.db.query('SELECT id FROM files ORDER BY id')).rows.map(row => row.id);
    assert.ok(baselineIds.length > 0, 'Accepted baseline must not be vacuous');
    const baseline = async () => ({
      rows: (await runtime.db.query(`SELECT f.id,f.size_bytes::text,f.validation_status::text,f.scan_status::text,
        c.phase,c.digest,c.validated_digest,c.scanned_digest FROM files f JOIN file_custodies c ON c.file_id=f.id
        WHERE f.id=ANY($1::uuid[]) ORDER BY f.id`, [baselineIds])).rows,
      bytes: await Promise.all(baselineIds.map(async id => ({ id, digest: digest(await runtime.privateFileBytes(id)) }))),
    });
    const originalBaseline = await baseline();
    const custody = async id => (await runtime.db.query(`SELECT f.id,f.size_bytes::text,f.validation_status::text,
      f.scan_status::text,f.rejection_code,u.status::text AS upload_status,u.reserved_bytes::text,
      (u.reservation_released_at IS NOT NULL) AS released,c.phase,(c.operation_id IS NULL) AS operation_cleared,
      (c.lease_until IS NULL) AS lease_cleared,c.digest,c.validated_digest,c.scanned_digest
      FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id WHERE f.id=$1`, [id])).rows[0];
    try {
      evidence.ownedBefore = runtime.inspectServices(); evidence.bindingsBefore = runtime.inspectServiceBindings(); await flush();
      const questionnaire = await createActivity(world, 'QUESTIONNAIRE', { title: 'P9 database recovery answer' });
      await openClassroom(page, runtime.origin, `P9 ${world.label} classroom`);
      await selectClassroomSection(page, 'activities', 'Actividades');
      await page.getByRole('article', { name: questionnaire.title, exact: true }).getByRole('button', { name: `Abrir ${questionnaire.title}`, exact: true }).click();
      const start = await startBrowserAttempt(page, room.id, questionnaire.id, 12000, 'Responder actividad');
      let pending; assert.equal(start.status(), 200);
      const started = await start.json(); assert.ok(started.editor);
      const answerPath = `/api/v1${rootOf(room)}/attempts/${started.attempt.id}/answer`;
      const answerRequests = [], answerObserver = req => {
        if (new URL(req.url()).pathname === answerPath && req.method() === 'POST') answerRequests.push({ at: Date.now() });
      };
      page.on('request', answerObserver);
      const field = page.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true });
      const text = 'Unconfirmed recovery answer\nRetained locally until explicit retry.';
      const before = await academicHash(runtime.db);
      try {
        event('databasePause', runtime.pauseDatabase()); await flush();
        pending = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/csrf', { timeout: 20000 });
        await field.fill(text);
        const failed = await pending; evidence.csrfFailure = { status: failed.status(), code: (await failed.json()).error?.code };
        assert.equal(failed.status(), 503);
        const status = page.getByRole('article', { name: 'Pregunta 1', exact: true }).getByRole('status');
        await status.filter({ hasText: 'Error de guardado · cambios sin confirmar' }).waitFor({ timeout: 20000 });
        assert.equal(await field.inputValue(), text);
        await page.getByText('Las respuestas siguen en pantalla; no se confirmó su guardado.', { exact: false }).waitFor();
        assert.equal(await status.filter({ hasText: 'Guardado confirmado' }).count(), 0);
        assert.equal(answerRequests.length, 0, 'Fresh CSRF failure must prevent answer POST, not queue a write');
        evidence.unsaved = { retained: true, answerPostCount: answerRequests.length, status: await status.textContent() };
        await page.screenshot({ path: join(scratch, 'database-unsaved-error.png'), fullPage: true }); await flush();
      } finally { event('databaseResume', runtime.resumeDatabase()); await flush(); }
      // Error state is reached only after the failed refresh finishes. Never query observer SQL while paused.
      assert.equal(await academicHash(runtime.db), before, 'No queued academic write may escape after restoration');
      assert.equal(answerRequests.length, 0);
      assert.equal(await field.inputValue(), text, 'No reload may discard the dirty mounted value');
      pending = page.waitForResponse(r => new URL(r.url()).pathname === answerPath && r.request().method() === 'POST', { timeout: 20000 });
      const retryAt = Date.now(); await page.getByRole('button', { name: 'Reintentar guardado', exact: true }).click();
      const saved = await pending; assert.equal(saved.status(), 200); const confirmation = await saved.json();
      await page.getByRole('article', { name: 'Pregunta 1', exact: true }).getByRole('status').filter({ hasText: 'Guardado confirmado' }).waitFor();
      const persisted = await session(world, questionnaire);
      assert.equal(persisted.attempt.answers.find(a => a.questionId === started.activity.questions[0].id)?.text, text);
      assert.equal(persisted.attempt.revision, confirmation.revision);
      assert.ok(BigInt(confirmation.revision) > BigInt(started.attempt.revision));
      assert.equal(answerRequests.length, 1); assert.ok(answerRequests[0].at >= retryAt);
      evidence.database = { unchangedHash: before, manualPostCount: answerRequests.length, revision: confirmation.revision, persisted: true };
      page.off('request', answerObserver);
      await page.getByRole('button', { name: 'Volver a actividades', exact: true }).click();

      const protectedAcademic = academicTables.filter(table => !['files', 'uploads', 'file_custodies'].includes(table));
      for (const service of [isolatedService]) {
        const title = service[0].toUpperCase() + service.slice(1);
        const activity = await createActivity(world, 'ASSIGNMENT', { title: `P9 ${service} upload recovery`, attachmentRequired: true });
        pending = page.waitForResponse(r => r.url().endsWith(`/${activity.id}/start`) && r.request().method() === 'POST');
        await openActivity(page, runtime.origin, { ...room, name: `P9 ${world.label} classroom` }, activity);
        const opened = await pending; assert.equal(opened.status(), 200); const data = await opened.json(); assert.ok(data.editor);
        const bytes = await planPdf(`Meaningful small ${service} recovery laboratory worksheet`), name = `${service}-recovery.pdf`;
        const region = page.getByRole('region', { name: 'Archivos y entrega del trabajo práctico', exact: true });
        await region.getByLabel('Seleccionar archivo del trabajo', { exact: true }).setInputFiles({ name, mimeType: 'application/pdf', buffer: bytes });
        const previousAcademic = await tableHash(runtime.db, protectedAcademic);
        let failedId;
        try {
          event(`${service}Pause`, runtime[`pause${title}`]()); await flush();
          pending = page.waitForResponse(r => /\/files\/[^/]+\/content$/.test(new URL(r.url()).pathname) && r.request().method() === 'PUT', { timeout: 45000 });
          const began = Date.now(); await region.getByRole('button', { name: 'Subir archivo privado', exact: true }).click();
          const failed = await pending, body = await failed.json(); failedId = /\/files\/([^/]+)\/content$/.exec(new URL(failed.url()).pathname)[1];
          evidence.uploads.push({ service, id: failedId, status: failed.status(), code: body.error?.code, retryAfter:failed.headers()['retry-after']??null, elapsedMs: Date.now() - began });
          await flush(); assert.equal(failed.status(), 503); assert.equal(body.error?.code, 'SERVICE_UNAVAILABLE');
          await region.getByText('Error · carga no confirmada', { exact: false }).waitFor({ timeout: 20000 });
          await region.getByRole('button', { name: `Quitar ${name}`, exact: true }).waitFor();
          assert.equal(await region.getByRole('link', { name: `Descargar ${name}`, exact: true }).count(), 0);
          assert.equal(await region.getByRole('button', { name: 'Revisar entrega', exact: true }).isDisabled(), true);
          const row = await custody(failedId); evidence.snapshots[`${service}Failure`] = row; await flush();
          assert.equal(row.upload_status, 'UPLOADING'); assert.equal(row.scan_status, 'ERROR');
          assert.equal(row.validation_status, service === 'storage' ? 'PENDING' : 'APPROVED');
          assert.equal(row.rejection_code, 'PROCESSING_UNAVAILABLE'); assert.equal(row.phase, 'reserved');
          assert.equal(row.operation_cleared, true); assert.equal(row.lease_cleared, true);
          assert.equal(row.released, false); assert.equal(row.reserved_bytes, String(bytes.length));
          const status = await ok(page, 'GET', `/files/${failedId}`); assert.equal(status.ready, false);
          const download = await request(page, 'GET', `/files/${failedId}/content`);
          assert.equal(download.status, 409); assert.equal(download.body.error.code, 'FILE_NOT_READY');
          assert.equal(await tableHash(runtime.db, protectedAcademic), previousAcademic);
          await page.screenshot({ path: join(scratch, `${service}-upload-error.png`), fullPage: true });
        } finally { event(`${service}Resume`, runtime[`resume${title}`]()); await flush(); }
        assert.deepEqual(await baseline(), originalBaseline, 'Accepted baseline files/bytes must survive service failure');
        pending = page.waitForResponse(r => r.url().endsWith('/attachments-remove') && r.request().method() === 'POST');
        await region.getByRole('button', { name: `Quitar ${name}`, exact: true }).click();
        assert.equal((await pending).status(), 200);
        await region.getByRole('button', { name: `Quitar ${name}`, exact: true }).waitFor({ state: 'detached' });
        const cancelled = await custody(failedId); assert.equal(cancelled.upload_status, 'CANCELLED');
        assert.equal(cancelled.released, false); assert.equal(cancelled.reserved_bytes, String(bytes.length));
        evidence.snapshots[`${service}Cancelled`] = cancelled; await flush();
        // PracticalAttempt retains the local selection. Each explicit upload creates a new real intent.
        pending = page.waitForResponse(r => /\/files\/[^/]+\/content$/.test(new URL(r.url()).pathname) && r.request().method() === 'PUT', { timeout: 45000 });
        await region.getByRole('button', { name: 'Subir archivo privado', exact: true }).click();
        const recovered = await pending, ready = await recovered.json(); assert.equal(recovered.status(), 200); assert.equal(ready.ready, true);
        assert.notEqual(ready.id, failedId); await assertReadyFile(runtime, ready.id, bytes.length, digest(bytes));
        await region.getByRole('link', { name: `Descargar ${name}`, exact: true }).waitFor();
        const download = await request(page, 'GET', `/files/${ready.id}/content`);
        assert.equal(download.status, 200); assert.equal(download.length, bytes.length); assert.equal(download.digest, digest(bytes));
        const current = await session(world, activity);
        assert.deepEqual(current.attempt.attachments.map(a => ({ id: a.id, ready: a.ready, selected: a.selected })), [{ id: ready.id, ready: true, selected: true }]);
        assert.equal(await region.getByRole('button', { name: 'Revisar entrega', exact: true }).isEnabled(), true);
        assert.equal(await region.getByRole('alert').count(), 0);
        evidence.snapshots[`${service}Recovered`] = await custody(ready.id);
        assert.deepEqual(await baseline(), originalBaseline); await flush();
        await page.getByRole('button', { name: 'Volver a actividades', exact: true }).click();
      }
      evidence.ownedAfter = runtime.inspectServices(); evidence.bindingsAfter = runtime.inspectServiceBindings();
      assert.deepEqual(evidence.ownedAfter, evidence.ownedBefore);
      assert.deepEqual(evidence.bindingsAfter, evidence.bindingsBefore);
      evidence.outcome = 'FIRST_SERVICE_FAILURE_RECOVERY_VERIFIED'; await flush();
    } catch (error) {
      evidence.failure = { name: error.name, code: error.code ?? 'SERVICE_RECOVERY_ASSERTION_FAILED' }; await flush(); throw error;
    } finally {
      runtime.resumeDatabase(); runtime.resumeStorage(); runtime.resumeScanner();
      evidence.finalOwned = runtime.inspectServices(); await flush();
    }
  });
});
}
