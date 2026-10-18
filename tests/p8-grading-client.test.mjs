import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClassroomClient } from '../apps/classrooms-ui/api.ts';
const id = 'a1111111-1111-4111-8111-111111111111';
test('private correction client sends canonical decimal text with fresh CSRF, never an attempt capability', async () => {
  const calls = []; let csrf = 0;
  const client = createClassroomClient({ csrfToken: async () => String(++csrf), fetch: async (path, options) => { calls.push({ path, ...options }); return Response.json({}); } });
  const body = { revision: '4', overallGrade: '8.50', overallFeedback: null, questions: [] };
  await client.call(`/${id}/attempts/${id}/grading`, 'POST', body);
  assert.equal(calls[0].body, JSON.stringify(body)); assert.equal(calls[0].headers['X-CSRF-Token'], '1');
  assert.equal(calls[0].headers['X-Attempt-Editor'], undefined);
  await client.call(`/${id}/attempts/${id}/grading`); assert.equal(calls[1].method, 'GET'); assert.equal(calls[1].body, undefined);
});
test('actual all-type history hosts teacher-only private correction without a publication affordance', async () => {
  const history = await readFile(new URL('../apps/classrooms-ui/AttemptHistory.tsx', import.meta.url), 'utf8');
  const editor = await readFile(new URL('../apps/classrooms-ui/GradingEditor.tsx', import.meta.url), 'utf8');
  assert.match(history, /teacher && attempt.status === 'SUBMITTED'.*Corregir intento/);
  assert.match(history, /<GradingEditor/); assert.match(editor, /Guardar corrección privada/);
  assert.match(editor, /overallGrade: data.activity.type === 'ASSIGNMENT'/); assert.match(editor, /manualPoints/);
  assert.match(editor, /No se ha publicado/); assert.ok(!editor.includes('Aprobado')); assert.ok(!editor.includes('/publish'));
});
