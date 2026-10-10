import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSubmissionDeliveryState } from '../application/submissionDeliveryState';
import { selectSubmissionAttachments } from '../application/submissionAttachments';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

for (const outcome of ['resolve', 'reject'] as const) {
  for (const replay of [false, true]) {
    test(`${outcome} after cleanup${replay ? ' and StrictMode setup replay' : ''} suppresses result and pending callbacks`, async () => {
      const state = createSubmissionDeliveryState();
      state.activate();
      const isCurrent = state.captureLifetime();
      const completion = deferred();
      const changes: boolean[] = [];
      const operation = state.deliver({ text: 'Respuesta' }, () => completion.promise, pending => changes.push(pending));
      state.invalidate();
      if (replay) state.activate();
      assert.equal(isCurrent(), false, 'older attempts never become live again');
      if (outcome === 'resolve') completion.resolve();
      else completion.reject(new Error('late failure'));
      assert.deepEqual(await operation, { status: 'ignored' });
      assert.deepEqual(changes, [true]);
      assert.equal(state.status, outcome === 'resolve' ? 'submitted' : 'draft', 'underlying completion is not cancelled');
      if (replay) {
        assert.equal(state.captureLifetime()(), true);
        if (outcome === 'resolve') assert.equal(state.edit(), true);
        assert.deepEqual(await state.deliver({ text: 'Nuevo borrador' }, () => {}, pending => changes.push(pending)), { status: 'submitted' });
        assert.deepEqual(changes, [true, true, false]);
      }
    });
  }
}

test('cleanup after helper completion still invalidates the awaiting component publication', async () => {
  const state = createSubmissionDeliveryState();
  state.activate();
  const isCurrent = state.captureLifetime();
  assert.deepEqual(await state.deliver({ text: 'Respuesta' }, () => {}), { status: 'submitted' });
  state.invalidate();
  state.activate();
  assert.equal(isCurrent(), false);
  assert.equal(state.captureLifetime()(), true);
});

// Executes the same gate used by StudentActivityDetail, without a mounted React DOM.
test('pending synchronously blocks duplicate/reentrant delivery and editing until callback settles', async () => {
  const state = createSubmissionDeliveryState();
  const completion = deferred();
  const changes: boolean[] = [];
  const draft = { text: 'Respuesta' };
  let calls = 0;
  let reentrant!: Promise<unknown>;
  const callback = () => {
    calls++;
    reentrant = state.deliver(draft, callback);
    return completion.promise;
  };
  const operation = state.deliver(draft, callback, pending => changes.push(pending));
  assert.equal(state.status, 'pending');
  assert.equal(state.edit(), false);
  assert.deepEqual(await state.deliver(draft, callback), { status: 'ignored' });
  assert.deepEqual(await reentrant, { status: 'ignored' });
  assert.equal(calls, 1);
  assert.deepEqual(changes, [true]);
  completion.resolve();
  assert.deepEqual(await operation, { status: 'submitted' });
  assert.equal(state.status, 'submitted');
  assert.deepEqual(changes, [true, false]);
  assert.deepEqual(await state.deliver(draft, callback), { status: 'ignored' });
  assert.equal(state.edit(), true);
  assert.equal(state.status, 'draft');
});

test('rejected asynchronous delivery retains the exact draft and File contents and permits retry', async () => {
  const state = createSubmissionDeliveryState();
  const completion = deferred();
  const file = new File(['contenido'], 'Trabajo.pdf');
  const draft = { text: 'Mi nota', attachments: selectSubmissionAttachments([], [file]).attachments };
  let received: unknown;
  const operation = state.deliver(draft, payload => { received = payload; return completion.promise; });
  completion.reject(new Error('Simulated failure'));
  const failure = await operation;
  assert.equal(failure.status, 'error');
  assert.equal(state.status, 'draft');
  assert.strictEqual(received, draft);
  assert.equal(draft.text, 'Mi nota');
  assert.strictEqual(draft.attachments[0].file, file);
  assert.equal(await draft.attachments[0].file.text(), 'contenido');
  assert.deepEqual(await state.deliver(draft, () => {}), { status: 'submitted' });
});

test('sync callbacks succeed only after return; throws, missing callback and empty drafts never succeed', async () => {
  const state = createSubmissionDeliveryState();
  const changes: boolean[] = [];
  assert.equal((await state.deliver({ text: 'Respuesta' })).status, 'error');
  assert.equal(state.status, 'draft');
  for (const draft of [{}, { text: '   ' }, { attachments: [] }]) {
    let called = false;
    assert.equal((await state.deliver(draft, () => { called = true; })).status, 'error');
    assert.equal(called, false);
  }
  assert.equal((await state.deliver({ text: 'Respuesta' }, () => { throw new Error('sync'); })).status, 'error');
  const operation = state.deliver({ text: 'Solo texto' }, () => {
    assert.equal(state.status, 'pending');
  }, pending => changes.push(pending));
  assert.equal(state.status, 'pending', 'No success before awaited sync callback completion');
  assert.deepEqual(await operation, { status: 'submitted' });
  assert.deepEqual(changes, [true, false]);
});
