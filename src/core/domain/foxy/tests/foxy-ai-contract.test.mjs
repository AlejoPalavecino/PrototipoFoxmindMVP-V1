import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const domain = () => import('../../index.ts');
const general = { kind: 'GENERAL' };
const classroom = { kind: 'CLASSROOM', classroomId: randomUUID() };
const create = (overrides = {}) => ({ requestId: randomUUID(), title: 'Repaso', context: general, ...overrides });
const send = (overrides = {}) => ({ requestId: randomUUID(), revision: '3', purpose: 'CHAT', text: 'Prepará un repaso',
  selection: { topicIds: [], sourceIds: [] }, ...overrides });
const invalid = (fn) => assert.throws(fn, { code: 'INVALID_INPUT', message: 'INVALID_INPUT' });

test('conversation contract accepts fixed general and classroom contexts and rejects authority injection', async () => {
  const { parseCreateFoxyConversation: parse } = await domain();
  assert.equal(typeof parse, 'function');
  for (const context of [general, classroom]) {
    const value = create({ context });
    assert.deepEqual(parse(value), value);
  }
  const value = create({ context: classroom });
  for (const bad of [null, [], 'object', { ...value, actorId: randomUUID() },
    { ...value, requestId: 'bad' }, { ...value, title: '' }, { ...value, title: 'x'.repeat(201) },
    { ...value, context: { kind: 'GENERAL', classroomId: randomUUID() } },
    { ...value, context: { kind: 'CLASSROOM' } }, { ...value, context: { kind: 'CLASSROOM', classroomId: 'bad' } },
    { ...value, context: { ...classroom, actorId: randomUUID() } }, { ...value, context: { kind: 'OTHER' } }]) invalid(() => parse(bad));
  for (const key of Object.keys(value)) { const bad = { ...value }; delete bad[key]; invalid(() => parse(bad)); }
  assert.equal(parse(create({ title: '🦊'.repeat(200) })).title.length, 400);
});

test('message contract allows all purposes and retains explicit classroom selection', async () => {
  const { parseSendFoxyMessage: parse } = await domain();
  assert.equal(typeof parse, 'function');
  for (const purpose of ['CHAT', 'STUDY_MATERIAL', 'REVIEW', 'SUMMARY', 'ACTIVITY_IDEAS', 'LESSON_PLAN']) {
    const value = send({ purpose });
    assert.deepEqual(parse(value, general), value);
  }
  const selection = { topicIds: [randomUUID()], sourceIds: [`plan:${randomUUID()}`, `material:${randomUUID()}`, `activity:${randomUUID()}`] };
  const value = send({ selection });
  assert.deepEqual(parse(value, classroom), value);
});

test('message contract enforces exact objects, request IDs, purpose and decimal int64 revisions', async () => {
  const { parseSendFoxyMessage: parse } = await domain();
  const value = send();
  for (const bad of [null, [], { ...value, classroomId: classroom.classroomId }, { ...value, context: classroom },
    { ...value, actorId: randomUUID() }, { ...value, requestId: 'request' }, { ...value, purpose: 'OTHER' },
    { ...value, revision: 1 }, { ...value, revision: '-1' }, { ...value, revision: '1\n' },
    { ...value, revision: '9223372036854775808' }, { ...value, selection: { ...value.selection, extra: true } },
    { ...value, selection: null }]) invalid(() => parse(bad, general));
  for (const key of Object.keys(value)) { const bad = { ...value }; delete bad[key]; invalid(() => parse(bad, general)); }
  assert.equal(parse(send({ revision: '9223372036854775807' }), general).revision, '9223372036854775807');
});

test('message text counts Unicode code points and rejects disallowed controls', async () => {
  const { parseSendFoxyMessage: parse } = await domain();
  const text = `${'🦊'.repeat(4998)}\n\t`;
  assert.equal(parse(send({ text }), general).text, text);
  for (const bad of ['', '🦊'.repeat(5001), 'a\u0000b', 'a\u000db', 'a\u007fb']) invalid(() => parse(send({ text: bad }), general));
});

test('classroom sources and topics obey explicit types, uniqueness and limits', async () => {
  const { parseSendFoxyMessage: parse } = await domain();
  const topicIds = Array.from({ length: 100 }, () => randomUUID());
  const docs = Array.from({ length: 6 }, () => `material:${randomUUID()}`);
  const activities = Array.from({ length: 14 }, () => `activity:${randomUUID()}`);
  const selection = { topicIds, sourceIds: [...docs, ...activities] };
  assert.deepEqual(parse(send({ selection }), classroom).selection, selection);
  for (const bad of [
    { topicIds: [...topicIds, randomUUID()], sourceIds: [] }, { topicIds: [topicIds[0], topicIds[0]], sourceIds: [] },
    { topicIds: ['bad'], sourceIds: [] }, { topicIds: [], sourceIds: [...docs, `plan:${randomUUID()}`] },
    { topicIds: [], sourceIds: [...selection.sourceIds, `activity:${randomUUID()}`] },
    { topicIds: [], sourceIds: [docs[0], docs[0]] }, { topicIds: [], sourceIds: [`file:${randomUUID()}`] },
    { topicIds: [], sourceIds: ['plan:bad'] }, { topicIds: 'bad', sourceIds: [] }, { topicIds: [], sourceIds: null }
  ]) invalid(() => parse(send({ selection: bad }), classroom));
});

test('general context rejects classroom topics and sources', async () => {
  const { parseSendFoxyMessage: parse } = await domain();
  for (const selection of [{ topicIds: [randomUUID()], sourceIds: [] },
    { topicIds: [], sourceIds: [`material:${randomUUID()}`] }]) invalid(() => parse(send({ selection }), general));
});

test('topic UUIDs cannot be duplicated with mixed letter case', async () => {
  const { parseSendFoxyMessage: parse } = await domain();
  const topic = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  invalid(() => parse(send({ selection: { topicIds: [topic, topic.toUpperCase()], sourceIds: [] } }), classroom));
});

test('source UUIDs cannot be duplicated with mixed letter case', async () => {
  const { parseSendFoxyMessage: parse } = await domain();
  const source = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  invalid(() => parse(send({ selection: { topicIds: [], sourceIds: [`material:${source}`, `material:${source.toUpperCase()}`] } }), classroom));
});
