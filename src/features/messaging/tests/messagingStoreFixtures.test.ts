import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import type { Conversation } from '../../../types';

type Store = typeof import('../messagingStore').messagingStore;
const KEY = 'foxmind_shared_messages_v5';
// Derived without evaluating the original literal: parse its array/object/scalar
// AST, serialize in source order, then SHA256 the complete UTF-8 JSON graph.
const SEED_SHA256 = '99a3a058dc19d251bf494ea9797e3b6c0df9c65d37d6687bdebb29142f63a729';
const SEED_IDS = [
  'dm-laura-valentina', 'dm-carlos-valentina', 'dm-gomez-valentina',
  'chan-3a-literatura', 'dm-laura-sofia', 'dm-laura-tomas', 'dm-laura-lucas',
  'dm-prof-carlos', 'dm-directora', 'dm-preceptor', 'dm-foxy-copilot',
];
let importId = 0;

class StorageDouble {
  events: string[] = [];
  writes: string[] = [];

  constructor(public value: string | null = null) {}

  getItem(key: string) {
    assert.equal(key, KEY);
    this.events.push('read');
    return this.value;
  }

  setItem(key: string, value: string) {
    assert.equal(key, KEY);
    this.events.push('save');
    this.writes.push(value);
    this.value = value;
  }
}

// Import the actual singleton, never a store double. Nested query imports also
// restore their parent's storage descriptor; subscriptions are cleaned at use.
async function withStore(
  storage: StorageDouble,
  run: (store: Store) => void | Promise<void>,
) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true, writable: true, value: storage,
    });
    const url = new URL('../messagingStore.ts', import.meta.url);
    url.searchParams.set('fixtures-characterization', String(++importId));
    const { messagingStore } = await import(url.href);
    await run(messagingStore);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

function assertSeed(conversations: Conversation[]) {
  assert.deepEqual(conversations.map(conversation => conversation.id), SEED_IDS);
  const json = JSON.stringify(conversations);
  assert.equal(Buffer.byteLength(json), 17095);
  assert.equal(createHash('sha256').update(json).digest('hex'), SEED_SHA256,
    'every field, seed string, optional value and array/property order stays unchanged');
}

// Include every nested object and array, not merely the first conversation.
function objectGraph(value: unknown, objects = new Set<object>()): Set<object> {
  if (value !== null && typeof value === 'object' && !objects.has(value)) {
    objects.add(value);
    for (const child of Object.values(value)) objectGraph(child, objects);
  }
  return objects;
}

function sharedGraph(store: Store): Set<object> {
  const visible = store.getConversations();
  const objects = objectGraph(visible);
  objects.delete(visible); // Public reads intentionally allocate a new outer array.
  return objects;
}

function assertDisjoint(first: Set<object>, second: Set<object>) {
  for (const object of first) assert.equal(second.has(object), false);
}

function assertSameGraph(actual: Set<object>, expected: Set<object>) {
  assert.equal(actual.size, expected.size);
  for (const object of expected) assert.ok(actual.has(object));
}

function addConversation(store: Store) {
  return store.createConversation({
    title: 'Fixture lifetime characterization', type: 'direct',
    participants: [{ id: 'fixture-student', name: 'Fixture Student', role: 'alumno' }],
    initialMessage: 'Created through the real insertion action',
    senderId: 'fixture-teacher', senderName: 'Fixture Teacher', senderRole: 'docente',
  });
}

for (const value of [null, '{malformed']) {
  test(`${value === null ? 'absent' : 'malformed'} storage preserves the complete ordered fixture graph`, async () => {
    const storage = new StorageDouble(value);
    await withStore(storage, store => {
      assertSeed(store.getConversations());
      assert.deepEqual(storage.events, value === null ? ['read', 'save'] : ['read']);
      if (value === null) assert.equal(storage.writes[0], JSON.stringify(store.getConversations()));
      else assert.deepEqual(storage.writes, []);
    });
  });

  test(`${value === null ? 'absent' : 'malformed'} fallback resets reuse mutable objects and nested arrays synchronously`, async () => {
    const storage = new StorageDouble(value);
    await withStore(storage, store => {
      const first = store.getConversations();
      const second = store.getConversations();
      assert.notStrictEqual(first, second);
      first.forEach((conversation, index) => {
        assert.strictEqual(conversation, second[index]);
        assert.strictEqual(store.getConversationById(conversation.id), conversation);
      });
      first.pop();
      assert.equal(store.getConversations().length, SEED_IDS.length);
      const conversation = second[0];
      const originalGraph = sharedGraph(store);
      const pinned = conversation.isPinned;
      conversation.title = 'Live fixture mutation';
      conversation.participants[0].name = 'Live participant mutation';
      conversation.tags!.push('Live tag mutation');
      conversation.messages[0].text = 'Live message mutation';
      conversation.messages[2].attachment!.name = 'Live attachment mutation';
      let notifications = 0;
      const unsubscribe = store.subscribe(() => {
        notifications++;
        storage.events.push('listener');
        assert.equal(storage.writes.at(-1), JSON.stringify(store.getConversations()),
          'persistence precedes synchronous subscribers');
      });
      try {
        storage.events.length = 0;
        store.togglePin(conversation.id);
        store.addReaction(conversation.id, conversation.messages[0].id, '❤️', 'Fixture Reader');
        assert.equal(notifications, 2);
        assert.deepEqual(storage.events, ['save', 'listener', 'save', 'listener']);
        assert.equal(conversation.isPinned, !pinned);
        assert.ok(conversation.messages[0].reactions![0].users.includes('Fixture Reader'));
        assertSameGraph(sharedGraph(store), originalGraph);
        const mutated = JSON.stringify(store.getConversations());
        for (let reset = 0; reset < 3; reset++) {
          storage.events.length = 0;
          assert.equal(store.resetToDefault(), undefined);
          assert.equal(notifications, 3 + reset);
          assert.deepEqual(storage.events, ['save', 'listener']);
          assert.equal(JSON.stringify(store.getConversations()), mutated);
          assertSameGraph(sharedGraph(store), originalGraph);
          second.forEach(conversation => {
            assert.strictEqual(store.getConversationById(conversation.id), conversation);
          });
        }
      } finally { unsubscribe(); }
    });
  });
}

test('real insertion mutates the fallback array and survives repeated resets', async () => {
  const storage = new StorageDouble();
  await withStore(storage, store => {
    const originals = store.getConversations();
    const created = addConversation(store);
    assert.strictEqual(store.getConversations()[0], created);
    created.messages[0].text = 'Created object remains live';
    for (let reset = 0; reset < 3; reset++) {
      store.resetToDefault();
      const visible = store.getConversations();
      assert.equal(visible.length, SEED_IDS.length + 1);
      assert.strictEqual(visible[0], created);
      assert.equal(visible[0].messages[0].text, 'Created object remains live');
      originals.forEach((conversation, index) => assert.strictEqual(visible[index + 1], conversation));
      assert.equal(storage.writes.at(-1), JSON.stringify(visible));
    }
  });
});

test('hydration parses a separate graph; first reset exposes untouched fixtures and later resets reuse them', async () => {
  await withStore(new StorageDouble(), async baseline => {
    const original = baseline.getConversations();
    const storage = new StorageDouble(JSON.stringify(original));
    await withStore(storage, hydrated => {
      const parsed = hydrated.getConversations();
      assertSeed(parsed);
      assertDisjoint(sharedGraph(baseline), sharedGraph(hydrated));
      assert.deepEqual(storage.events, ['read']);
      parsed[0].title = 'Hydrated-only mutation';
      hydrated.togglePin(parsed[0].id);
      const hydratedOnly = addConversation(hydrated);
      hydrated.resetToDefault();
      const fixtures = hydrated.getConversations();
      assertSeed(fixtures);
      assertDisjoint(objectGraph(parsed), sharedGraph(hydrated));
      assertDisjoint(sharedGraph(baseline), sharedGraph(hydrated));
      assert.equal(hydrated.getConversationById(hydratedOnly.id), undefined);
      assert.equal(parsed[0].title, 'Hydrated-only mutation');
      const fixtureGraph = sharedGraph(hydrated);
      hydrated.toggleMute(fixtures[0].id);
      const created = addConversation(hydrated);
      for (let reset = 0; reset < 2; reset++) {
        hydrated.resetToDefault();
        fixtures.forEach(conversation => {
          assert.strictEqual(hydrated.getConversationById(conversation.id), conversation);
        });
        assert.strictEqual(hydrated.getConversations()[0], created);
        assert.equal(fixtures[0].isMuted, true);
        for (const object of fixtureGraph) assert.ok(sharedGraph(hydrated).has(object));
      }
      assertSeed(original);
    });
  });
});

test('query-qualified stores never share produced fixture graphs, including after resets', async () => {
  await withStore(new StorageDouble(), async first => {
    const firstFixtures = first.getConversations();
    first.togglePin(firstFixtures[0].id);
    firstFixtures[0].participants[0].name = 'First store only';
    const created = addConversation(first);
    await withStore(new StorageDouble(), second => {
      assert.notStrictEqual(first, second);
      assertSeed(second.getConversations());
      const secondGraph = sharedGraph(second);
      assertDisjoint(sharedGraph(first), secondGraph);
      second.toggleMute(SEED_IDS[1]);
      for (let reset = 0; reset < 3; reset++) {
        first.resetToDefault();
        second.resetToDefault();
        assert.strictEqual(first.getConversationById(firstFixtures[0].id), firstFixtures[0]);
        assert.strictEqual(first.getConversationById(created.id), created);
        assert.equal(second.getConversationById(created.id), undefined);
        assert.equal(second.getConversationById(SEED_IDS[0])!.participants[0].name, 'Prof. Laura Martínez');
        assert.equal(second.getConversationById(SEED_IDS[0])!.isPinned, true);
        assert.equal(first.getConversationById(SEED_IDS[1])!.isMuted, undefined);
        assert.equal(second.getConversationById(SEED_IDS[1])!.isMuted, true);
        assertSameGraph(sharedGraph(second), secondGraph);
        assertDisjoint(sharedGraph(first), sharedGraph(second));
      }
    });
  });
});
