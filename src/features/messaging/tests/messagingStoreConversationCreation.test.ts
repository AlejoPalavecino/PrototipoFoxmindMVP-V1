import assert from 'node:assert/strict';
import test from 'node:test';
import type { Conversation } from '../../../types';

type Store = typeof import('../messagingStore').messagingStore;
type Params = Parameters<Store['createConversation']>[0];
const KEY = 'foxmind_shared_messages_v5';
const POLICY = 'Normativa escolar: Los alumnos solo pueden comunicarse con docentes y autoridades escolares.';
let importId = 0;
const recipient = { id: 'staff', name: 'Staff', role: 'preceptor' as const };
function params(overrides: Partial<Params> = {}): Params {
  return { title: 'New chat', type: 'direct', participants: [recipient], initialMessage: 'Hello',
    senderId: 'sender', senderName: 'Sender', senderRole: 'docente', ...overrides };
}
const seed: Conversation = { id: 'existing', type: 'direct', title: 'Existing', participants: [],
  lastMessage: '', lastMessageTime: '', lastMessageSender: '', unreadCountDocente: 0,
  unreadCountAlumno: 0, messages: [] };

// Each query-qualified actual store loads a fresh seed. All global descriptors and
// subscriptions are restored in finally; any attempted timer fails synchronously.
async function withStore(run: (h: { store: Store; events: string[]; writes: Conversation[][];
  hooks: { effect?: (name: string) => void; failStorage?: boolean };
  listen: (fn?: () => void) => void;
}) => void) {
  const targets = [[globalThis, 'localStorage'], [globalThis, 'Date'],
    [globalThis, 'setTimeout'], [Math, 'random']] as const;
  const descriptors = targets.map(([target, key]) => Object.getOwnPropertyDescriptor(target, key));
  const OriginalDate = Date;
  const events: string[] = [], writes: Conversation[][] = [];
  const hooks: { effect?: (name: string) => void; failStorage?: boolean } = {};
  const subscriptions: (() => void)[] = [];
  let tick = 1233;
  const effect = (name: string) => { events.push(name); hooks.effect?.(name); };
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem(key: string) { assert.equal(key, KEY); return JSON.stringify([seed]); },
      setItem(key: string, value: string) {
        assert.equal(key, KEY); effect('save');
        if (hooks.failStorage) throw new Error('quota');
        writes.push(JSON.parse(value));
      },
    } });
    class FixedDate extends OriginalDate {
      constructor() { super('2026-04-05T12:34:00Z'); effect('date'); }
      static now() { const value = ++tick; effect('now'); return value; }
      toLocaleTimeString(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
        assert.deepEqual(locales, []);
        assert.deepEqual(options, { hour: '2-digit', minute: '2-digit' });
        effect('time'); return '12:34';
      }
    }
    Object.defineProperty(globalThis, 'Date', { configurable: true, value: FixedDate });
    Object.defineProperty(Math, 'random', { configurable: true, value: () => { effect('random'); return 0.5; } });
    Object.defineProperty(globalThis, 'setTimeout', { configurable: true,
      value: () => { assert.fail('creation must not schedule timers'); } });
    const url = new URL('../messagingStore.ts', import.meta.url);
    url.searchParams.set('creation-characterization', String(++importId));
    const { messagingStore: store } = await import(url.href);
    events.length = 0; writes.length = 0;
    run({ store, events, writes, hooks, listen: (fn = () => {}) => {
      subscriptions.push(store.subscribe(() => { events.push('listener'); fn(); }));
    } });
  } finally {
    subscriptions.forEach(unsubscribe => unsubscribe());
    targets.forEach(([target, key], index) => {
      const descriptor = descriptors[index];
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else Reflect.deleteProperty(target, key);
      assert.deepEqual(Object.getOwnPropertyDescriptor(target, key), descriptor);
    });
  }
}
const EFFECTS = ['now', 'random', 'date', 'time', 'now', 'save', 'listener'];

for (const senderRole of ['docente', 'alumno'] as const) {
  for (const type of ['direct', 'channel'] as const) {
    test(`complete ${senderRole}/${type} object, prepend, return identity and snapshot reads`, async () => {
      await withStore(({ store, events, writes, listen }) => {
        const before = store.getConversations(); listen();
        const input = params({ senderRole, type });
        const created = store.createConversation(input);
        assert.deepEqual(created, {
          id: 'conv-1234-i', type, title: 'New chat',
          subtitle: type === 'channel' ? 'Canal de grupo creado' : 'Staff',
          avatarInitial: 'NE', colorScheme: type === 'channel' ? 'fox-primary' : 'fox-orange',
          participants: [{ id: 'sender', name: 'Sender', role: senderRole, status: 'online' },
            { ...recipient, status: 'online' }],
          lastMessage: 'Hello', lastMessageTime: '12:34', lastMessageSender: 'Sender',
          unreadCountDocente: senderRole === 'alumno' ? 1 : 0,
          unreadCountAlumno: senderRole === 'docente' ? 1 : 0, isPinned: false,
          messages: [{ id: 'msg-1235', senderId: 'sender', senderName: 'Sender', senderRole,
            text: 'Hello', timestamp: '12:34', dateGroup: 'Hoy', status: 'sent', categoryTag: undefined }],
        });
        assert.ok(Object.hasOwn(created.messages[0], 'categoryTag'));
        const after = store.getConversations();
        assert.notStrictEqual(after, before); assert.deepEqual(before, [seed]);
        assert.strictEqual(after[0], created); assert.strictEqual(after[1], before[0]);
        assert.strictEqual(store.getConversationById(created.id), created);
        after.pop(); assert.equal(store.getConversations().length, 2);
        assert.deepEqual(events, EFFECTS);
        assert.deepEqual(writes, [JSON.parse(JSON.stringify([created, seed]))]);
      });
    });
  }
}

test('recipient spread is shallow, overrides status, keeps extras; sender is prepended without deduplication', async () => {
  await withStore(({ store }) => {
    const extra = { nested: true }, duaProfile = ['visual'];
    const source = { id: 'sender', name: 'Duplicate', role: 'foxy' as const, course: '3A',
      status: 'busy', email: 'school@example.test', duaProfile, extra };
    const input = params({ participants: [source, source], categoryTag: 'Material' });
    const created = store.createConversation(input);
    assert.notStrictEqual(created.participants, input.participants);
    assert.equal(created.participants.length, 3);
    for (const copy of created.participants.slice(1)) {
      assert.notStrictEqual(copy, source); assert.deepEqual(copy, { ...source, status: 'online' });
      assert.strictEqual(copy.duaProfile, duaProfile);
      assert.strictEqual((copy as typeof source).extra, extra);
    }
    assert.notStrictEqual(created.participants[1], created.participants[2]);
    source.name = 'Later'; input.participants.length = 0; input.initialMessage = 'Later';
    duaProfile.push('audio'); extra.nested = false;
    assert.equal(created.participants[1].name, 'Duplicate');
    assert.deepEqual(created.participants[1].duaProfile, ['visual', 'audio']);
    assert.equal(created.messages[0].text, 'Hello'); assert.equal(created.messages[0].categoryTag, 'Material');
    assert.equal(source.status, 'busy');
  });
});

test('empty title/message and absent or empty recipient names keep original fallbacks', async () => {
  for (const participants of [[], [{ ...recipient, name: '' }]]) {
    await withStore(({ store }) => {
      const created = store.createConversation(params({ title: '', initialMessage: '', participants }));
      assert.equal(created.title, ''); assert.equal(created.avatarInitial, '');
      assert.equal(created.subtitle, 'Contacto'); assert.equal(created.lastMessage, '');
      assert.equal(created.messages[0].text, ''); assert.equal(created.isPinned, false);
    });
  }
});

test('student direct policy rejects ANY other student before clocks/random/save/listeners', async () => {
  for (const participants of [[{ id: 'peer', name: 'Peer', role: 'alumno' as const }],
    [recipient, { id: 'sender', name: 'Self', role: 'alumno' as const },
      { id: 'peer', name: 'Peer', role: 'alumno' as const }]]) {
    await withStore(({ store, events, writes, listen }) => {
      listen(); const before = store.getConversations();
      assert.throws(() => store.createConversation(params({ senderRole: 'alumno', participants })),
        error => error instanceof Error && error.message === POLICY);
      assert.deepEqual(store.getConversations(), before); assert.deepEqual(events, []); assert.deepEqual(writes, []);
    });
  }
});

test('policy allows self student, empty recipients, every staff/bot role, channels and teacher initiation', async () => {
  const self = { id: 'sender', name: 'Self', role: 'alumno' as const };
  const peer = { id: 'peer', name: 'Peer', role: 'alumno' as const };
  for (const input of [params({ senderRole: 'alumno', participants: [self, self] }),
    params({ senderRole: 'alumno', participants: [] }),
    ...(['docente', 'directivo', 'preceptor', 'foxy'] as const).map(role =>
      params({ senderRole: 'alumno', participants: [{ ...recipient, role }] })),
    params({ senderRole: 'alumno', type: 'channel', participants: [peer] }), params({ participants: [peer] })]) {
    await withStore(({ store, events, listen }) => {
      listen(); assert.strictEqual(store.getConversations()[0].id, 'existing');
      const created = store.createConversation(input);
      assert.strictEqual(store.getConversations()[0], created); assert.deepEqual(events, EFFECTS);
    });
  }
});

test('parameter getters retain separate reads and original construction order', async () => {
  await withStore(({ store, events }) => {
    const input = new Proxy(params(), { get(target, key, receiver) {
      events.push(`read:${String(key)}`); return Reflect.get(target, key, receiver);
    } });
    store.createConversation(input);
    assert.deepEqual(events, ['read:senderRole', 'now', 'random', 'date', 'time',
      ...['type', 'title', 'type', 'participants', 'title', 'type', 'senderId', 'senderName',
        'senderRole', 'participants', 'initialMessage', 'senderName', 'senderRole', 'senderRole'].map(k => `read:${k}`),
      'now', ...['senderId', 'senderName', 'senderRole', 'initialMessage', 'categoryTag'].map(k => `read:${k}`), 'save']);
  });
});

for (const phase of ['now', 'random', 'date', 'time', 'message-now']) {
  test(`reentrant ${phase} reset inserts into CURRENT store array after construction`, async () => {
    await withStore(({ store, hooks, writes, events, listen }) => {
      const before = store.getConversations(); const input = params(); let reads = 0, reset = false;
      listen();
      hooks.effect = name => {
        if (name === 'now') reads++;
        if (!reset && (phase === 'message-now' ? name === 'now' && reads === 2 : name === phase)) {
          reset = true; store.resetToDefault(); input.title = 'Changed'; input.initialMessage = 'Changed';
          input.participants = [{ ...recipient, name: 'Changed recipient' }];
        }
      };
      const created = store.createConversation(input);
      assert.ok(reset); assert.strictEqual(store.getConversations()[0], created);
      assert.equal(store.getConversationById('existing'), undefined); assert.deepEqual(before, [seed]);
      assert.equal(created.title, phase === 'message-now' ? 'New chat' : 'Changed');
      assert.equal(created.subtitle, phase === 'message-now' ? 'Staff' : 'Changed recipient');
      assert.equal(created.messages[0].text, 'Changed');
      assert.equal(writes.length, 2); assert.equal(writes[0][0].id, 'dm-laura-valentina');
      assert.equal(writes[1][0].id, created.id); assert.deepEqual(events.slice(-2), ['save', 'listener']);
    });
  });
}

test('reentrant listener creation reorders state but outer returns its own mutable object', async () => {
  await withStore(({ store, writes, listen }) => {
    let outer: Conversation | undefined, inner: Conversation | undefined;
    listen(() => {
      if (outer) return;
      outer = store.getConversations()[0]; outer.title = 'Listener mutation';
      inner = store.createConversation(params({ title: 'Inner' }));
    });
    const returned = store.createConversation(params());
    assert.strictEqual(returned, outer); assert.equal(returned.title, 'Listener mutation');
    assert.strictEqual(store.getConversations()[0], inner); assert.strictEqual(store.getConversations()[1], returned);
    assert.deepEqual(writes.map(w => w[0].title), ['New chat', 'Inner']);
  });
});

test('listener reset removes created state without changing outer return identity', async () => {
  await withStore(({ store, listen, writes }) => {
    let captured: Conversation | undefined;
    listen(() => { if (!captured) { captured = store.getConversations()[0]; store.resetToDefault(); } });
    const returned = store.createConversation(params());
    assert.strictEqual(returned, captured); assert.equal(store.getConversationById(returned.id), undefined);
    assert.equal(writes[0][0].id, returned.id); assert.equal(writes[1][0].id, 'dm-laura-valentina');
  });
});

test('listener exception propagates after save/insert, prevents return and later listeners', async () => {
  await withStore(({ store, events, writes, listen }) => {
    const failure = new Error('listener failure'); let returned = false;
    listen(() => { throw failure; }); listen(() => assert.fail('later listener ran'));
    assert.throws(() => { store.createConversation(params()); returned = true; }, error => error === failure);
    assert.equal(returned, false); assert.deepEqual(events, EFFECTS);
    assert.equal(writes[0][0].id, 'conv-1234-i'); assert.equal(store.getConversations()[0].id, 'conv-1234-i');
  });
});

test('storage failure is swallowed while listeners run and return shares stored object', async () => {
  await withStore(({ store, events, writes, hooks, listen }) => {
    hooks.failStorage = true; let observed: Conversation | undefined;
    listen(() => { observed = store.getConversations()[0]; });
    const returned = store.createConversation(params());
    assert.strictEqual(returned, observed); assert.strictEqual(returned, store.getConversations()[0]);
    assert.deepEqual(events, EFFECTS); assert.deepEqual(writes, []);
  });
});
