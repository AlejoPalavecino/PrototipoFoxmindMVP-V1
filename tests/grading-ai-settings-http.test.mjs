import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { withGradingFixture } from './p8-grading-helpers.mjs';
import { createClassroomsHandler } from '../.build/api/apps/api/src/classrooms/http.js';

test('PATCH settings transporta opción de corrección IA y conserva permisos', { timeout: 150000 }, async t => {
  await withGradingFixture(async f => {
    const { service, room, teacher, student, foreign, pool, T } = f;
    service.ports.gradingAiAvailable = true;
    const handler = createClassroomsHandler(service, { admit: async (req, write) => {
      if (write && req.headers['x-fixture-csrf'] !== 'valid') throw new Error('deny');
      req.actor = req.headers['x-fixture-actor'];
    } });
    const server = createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end(); }));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/classrooms/${room}/settings`;
    const body = async () => { const d = await service.detail(T, room); return { revision: d.revision, name: d.name,
      subject: d.subject, division: d.division, academicYear: d.academicYear }; };
    const patch = (actor, data, csrf = 'valid') => fetch(url, { method: 'PATCH', headers: { 'content-type': 'application/json',
      'x-fixture-actor': actor, 'x-fixture-csrf': csrf }, body: JSON.stringify(data) });
    try {
      await t.test('booleano habilita y deshabilita; cambios persisten', async () => {
        for (const enabled of [true, false]) {
          const response = await patch(teacher, { ...await body(), aiGradingEnabled: enabled });
          assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
          const row = (await pool.query('SELECT ai_grading_enabled FROM classrooms WHERE id=$1', [room])).rows[0];
          assert.equal(row.ai_grading_enabled, enabled);
        }
      });
      await t.test('cliente previo sin campo opcional conserva su compatibilidad', async () => {
        const response = await patch(teacher, { ...await body(), name: 'Nombre actualizado' });
        assert.equal(response.status, 200); assert.equal((await service.detail(T, room)).name, 'Nombre actualizado');
      });
      await t.test('rechaza tipos inválidos y campos extra sin mutar', async () => {
        for (const extra of [{ aiGradingEnabled: 'true' }, { aiGradingEnabled: null }, { aiGradingEnabled: true, forged: true }]) {
          const before = (await pool.query('SELECT revision,ai_grading_enabled FROM classrooms WHERE id=$1', [room])).rows[0];
          assert.equal((await patch(teacher, { ...await body(), ...extra })).status, 400);
          assert.deepEqual((await pool.query('SELECT revision,ai_grading_enabled FROM classrooms WHERE id=$1', [room])).rows[0], before);
        }
      });
      await t.test('alumno, otro docente y petición sin admisión no pueden cambiar ajustes', async () => {
        const request = { ...await body(), aiGradingEnabled: true };
        for (const [actor, csrf] of [[student, 'valid'], [foreign, 'valid'], [teacher, 'invalid']]) {
          const before = (await pool.query('SELECT revision,ai_grading_enabled FROM classrooms WHERE id=$1', [room])).rows[0];
          assert.equal((await patch(actor, request, csrf)).status, 403);
          assert.deepEqual((await pool.query('SELECT revision,ai_grading_enabled FROM classrooms WHERE id=$1', [room])).rows[0], before);
        }
      });
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  });
});
