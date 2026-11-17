import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createFoxyPrivateAssetEditorialRepository } from '../private-asset-editorial-repository.ts';
const owner = '10000000-0000-4000-8000-000000000001', id = 'abcdef00-0000-4000-8000-000000000002', conversationId = '10000000-0000-4000-8000-000000000003';
const command = { requestId: '10000000-0000-4000-8000-000000000004', expectedRevision: '7', title: '  Title  ', description: 'Description\nline two' };
const hash = input => createHash('sha256').update(JSON.stringify(['foxy-private-editorial-v1', id, input.expectedRevision, input.title, input.description])).digest('hex');
function fixture({ state = 'READY', revision = 7n, previous, ownerAllowed = true, update = true, input = command } = {}) {
 const calls = [], steps = [["account_role='teacher' AND email_verified_at IS NOT NULL FOR UPDATE", ownerAllowed ? [{}] : []]];
 if (ownerAllowed) steps.push(['SELECT a.conversation_id', [{ conversation_id: conversationId, classroom_id: null }]], ['SELECT classroom_id FROM foxy_conversations', [{ classroom_id: null }]], ['SELECT state,revision,editorial_revision', [{ state, revision: 11n, editorial_revision: revision }]], ['SELECT asset_id,action,input_hash,editorial_revision', previous ? [previous] : []]);
 const tx = { async query(sql, ...values) { const step = steps[calls.length]; if (step) { assert.ok(sql.includes(step[0]), sql); calls.push({ sql, values }); return step[1]; } calls.push({ sql, values }); if (sql.includes('UPDATE foxy_visual_assets SET editorial_revision')) return update ? [{ editorial_revision: 8n }] : []; if (sql.includes('INSERT INTO foxy_private_asset_commands')) return []; throw Error('unexpected SQL'); } };
 return { calls, run: () => createFoxyPrivateAssetEditorialRepository().edit(tx, owner, id.toUpperCase(), input) };
}

test('private editorial edit preserves normalized identity, hash, guarded revision and receipt without mutating produced content', async () => {
 const f = fixture(); assert.deepEqual(await f.run(), { assetId: id, action: 'EDIT', editorialRevision: '8' });
 assert.equal(f.calls.length, 7);
 assert.deepEqual(f.calls[5].values, [id, owner, '7', command.title, command.description]);
 assert.match(f.calls[5].sql, /editorial_revision=\$3::bigint AND state='READY'/);
 assert.doesNotMatch(f.calls[5].sql, /\bSET (?:title|description|diagram|digest|revision)=/);
 assert.deepEqual(f.calls[6].values, [owner, command.requestId, id, hash(command), 11n, 8n]);
});

test('private editorial replay follows reauthorization and precedes current state/revision checks', async () => {
 const previous = { asset_id: id, action: 'EDIT', input_hash: hash(command), editorial_revision: 8n };
 const f = fixture({ state: 'DISCARDED', revision: 20n, previous });
 assert.deepEqual(await f.run(), { assetId: id, action: 'EDIT', editorialRevision: '8' }); assert.equal(f.calls.length, 5);
});

test('private editorial rejects a reused request for another asset, action or body without mutation', async () => {
 for (const change of [{ asset_id: owner }, { action: 'DISCARD' }, { input_hash: 'different' }]) {
  const f = fixture({ previous: { asset_id: id, action: 'EDIT', input_hash: hash(command), editorial_revision: 8n, ...change } });
  await assert.rejects(f.run(), { code: 'CONFLICT' }); assert.equal(f.calls.length, 5);
 }
});

test('private editorial rejects non-ready, stale and exhausted revisions before its guarded update', async () => {
 for (const options of [{ state: 'PROCESSING' }, { state: 'DISCARDED' }, { revision: 8n }, { revision: 9223372036854775807n, input: { ...command, expectedRevision: '9223372036854775807' } }]) {
  const f = fixture(options); await assert.rejects(f.run(), { code: 'CONFLICT' }); assert.equal(f.calls.length, 5);
 }
});

test('private editorial preserves owner rejection and cannot record a failed CAS update', async () => {
 const denied = fixture({ ownerAllowed: false }); await assert.rejects(denied.run(), { code: 'NOT_FOUND' }); assert.equal(denied.calls.length, 1);
 const stale = fixture({ update: false }); await assert.rejects(stale.run(), { code: 'CONFLICT' }); assert.equal(stale.calls.length, 6);
});
