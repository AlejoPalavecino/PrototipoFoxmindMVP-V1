import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClassroomClient } from '../apps/web/src/application/academic-client.ts';
const id = 'a1111111-1111-4111-8111-111111111111';

test('progress client reads self/class and explicit teacher member paths with no write body/editor/CSRF', async () => {
  const calls = []; let csrf = 0;
  const client = createClassroomClient({ prefix: '/api/v1', csrfToken: async () => String(++csrf), fetch: async (path, options) => { calls.push({ path, ...options }); return Response.json({}); } });
  const controller = new AbortController();
  for (const suffix of ['/progress', `/members/${id}/progress`, `/members/${id}`]) {
    await client.call(`/${id}${suffix}`, undefined, undefined, controller.signal);
    assert.equal(calls.at(-1).path, `/api/v1/classrooms/${id}${suffix}`);
    assert.equal(calls.at(-1).method, 'GET'); assert.equal(calls.at(-1).body, undefined);
    assert.equal(calls.at(-1).headers['X-Attempt-Editor'], undefined); assert.equal(calls.at(-1).signal.aborted, false);
  }
  controller.abort(); assert.ok(calls.every(call => call.signal.aborted));
  assert.equal(csrf, 0);
});
test('progress extends existing shell, captures member identity separately and clears stale data on refresh failure', async () => {
  const source = await readFile(new URL('../apps/web/src/features/grading/ui/Progress.tsx', import.meta.url), 'utf8');
  const shell = await readFile(new URL('../apps/web/src/application/academic-ClassroomView.tsx', import.meta.url), 'utf8');
  const roster = await readFile(new URL('../apps/web/src/features/classrooms/ui/ClassroomRoster.tsx', import.meta.url), 'utf8');
  const dialogs = await readFile(new URL('../apps/web/src/application/academic-ClassroomDialogs.tsx', import.meta.url), 'utf8');
  for (const label of ['Cumplimiento de entregas', 'Rendimiento académico', 'Avance del plan', 'Reintentar progreso']) assert.ok(source.includes(label));
  assert.match(source, /setLoading\(true\); setData\(null\); setError\(''\)/);
  assert.match(source, /controller.signal.aborted/); assert.match(source, /return \(\) => controller.abort\(\)/);
  const {loadTsModule}=await import('./helpers/load-ts-module.mjs');
  const {classroomSections}=loadTsModule('apps/web/src/features/classrooms/ui/ClassroomNavigation.tsx');
  assert.equal(classroomSections(true).find(item=>item.key==='progress').label,'Progreso');
  assert.equal(classroomSections(false).find(item=>item.key==='progress').label,'Mi progreso');
  assert.match(shell,/tab === 'progress'/);
  assert.match(roster, /studentId: member.studentId!/); assert.match(dialogs, /summary=\{summary\}/);
  assert.match(source, /data.scope === 'classroom' \? <section aria-label="Estudiantes actuales"/);
});
