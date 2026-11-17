import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createFoxyResourceRepository } from '../resource-repository.ts';
const owner = '10000000-0000-4000-8000-000000000001', id = 'abcdef00-0000-4000-8000-000000000002';
const conversationId = '10000000-0000-4000-8000-000000000003', turnId = '10000000-0000-4000-8000-000000000004';
const input = { requestId: '10000000-0000-4000-8000-000000000005', revision: '7', title: '  Edited  ', markdown: 'Saved text' };
const row = { id, owner_id: owner, conversation_id: conversationId, source_turn_id: turnId, title: 'Original', markdown: 'Original text', revision: 7n };
const view = value => ({ id: value.id, conversationId: value.conversation_id, sourceTurnId: value.source_turn_id, title: value.title, markdown: value.markdown, revision: String(value.revision) });
const hash = value => createHash('sha256').update(JSON.stringify({ id: id.toLowerCase(), revision: value.revision, title: value.title, markdown: value.markdown })).digest('hex');
function scripted(steps) {
 const calls = [], tx = { async query(sql, ...values) { const step = steps[calls.length]; assert.ok(step, 'unexpected SQL'); assert.ok(sql.includes(step[0]), sql); calls.push({ sql, values }); return step[1]; } };
 return { tx, calls, complete() { assert.equal(calls.length, steps.length); } };
}
const locked = current => [["account_role='teacher' FOR UPDATE", [{ id: owner }]], ['SELECT r.* FROM foxy_resources', current ? [current] : []]];

test('resource edit preserves locks, hash serialization, revision and receipt in the exact caller tx', async () => {
 const updated = { ...row, title: input.title, markdown: input.markdown, revision: 8n };
 const f = scripted([...locked(row), ['SELECT input_hash,result', []], ['UPDATE foxy_resources SET title', [updated]], ['INSERT INTO foxy_resource_requests', []]]);
 const result = await createFoxyResourceRepository().edit(f.tx, owner, id.toUpperCase(), input);
 assert.deepEqual(result, { edited: true, resource: view(updated) }); f.complete();
 assert.match(f.calls[1].sql, /FOR UPDATE OF r/);
 assert.deepEqual(f.calls[3].values, [owner, id.toUpperCase(), input.title, input.markdown]);
 assert.deepEqual(f.calls[4].values, [owner, input.requestId, id.toUpperCase(), hash(input), JSON.stringify(view(updated))]);
});

test('resource edit replays its original result after reauthorization even when current revision advanced', async () => {
 const saved = view({ ...row, revision: 8n }), f = scripted([...locked({ ...row, revision: 12n }), ['SELECT input_hash,result', [{ input_hash: hash(input), result: saved }]]]);
 assert.deepEqual(await createFoxyResourceRepository().edit(f.tx, owner, id, input), { edited: false, resource: saved }); f.complete();
});

test('resource edit rejects request reuse and stale revisions without mutation', async () => {
 for (const [current, prior] of [[row, { input_hash: 'different', result: view(row) }], [{ ...row, revision: 8n }, null]]) {
  const f = scripted([...locked(current), ['SELECT input_hash,result', prior ? [prior] : []]]);
  await assert.rejects(createFoxyResourceRepository().edit(f.tx, owner, id, input), { code: 'CONFLICT' }); f.complete();
 }
});

test('resource edit cannot save a receipt when its guarded update produces no row', async () => {
 const f = scripted([...locked(row), ['SELECT input_hash,result', []], ['UPDATE foxy_resources SET title', []]]);
 await assert.rejects(createFoxyResourceRepository().edit(f.tx, owner, id, input), { code: 'CONFLICT' }); f.complete();
});

test('resource owner or row rejection stops before reading private request receipts', async () => {
 for (const steps of [[["account_role='teacher' FOR UPDATE", []]], locked(null)]) {
  const f = scripted(steps); await assert.rejects(createFoxyResourceRepository().edit(f.tx, owner, id, input), { code: 'NOT_FOUND' }); f.complete();
 }
});

test('fromTurn requires READY before looking for replay, and an existing resource does not reparse answer content', async () => {
 const pending = scripted([["account_role='teacher' FOR UPDATE", [{}]], ['SELECT t.state,t.answer', [{ state: 'QUEUED', answer: null }]]]);
 await assert.rejects(createFoxyResourceRepository().fromTurn(pending.tx, owner, conversationId, turnId), { code: 'CONFLICT' }); pending.complete();
 const replay = scripted([["account_role='teacher' FOR UPDATE", [{}]], ['SELECT t.state,t.answer', [{ state: 'READY', answer: null }]], ['SELECT * FROM foxy_resources', [row]]]);
 assert.deepEqual(await createFoxyResourceRepository().fromTurn(replay.tx, owner, conversationId, turnId), { created: false, resource: view(row) }); replay.complete();
});

test('fromTurn rejects oversized new content before inserting any resource', async () => {
 const answer = { schemaVersion: 'foxy-answer-v1', title: 'Title', markdown: 'x'.repeat(50001), references: [], warnings: [], missingInformation: [] };
 const f = scripted([["account_role='teacher' FOR UPDATE", [{}]], ['SELECT t.state,t.answer', [{ state: 'READY', answer }]], ['SELECT * FROM foxy_resources', []]]);
 await assert.rejects(createFoxyResourceRepository().fromTurn(f.tx, owner, conversationId, turnId), { code: 'INVALID_INPUT' }); f.complete();
});
