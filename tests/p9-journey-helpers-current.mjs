// Current UI adapter of questionnaireJourney from the frozen P9 historical helper.
// The historical helper and its fixed SHA remain unchanged.
// Adapts only current UI disclosures, confirmation, receipt, published grade and question-score presentation.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account } from './p4-integration-helpers.mjs';
import { classroom, openClassroom } from './p6-integration-helpers.mjs';
import { startBrowserAttempt } from './helpers/browser-admission-step.mjs';
import { rootOf, inviteExplicitly, createActivity, ok, openActivity, session, rejectUnchanged,
  request, editorHeaders, academicHash, assertPublishedQuestions } from './p9-journey-helpers.mjs';
export * from './p9-journey-helpers.mjs';

/** A new real account/captured email and owned disposable fixture for each coherent journey. */
export async function withJourney(label, run, { peer = false, classroomQuotaBytes } = {}) {
  const options = { classrooms: true, ...(classroomQuotaBytes === undefined ? {} : { classroomQuotaBytes }) };
  return withP4IntegrationRuntime(async runtime => {
    const scratch = await mkdtemp(join(tmpdir(), `foxmind-p9-${label}-`));
    console.log(`P9 ${label} retained evidence: ${scratch}`);
    const browser = await chromium.launch({ headless: true }), pages = [], errors = [], responses = [], pendingResponses = new Set();
    const observe = page => {
      const index = pages.length; pages.push(page);
      page.setDefaultTimeout(12000); page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => {
        const path = new URL(request.url()).pathname;
        if (path.startsWith('/api/v1/')) responses.push({ page: index, path, method: request.method(), failed: true });
      });
      page.on('response', response => {
        const path = new URL(response.url()).pathname;
        if (!path.startsWith('/api/v1/')) return;
        const row = { page: index, path, method: response.request().method(), status: response.status(), complete: false };
        responses.push(row);
        const task = response.finished().then(error => { row.complete = !error; }).catch(() => { row.failed = true; });
        pendingResponses.add(task); void task.finally(() => pendingResponses.delete(task));
      });
    };
    try {
      const newActor = async (role, width) => {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        context.on('page', observe); const page = await context.newPage();
        const email = `p9-${label}-${role}-${Date.now()}@example.test`;
        const user = await account(page, runtime.origin, runtime.inbox, email, undefined, role === 'teacher' ? 'teacher' : 'student');
        return { page, user, email };
      };
      const T = await newActor('teacher', 1280), S = await newActor('student', 375);
      const P = peer ? await newActor('peer', 1280) : undefined;
      const room = await classroom(T.page, S.page, `P9 ${label} classroom`);
      await run({ label, runtime, browser, scratch, T, S, P, room, errors });
      assert.deepEqual(errors, []);
      for (const page of pages) {
        const alerts = await page.getByRole('alert').evaluateAll(nodes => nodes.filter(node =>
          !(node.tagName === 'P' && node.id === '__next-route-announcer__' && node.getAttribute('aria-live') === 'assertive'))
          .map(node => ({ tag: node.tagName, id: node.id, text: node.textContent,
            owner: node.closest('section')?.getAttribute('aria-label') })));
        assert.deepEqual(alerts, [], 'Unknown application alerts must not be mistaken for route announcements');
      }
    } catch (error) {
      for (const [index, page] of pages.entries()) {
        const alerts = await page.getByRole('alert').evaluateAll(nodes => nodes.map(n => ({ tag: n.tagName, id: n.id,
          live: n.getAttribute('aria-live'), text: n.textContent, owner: n.closest('section')?.getAttribute('aria-label') })));
        console.error(`P9 ${label} page${index} alert diagnostics`, JSON.stringify(alerts));
        await page.screenshot({ path: join(scratch, `failure-${index}.png`), fullPage: true }).catch(() => {});
      }
      throw error;
    } finally {
      try { await browser.close(); }
      finally {
        await Promise.all([...pendingResponses]);
        await writeFile(join(scratch, 'safe-responses.json'), `${JSON.stringify(responses, null, 2)}\n`);
      }
    }
  }, options);
}

export async function openOwnResult(world, activity, attemptId) {
  const { S, room, runtime } = world;
  await openClassroom(S.page, runtime.origin, `P9 ${world.label} classroom`);
  await S.page.getByRole('button', { name: 'Actividades', exact: true }).click();
  await S.page.getByRole('article', { name: activity.title, exact: true }).getByRole('button', { name: 'Ver mis intentos', exact: true }).click();
  const response = S.page.waitForResponse(r => r.url().endsWith(`/${attemptId}/result`) && r.request().method() === 'GET');
  await S.page.getByRole('button', { name: 'Consultar intento 1', exact: true }).click();
  const opened = await response; assert.equal(opened.status(), 200);
  const data = await opened.json(), region = S.page.getByRole('region', { name: 'Resultado publicado del intento', exact: true });
  const grade = region.locator('.p8-final-grade');
  await grade.getByText('Calificación publicada', { exact: true }).waitFor();
  await grade.getByText(`${data.grade.finalGrade.replace('.', ',')} / 10`, { exact: true }).waitFor();
  assert.equal(await region.getByRole('alert').count(), 0);
  return { data, region };
}

/** Authenticated raw bytes still traverse the actual Next public proxy and its policies. */
export async function questionnaireJourney(world, type) {
  const { runtime, T, S, P, room, scratch } = world, page = S.page, root = rootOf(room);
  world.label = type === 'QUESTIONNAIRE' ? 'questionnaire' : 'evaluation';
  await inviteExplicitly(world, P);
  const activity = await createActivity(world, type, { publish: false });
  const preview = await ok(T.page, 'GET', `${root}/activities/${activity.id}/preview`);
  assert.equal(preview.activity.locked, false);
  assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempts')).rows[0].n, 0);
  await openClassroom(T.page, runtime.origin, `P9 ${world.label} classroom`);
  await T.page.getByRole('button', { name: 'Actividades', exact: true }).click();
  const article = T.page.getByRole('article', { name: activity.title, exact: true });
  await article.getByText('Más opciones', { exact: true }).click();
  await article.getByRole('button', { name: 'Publicar', exact: true }).click();
  const publication = T.page.waitForResponse(r => r.url().endsWith(`${room.id}/activities`) && r.request().method() === 'POST');
  await T.page.getByRole('button', { name: 'Confirmar publicación', exact: true }).click();
  assert.equal((await publication).status(), 200); await (await publication).json();
  await T.page.getByText('Estado de publicación confirmado.', { exact: true }).waitFor();
  await openActivity(page, runtime.origin, { ...room, name: `P9 ${world.label} classroom` }, activity);
  const response = await startBrowserAttempt(page, room.id, activity.id, 12000); assert.equal(response.status(), 200);
  const started = await response.json(), attemptId = started.attempt.id, editor = started.editor;
  assert.equal(started.attempt.status, 'DRAFT'); assert.ok(editor);
  assert.ok(!/"(?:correct|scoringRule|manualPoints)"/.test(JSON.stringify(started)));
  const navigation = number => page.getByRole('navigation', { name: 'Navegación de preguntas', exact: true })
    .getByRole('button', { name: `Pregunta ${number}`, exact: true }).click();
  const answerResponse = () => page.waitForResponse(r => r.url().endsWith('/answer') && r.request().method() === 'POST');
  const originalAnswer = `${type} real multiline answer\nPreserved second line 😀`;
  let pending = answerResponse(), began = Date.now();
  await page.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true }).fill(originalAnswer);
  let saved = await pending; assert.equal(saved.status(), 200); await saved.json();
  assert.ok(Date.now() - began >= 1900, 'Two-second idle autosave boundary');
  await page.getByRole('status').filter({ hasText: 'Guardado confirmado' }).waitFor();
  await navigation(2);
  if (type === 'QUESTIONNAIRE') {
    await page.getByRole('radio', { name: 'Selected single answer', exact: true }).check();
    pending = answerResponse(); await navigation(3); saved = await pending; assert.equal(saved.status(), 200); await saved.json();
  } else await navigation(3);
  await page.getByRole('checkbox', { name: 'Selected multiple A', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Selected multiple B', exact: true }).check();
  pending = answerResponse(); await navigation(1); saved = await pending; assert.equal(saved.status(), 200); await saved.json();
  let state = await session(world, activity);
  assert.equal(state.attempt.status, 'DRAFT'); assert.equal(state.unansweredCount, type === 'EVALUATION' ? 1 : 0);
  const locked = await ok(T.page, 'GET', `${root}/activities/${activity.id}/preview`);
  assert.equal(locked.activity.locked, true);
  await rejectUnchanged(runtime.db, () => request(T.page, 'POST', `${root}/activities`, {
    revision: locked.revision, operation: { action: 'save', id: activity.id, payload: { ...activity.payload, instructions: 'Forbidden content change' } } }), 409);
  const cancelHash = await academicHash(runtime.db);
  await page.getByRole('button', { name: 'Enviar respuestas', exact: true }).click();
  const confirmation = page.getByRole('region', { name: 'Confirmar entrega de respuestas', exact: true });
  await confirmation.getByText(type === 'EVALUATION'
    ? 'Quedan 1 preguntas sin responder y obtendrán cero puntos. Confirmá si querés entregar así.'
    : 'Todas las preguntas tienen una respuesta guardada.', { exact: false }).waitFor();
  if (type === 'EVALUATION') assert.match(await confirmation.locator('p').innerText(), /obtendrán cero puntos\./);
  await page.getByRole('button', { name: 'Cancelar entrega', exact: true }).click();
  assert.equal(await academicHash(runtime.db), cancelHash);
  assert.equal(await page.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true }).isEnabled(), true);
  if (type === 'EVALUATION') await rejectUnchanged(runtime.db, () => request(page, 'POST', `${root}/attempts/${attemptId}/submit-answers`,
    { revision: state.attempt.revision, confirm: true, confirmIncomplete: false }, editorHeaders(editor)), 409);
  await page.getByRole('button', { name: 'Enviar respuestas', exact: true }).click();
  pending = page.waitForResponse(r => r.url().endsWith('/submit-answers'));
  await page.getByRole('button', { name: type === 'EVALUATION' ? 'Confirmar entrega incompleta' : 'Confirmar envío de respuestas', exact: true }).click();
  const submitted = await pending; assert.equal(submitted.status(), 200); await submitted.json();
  await page.getByText('Entrega confirmada.', { exact: true }).waitFor();
  assert.equal((await session(world, activity)).attempt.status, 'SUBMITTED');
  assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempt_grades')).rows[0].n, 0);
  await openClassroom(T.page, runtime.origin, `P9 ${world.label} classroom`);
  await T.page.getByRole('button', { name: 'Actividades', exact: true }).click();
  await T.page.getByRole('article', { name: activity.title, exact: true }).getByRole('button', { name: 'Ver entregas recibidas', exact: true }).click();
  await T.page.getByRole('button', { name: 'Corregir intento 1', exact: true }).click();
  const region = T.page.getByRole('region', { name: 'Corrección privada del intento', exact: true });
  await region.getByLabel('Puntos de la pregunta 1', { exact: true }).fill('1,50');
  const comments = [1, 2, 3].map(n => `${type} distinct feedback for exact question ${n}`);
  for (let index = 0; index < comments.length; index++) await region.getByLabel(`Devolución de la pregunta ${index + 1}`, { exact: true }).fill(comments[index]);
  pending = T.page.waitForResponse(r => r.url().endsWith('/grading') && r.request().method() === 'POST');
  await region.getByRole('button', { name: 'Guardar corrección privada', exact: true }).click();
  const correctionResponse = await pending; assert.equal(correctionResponse.status(), 200);
  const correction = await correctionResponse.json(), expectedGrade = type === 'QUESTIONNAIRE' ? '7.50' : '5.50';
  assert.equal(correction.grade.finalGrade, expectedGrade); assert.equal(correction.grade.isPublished, false);
  const privateGrade = await ok(T.page, 'GET', `${root}/attempts/${attemptId}/grading`);
  assert.deepEqual(privateGrade.activity.questions.map(q => q.id), started.activity.questions.map(q => q.id));
  assert.deepEqual(privateGrade.activity.questions.map(q => q.feedback), comments);
  assert.deepEqual(await ok(page, 'GET', `${root}/attempts/${attemptId}/result`), { status: 'pending', attemptId });
  const privateHistory = await ok(page, 'GET', `${root}/attempts/${attemptId}/history`);
  assert.ok(!JSON.stringify(privateHistory).includes(comments[0]));
  const cancelPublication = await academicHash(runtime.db);
  await region.getByRole('button', { name: 'Publicar calificación', exact: true }).click();
  await region.getByRole('button', { name: 'Cancelar publicación', exact: true }).click();
  assert.equal(await academicHash(runtime.db), cancelPublication);
  await region.getByRole('button', { name: 'Publicar calificación', exact: true }).click();
  pending = T.page.waitForResponse(r => r.url().endsWith('/publish-grade'));
  await region.getByRole('button', { name: 'Confirmar publicación', exact: true }).click();
  const published = await pending; assert.equal(published.status(), 200); await published.json();
  await region.getByText('Calificación publicada · solo consulta.', { exact: true }).waitFor();
  const expected = started.activity.questions.map((q, index) => ({ id: q.id, feedback: comments[index],
    text: index === 0 ? originalAnswer : null,
    selected: index === 1 && type === 'QUESTIONNAIRE' ? [q.options[0].id] : index === 2 ? q.options.slice(0, 2).map(o => o.id) : [],
    earned: index === 0 ? { numerator: '3', denominator: '2' } : { numerator: index === 1 ? type === 'QUESTIONNAIRE' ? '2' : '0' : '4', denominator: '1' } }));
  const assertOwn = async result => {
    assertPublishedQuestions(result, expected); assert.equal(result.grade.finalGrade, expectedGrade);
    assert.equal(result.grade.isEffective, true); assert.ok(!JSON.stringify(result).includes('Unselected secret correct option'));
  };
  await assertOwn(await ok(page, 'GET', `${root}/attempts/${attemptId}/result`));
  await rejectUnchanged(runtime.db, () => request(page, 'GET', `${root}/attempts/${attemptId}/grade-corrections`), 403);
  await rejectUnchanged(runtime.db, () => request(P.page, 'GET', `${root}/attempts/${attemptId}/result`), 403);
  const rendered = await openOwnResult(world, activity, attemptId); await assertOwn(rendered.data);
  for (const [index, q] of expected.entries()) {
    const article = rendered.region.getByRole('article').nth(index);
    await article.getByText(started.activity.questions[index].prompt, { exact: true }).waitFor();
    await article.getByText(q.feedback, { exact: true }).waitFor();
    await article.getByText(`Pregunta ${index + 1}`, { exact: true }).waitFor();
    const earned = q.earned.denominator === '1' ? q.earned.numerator : `${q.earned.numerator}/${q.earned.denominator}`;
    await article.locator('header').getByText(`${earned} / ${started.activity.questions[index].points.replace('.', ',')} puntos`, { exact: true }).waitFor();
    if (index > 0) {
      assert.equal(await article.getByRole('listitem').count(), q.selected.length);
      for (const selectedId of q.selected) await article.getByText(started.activity.questions[index].options.find(option => option.id === selectedId).text,
        { exact: true }).waitFor();
    }
  }
  await rendered.region.getByText(originalAnswer, { exact: true }).waitFor();
  assert.equal(await rendered.region.getByText('Unselected secret correct option', { exact: true }).count(), 0);
  await page.screenshot({ path: join(scratch, 'published-per-question-feedback.png'), fullPage: true });
  await page.reload();
  const reloaded = await openOwnResult(world, activity, attemptId); await assertOwn(reloaded.data);
  for (const comment of comments) await reloaded.region.getByText(comment, { exact: true }).waitFor();
  const progress = await ok(page, 'GET', `${root}/progress`);
  assert.equal(progress.completion.percentage, '100.00'); assert.equal(progress.performance.average, expectedGrade);
  const persisted = await academicHash(runtime.db); await runtime.restartData();
  assert.equal(await academicHash(runtime.db), persisted);
  await assertOwn(await ok(page, 'GET', `${root}/attempts/${attemptId}/result`));
  const restored = await openOwnResult(world, activity, attemptId); await assertOwn(restored.data);
  for (const comment of comments) await restored.region.getByText(comment, { exact: true }).waitFor();
  assert.deepEqual(await ok(page, 'GET', `${root}/progress`), progress);
  console.log(`P9 ${world.label}: exact3questionfeedback/private/published/UI/reload/data-API-restart/progress PASS`);
}
