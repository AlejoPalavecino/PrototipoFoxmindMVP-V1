import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView } from './agenda-ui-helpers.test.mjs';
import React from 'react';

const base = 'apps/web/src/features/classrooms';
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('draft persistence queues latest snapshots and publication uses the confirmed revision', async () => {
  const { createClassroomDraftPersistence } = loadTsModule(`${base}/creation/draft-persistence.ts`);
  const first = deferred(), calls = [];
  let payload = { name: 'One' };
  const persistence = createClassroomDraftPersistence({
    saveDraft: async (id, revision, value) => { calls.push([id, revision, value]); if (calls.length === 1) await first.promise; return { revision: `r${calls.length + 1}` }; },
    publishDraft: async (id, revision) => ({ id, code: revision }),
  }, { id: 'draft', revision: 'r1', payload: {} }, () => payload);
  const saving = persistence.save();
  await new Promise(resolve => setImmediate(resolve));
  payload = { name: 'Two' };
  const queued = persistence.save();
  first.resolve();
  await Promise.all([saving, queued]);
  assert.deepEqual(calls, [['draft', 'r1', { name: 'One' }], ['draft', 'r2', { name: 'Two' }]]);
  assert.deepEqual(await persistence.publish(), { id: 'draft', code: 'r3' });
  assert.equal(calls.length, 2);
});

test('draft save failure is sticky and applying extraction advances the saved snapshot', async () => {
  const { createClassroomDraftPersistence } = loadTsModule(`${base}/creation/draft-persistence.ts`);
  let writes = 0, payload = { name: 'Changed' };
  const persistence = createClassroomDraftPersistence({ saveDraft: async () => { writes++; throw new Error('CONFLICT'); } }, { id: 'draft', revision: 'r1', payload: {} }, () => payload);
  await assert.rejects(persistence.save(), /CONFLICT/);
  await assert.rejects(persistence.save(), /otra sesión/);
  assert.equal(writes, 1);
  payload = { name: 'Applied' };
  persistence.accept({ revision: 'r9', payload });
  assert.equal(persistence.isSaved(payload), true);
  assert.equal(persistence.revision(), 'r9');
  await persistence.save();
  assert.equal(writes, 1);
});

test('collection loading ignores superseded responses, errors and invalidated invitation reads', async () => {
  const { createCollectionRequests } = loadTsModule(`${base}/collection/collection-requests.ts`);
  const requests = createCollectionRequests();
  const old = requests.begin('rooms');
  const current = requests.begin('rooms');
  assert.equal(old.current(), false);
  assert.equal(current.current(), true);
  const invitations = requests.begin('invitations');
  requests.invalidate('invitations');
  assert.equal(invitations.current(), false);
  const controller = new AbortController();
  const aborted = requests.begin('drafts', controller.signal);
  controller.abort();
  assert.equal(aborted.current(), false);
});

test('enrollment adapter normalizes 8-character and legacy six digit codes and preview then explicit confirmation', async () => {
  const { createEnrollmentOperations } = loadTsModule(`${base}/enrollment/enrollment-api.ts`);
  const calls = [], api = createEnrollmentOperations({ call: async (...args) => { calls.push(args); return { confirmation: 'signed' }; } });
  await api.previewCode(' 12 34 56 ');
  assert.deepEqual(calls, [['/codes/preview', 'POST', { code: '123456' }]]);
  await api.previewCode(' abcd-efgh ');
  await api.previewCode('2345 6789');
  assert.deepEqual(calls.slice(1), [['/codes/preview', 'POST', { code: 'ABCDEFGH' }], ['/codes/preview', 'POST', { code: '23456789' }]]);
  calls.length = 1;
  await api.confirmCode('signed');
  await api.respondInvitation('invitation', 'accept');
  assert.deepEqual(calls.slice(1), [
    ['/codes/confirm', 'POST', { confirmation: 'signed' }],
    ['/invitations/invitation/accept', 'POST', {}],
  ]);
});

test('collection hook preserves newer rows and a confirmed removal against stale reads', async () => {
  const { useClassroomCollection } = loadTsModule(`${base}/collection/use-classroom-collection.ts`);
  const old = deferred(), fresh = deferred(), invitations = deferred();
  let reads = 0;
  const operations = { rooms: () => ++reads === 1 ? old.promise : fresh.promise, invitations: () => invitations.promise };
  const Host = () => React.createElement('output', { state: useClassroomCollection(operations) });
  const view = hookView(Host, {});
  try {
    await view.flush();
    const state = () => view.tree.props.state;
    const older = state().load(undefined, 'rooms');
    const newer = state().load(undefined, 'rooms');
    fresh.resolve({ teach: [{ id: 'new' }], study: [] });
    await newer; await view.flush();
    old.resolve({ teach: [{ id: 'old' }], study: [] });
    await older; await view.flush();
    assert.equal(state().data.teach[0].id, 'new');
    const loading = state().load(undefined, 'invitations');
    state().invalidate('invitations');
    state().setData(current => ({ ...current, invitations: [] }));
    invitations.resolve([{ id: 'removed' }]);
    await loading; await view.flush();
    assert.deepEqual(state().data.invitations, []);
  } finally { view.close(); }
});

test('enrollment hook waits for explicit confirmation before reporting membership', async () => {
  const { useClassroomEnrollment } = loadTsModule(`${base}/enrollment/use-classroom-enrollment.ts`);
  const calls = [], joined = [], preview = { confirmation: 'signed', classroom: { name: 'Ciencias' } };
  const operations = { previewCode: async code => { calls.push(['preview', code]); return preview; }, confirmCode: async token => calls.push(['confirm', token]) };
  const Host = () => React.createElement('output', { state: useClassroomEnrollment(operations, () => {}, async value => joined.push(value)) });
  const view = hookView(Host, {});
  try {
    await view.flush();
    const state = () => view.tree.props.state;
    state().setCode('123456'); await view.flush();
    await state().enterCode(); await view.flush();
    assert.deepEqual(calls, [['preview', '123456']]);
    assert.equal(joined.length, 0);
    assert.equal(state().preview, preview);
    await state().enterCode(); await view.flush();
    assert.deepEqual(calls.at(-1), ['confirm', 'signed']);
    assert.deepEqual(joined, [preview]);
    assert.equal(state().preview, null);
    assert.equal(state().code, '');
  } finally { view.close(); }
});

test('collection and creation adapters keep read cancellation and confirmed draft writes intact', async () => {
  const { createClassroomCollectionOperations } = loadTsModule(`${base}/collection/collection-api.ts`);
  const { createClassroomCreationOperations } = loadTsModule(`${base}/creation/creation-api.ts`);
  const calls = [], transport = { call: async (...args) => calls.push(args) };
  const collection = createClassroomCollectionOperations(transport);
  const creation = createClassroomCreationOperations(transport);
  const signal = new AbortController().signal;
  await collection.rooms(signal);
  await collection.drafts(signal);
  await collection.invitations(signal);
  await collection.deleteDraft('draft', 'r1');
  await creation.saveDraft('draft', 'r2', { wizardStep: 3, wizardMethod: 'manual' });
  await creation.publishDraft('draft', 'r3');
  assert.deepEqual(calls, [
    ['', undefined, undefined, signal], ['/drafts', undefined, undefined, signal], ['/invitations', undefined, undefined, signal],
    ['/drafts/draft', 'DELETE', { revision: 'r1', confirm: true }],
    ['/drafts/draft', 'PATCH', { revision: 'r2', payload: { wizardStep: 3, wizardMethod: 'manual' } }],
    ['/drafts/draft/publish', 'POST', { revision: 'r3' }],
  ]);
});

test('access code display groups new 8-character codes and keeps legacy six digit grouping', () => {
  const { formatAccessCode, normalizeAccessCodeInput } = loadTsModule('src/core/domain/classrooms/access-code.ts');
  assert.equal(formatAccessCode('ABCDEFGH'), 'ABCD-EFGH');
  assert.equal(formatAccessCode('123456'), '123 456');
  assert.equal(normalizeAccessCodeInput('abcd efgh'), 'ABCDEFGH');
  assert.equal(normalizeAccessCodeInput('abcd-efg1'), undefined);
});
