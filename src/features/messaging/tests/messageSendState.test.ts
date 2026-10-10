import assert from 'node:assert/strict';
import test from 'node:test';
import { runMessageSend, sendLocalMessage, type MessageSendState } from '../application/messageSendState';

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness() {
  const gate = { current: false };
  const states: MessageSendState[] = [];
  const draft: { text: string; attachment: { id: string } | null; reply: { id: string } | null; tag: string | null } = {
    text: 'Consulta', attachment: { id: 'file' }, reply: { id: 'reply' }, tag: 'Duda TP',
  };
  let clears = 0;
  const send = (operation?: () => void | Promise<void>, isCurrent = () => true) => runMessageSend(gate, {
    operation, onState: state => states.push(state), isCurrent,
    onConfirmed: () => { clears++; draft.text = ''; draft.attachment = null; draft.reply = null; draft.tag = null; },
  });
  return { gate, states, draft, send, clears: () => clears };
}

test('sync success clears only after operation confirmation and pending publication', async () => {
  const h = harness();
  const before = { ...h.draft };
  const result = h.send(() => {
    assert.equal(h.gate.current, true);
    assert.deepEqual(h.states, [{ pending: true, error: null }]);
    assert.deepEqual(h.draft, before);
  });
  assert.deepEqual(h.draft, before, 'even a sync callback is awaited before reset');
  assert.equal(await result, true);
  assert.equal(h.clears(), 1);
  assert.deepEqual(h.draft, { text: '', attachment: null, reply: null, tag: null });
  assert.deepEqual(h.states.at(-1), { pending: false, error: null });
});

for (const kind of ['throw', 'reject'] as const) {
  test(`${kind} retains complete draft, exposes Spanish feedback and permits retry`, async () => {
    const h = harness(); const before = { ...h.draft };
    const fail = () => { if (kind === 'throw') throw Error('failure'); return Promise.reject(Error('failure')); };
    assert.equal(await h.send(fail), false);
    assert.deepEqual(h.draft, before); assert.equal(h.clears(), 0); assert.equal(h.gate.current, false);
    assert.match(h.states.at(-1)!.error!, /No se pudo completar el envío.*borrador.*reintentar/);
    assert.equal(await h.send(() => {}), true);
    assert.equal(h.clears(), 1); assert.equal(h.states.at(-1)!.error, null);
  });
}

test('promise success waits and rapid/reentrant invocations share a synchronous gate', async () => {
  const h = harness(); const wait = deferred(); const before = { ...h.draft }; let calls = 0;
  let reentrant: Promise<boolean>;
  const result = h.send(() => { calls++; reentrant = h.send(() => { calls++; }); return wait.promise; });
  assert.equal(await reentrant!, false);
  assert.equal(await h.send(() => { calls++; }), false);
  assert.equal(calls, 1); assert.deepEqual(h.draft, before); assert.equal(h.gate.current, true);
  wait.resolve(); assert.equal(await result, true); assert.equal(h.clears(), 1);
  assert.equal(h.gate.current, false);
});

test('gate is acquired before pending observers can reenter', async () => {
  const gate = { current: false }; let calls = 0; let nested: Promise<boolean>;
  const result = runMessageSend(gate, {
    operation: () => { calls++; }, onConfirmed: () => {},
    onState: state => { if (state.pending) nested = runMessageSend(gate, {
      operation: () => { calls++; }, onState: () => {}, onConfirmed: () => {},
    }); },
  });
  assert.equal(await nested!, false); assert.equal(await result, true); assert.equal(calls, 1);
});

test('changing conversation visit while pending cannot clear the new draft, even after returning', async () => {
  const h = harness(); const wait = deferred(); const captured = {}; let current = captured;
  const result = h.send(() => wait.promise, () => current === captured);
  current = {}; h.draft.text = 'Otra conversación';
  current = {}; h.draft.text = 'Nuevo borrador en la conversación original';
  wait.resolve(); assert.equal(await result, true);
  assert.equal(h.clears(), 0); assert.equal(h.draft.text, 'Nuevo borrador en la conversación original');
});

for (const outcome of ['resolve', 'reject'] as const) {
  for (const replay of [false, true]) {
    test(`${outcome} after cleanup${replay ? ' and setup replay' : ''} suppresses callbacks but releases the internal gate`, async () => {
      const gate = { current: false };
      const states: MessageSendState[] = [];
      const wait = deferred();
      let generation = 1;
      let live = true;
      let confirmations = 0;
      const capturedGeneration = generation;
      const isLive = () => live && generation === capturedGeneration;
      const result = runMessageSend(gate, {
        operation: () => wait.promise,
        isLive,
        isCurrent: isLive,
        onState: state => states.push(state),
        onConfirmed: () => { confirmations++; },
      });
      live = false;
      generation++;
      if (replay) { live = true; generation++; }
      if (outcome === 'resolve') wait.resolve();
      else wait.reject(Error('late failure'));
      assert.equal(await result, outcome === 'resolve', 'operation semantics remain unchanged');
      assert.equal(confirmations, 0);
      assert.deepEqual(states, [{ pending: true, error: null }]);
      assert.equal(gate.current, false);
      if (replay) {
        const newGeneration = generation;
        assert.equal(await runMessageSend(gate, {
          operation: () => {},
          isLive: () => live && generation === newGeneration,
          onState: state => states.push(state),
          onConfirmed: () => { confirmations++; },
        }), true);
        assert.equal(confirmations, 1);
        assert.deepEqual(states.slice(1), [{ pending: true, error: null }, { pending: false, error: null }]);
      }
    });
  }

  test(`${outcome} still releases visible pending after a mounted conversation change`, async () => {
    const gate = { current: false };
    const states: MessageSendState[] = [];
    const wait = deferred();
    let current = true;
    let confirmations = 0;
    const result = runMessageSend(gate, {
      operation: () => wait.promise,
      isLive: () => true,
      isCurrent: () => current,
      onState: state => states.push({ ...state, error: current ? state.error : null }),
      onConfirmed: () => { confirmations++; },
    });
    current = false;
    if (outcome === 'resolve') wait.resolve();
    else wait.reject(Error('failure in previous conversation'));
    assert.equal(await result, outcome === 'resolve');
    assert.equal(gate.current, false);
    assert.equal(confirmations, 0);
    assert.deepEqual(states, [{ pending: true, error: null }, { pending: false, error: null }]);
  });
}

test('missing action fails without clearing or pretending success', async () => {
  const h = harness(); assert.equal(await h.send(), false);
  assert.equal(h.clears(), 0); assert.equal(h.draft.text, 'Consulta'); assert.ok(h.states.at(-1)!.error);
});

test('local boundary rejects missing/invalid targets and operations before accepting void success', async () => {
  const input = { conversationId: 'c', senderId: 'u', senderName: 'Usuario', senderRole: 'docente' as const, text: 'Hola' };
  let calls = 0;
  const conversation = { id: 'c', type: 'channel' as const, participants: [] };
  const store = { getConversationById: () => conversation, sendMessage: () => { calls++; } };
  assert.equal(await sendLocalMessage(store, input), undefined); assert.equal(calls, 1);
  for (const invalid of [
    { ...store, getConversationById: () => undefined },
    { ...store, sendMessage: undefined },
    { ...store, getConversationById: () => ({ ...conversation, type: 'direct' as const }) },
  ]) {
    const h = harness(); assert.equal(await h.send(() => sendLocalMessage(invalid, input)), false);
    assert.equal(h.clears(), 0);
  }
  const h = harness(); assert.equal(await h.send(() => sendLocalMessage(store, { ...input, text: ' ' })), false);
  assert.equal(calls, 1);
  const wait = deferred();
  const sending = sendLocalMessage({ ...store, sendMessage: () => wait.promise }, input);
  assert.strictEqual(sending, wait.promise, 'boundary preserves promise rather than pretending sync completion');
  wait.resolve(); await sending;
});
