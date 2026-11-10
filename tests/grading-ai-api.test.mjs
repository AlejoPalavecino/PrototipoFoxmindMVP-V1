import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { withGradingFixture, tableHash, protectedTables } from './p8-grading-helpers.mjs';
import { createClassroomsHandler } from '../.build/api/apps/api/src/bootstrap/academic-http.js';
import { gradingAiSnapshotFromSql } from '../apps/api/src/modules/grading/infrastructure/grading-ai/snapshot-sql.ts';

// Real HTTP ingress and real isolated PostgreSQL. The provider is not called: a READY
// job is seeded from the same snapshot used by the worker so this tests the teacher API.
test('propuestas IA: consulta, aplicación privada y descarte con permisos reales', { timeout: 150000 }, async t => {
  await withGradingFixture(async f => {
    const { pool, service, room, teacher, student, foreign, T, create } = f;
    // The isolated fixture has no provider; explicitly simulate an enabled global AI runtime.
    service.ports.gradingAiAvailable = true;
    await pool.query('UPDATE classrooms SET ai_grading_enabled=true WHERE id=$1', [room]);
    const handler = createClassroomsHandler(service, { admit: async (req, write) => {
      req.actor = req.headers['x-fixture-actor'];
      if (write && req.headers['x-fixture-csrf'] !== 'valid') throw Error('deny');
    } });
    const server = createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end(); }));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/classrooms/${room}/attempts`;
    const fetchAs = (actor, path, body) => fetch(`${base}/${path}`, {
      method: body === undefined ? 'GET' : 'POST', headers: { 'x-fixture-actor': actor,
        ...(body === undefined ? {} : { 'content-type': 'application/json', 'x-fixture-csrf': 'valid' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const ready = async type => {
      const practicalResponse=type==='ASSIGNMENT'?'Respuesta escrita sin adjuntos\nEvidencia sintética 😀':'';
      const activity = await create(type,{practicalResponse}), view = await service.getAttemptGrading(T, room, activity.attempt);
      const row = (await pool.query('SELECT id,epoch,rubric_snapshot FROM grading_ai_jobs WHERE attempt_id=$1', [activity.attempt])).rows[0];
      assert.ok(row, 'submit enqueues the job before the test seeds READY');
      const loaded = await gradingAiSnapshotFromSql({ query: async (sql, ...args) => (await pool.query(sql, args)).rows },
        { id: row.id, attemptId: activity.attempt, activityId: activity.id, classroomId: room, ownerId: teacher });
      assert.ok(loaded.snapshot && loaded.fingerprint);
      if(type==='ASSIGNMENT'){
        assert.equal(view.attempt.practicalResponse,practicalResponse);
        assert.equal(loaded.snapshot.evidence.practicalResponse,practicalResponse);
        assert.equal(loaded.files.length,0);
        assert.equal((await service.activityAttempt(f.S,room,activity.attempt)).attempt.practicalResponse,practicalResponse);
      }
      const snapshot = { ...loaded.snapshot, hash: loaded.fingerprint };
      const proposal = { schemaVersion: 'grading-proposal-v1', overallGrade: type === 'ASSIGNMENT' ? '8.00' : null,
        overallFeedback: 'Privado', questions: snapshot.spec.questions.map(q => ({ ref: q.ref, points: q.manual ? '1.00' : null, feedback: 'Comentario' })), warnings: [] };
      await pool.query("UPDATE grading_ai_jobs SET state='READY',snapshot_hash=$2,proposal=$3::jsonb WHERE id=$1", [row.id, snapshot.hash, JSON.stringify(proposal)]);
      return { ...activity, view, row, snapshot, proposal };
    };
    try {
      await t.test('solo docente propietario consulta la propuesta, sin exposición al alumno ni a otro docente', async () => {
        const data = await ready('QUESTIONNAIRE'), path = `${data.attempt}/grading-ai`;
        const response = await fetchAs(teacher, path); assert.equal(response.status, 200);
        const result = await response.json(); assert.equal(result.id, data.row.id); assert.equal(result.state, 'READY');
        assert.deepEqual(result.proposal, data.proposal); assert.equal(result.snapshotHash, data.snapshot.hash);
        for (const actor of [student, foreign]) assert.equal((await fetchAs(actor, path)).status, 403);
        const own = await service.activityAttempt(f.S, room, data.attempt);
        assert.ok(!JSON.stringify(own).includes('Privado'));
      });
      await t.test('aplicar y reintentar la misma solicitud conserva puntuación P8, privacidad e idempotencia', async () => {
        const data = await ready('QUESTIONNAIRE'), path = `${data.attempt}/grading-ai/${data.row.id}/apply`;
        const proposal = structuredClone(data.proposal); proposal.questions[0].points = '2.00'; proposal.overallFeedback = 'Revisada';
        const body = { requestId: randomUUID(), revision: data.view.revision, snapshotHash: data.snapshot.hash, proposal };
        const beforeProtected = await tableHash(pool, protectedTables);
        const response = await fetchAs(teacher, path, body); assert.equal(response.status, 200);
        const first = await response.json();
        const grade = await service.getAttemptGrading(T, room, data.attempt);
        assert.equal(grade.grade.isPublished, false); assert.equal(grade.grade.finalGrade, '7.50');
        assert.equal(grade.grade.overallFeedback, 'Revisada');
        assert.deepEqual(grade.activity.questions[1].earned, { numerator: '4', denominator: '1' });
        assert.equal(await tableHash(pool, protectedTables), beforeProtected);
        const again = await fetchAs(teacher, path, body); assert.equal(again.status, 200); assert.deepEqual(await again.json(), first);
        const altered = structuredClone(body); altered.proposal.overallFeedback = 'Otra';
        assert.equal((await fetchAs(teacher, path, altered)).status, 409);
      });
      await t.test('rechaza alumno, otro docente, revisión y snapshot obsoletos sin guardar', async () => {
        const data = await ready('ASSIGNMENT'), path = `${data.attempt}/grading-ai/${data.row.id}/apply`;
        const body = { requestId: randomUUID(), revision: data.view.revision, snapshotHash: data.snapshot.hash, proposal: data.proposal };
        for (const actor of [student, foreign]) assert.equal((await fetchAs(actor, path, body)).status, 403);
        assert.equal((await fetchAs(teacher, path, { ...body, revision: '0' })).status, 409);
        assert.equal((await fetchAs(teacher, path, { ...body, snapshotHash: '0'.repeat(64) })).status, 409);
        assert.equal((await pool.query('SELECT count(*)::int n FROM attempt_grades WHERE attempt_id=$1', [data.attempt])).rows[0].n, 0);
      });
      await t.test('desactivar el aula invalida la aplicación aunque se reactive', async () => {
        const data = await ready('ASSIGNMENT'), path = `${data.attempt}/grading-ai/${data.row.id}/apply`;
        await pool.query('UPDATE classrooms SET ai_grading_enabled=false, ai_grading_epoch=ai_grading_epoch+1 WHERE id=$1', [room]);
        await pool.query('UPDATE classrooms SET ai_grading_enabled=true WHERE id=$1', [room]);
        const body = { requestId: randomUUID(), revision: data.view.revision, snapshotHash: data.snapshot.hash, proposal: data.proposal };
        assert.equal((await fetchAs(teacher, path, body)).status, 409);
        assert.equal((await pool.query('SELECT count(*)::int n FROM attempt_grades WHERE attempt_id=$1', [data.attempt])).rows[0].n, 0);
      });
      await t.test('descartar solo modifica el job y nunca guarda ni publica una nota', async () => {
        const data = await ready('ASSIGNMENT'), path = `${data.attempt}/grading-ai/${data.row.id}/discard`;
        const body = { requestId: randomUUID(), revision: data.view.revision };
        assert.equal((await fetchAs(student, path, body)).status, 403);
        const before = await tableHash(pool, protectedTables);
        assert.equal((await fetchAs(teacher, path, body)).status, 200);
        assert.equal((await pool.query('SELECT state FROM grading_ai_jobs WHERE id=$1', [data.row.id])).rows[0].state, 'DISCARDED');
        assert.equal((await pool.query('SELECT count(*)::int n FROM attempt_grades WHERE attempt_id=$1', [data.attempt])).rows[0].n, 0);
        assert.equal(await tableHash(pool, protectedTables), before);
      });
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  });
});
