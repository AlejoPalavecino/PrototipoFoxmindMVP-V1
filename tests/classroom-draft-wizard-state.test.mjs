import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
const valid = { name: 'Aula', subject: 'Arte', division: 'A', academicYear: 2026, timezone: 'UTC', coverKey: 'explore', units: [{ name: 'Unidad', topics: [{ name: 'Tema' }] }] };
test('draft wizard state survives JSON roundtrip and is excluded from publication', () => {
  const { draftPayload } = loadTsModule('src/core/domain/classrooms/policy.ts');
  assert.deepEqual(draftPayload(valid, false), valid);
  for (const wizardStep of [0, 1, 2, 3]) for (const wizardMethod of ['ai', 'manual', null]) {
    const draft = { ...valid, wizardStep, wizardMethod };
    const saved = draftPayload(draft, false);
    assert.deepEqual(draftPayload(JSON.parse(JSON.stringify(saved)), false), draft);
    assert.deepEqual(draftPayload(saved, true), valid);
  }
});
test('wizard metadata is strictly bounded and does not weaken existing draft validation', () => {
  const { draftPayload } = loadTsModule('src/core/domain/classrooms/policy.ts');
  for (const publish of [false, true]) {
    for (const wizardStep of [-1, 4, 1.5, '2', null, true]) assert.throws(() => draftPayload({ ...valid, wizardStep }, publish), { code: 'INVALID_INPUT' });
    for (const wizardMethod of ['AUTO', '', 1, false, {}]) assert.throws(() => draftPayload({ ...valid, wizardMethod }, publish), { code: 'INVALID_INPUT' });
    assert.throws(() => draftPayload({ ...valid, wizardStep: 1, ownerId: 'foreign' }, publish), { code: 'INVALID_INPUT' });
    assert.throws(() => draftPayload({ ...valid, wizardMethod: 'ai', coverKey: 'invalid' }, publish), { code: 'INVALID_INPUT' });
  }
});

test('draft service saves and reloads wizard metadata while retaining owner, role and revision checks', async () => {
  const { DraftService } = loadTsModule('apps/api/src/modules/classrooms/drafts/application/drafts.ts');
  const { createDraftsRepository } = loadTsModule('apps/api/src/modules/classrooms/drafts/infrastructure/drafts-repository.ts');
  const id = '10000000-0000-4000-8000-000000000001', owner = '20000000-0000-4000-8000-000000000002';
  let stored = { id, owner_id: owner, revision: 1n, payload: {}, published_classroom_id: null };
  const calls = [];
  const tx = { query: async (sql, ...params) => {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT')) {
      assert.match(sql, /owner_id=\$2::uuid AND deleted_at IS NULL FOR UPDATE/);
      return params[0] === id && params[1] === owner ? [stored] : [];
    }
    assert.match(sql, /SET payload=\$2::jsonb,revision=revision\+1/);
    stored = { ...stored, revision: stored.revision + 1n, payload: JSON.parse(params[1]) };
    return [stored];
  } };
  const service = new DraftService({ run: async (actor, _write, work) => work(tx, actor), classroom() {} }, createDraftsRepository(), {});
  const actor = { id: owner, account_role: 'teacher' };
  const payload = { ...valid, wizardStep: 2, wizardMethod: 'manual' };
  const saved = await service.saveDraft(actor, id, { revision: '1', payload });
  assert.equal(saved.revision, '2');
  assert.deepEqual((await service.getDraft(actor, id)).payload, payload);
  await assert.rejects(service.saveDraft(actor, id, { revision: '1', payload }), { code: 'CONFLICT' });
  await assert.rejects(service.getDraft({ ...actor, id: '30000000-0000-4000-8000-000000000003' }, id), { code: 'FORBIDDEN' });
  await assert.rejects(service.getDraft({ ...actor, account_role: 'student' }, id), { code: 'FORBIDDEN' });
  assert.equal(calls.filter(call => call.sql.startsWith('UPDATE')).length, 1);
});
