import assert from 'node:assert/strict';
import test from 'node:test';
import type { Conversation } from '../../../types';

type Store = typeof import('../messagingStore').messagingStore;
const KEY = 'foxmind_shared_messages_v5';
let importId = 0;

class StorageDouble {
  events: string[] = [];
  writes: [string, string][] = [];
  failRead = false;
  failWrite = false;

  constructor(public value: string | null = null) {}

  getItem(key: string) {
    this.events.push(`read:${key}`);
    if (this.failRead) throw new Error('read denied');
    return this.value;
  }

  setItem(key: string, value: string) {
    this.events.push(`write:${key}`);
    if (this.failWrite) throw new Error('quota exceeded');
    this.writes.push([key, value]);
    this.value = value;
  }
}

// Each query imports the actual singleton with its own fixtures. Restore the global
// descriptor even on failure; avoid invitation enrollment and bot timers entirely.
async function withStore(
  storage: StorageDouble | 'missing' | 'throwing',
  run: (store: Store) => void | Promise<void>,
) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    if (storage === 'missing') {
      Reflect.deleteProperty(globalThis, 'localStorage');
    } else {
      Object.defineProperty(globalThis, 'localStorage', storage === 'throwing'
        ? { configurable: true, get() { throw new Error('global access denied'); } }
        : { configurable: true, writable: true, value: storage });
    }
    const url = new URL('../messagingStore.ts', import.meta.url);
    url.searchParams.set('characterization', String(++importId));
    const { messagingStore } = await import(url.href);
    await run(messagingStore);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

function assertLiveFallback(store: Store) {
  // A narrow runtime peek proves array identity too, not just equal fixture data.
  const backing = (store as unknown as { conversations: Conversation[] }).conversations;
  const visible = store.getConversations();
  assert.ok(visible.length > 0);
  assert.notStrictEqual(visible, backing);
  assert.strictEqual(visible[0], backing[0]);
  const first = visible[0];
  const pinned = first.isPinned;
  const unsubscribe = store.subscribe(() => {});
  try {
    store.togglePin(first.id);
    store.resetToDefault();
    assert.strictEqual((store as unknown as { conversations: Conversation[] }).conversations, backing);
    assert.strictEqual(store.getConversationById(first.id), first);
    assert.equal(first.isPinned, !pinned, 'reset reuses the mutated live fixture');
  } finally {
    first.isPinned = pinned;
    unsubscribe();
  }
}

for (const value of [null, '']) {
  test(`${value === null ? 'absent' : 'empty'} storage synchronously saves initial data at the exact key`, async () => {
    const storage = new StorageDouble(value);
    await withStore(storage, store => {
      assert.deepEqual(storage.events, [`read:${KEY}`, `write:${KEY}`]);
      assert.deepEqual(storage.writes, [[KEY, JSON.stringify(store.getConversations())]]);
      assertLiveFallback(store);
    });
  });
}

test('valid conversation data roundtrips and saves before synchronous subscriber notification', async () => {
  const initial = new StorageDouble();
  let fixture: Conversation;
  await withStore(initial, store => { fixture = store.getConversations()[0]; });
  const storage = new StorageDouble(JSON.stringify([fixture!]));
  let saved: Conversation[];
  await withStore(storage, store => {
    assert.deepEqual(storage.events, [`read:${KEY}`]);
    assert.deepEqual(store.getConversations(), [fixture!]);
    const conv = store.getConversations()[0];
    const before = conv.isPinned;
    let notified = false;
    const unsubscribe = store.subscribe(() => {
      notified = true;
      assert.deepEqual(storage.events, [`read:${KEY}`, `write:${KEY}`]);
      assert.equal(JSON.parse(storage.value!)[0].isPinned, !before);
      assert.strictEqual(store.getConversationById(conv.id), conv);
    });
    try {
      store.togglePin(conv.id);
      assert.equal(notified, true);
      saved = JSON.parse(storage.value!);
    } finally { unsubscribe(); }
  });
  await withStore(new StorageDouble(storage.value), store => {
    assert.deepEqual(store.getConversations(), saved!);
    assert.notStrictEqual(store.getConversations()[0], fixture!);
  });
});

test('malformed JSON falls back without a repair save', async () => {
  const storage = new StorageDouble('{broken');
  await withStore(storage, store => {
    assert.deepEqual(storage.events, [`read:${KEY}`]);
    assert.equal(storage.value, '{broken');
    assert.equal(storage.writes.length, 0);
    assertLiveFallback(store);
  });
});

test('throwing reads fall back without a repair save', async () => {
  const storage = new StorageDouble('unread');
  storage.failRead = true;
  await withStore(storage, store => {
    assert.deepEqual(storage.events, [`read:${KEY}`]);
    assert.equal(storage.writes.length, 0);
    assertLiveFallback(store);
  });
});

for (const availability of ['missing', 'throwing'] as const) {
  test(`${availability} global storage does not crash import or later saves`, async () => {
    await withStore(availability, store => {
      assertLiveFallback(store);
      let calls = 0;
      const unsubscribe = store.subscribe(() => { calls++; });
      try {
        store.resetToDefault();
        assert.equal(calls, 1);
      } finally { unsubscribe(); }
    });
  });
}

test('write failures are swallowed during initialization and before subscribers', async () => {
  const storage = new StorageDouble();
  storage.failWrite = true;
  await withStore(storage, store => {
    assert.deepEqual(storage.events, [`read:${KEY}`, `write:${KEY}`]);
    assert.equal(storage.writes.length, 0);
    const unsubscribe = store.subscribe(() => {
      assert.equal(storage.events.at(-1), `write:${KEY}`);
      assert.equal(storage.events.length, 3);
    });
    try { store.resetToDefault(); } finally { unsubscribe(); }
    assertLiveFallback(store);
  });
});

test('serialization failures are swallowed and subscribers still run', async () => {
  const storage = new StorageDouble();
  await withStore(storage, store => {
    const conv = store.getConversations()[0] as Conversation & { circular?: unknown };
    conv.circular = conv;
    let calls = 0;
    const unsubscribe = store.subscribe(() => { calls++; });
    try {
      store.resetToDefault();
      assert.equal(storage.writes.length, 1, 'failed serialization never reaches setItem');
      assert.equal(calls, 1);
    } finally {
      delete conv.circular;
      unsubscribe();
    }
  });
});

test('save looks up the current global storage instead of capturing it at import', async () => {
  const initial = new StorageDouble();
  await withStore(initial, store => {
    const replacement = new StorageDouble();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: replacement });
    store.resetToDefault();
    assert.equal(initial.writes.length, 1);
    assert.deepEqual(replacement.writes, [[KEY, JSON.stringify(store.getConversations())]]);
  });
});

for (const lookup of ['global', 'setItem'] as const) {
  test(`save resolves a reentrant ${lookup} getter before reading current conversations`, async () => {
    let persisted: string;
    await withStore(new StorageDouble(), store => {
      persisted = JSON.stringify([store.getConversations()[0]]);
    });
    const storage = new StorageDouble(persisted!);
    await withStore(storage, store => {
      assert.equal(store.getConversations().length, 1);
      let armed = true;
      const reenter = () => {
        if (armed) {
          armed = false;
          store.resetToDefault();
        }
      };
      const target = lookup === 'global' ? globalThis : storage;
      const property = lookup === 'global' ? 'localStorage' : 'setItem';
      const original = Object.getOwnPropertyDescriptor(target, property);
      const setItem = storage.setItem;
      const observed: number[] = [];
      const unsubscribe = store.subscribe(() => {
        observed.push(JSON.parse(storage.value!).length);
      });
      try {
        Object.defineProperty(target, property, {
          configurable: true,
          get() {
            reenter();
            return lookup === 'global' ? storage : setItem;
          },
        });
        store.togglePin(store.getConversations()[0].id);
        assert.equal(armed, false);
        assert.equal(store.getConversations().length, 11);
        assert.deepEqual(storage.writes.map(([, value]) => JSON.parse(value).length), [11, 11],
          'both nested reset and outer save must serialize current defaults, not the stale persisted array');
        assert.deepEqual(storage.writes, [
          [KEY, JSON.stringify(store.getConversations())],
          [KEY, JSON.stringify(store.getConversations())],
        ]);
        assert.deepEqual(observed, [11, 11], 'each listener sees its preceding save');
      } finally {
        unsubscribe();
        if (original) Object.defineProperty(target, property, original);
        else Reflect.deleteProperty(target, property);
      }
    });
  });
}

for (const json of ['[]', 'null', 'false', '42', '"abc"', '{"arbitrary":true}']) {
  test(`valid arbitrary JSON ${json} retains parse semantics without validation or repair`, async () => {
    const storage = new StorageDouble(json);
    await withStore(storage, store => {
      assert.deepEqual(storage.events, [`read:${KEY}`]);
      assert.equal(storage.writes.length, 0);
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed) || typeof parsed === 'string') {
        assert.deepEqual(store.getConversations(), [...parsed]);
      } else {
        assert.throws(() => store.getConversations(), TypeError);
      }
      store.resetToDefault();
      assert.ok(store.getConversations().length > 0);
    });
  });
}

test('isolated imports do not share singleton or mutable fallback fixtures', async () => {
  await withStore(new StorageDouble(), async first => {
    const conversation = first.getConversations()[0];
    const before = conversation.isPinned;
    try {
      first.togglePin(conversation.id);
      await withStore(new StorageDouble(), second => {
        assert.notStrictEqual(first, second);
        assert.notStrictEqual(conversation, second.getConversations()[0]);
        assert.equal(second.getConversations()[0].isPinned, before);
      });
    } finally { conversation.isPinned = before; }
  });
});
