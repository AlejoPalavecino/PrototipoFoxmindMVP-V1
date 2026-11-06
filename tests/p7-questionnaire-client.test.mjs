import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomClient } from '../apps/classrooms-ui/api.ts';
const id = 'a1111111-1111-4111-8111-111111111111';

test('answer and submit client use separate explicit editor-bearing requests with fresh CSRF; old client shapes remain unchanged', async () => {
  let csrf = 0; const calls = [], editor = { token: 'a'.repeat(43), epoch: '3' };
  const client = createClassroomClient({ csrfToken: async () => String(++csrf), fetch: async (path, options) => { calls.push({ path, ...options }); return Response.json({ revision: '2' }); } });
  const answer = { revision: '1', questionId: id, text: '  Preserve\nplain text 😀  ', optionIds: [] };
  await client.attempt(`/${id}/attempts/${id}/answer`, answer, editor);
  assert.equal(calls[0].path, `/classrooms/${id}/attempts/${id}/answer`); assert.equal(calls[0].body, JSON.stringify(answer));
  await client.attempt(`/${id}/attempts/${id}/submit-answers`, { revision: '2', confirm: true, confirmIncomplete: true }, editor);
  for (const call of calls) { assert.equal(call.headers['X-Attempt-Editor'], editor.token); assert.equal(call.headers['X-Attempt-Epoch'], '3'); assert.equal(call.credentials, 'same-origin'); assert.equal(call.method, 'POST'); }
  assert.notEqual(calls[0].headers['X-CSRF-Token'], calls[1].headers['X-CSRF-Token']);
  await client.call(`/${id}/plan`, 'POST', { revision: '3', operation: { action:'setTopicState',id:'11111111-1111-4111-8111-111111111111',status:'TAUGHT' } });
  assert.equal(calls.at(-1).headers['X-Attempt-Editor'], undefined); assert.equal(calls.at(-1).headers['X-Attempt-Epoch'], undefined);
  await client.attempt(`/${id}/attempts/${id}/submit-practical`, { revision: '4', confirm: true }, editor);
  assert.deepEqual(JSON.parse(calls.at(-1).body), { revision: '4', confirm: true });
});
