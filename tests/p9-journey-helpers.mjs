import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom, openClassroom } from './p6-integration-helpers.mjs';
import { tableHash } from './p8-grading-helpers.mjs';
import { zip } from './p4-fixtures.mjs';

// Academic state only: ingress, sessions, admission and worker leases are not academic effects.
export const academicTables = Object.freeze(['classroom_drafts', 'classrooms', 'classroom_codes', 'invitations',
  'units', 'topics', 'study_plan_versions', 'materials', 'enrollments', 'membership_periods', 'wall_posts',
  'wall_replies', 'notifications', 'activities', 'activity_materials', 'activity_instruction_files',
  'student_activities', 'questions', 'question_options', 'attempts', 'answers', 'answer_selections',
  'attempt_attachments', 'attempt_grades', 'question_grades', 'grade_corrections', 'files', 'uploads', 'file_custodies']);
export const academicHash = db => tableHash(db, academicTables);
export async function rejectUnchanged(db, action, status) {
  const before = await academicHash(db), result = await action();
  assert.equal(result.status, status, 'Exact route-specific rejection required');
  assert.equal(await academicHash(db), before, 'Rejected operation changed academic/private records');
  return result;
}

export function maximumZip(index, size = 50_000_000) {
  assert.ok(Number.isInteger(index) && index >= 0 && index < 5);
  assert.ok(Number.isSafeInteger(size) && size >= 114);
  return zip([{ name: 'work.txt', bytes: Buffer.alloc(size - 114, 65 + index) }]);
}

export function assertPublishedQuestions(result, expected) {
  assert.equal(result.status, 'published');
  assert.ok(!/"(?:correct|scoringRule|manualPoints|audit|corrections|actor|graded_by_id)"/.test(JSON.stringify(result)));
  assert.equal(result.questions.length, expected.length);
  assert.equal(new Set(expected.map(q => q.feedback)).size, expected.length);
  expected.forEach((q, index) => {
    assert.ok(q.feedback?.trim());
    const actual = result.questions[index];
    assert.equal(actual.id, q.id); assert.equal(actual.feedback, q.feedback);
    assert.deepEqual(actual.earned, q.earned); assert.equal(actual.answer.text, q.text);
    assert.deepEqual(actual.answer.selectedOptions.map(option => option.id), q.selected);
  });
}

/** Never treat 429 as fresh data. One real Retry-After wait preserves existing admission policy. */
export async function request(page, method, path, body, headers) {
  let result = await api(page, method, path, body, headers);
  if (result.status === 429) {
    const seconds = Number(result.headers['retry-after']);
    assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
    console.log(`P9 public prerequisite honors actual Retry-After=${seconds}s once`);
    await delay(seconds * 1000); result = await api(page, method, path, body, headers);
  }
  return result;
}
export function checkedResponse(result, label = 'Public prerequisite') {
  assert.equal(result.status, 200, `${label}: ${JSON.stringify(result.body?.error)}`);
  return Object.hasOwn(result, 'body') ? result.body : result;
}
export async function ok(...args) {
  return checkedResponse(await request(...args), `${args[1]} ${args[2]}`);
}
export const editorHeaders = editor => ({ 'x-attempt-editor': editor.token, 'x-attempt-epoch': editor.epoch });
export const rootOf = room => `/classrooms/${room.id}`;
export const detail = (teacher, room) => ok(teacher, 'GET', rootOf(room));
export async function changeActivity(teacher, room, operation) {
  return ok(teacher, 'POST', `${rootOf(room)}/activities`, { revision: (await detail(teacher, room)).revision, operation });
}

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
        const user = await account(page, runtime.origin, runtime.inbox, email);
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

export async function capturedInvitation(inbox, email, id) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const messages = await (await fetch(`${inbox}/api/v1/messages`)).json();
    for (const message of messages.messages.filter(row => row.To.some(to => to.Address === email))) {
      const body = await (await fetch(`${inbox}/api/v1/message/${message.ID}`)).json();
      const link = /http:\/\/127\.0\.0\.1:\d+\/mis-aulas\?invitacion=[a-f0-9-]{36}/i.exec(body.Text)?.[0];
      if (link && new URL(link).searchParams.get('invitacion') === id) return link;
    }
    await delay(100);
  }
  assert.fail('Actual captured classroom invitation required');
}
export async function inviteExplicitly(world, actor = world.S) {
  const { runtime, room, T } = world, before = (await runtime.db.query('SELECT count(*)::int n FROM membership_periods')).rows[0].n;
  const invitation = await ok(T.page, 'POST', `${rootOf(room)}/invitations`, { email: actor.email });
  const link = await capturedInvitation(runtime.inbox, actor.email, invitation.id);
  await actor.page.goto(link);
  await actor.page.getByRole('article', { name: 'Invitación seleccionada del correo', exact: true }).waitFor();
  assert.equal((await runtime.db.query('SELECT count(*)::int n FROM membership_periods')).rows[0].n, before);
  const response = actor.page.waitForResponse(r => new URL(r.url()).pathname === `/api/v1/classrooms/invitations/${invitation.id}/accept`);
  await actor.page.getByRole('button', { name: 'Aceptar invitación', exact: true }).click();
  assert.equal((await response).status(), 200); await (await response).json();
  assert.equal((await runtime.db.query('SELECT count(*)::int n FROM membership_periods')).rows[0].n, before + 1);
  return invitation;
}

export function questions() {
  return [{ type: 'DEVELOPMENT', prompt: 'Explain the joined answer', points: '2', scoringRule: null, options: [] },
    { type: 'SINGLE_CHOICE', prompt: 'Choose the first option', points: '2', scoringRule: 'EXACT',
      options: [{ text: 'Selected single answer', correct: true }, { text: 'Hidden single distractor', correct: false }] },
    { type: 'MULTIPLE_CHOICE', prompt: 'Choose two of three correct options', points: '6', scoringRule: 'PARTIAL',
      options: [{ text: 'Selected multiple A', correct: true }, { text: 'Selected multiple B', correct: true },
        { text: 'Unselected secret correct option', correct: true }, { text: 'Unselected distractor', correct: false }] }];
}
export async function createActivity(world, type, { publish = true, title = `P9 ${type}`, attachmentRequired = false } = {}) {
  const { T, S, room } = world, state = await detail(T.page, room);
  const { id } = await changeActivity(T.page, room, { action: 'create', type });
  const payload = { title, unitId: state.units[0].id, topicId: state.units[0].topics[0].id,
    instructions: 'Joined original instructions', attachmentRequired, instructionFileIds: [], materialIds: [],
    deadline: null, allowLate: false, questions: type === 'ASSIGNMENT' ? [] : questions() };
  await changeActivity(T.page, room, { action: 'save', id, payload });
  assert.equal((await ok(S.page, 'GET', `${rootOf(room)}/activities`)).activities.some(row => row.id === id), false);
  assert.equal((await ok(S.page, 'GET', '/classrooms/notifications')).some(row => row.activityId === id), false);
  if (publish) await changeActivity(T.page, room, { action: 'publish', id });
  return { id, title, type, payload };
}
export async function openActivity(page, origin, room, activity) {
  await openClassroom(page, origin, room.name ?? `P9 ${activity.type.toLowerCase()} classroom`);
  await page.getByRole('button', { name: 'Actividades', exact: true }).click();
  await page.getByRole('article', { name: activity.title, exact: true }).getByRole('button',
    { name: activity.type === 'ASSIGNMENT' ? 'Abrir trabajo práctico' : 'Consultar actividad', exact: true }).click();
  await page.getByRole('region', { name: activity.type === 'EVALUATION' ? 'Evaluación · sesión reducida' : 'Sesión de actividad', exact: true }).waitFor();
}

export async function startPublic(world, activity, page = world.S.page) {
  return ok(page, 'POST', `${rootOf(world.room)}/activities/${activity.id}/start`, {});
}
export async function session(world, activity, page = world.S.page) {
  return ok(page, 'GET', `${rootOf(world.room)}/activities/${activity.id}/session`);
}
export async function publishSavedGrade(world, attemptId, grade, feedback = 'Joined overall feedback') {
  const { T, room } = world, path = `${rootOf(room)}/attempts/${attemptId}`;
  const saved = await ok(T.page, 'POST', `${path}/grading`, { revision: (await detail(T.page, room)).revision,
    overallGrade: grade, overallFeedback: feedback, questions: [] });
  assert.equal(saved.grade.isPublished, false);
  assert.deepEqual(await ok(world.S.page, 'GET', `${path}/result`), { status: 'pending', attemptId });
  return ok(T.page, 'POST', `${path}/publish-grade`, { revision: saved.revision, confirm: true });
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
  await region.getByText(`Calificación publicada: ${data.grade.finalGrade.replace('.', ',')}`, { exact: true }).waitFor();
  assert.equal(await region.getByRole('alert').count(), 0);
  return { data, region };
}

/** Authenticated raw bytes still traverse the actual Next public proxy and its policies. */
export async function rawUpload(page, origin, fileId, bytes, editor) {
  const csrf = await ok(page, 'GET', '/auth/csrf');
  const cookie = (await page.context().cookies()).map(c => `${c.name}=${c.value}`).join('; ');
  return new Promise((resolve, reject) => {
    const request = httpRequest(`${origin}/api/v1/files/${fileId}/content`, { method: 'PUT', headers: {
      cookie, origin, 'x-csrf-token': csrf.csrfToken, ...editorHeaders(editor),
      'content-type': 'application/octet-stream', 'content-length': String(bytes.length) } }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('error', reject);
      response.on('end', () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          console.log('P9 raw Next upload response', JSON.stringify({ method: 'PUT', path: `/api/v1/files/${fileId}/content`,
            status: response.statusCode, bytes: bytes.length, complete: true }));
          resolve({ status: response.statusCode, body });
        }
        catch (error) { reject(error); }
      });
    });
    request.on('error', reject); request.end(bytes);
  });
}

export async function assertReadyFile(runtime, id, size, expectedDigest) {
  const { rows } = await runtime.db.query(`SELECT f.size_bytes::text AS size,f.validation_status::text AS validation,
    f.scan_status::text AS scan,u.status::text AS upload,c.phase,c.digest,c.validated_digest,c.scanned_digest
    FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id WHERE f.id=$1`, [id]);
  assert.deepEqual(rows, [{ size: String(size), validation: 'APPROVED', scan: 'CLEAN', upload: 'COMPLETED', phase: 'ready',
    digest: expectedDigest, validated_digest: expectedDigest, scanned_digest: expectedDigest }]);
  assert.equal(digest(await runtime.privateFileBytes(id)), expectedDigest);
}

/** Complete Q and E independently, including exact positive question-feedback durability. */
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
  await article.getByRole('button', { name: 'Publicar', exact: true }).click();
  const publication = T.page.waitForResponse(r => r.url().endsWith(`${room.id}/activities`) && r.request().method() === 'POST');
  await T.page.getByRole('button', { name: 'Confirmar publicación', exact: true }).click();
  assert.equal((await publication).status(), 200); await (await publication).json();
  await T.page.getByText('Estado de publicación confirmado.', { exact: true }).waitFor();
  await openActivity(page, runtime.origin, { ...room, name: `P9 ${world.label} classroom` }, activity);
  const startedResponse = page.waitForResponse(r => r.url().endsWith(`/${activity.id}/start`));
  await page.getByRole('button', { name: 'Comenzar', exact: true }).click();
  const response = await startedResponse; assert.equal(response.status(), 200);
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
  await page.getByText(`Quedan ${type === 'EVALUATION' ? 1 : 0} preguntas sin responder.`, { exact: false }).waitFor();
  if (type === 'EVALUATION') await page.getByText('Las preguntas sin responder obtendrán cero puntos', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Cancelar entrega', exact: true }).click();
  assert.equal(await academicHash(runtime.db), cancelHash);
  assert.equal(await page.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true }).isEnabled(), true);
  if (type === 'EVALUATION') await rejectUnchanged(runtime.db, () => request(page, 'POST', `${root}/attempts/${attemptId}/submit-answers`,
    { revision: state.attempt.revision, confirm: true, confirmIncomplete: false }, editorHeaders(editor)), 409);
  await page.getByRole('button', { name: 'Enviar respuestas', exact: true }).click();
  pending = page.waitForResponse(r => r.url().endsWith('/submit-answers'));
  await page.getByRole('button', { name: type === 'EVALUATION' ? 'Confirmar entrega incompleta' : 'Confirmar envío de respuestas', exact: true }).click();
  const submitted = await pending; assert.equal(submitted.status(), 200); await submitted.json();
  await page.getByText('Comprobante de entrega · pendiente de corrección.', { exact: false }).waitFor();
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
    await article.getByText(`Puntos obtenidos: ${earned} de ${started.activity.questions[index].points.replace('.', ',')}`, { exact: true }).waitFor();
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
