import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClassroomClient } from '../apps/classrooms-ui/api.ts';
const id = 'a1111111-1111-4111-8111-111111111111';

test('reopening client uses fresh CSRF without teacher-issued editor capability; original wall payload remains exact', async () => {
  const calls = []; let csrf = 0;
  const client = createClassroomClient({ csrfToken: async () => String(++csrf), fetch: async (path, options) => { calls.push({ path, ...options }); return Response.json({}); } });
  const data = { revision: '1', studentId: id, deadline: null, confirm: true };
  await client.call(`/${id}/activities/${id}/reopen`, 'POST', data);
  assert.equal(calls[0].body, JSON.stringify(data)); assert.equal(calls[0].headers['X-Attempt-Editor'], undefined);
  await client.call(`/${id}/activities/${id}/history`);
  assert.equal(calls[1].method, 'GET'); assert.equal(calls[1].body, undefined);
  const wall = { revision: '2', operation: { action: 'publish', body: 'Existing' } };
  await client.call(`/${id}/wall`, 'POST', wall); assert.equal(calls.at(-1).body, JSON.stringify(wall));
});

test('actual UI wires all-type history/reopening and target navigation without filtering teacher submissions to practical work', async () => {
  const [activities, history, view] = await Promise.all(['Activities.tsx', 'AttemptHistory.tsx', 'ClassroomView.tsx'].map(name => readFile(new URL(`../apps/classrooms-ui/${name}`, import.meta.url), 'utf8')));
  assert.match(activities, /<AttemptHistory/); assert.ok(!activities.includes("teacher && activity.type === 'ASSIGNMENT'"));
  assert.match(history, /Confirmar nuevo intento/); assert.match(history, /offsetMinutes/); assert.match(history, /currentMember/);
  assert.match(view, /wallTarget\?\.classroomId === id \? wallTarget : null/);
  assert.match(view, /'postId' in activeWallTarget \? 'wall' : 'activities'/);
});
