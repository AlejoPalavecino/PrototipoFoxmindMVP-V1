import assert from 'node:assert/strict';
import { randomUUID, webcrypto } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { classroom, planPdf, upload } from './p6-integration-helpers.mjs';
import { api, password } from './p4-integration-helpers.mjs';

// Explicit CLI opt-in only. Test discovery never starts this live fixture.
// All accounts, volumes, configuration and documents belong to this invocation.
export async function withFoxmind3dLive(run, controlled = false) {
  const factory = controlled ? (await import('./foxmind-3d-live-controlled.test.mjs')).withFoxmind3dControlledRuntime : withP4IntegrationRuntime;
  return factory(async runtime => {
    const { createPasswordService } = await Promise.all([import("../.build/api/apps/api/src/modules/identity/domain/security/errors.js"),import("../.build/api/apps/api/src/modules/identity/domain/security/inputs.js"),import("../.build/api/apps/api/src/modules/identity/accounts/infrastructure/security/verifiers.js"),import("../.build/api/apps/api/src/modules/identity/accounts/infrastructure/security/configuration.js"),import("../.build/api/apps/api/src/modules/identity/accounts/infrastructure/security/passwords.js"),import("../.build/api/apps/api/src/modules/identity/accounts/infrastructure/security/sessions.js"),import("../.build/api/apps/api/src/modules/identity/accounts/presentation/session-cookies.js")]).then(([m0,m1,m2,m3,m4,m5,m6]) => Object.freeze({IdentitySecurityError: m0.IdentitySecurityError,validatePassword: m1.validatePassword,validateName: m1.validateName,validateBodyShape: m1.validateBodyShape,assertBodySize: m1.assertBodySize,generateVerifier: m2.generateVerifier,parseVerifier: m2.parseVerifier,accountTokenDigest: m2.accountTokenDigest,sessionTokenDigest: m2.sessionTokenDigest,readIdentityConfiguration: m3.readIdentityConfiguration,createPasswordService: m4.createPasswordService,IDENTITY_POLICY: m5.IDENTITY_POLICY,newSessionWindow: m5.newSessionWindow,sessionIsActive: m5.sessionIsActive,refreshSessionWindow: m5.refreshSessionWindow,sessionCookie: m6.sessionCookie,clearSessionCookie: m6.clearSessionCookie}));
    const passwords = await createPasswordService(), passwordHash = await passwords.hash(password), actors = {};
    for (const role of ['primaryTeacher', 'teacher', 'student', 'studyStudent', 'empty', 'archived', 'unverified']) {
      const id = randomUUID(), email = `${role}-3d@example.test`;
      await runtime.db.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
        VALUES($1,now(),$2,$2,$3,'Synthetic',$4,CASE WHEN $5 THEN now() ELSE NULL END,$6)`, [id, email, role, passwordHash, role !== 'unverified', ['student', 'studyStudent'].includes(role) ? 'student' : 'teacher']);
      const cookies = new Map();
      const request = async (url, options = {}) => {
        const headers = new Headers(options.headers); headers.set('origin', runtime.origin);
        headers.set('cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
        const result = await fetch(new URL(url, runtime.origin), { ...options, headers });
        for (const cookie of result.headers.getSetCookie()) { const pair = cookie.split(';')[0], at = pair.indexOf('='); cookies.set(pair.slice(0, at), pair.slice(at + 1)); }
        return result;
      };
      const person = { id, email, request,
        evaluate: (fn, argument) => new Function('fetch', 'crypto', 'argument', `return (${fn.toString()})(argument)`)(request, webcrypto, argument) };
      assert.equal((await api(person, 'POST', '/auth/login', { email, password })).status, 200);
      actors[role] = person;
    }
    const teach = await classroom(actors.primaryTeacher, actors.student, 'Biología · preguntas sobre la vida');
    const study = await classroom(actors.teacher, actors.studyStudent, 'Literatura · lecturas y conversaciones');
    const history = await classroom(actors.archived, null, 'Historia conservada');
    for (const [room, subject, cover] of [[teach, 'Biología', 'biology'], [study, 'Literatura', 'literature'], [history, 'Matemática', 'math']]) {
      await runtime.db.query('UPDATE classrooms SET subject=$2,cover_key=$3 WHERE id=$1', [room.id, subject, cover]);
    }
    const detail = async (person, room) => (await api(person, 'GET', `/classrooms/${room.id}`)).body;
    const change = async (person, room, operation) => api(person, 'POST', `/classrooms/${room.id}/activities`, { revision: (await detail(person, room)).revision, operation });
    const activities = [];
    for (const [person, room] of [[actors.primaryTeacher, teach], [actors.teacher, study]]) {
      const unit = (await detail(person, room)).units[0];
      for (const [type, title] of [['ASSIGNMENT', 'Observar y explicar la luz'], ['QUESTIONNAIRE', 'Preguntas de exploración'], ['EVALUATION', 'Evaluación de conceptos']]) {
        const created = await change(person, room, { action: 'create', type }); assert.equal(created.status, 200);
        const saved = await change(person, room, { action: 'save', id: created.body.id, payload: { title, unitId: unit.id, topicIds: unit.topics.map(t => t.id),
          instructions: 'Actividad sintética para verificación local.', attachmentRequired: false, instructionFileIds: [], materialIds: [],
          deadline: null, allowLate: false, questions: type === 'ASSIGNMENT' ? [] : [{ type: 'DEVELOPMENT', prompt: 'Explica una observación.', points: '10', scoringRule: null, options: [] }] } });
        assert.equal(saved.status, 200); assert.equal((await change(person, room, { action: 'publish', id: created.body.id })).status, 200);
        activities.push({ id: created.body.id, roomId: room.id, type });
      }
      const file = await upload(person, { kind: 'classroom', id: room.id }, await planPdf('Documento sintético real'), 'material', 'lectura.pdf');
      assert.equal((await api(person, 'POST', `/classrooms/${room.id}/library`, { revision: (await detail(person, room)).revision,
        operation: { action: 'publish', title: 'Lectura contextual', fileId: file.id, unitId: unit.id, topicId: unit.topics[0].id } })).status, 200);
    }
    const submitted = [];
    for (const type of ['ASSIGNMENT', 'QUESTIONNAIRE']) {
      const activity = activities.find(item => item.roomId === teach.id && item.type === type);
      const started = await api(actors.student, 'POST', `/classrooms/${teach.id}/activities/${activity.id}/start`, {});
      assert.equal(started.status, 200); const state = started.body;
      const headers = { 'x-attempt-editor': state.editor.token, 'x-attempt-epoch': state.editor.epoch };
      assert.equal((await api(actors.student, 'POST', `/classrooms/${teach.id}/attempts/${state.attempt.id}/${type === 'ASSIGNMENT' ? 'submit-practical' : 'submit-answers'}`,
        { revision: state.attempt.revision, confirm: true, ...(type === 'ASSIGNMENT' ? {} : { confirmIncomplete: true }) }, headers)).status, 200);
      submitted.push({ ...activity, attemptId: state.attempt.id });
    }
    const privateAttempt = submitted.find(item => item.type === 'ASSIGNMENT');
    const gradingPath = `/classrooms/${teach.id}/attempts/${privateAttempt.attemptId}/grading`;
    const grading = await api(actors.primaryTeacher, 'GET', gradingPath); assert.equal(grading.status, 200);
    assert.equal((await api(actors.primaryTeacher, 'POST', gradingPath, { revision: grading.body.revision, overallGrade: '0',
      overallFeedback: 'Devolución sintética privada pendiente de publicar.', questions: [] })).status, 200);
    const wall = await api(actors.student, 'GET', `/classrooms/${teach.id}/wall`); assert.equal(wall.status, 200);
    assert.equal((await api(actors.student, 'POST', `/classrooms/${teach.id}/wall`, { revision: wall.body.revision,
      operation: { action: 'publish', body: '¿Cómo puedo relacionar los conceptos de esta unidad?' } })).status, 200);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    assert.equal((await api(actors.primaryTeacher, 'PUT', `/agenda/events/${randomUUID()}`, { title: 'Lectura escolar de mañana', description: '', category: 'ACTIVITY',
      schedule: { kind: 'TIMED', timeZone: 'UTC', startLocal: `${tomorrow}T14:00`, endLocal: `${tomorrow}T15:00` }, repeat: { kind: 'NONE' } })).status, 201);
    const historic = await detail(actors.archived, history);
    assert.equal((await api(actors.archived, 'POST', `/classrooms/${history.id}/archive`, { revision: historic.revision, archived: true })).status, 200);
    // Verified real HTTP projections are a readiness gate, not invented UI data.
    for (const role of ['primaryTeacher', 'teacher', 'student', 'studyStudent', 'empty', 'archived']) {
      const result = await api(actors[role], 'GET', '/home?timeZone=UTC'); assert.equal(result.status, 200);
      assert.equal(result.body.participation, { primaryTeacher: 'teach', teacher: 'teach', student: 'study', studyStudent: 'study', empty: 'none', archived: 'none' }[role]);
    }
    const extremeId = randomUUID(), extremeDay = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const extremeAt = new Date(Date.parse(`${extremeDay}T00:30:00Z`) - 14 * 3600000);
    const extremeViewDay = new Date(extremeAt.getTime() - 12 * 3600000).toISOString().slice(0, 10);
    await runtime.db.query(`INSERT INTO agenda_events(id,owner_id,title,description,category,schedule_kind,start_date,end_date_exclusive,
      start_local,end_local,time_zone,start_at,end_at,repeat_kind)
      VALUES($1,$2,'Lectura en zona extrema','','CLASS','TIMED',$3,$4,$5,$6,'Pacific/Kiritimati',$7,$8,'NONE')`,
    [extremeId, actors.primaryTeacher.id, extremeDay, new Date(Date.parse(`${extremeDay}T00:00:00Z`) + 86400000).toISOString().slice(0, 10),
      `${extremeDay}T00:30`, `${extremeDay}T01:30`, extremeAt.toISOString(), new Date(extremeAt.getTime() + 3600000).toISOString()]);
    return run({ ...runtime, actors, rooms: { teach, study, history }, activities, submitted,
      extremeEvent: { id: extremeId, originalDate: extremeDay, viewDate: extremeViewDay } });
  }, { classrooms: true });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href && process.argv.includes('--live')) {
  const started = Date.now();
  await withFoxmind3dLive(async runtime => {
    console.log('FOXMIND_3D_LIVE_READY', JSON.stringify({ origin: runtime.origin, inbox: runtime.inbox,
      accounts: Object.fromEntries(Object.entries(runtime.actors).map(([role, actor]) => [role, actor.email])),
      rooms: Object.fromEntries(Object.entries(runtime.rooms).map(([name, room]) => [name, room.id])), activities: runtime.activities, submitted: runtime.submitted,
      extremeEvent: runtime.extremeEvent }));
    await new Promise(resolveStop => {
      const stop = () => { clearTimeout(timer); resolveStop(); };
      const timer = setTimeout(stop, Math.max(1, 360000 - (Date.now() - started)));
      process.once('SIGINT', stop); process.once('SIGTERM', stop); process.stdin.resume(); process.stdin.once('data', stop);
    });
    process.stdin.pause();
  }, process.argv.includes('--controlled'));
}
