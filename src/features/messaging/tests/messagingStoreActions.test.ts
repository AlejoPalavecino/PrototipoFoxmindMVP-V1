import assert from 'node:assert/strict';
import test from 'node:test';
import type { Conversation } from '../../../types';

type Store = typeof import('../messagingStore').messagingStore;
const KEY = 'foxmind_shared_messages_v5';
let importId = 0;

// Exercise the real store boundary; query imports keep mutable fixtures isolated.
// Only storage is faked, and its original global descriptor is always restored.
async function withStore(run: (store: Store, events: string[], writes: Conversation[][]) => void, initial = [seed()]) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const events: string[] = [];
  const writes: Conversation[][] = [];
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem(key: string) { assert.equal(key, KEY); return JSON.stringify(initial); },
      setItem(key: string, value: string) {
        assert.equal(key, KEY);
        events.push('save');
        writes.push(JSON.parse(value));
      },
    } });
    const url = new URL('../messagingStore.ts', import.meta.url);
    url.searchParams.set('actions-characterization', String(++importId));
    const { messagingStore } = await import(url.href);
    run(messagingStore, events, writes);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

function seed(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'selected', type: 'direct', title: 'Selected', participants: [],
    lastMessage: 'Before', lastMessageTime: 'Before', lastMessageSender: 'Teacher',
    unreadCountDocente: 3, unreadCountAlumno: 2,
    messages: [{ id: 'message', senderId: 'teacher', senderName: 'Teacher', senderRole: 'docente',
      text: 'Before', timestamp: 'Before', dateGroup: 'Hoy', status: 'read' }], ...overrides,
  };
}

function observe(store: Store, events: string[]) {
  return store.subscribe(() => { events.push('listener'); });
}

function assertMutation(events: string[], writes: Conversation[][], store: Store) {
  assert.deepEqual(events.splice(0), ['save', 'listener']);
  assert.deepEqual(writes.at(-1), JSON.parse(JSON.stringify(store.getConversations())));
}

test('queries return fresh outer copies, shared objects, first ID match and role-specific || zero totals', async () => {
  await withStore((store, events, writes) => {
    const first = store.getConversations();
    const second = store.getConversations();
    assert.notStrictEqual(first, second);
    assert.strictEqual(first[0], second[0]);
    assert.strictEqual(store.getConversationById('selected'), first[0]);
    assert.equal(store.getConversationById('missing'), undefined);
    first.pop();
    assert.equal(store.getConversations().length, 3);
    second[0].title = 'Shared mutation';
    assert.equal(store.getConversationById('selected')!.title, 'Shared mutation');
    assert.equal(store.getUnreadCount('docente'), 1);
    assert.equal(store.getUnreadCount('alumno'), 4);
    assert.deepEqual(events, []);
    assert.deepEqual(writes, []);
  }, [seed(), seed({ unreadCountDocente: -2, unreadCountAlumno: 2 }),
    seed({ id: 'undefined-counts', unreadCountDocente: undefined, unreadCountAlumno: undefined })]);
});

for (const role of ['docente', 'alumno'] as const) {
  test(`markAsRead clears only positive ${role} count on first match, saves then synchronously notifies`, async () => {
    await withStore((store, events, writes) => {
      const conv = store.getConversations()[0];
      const duplicate = store.getConversations()[1];
      const unsubscribe = observe(store, events);
      try {
        assert.equal(store.markAsRead('selected', role), undefined);
        assert.equal(conv.unreadCountDocente, role === 'docente' ? 0 : 3);
        assert.equal(conv.unreadCountAlumno, role === 'alumno' ? 0 : 2);
        assert.equal(duplicate.unreadCountDocente, 3);
        assert.equal(duplicate.unreadCountAlumno, 2);
        assert.strictEqual(store.getConversationById('selected'), conv);
        assertMutation(events, writes, store);
        store.markAsRead('selected', role);
        store.markAsRead('missing', role);
        assert.deepEqual(events, []);
        assert.equal(writes.length, 1);
      } finally { unsubscribe(); }
    }, [seed(), seed()]);
  });
  for (const count of [0, undefined, -2]) {
    test(`markAsRead leaves ${role} ${String(count)} unchanged without persistence or notification`, async () => {
      await withStore((store, events, writes) => {
        const conv = store.getConversationById('selected')!;
        const before = { ...conv };
        const unsubscribe = observe(store, events);
        try {
          store.markAsRead('selected', role);
          assert.deepEqual(conv, before);
          assert.deepEqual(events, []);
          assert.deepEqual(writes, []);
        } finally { unsubscribe(); }
      }, [seed(role === 'docente' ? { unreadCountDocente: count } : { unreadCountAlumno: count })]);
    });
  }
}

for (const [method, flag] of [['togglePin', 'isPinned'], ['toggleMute', 'isMuted']] as const) {
  test(`${method} mutates only first match, toggles undefined to true then false and ignores missing IDs`, async () => {
    await withStore((store, events, writes) => {
      const [conv, duplicate] = store.getConversations();
      const unsubscribe = observe(store, events);
      try {
        assert.equal(conv[flag], undefined);
        assert.equal(store[method]('selected'), undefined);
        assert.equal(conv[flag], true);
        assert.equal(duplicate[flag], undefined);
        assertMutation(events, writes, store);
        store[method]('selected');
        assert.equal(conv[flag], false);
        assertMutation(events, writes, store);
        store[method]('missing');
        assert.deepEqual(events, []);
        assert.equal(writes.length, 2);
      } finally { unsubscribe(); }
    }, [seed(), seed()]);
  });
}

test('reaction branches retain objects, push existing users and replace arrays only when toggling off', async () => {
  await withStore((store, events, writes) => {
    const [conv, duplicate] = store.getConversations();
    const msg = conv.messages[0];
    const messages = conv.messages;
    const unsubscribe = observe(store, events);
    const react = (emoji: string, user: string) => {
      assert.equal(store.addReaction(conv.id, msg.id, emoji, user), undefined);
      assertMutation(events, writes, store);
      assert.strictEqual(conv.messages, messages);
      assert.strictEqual(conv.messages[0], msg);
      assert.equal(duplicate.messages[0].reactions, undefined);
    };
    try {
      assert.equal(msg.reactions, undefined);
      react('heart', 'Ana');
      const reactions = msg.reactions!;
      const heart = reactions[0];
      const originalUsers = heart.users;
      assert.deepEqual(heart, { emoji: 'heart', count: 1, users: ['Ana'] });
      react('star', 'Bea');
      const star = reactions[1];
      const starUsers = star.users;
      assert.strictEqual(msg.reactions, reactions);
      assert.strictEqual(reactions[0], heart);
      assert.deepEqual(star, { emoji: 'star', count: 1, users: ['Bea'] });
      react('heart', 'Bea');
      assert.strictEqual(heart.users, originalUsers);
      assert.deepEqual(originalUsers, ['Ana', 'Bea']);
      assert.equal(heart.count, 2);
      react('heart', 'Ana');
      const remainingUsers = heart.users;
      assert.notStrictEqual(remainingUsers, originalUsers);
      assert.deepEqual(originalUsers, ['Ana', 'Bea']);
      assert.deepEqual(remainingUsers, ['Bea']);
      assert.equal(heart.count, 1);
      assert.strictEqual(msg.reactions, reactions);
      react('heart', 'Bea');
      assert.notStrictEqual(msg.reactions, reactions);
      assert.notStrictEqual(heart.users, remainingUsers);
      assert.deepEqual(remainingUsers, ['Bea']);
      assert.deepEqual(heart, { emoji: 'heart', count: 0, users: [] });
      assert.strictEqual(reactions[0], heart);
      assert.deepEqual(msg.reactions, [star]);
      assert.strictEqual(msg.reactions![0], star);
      assert.strictEqual(star.users, starUsers);
      assert.equal(writes.length, 5);
    } finally { unsubscribe(); }
  }, [seed(), seed()]);
});

test('missing reaction conversation/message does not initialize reactions, save or notify', async () => {
  await withStore((store, events, writes) => {
    const msg = store.getConversations()[0].messages[0];
    const unsubscribe = observe(store, events);
    try {
      store.addReaction('missing', 'message', 'heart', 'Ana');
      store.addReaction('selected', 'missing', 'heart', 'Ana');
      assert.equal(msg.reactions, undefined);
      assert.deepEqual(events, []);
      assert.deepEqual(writes, []);
    } finally { unsubscribe(); }
  });
});

test('listener errors propagate after persistence and mutation, stopping subsequent listeners', async () => {
  await withStore((store, events, writes) => {
    const error = new Error('listener failed');
    const first = store.subscribe(() => { events.push('throwing listener'); throw error; });
    const second = observe(store, events);
    try {
      assert.throws(() => store.togglePin('selected'), thrown => thrown === error);
      assert.equal(store.getConversationById('selected')!.isPinned, true);
      assert.deepEqual(events, ['save', 'throwing listener']);
      assert.equal(writes[0][0].isPinned, true);
    } finally { first(); second(); }
  });
});
