import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Classroom } from '../model/Classroom';

import { createClassroomJoinState } from '../application/classroomJoinState';
const state = createClassroomJoinState;
const classroom = { id: 'joined', subject: 'Historia', course: '2° B' } as Classroom;
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('join gate blocks duplicate events and conflicting edits immediately, until confirmation', async () => {
  const gate = state(), work = deferred<{ status: 'generic'; classroom: Classroom }>();
  let calls = 0, confirmations = 0;
  const pending: boolean[] = [];
  const operation = (code: string, snapshot: Classroom[]) => {
    calls++; assert.equal(code, ' raw generic '); assert.equal(snapshot, enrolled); return work.promise;
  };
  const enrolled = [classroom];
  const first = gate.join(' raw generic ', enrolled, operation, {
    onConfirmed: () => { confirmations++; }, onPendingChange: value => pending.push(value),
  });
  assert.equal(gate.pending, true); assert.equal(gate.edit(), false);
  assert.equal((await gate.join('different', [], operation)).status, 'ignored');
  assert.equal(calls, 1); assert.equal(confirmations, 0); assert.deepEqual(pending, [true]);
  work.resolve({ status: 'generic', classroom });
  assert.equal((await first).status, 'confirmed'); assert.equal(confirmations, 1);
  assert.equal(gate.pending, false); assert.equal(gate.edit(), true); assert.deepEqual(pending, [true, false]);
});

test('sync outcomes confirm immediately without fictional delays, including prototype duplicates', async () => {
  for (const status of ['duplicate', 'catalogue', 'generic'] as const) {
    const gate = state(); let confirmed: unknown;
    const result = { status, classroom };
    const attempt = gate.join('anything', [], () => result, { onConfirmed: value => { confirmed = value; } });
    assert.equal(confirmed, result, 'Current synchronous operation completes in the event turn');
    assert.equal(gate.pending, false); assert.equal((await attempt).status, 'confirmed');
  }
});

test('throws and promise rejections release the gate and permit retry without confirmation', async () => {
  for (const asynchronous of [false, true]) {
    const gate = state(); let confirmations = 0; const errors: string[] = [];
    const callbacks = { onConfirmed: () => { confirmations++; }, onError: (message: string) => errors.push(message) };
    const failed = await gate.join('kept code', [], () => {
      if (asynchronous) return Promise.reject(new Error('private details'));
      throw new Error('private details');
    }, callbacks);
    assert.equal(failed.status, 'error'); assert.equal(confirmations, 0); assert.equal(gate.pending, false);
    assert.equal(errors.length, 1); assert.match(errors[0], /código se conserva/); assert.doesNotMatch(errors[0], /private details/);
    assert.equal((await gate.join('kept code', [], () => ({ status: 'duplicate', classroom }), callbacks)).status, 'confirmed');
    assert.equal(confirmations, 1);
  }
});

test('blank, missing, malformed and domain-rejected operations never fake confirmation', async () => {
  const gate = state(); let confirmations = 0, calls = 0;
  const callbacks = { onConfirmed: () => { confirmations++; } };
  assert.equal((await gate.join(' \t ', [], () => { calls++; return { status: 'generic', classroom }; }, callbacks)).status, 'error');
  assert.equal(calls, 0);
  assert.equal((await gate.join('code', [], undefined, callbacks)).status, 'error');
  assert.equal((await gate.join('code', [], 123 as unknown as Parameters<typeof gate.join>[2], callbacks)).status, 'error');
  for (const value of [undefined, null, {}, { status: 'unknown', classroom }, { status: { toString: () => 'generic' }, classroom }, { status: 'generic' }, { status: 'catalogue', classroom: {} }, { status: 'rejected' }, Promise.resolve({ status: 'rejected' })]) {
    const operation = (() => value) as Parameters<typeof gate.join>[2];
    assert.equal((await gate.join('code', [], operation, callbacks)).status, 'error');
    assert.equal(gate.pending, false);
  }
  assert.equal(confirmations, 0);
});

test('invalidated dialog completions cannot confirm, report errors or alter a newer visit', async () => {
  for (const reject of [false, true]) {
    const gate = state(), work = deferred<{ status: 'catalogue'; classroom: Classroom }>();
    const notifications: unknown[] = [];
    const attempt = gate.join('old code', [], () => work.promise, {
      onConfirmed: value => notifications.push(value), onError: value => notifications.push(value),
      onPendingChange: value => notifications.push(value),
    });
    gate.invalidate();
    if (reject) work.reject(new Error('late rejection'));
    else work.resolve({ status: 'catalogue', classroom });
    assert.equal((await attempt).status, 'stale'); assert.deepEqual(notifications, [true]);
    assert.equal(gate.pending, false); assert.equal(gate.edit(), true);
    assert.equal((await gate.join('new code', [], () => ({ status: 'generic', classroom }))).status, 'confirmed');
  }
});
