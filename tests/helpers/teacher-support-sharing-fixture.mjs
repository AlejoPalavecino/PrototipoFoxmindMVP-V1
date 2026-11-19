import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { api } from '../p4-integration-helpers.mjs';
import { seedPlan } from './plan-fixture.mjs';

export const privateMarker = 'Apuntes personales para mi próximo intento';
export const draftText = 'Apunte de aula que todavía no entregué.';
export const writtenText = 'La luz lateral perfila el rostro y hace visible la textura.';
export const reportedStrength = 'Explica qué efecto consigue con la luz lateral.';
export const reportedImprovement = 'Compará el resultado con una segunda posición de la lámpara.';
export const strategyText = '  Me sirve ordenar las ideas en un esquema antes de escribir.  ';

export function writingFixture() {
  const calls = [];
  const unexpected = () => { throw new Error('Unexpected call to unrelated AI capability'); };
  return {
    calls,
    runtimeOptions: {
      aiEnvironment: {
        AI_ENABLED: 'true', AI_BACKEND: 'gemini-developer', AI_MODEL: 'synthetic-writing', AI_API_KEY: 'synthetic-only',
        AI_DAILY_ACTOR_REQUESTS: '15', AI_DAILY_GLOBAL_REQUESTS: '100', AI_MAX_INPUT_TOKENS: '100000',
        AI_MAX_OUTPUT_TOKENS: '16384', AI_DAILY_BUDGET_USD: '10', AI_INPUT_USD_PER_MILLION: '1',
        AI_OUTPUT_USD_PER_MILLION: '2', AI_DEADLINE_MS: '4000', AI_MAX_CONCURRENCY: '2',
        AI_MAX_DISPATCHES: '2', AI_MAX_JOB_AGE_MS: '300000',
      },
      applicationOptions: { ai: {
        provider: { countStudyPlanTokens: unexpected, extractStudyPlan: unexpected },
        teacherWritingProvider: {
          async countWritingTokens({ evidence }) { calls.push({ phase: 'count', evidence }); return 25; },
          async generateWriting({ evidence }) {
            calls.push({ phase: 'generate', evidence });
            return {
              json: {
                strengths: [{ text: reportedStrength, evidenceRefs: ['A1'] }],
                improvements: [{ text: reportedImprovement, evidenceRefs: ['A1'] }],
                nextStep: null,
              },
              inputTokens: 25, outputTokens: 14,
            };
          },
        },
      } },
    },
  };
}

export async function request(actor, method, path, body, headers = {}) {
  if (method !== 'DELETE') return api(actor.page, method, path, body, headers);
  const response = await api(actor.page, 'GET', '/auth/csrf');
  assert.equal(response.status, 200);
  return api(actor.page, method, path, body, { ...headers, 'x-csrf-token': response.body.csrfToken });
}

export async function accepted(actor, method, path, body, headers) {
  const response = await request(actor, method, path, body, headers);
  assert.equal(response.status, 200, `${method} ${path} · ${response.body?.error?.code ?? response.status}`);
  return response.body;
}

async function actor(runtime, browser, first, role, width) {
  const id = randomUUID(), email = `${id}@example.test`, token = randomBytes(32).toString('base64url');
  const { sessionTokenDigest } = await import('../../.build/api/apps/api/src/modules/identity/accounts/infrastructure/security/verifiers.js');
  await runtime.database.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,$3,'Ejemplo','synthetic',now(),$4)`, [id, email, first, role]);
  await runtime.database.query(`INSERT INTO sessions(id,updated_at,user_id,token_hash,expires_at)
    VALUES($1,now(),$2,$3,now()+interval '1 hour')`, [randomUUID(), id, sessionTokenDigest(token)]);
  const context = await browser.newContext({ viewport: { width, height: 850 }, reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'foxmind_session', value: token, url: runtime.origin, httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.goto(runtime.origin + '/sign-in');
  return { id, page, email };
}

async function room(database, teacher, student, name) {
  const id = randomUUID(), enrollment = randomUUID();
  await database.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
    VALUES($1,now(),$2,$3,'Arte','A',2026,'UTC','explore',100000000)`, [id, teacher.id, name]);
  await database.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, id, student.id]);
  await database.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method)
    VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), enrollment, id]);
  await seedPlan(database.query.bind(database), id, { action: 'addUnit', name: 'Fotografía' });
  const { rows: [{ id: unitId }] } = await database.query('SELECT id FROM units WHERE classroom_id=$1', [id]);
  await seedPlan(database.query.bind(database), id, { action: 'addTopic', unitId, name: 'Luz y textura' });
  const { rows: [{ id: topicId }] } = await database.query('SELECT id FROM topics WHERE unit_id=$1', [unitId]);
  return { id, name, unitId, topicId, path: '/classrooms/' + id };
}

async function publishedAssignment(teacher, classroom, title = 'Luz lateral') {
  const change = async operation => accepted(teacher, 'POST', classroom.path + '/activities', {
    revision: (await accepted(teacher, 'GET', classroom.path)).revision, operation,
  });
  const { id } = await change({ action: 'create', type: 'ASSIGNMENT' });
  await change({ action: 'save', id, payload: {
    title, unitId: classroom.unitId, topicId: classroom.topicId,
    instructions: 'Explicá qué cambia al mover la lámpara.',
    attachmentRequired: false, deadline: null, allowLate: false, instructionFileIds: [], materialIds: [], questions: [],
  } });
  await change({ action: 'publish', id });
  return id;
}

async function saveDraft(student, classroom, id, text) {
  const start = await accepted(student, 'POST', `${classroom.path}/activities/${id}/start`, {});
  const path = `${classroom.path}/attempts/${start.attempt.id}`;
  const headers = { 'x-attempt-editor': start.editor.token, 'x-attempt-epoch': start.editor.epoch };
  const saved = await accepted(student, 'POST', path + '/practical-response', { revision: start.attempt.revision, text }, headers);
  return { path, headers, revision: saved.revision };
}

async function submit(student, classroom, id) {
  const { path, headers, revision } = await saveDraft(student, classroom, id, writtenText);
  const receipt = await accepted(student, 'POST', path + '/submit-practical', { revision, confirm: true }, headers);
  return receipt.id;
}

async function linkedFolder(student, classroom) {
  const { folder: draft } = await accepted(student, 'POST', '/study-folders', {
    name: 'Mi carpeta privada de arte', academicYear: 2026, bannerKey: 'explore',
  });
  const path = '/study-folders/' + draft.id;
  const command = (revision, action, options) => accepted(student, 'POST', path + '/commands', {
    action, revision, requestId: randomUUID(), ...options,
  });
  const imported = await command(draft.revision, 'IMPORT_CLASSROOM_PLAN', { classroomId: classroom.id });
  const active = await command(imported.folder.revision, 'CONFIRM_FOLDER');
  await command(active.folder.revision, 'NEW_CONVERSATION', { title: privateMarker });
  return { id: draft.id, path, sharePath: path + '/shared-strategy', command };
}

export async function sharingWorld(runtime, browser) {
  const teacher = await actor(runtime, browser, 'Paz', 'teacher', 1350);
  const otherTeacher = await actor(runtime, browser, 'Irene', 'teacher', 1280);
  const student = await actor(runtime, browser, 'Tomás', 'student', 390);
  const otherStudent = await actor(runtime, browser, 'Emilia', 'student', 390);
  const classroom = await room(runtime.database, teacher, student, 'Taller de arte');
  const otherClassroom = await room(runtime.database, otherTeacher, student, 'Aula ajena');
  const id = await publishedAssignment(teacher, classroom);
  const attemptId = await submit(student, classroom, id);
  const pendingId = await publishedAssignment(teacher, classroom, 'Apuntes de composición');
  const pending = await saveDraft(student, classroom, pendingId, draftText);
  await runtime.database.query("UPDATE activities SET deadline_at=clock_timestamp()-interval '2 days' WHERE id=$1", [pendingId]);
  const folder = await linkedFolder(student, classroom);
  const recordPath = `${classroom.path}/members/${student.id}/support`;
  return { teacher, otherTeacher, student, otherStudent, classroom, otherClassroom, activityId: id, attemptId, pendingId, pending, folder, recordPath,
    writingPath: recordPath + '/writing' };
}
