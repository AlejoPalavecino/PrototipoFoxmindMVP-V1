import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { enqueueSubmittedAttemptGradingAi } from '../apps/api/src/modules/grading/assistance/infrastructure/grading-ai/enqueue.ts';
import { ClassroomCore } from '../apps/api/src/modules/classrooms/access/infrastructure/core.ts';
import { DraftService } from '../apps/api/src/bootstrap/academic-management-composition.ts';

const id = '11111111-1111-4111-8111-111111111111', teacher = '22222222-2222-4222-8222-222222222222';
const row = { id, teacher_id: teacher, name: 'Aula', subject: 'Materia', division: 'A', academic_year: 2026, timezone: 'UTC',
  cover_key: 'explore', archived_at: null, teacher_name: 'Docente', ai_grading_enabled: true, revision: 2n };
const settings = extra => ({ revision: '2', name: 'Aula', subject: 'Materia', division: 'A', academicYear: 2026, ...extra });
const text = n => typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(text).join(' ') : n?.props ? text(n.props.children) : '';

test('detalle docente informa disponibilidad global sin alterar selección persistida del aula', () => {
  for (const available of [false, true]) {
    const summary = ClassroomCore.prototype.summary.call({ ports: { gradingAiAvailable: available } }, row, teacher);
    assert.equal(summary.aiGradingEnabled, true); assert.equal(summary.aiGradingAvailable, available);
  }
  const student = ClassroomCore.prototype.summary.call({ ports: { gradingAiAvailable: false } }, row, 'student');
  assert.equal(Object.hasOwn(student, 'aiGradingAvailable'), false);
});

test('sin IA global no se encola job incluso si el aula estaba activada', async () => {
  let inserts = 0;
  const tx = { query: async sql => /^\s*SELECT/i.test(sql) ? [{ teacher_id: teacher, ai_grading_enabled: true,
    ai_grading_epoch: 0n, ai_grading_rubric: '' }] : (inserts++, [{ id: 'job' }]) };
  assert.equal(await enqueueSubmittedAttemptGradingAi(tx, { classroomId: id, activityId: id, attemptId: id }, false), false);
  assert.equal(inserts, 0);
});

test('sin IA global rechaza activar y permite desactivar o guardar ajustes anteriores', async () => {
  let writes = 0; const tx = { query: async () => { writes++; return [{ id }]; } };
  const service = new DraftService({ ports: { gradingAiAvailable: false }, run: async (_req, _write, cb) => cb(tx, { id: teacher }), classroom: async () => ({ ...row, ai_grading_enabled: false }) });
  await assert.rejects(DraftService.prototype.updateSettings.call(service, {}, id, settings({ aiGradingEnabled: true })));
  assert.equal(writes, 0);
  await assert.doesNotReject(DraftService.prototype.updateSettings.call(service, {}, id, settings({ aiGradingEnabled: false })));
  await assert.doesNotReject(DraftService.prototype.updateSettings.call(service, {}, id, settings({})));
});

test('guardar otros datos del aula no envía una nueva activación de IA mientras el servicio no está disponible', async () => {
  const { ClassroomSettings } = loadTsModule('apps/web/src/features/classrooms/settings/ClassroomSettings.tsx');
  const detail = { id, revision: '2', role: 'teacher', archived: false, name: 'Aula', subject: 'Materia', division: 'A', academicYear: 2026,
    teacher: 'Docente', timezone: 'UTC', coverKey: 'explore', plans: [], units: [], aiGradingEnabled: true, aiGradingAvailable: false };
  const calls = [];
  const view = hookView(ClassroomSettings, { api: { call: async (...args) => { calls.push(args); return { revision: '3' }; } },
    id, room: detail, settings: { name:'Aula actualizada', subject:'Materia', division:'A', academicYear:2026, coverKey:'explore', aiGradingEnabled:true },
    setSettings() {}, settingsRevision:'2', setSettingsRevision() {}, settingsConflict:false, setSettingsConflict() {}, reloadSettings:async()=>{},
    isCurrentRoom:()=>true, busy:false, load:async()=>{}, action:async work=>work(), setNotice() {}, setConfirm() {} });
  try {
    await view.flush();
    assert.equal(descendants(view.tree, n => n.type === 'label' && /correcci[oó]n.*IA/i.test(text(n))).length, 0);
    descendants(view.tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await view.flush();
    assert.deepEqual(calls, [[`/${id}/settings`, 'PATCH', {
      name:'Aula actualizada', subject:'Materia', division:'A', academicYear:2026, coverKey:'explore', revision:'2',
    }]]);
    assert.equal(detail.aiGradingEnabled, true);
  } finally { view.close(); }
});

test('aula ya activa con IA global apagada puede guardar otros datos sin perder preferencia', async () => {
  const writes = []; const tx = { query: async (sql, ...args) => { writes.push({sql,args}); return [{ id }]; } };
  const service = new DraftService({ ports: { gradingAiAvailable: false }, run: async (_req, _write, cb) => cb(tx, { id: teacher }), classroom: async () => row });
  await assert.doesNotReject(DraftService.prototype.updateSettings.call(service, {}, id, { ...settings({ aiGradingEnabled: true }), name: 'Aula actualizada' }));
  assert.equal(writes.length, 1); assert.ok(writes[0].args.includes('Aula actualizada'));
  assert.ok(writes[0].args.includes(true));
});
