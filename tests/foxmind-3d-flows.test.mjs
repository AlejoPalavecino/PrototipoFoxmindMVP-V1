import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const id = '11111111-1111-4111-8111-111111111111';
const room = role => ({ id, revision: '2', role, archived: false, name: 'Ciencias', subject: 'Ciencias',
  division: 'A', academicYear: 2026, teacher: 'Docente sintético', timezone: 'UTC', coverKey: 'explore', plans: [], units: [] });

test('D3 API draft validation preserves three legacy cover keys and accepts seven new persisted keys', () => {
  const { draftPayload } = loadTsModule('apps/api/src/classrooms/policy.ts');
  for (const coverKey of ['explore', 'create', 'discover', 'literature', 'math', 'biology', 'society', 'science', 'creative', 'general'])
    assert.deepEqual(draftPayload({ coverKey }, false), { coverKey });
  for (const coverKey of ['unknown', '', 'GENERAL', null, ['general']])
    assert.throws(() => draftPayload({ coverKey }, false), { code: 'INVALID_INPUT' });
});
