import assert from 'node:assert/strict';
import test from 'node:test';
import type { Conversation, MessageAttachment } from '../../../types';

type Store = typeof import('../messagingStore').messagingStore;
type Params = Parameters<Store['sendMessage']>[0];
const KEY = 'foxmind_shared_messages_v5';
const POLICY = 'Normativa escolar: Los alumnos únicamente pueden comunicarse directamente con sus docentes y preceptoría.';
let importId = 0;

function seed(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'selected', type: 'direct', title: 'Selected',
    participants: [{ id: 'sender', name: 'Sender', role: 'docente' }],
    lastMessage: 'Before', lastMessageTime: 'Before', lastMessageSender: 'Before',
    unreadCountDocente: 3, unreadCountAlumno: 2, messages: [], ...overrides,
  };
}

function params(overrides: Partial<Params> = {}): Params {
  return { conversationId: 'selected', senderId: 'sender', senderName: 'Sender',
    senderRole: 'docente', text: 'Hello', ...overrides };
}

// Query-qualified actual stores, persisted JSON seeds and manually drained timers.
// Every replaced descriptor (including Math.random) is restored even on failure.
async function withStore(run: (h: {
  store: Store; events: string[]; writes: Conversation[][]; timers: (() => void)[];
  listen: (fn?: () => void) => void; drain: () => void;
}) => void, initial = [seed()]) {
  const targets = [[globalThis, 'localStorage'], [globalThis, 'Date'],
    [globalThis, 'setTimeout'], [Math, 'random']] as const;
  const descriptors = targets.map(([target, key]) => Object.getOwnPropertyDescriptor(target, key));
  const OriginalDate = Date;
  const events: string[] = [];
  const writes: Conversation[][] = [];
  const timers: (() => void)[] = [];
  const subscriptions: (() => void)[] = [];
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem(key: string) { assert.equal(key, KEY); return JSON.stringify(initial); },
      setItem(key: string, value: string) {
        assert.equal(key, KEY); events.push('save'); writes.push(JSON.parse(value));
      },
    } });
    class FixedDate extends OriginalDate {
      constructor() { super('2026-04-05T12:34:00Z'); events.push('date'); }
      toLocaleTimeString(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
        assert.deepEqual(locales, []);
        assert.deepEqual(options, { hour: '2-digit', minute: '2-digit' });
        events.push('time'); return '12:34';
      }
      static now() { events.push('now'); return 1234; }
    }
    Object.defineProperty(globalThis, 'Date', { configurable: true, value: FixedDate });
    Object.defineProperty(Math, 'random', { configurable: true, value: () => {
      events.push('random'); return 0.5;
    } });
    Object.defineProperty(globalThis, 'setTimeout', { configurable: true,
      value: (callback: () => void, delay: number, ...args: unknown[]) => {
        assert.equal(delay, 900); assert.deepEqual(args, []);
        events.push('schedule:900'); timers.push(callback); return 999;
      } });
    const url = new URL('../messagingStore.ts', import.meta.url);
    url.searchParams.set('send-characterization', String(++importId));
    const { messagingStore: store } = await import(url.href);
    events.length = 0;
    writes.length = 0;
    run({ store, events, writes, timers,
      listen: (fn = () => {}) => subscriptions.push(store.subscribe(() => {
        events.push('listener'); fn();
      })),
      drain: () => { const callback = timers.shift(); assert.ok(callback); callback(); },
    });
  } finally {
    subscriptions.forEach(unsubscribe => unsubscribe());
    timers.length = 0;
    targets.forEach(([target, key], index) => {
      const descriptor = descriptors[index];
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else Reflect.deleteProperty(target, key);
    });
    targets.forEach(([target, key], index) => {
      assert.deepEqual(Object.getOwnPropertyDescriptor(target, key), descriptors[index]);
    });
    assert.equal(timers.length, 0);
  }
}

const SEND_EVENTS = ['date', 'time', 'now', 'random', 'save', 'listener'];
const BOT_EVENTS = ['date', 'time', 'now', 'save', 'listener'];

for (const role of ['docente', 'alumno', 'directivo', 'preceptor', 'foxy'] as const) {
  test(`send ${role}: first match, shared references, complete message, unread and effect order`, async () => {
    await withStore(({ store, events, writes, timers, listen }) => {
      const [conv, duplicate] = store.getConversations();
      const messages = conv.messages;
      const beforeDuplicate = JSON.stringify(duplicate);
      listen();
      const input = params({ senderRole: role });
      assert.equal(store.sendMessage(input), undefined);
      assert.strictEqual(store.getConversationById('selected'), conv);
      assert.strictEqual(conv.messages, messages);
      assert.deepEqual(messages, [{
        id: 'msg-1234-i', senderId: 'sender', senderName: 'Sender', senderRole: role,
        text: 'Hello', timestamp: '12:34', dateGroup: 'Hoy', status: 'sent',
        replyTo: undefined, attachment: undefined, categoryTag: undefined,
      }]);
      for (const key of ['replyTo', 'attachment', 'categoryTag']) {
        assert.ok(Object.hasOwn(messages[0], key));
      }
      assert.deepEqual([conv.lastMessage, conv.lastMessageTime, conv.lastMessageSender], ['Hello', '12:34', 'Sender']);
      assert.equal(conv.unreadCountDocente, role === 'alumno' ? 4 : 3);
      assert.equal(conv.unreadCountAlumno, role === 'docente' ? 3 : 2);
      assert.equal(JSON.stringify(duplicate), beforeDuplicate);
      assert.deepEqual(events, SEND_EVENTS);
      assert.deepEqual(writes, [JSON.parse(JSON.stringify(store.getConversations()))]);
      assert.deepEqual(timers, []);
    }, [seed(), seed()]);
  });
}

test('nonparticipants cannot send direct messages regardless of sender or recipient role, before every effect', async () => {
  for (const senderRole of ['docente', 'alumno', 'directivo', 'preceptor', 'foxy'] as const) {
    for (const recipientRole of ['docente', 'alumno'] as const) {
      await withStore(({ store, events, writes, timers, listen }) => {
        listen();
        const conv = store.getConversations()[0];
        const messages = conv.messages;
        const before = JSON.stringify(store.getConversations());
        assert.throws(() => store.sendMessage(params({ senderRole })),
          error => error instanceof Error && error.message === 'No perteneces a esta conversación.');
        assert.strictEqual(conv.messages, messages);
        assert.equal(JSON.stringify(store.getConversations()), before);
        assert.deepEqual(events, []);
        assert.deepEqual(writes, []);
        assert.deepEqual(timers, []);
      }, [seed({ id: 'selected', participants: [
        { id: 'other', name: 'Other', role: recipientRole },
      ] })]);
    }
  }
});

test('channels and bots preserve nonparticipant sending behavior', async () => {
  for (const type of ['channel', 'bot'] as const) {
    await withStore(({ store, events, timers, listen }) => {
      listen();
      store.sendMessage(params({ senderRole: 'alumno' }));
      assert.equal(store.getConversations()[0].messages.length, 1);
      assert.deepEqual(events, type === 'bot' ? [...SEND_EVENTS, 'schedule:900'] : SEND_EVENTS);
      assert.equal(timers.length, type === 'bot' ? 1 : 0);
    }, [seed({ type, participants: [] })]);
  }
});

test('missing target and forbidden student direct send are noops before every effect', async () => {
  await withStore(({ store, events, writes, timers, listen }) => {
    listen();
    const before = JSON.stringify(store.getConversations());
    assert.equal(store.sendMessage(params({ conversationId: 'missing' })), undefined);
    assert.throws(() => store.sendMessage(params({ senderRole: 'alumno' })),
      error => error instanceof Error && error.message === POLICY);
    assert.equal(JSON.stringify(store.getConversations()), before);
    assert.deepEqual(events, []); assert.deepEqual(writes, []); assert.deepEqual(timers, []);
  }, [seed({ participants: [
    { id: 'sender', name: 'Self', role: 'alumno' },
    { id: 'peer', name: 'Peer', role: 'alumno' },
    { id: 'teacher', name: 'Teacher', role: 'docente' },
  ] })]);
});

test('policy uses only first other participant; channels and all non-student roles remain allowed', async () => {
  const self = { id: 'sender', name: 'Self', role: 'alumno' as const };
  const peer = { id: 'peer', name: 'Peer', role: 'alumno' as const };
  const staff = { id: 'staff', name: 'Staff', role: 'preceptor' as const };
  for (const [type, participants, role] of [
    ['direct', [self, staff, peer], 'alumno'], ['direct', [self], 'alumno'],
    ['channel', [self, peer], 'alumno'],
    ...(['docente', 'directivo', 'preceptor', 'foxy'] as const).map(role => ['direct', [self, peer], role] as const),
  ] as const) {
    await withStore(({ store, events, listen }) => {
      listen(); store.sendMessage(params({ senderRole: role }));
      assert.equal(store.getConversations()[0].messages.length, 1);
      assert.deepEqual(events, SEND_EVENTS);
    }, [seed({ type, participants: [...participants] })]);
  }
});

test('attachment/reply retain input references, category and attachment preview fallback', async () => {
  for (const text of ['', 'Caption']) {
    await withStore(({ store, writes, listen }) => {
      listen();
      const attachment: MessageAttachment = { id: 'file', name: 'Guide.pdf', size: '1 MB', type: 'pdf' };
      const replyTo = { id: 'old', senderName: 'Old sender', text: 'Old text' };
      const input = params({ text, attachment, replyTo, categoryTag: 'Material' });
      store.sendMessage(input);
      const conv = store.getConversations()[0];
      const message = conv.messages[0];
      assert.strictEqual(message.attachment, attachment); assert.strictEqual(message.replyTo, replyTo);
      assert.equal(message.categoryTag, 'Material'); assert.equal(message.text, text);
      assert.equal(conv.lastMessage, `📎 Guide.pdf - ${text || 'Archivo adjunto'}`);
      assert.deepEqual(writes[0], JSON.parse(JSON.stringify(store.getConversations())));
      attachment.name = 'Changed'; replyTo.text = 'Changed'; input.text = 'Later';
      assert.equal(message.attachment!.name, 'Changed'); assert.equal(message.replyTo!.text, 'Changed');
      assert.equal(message.text, text);
    });
  }
});

test('send unread uses || zero for missing and zero counts', async () => {
  for (const count of [undefined, 0]) {
    for (const role of ['docente', 'alumno'] as const) {
      await withStore(({ store }) => {
        store.sendMessage(params({ senderRole: role }));
        const conv = store.getConversations()[0];
        assert.equal(role === 'docente' ? conv.unreadCountAlumno : conv.unreadCountDocente, 1);
        assert.equal(role === 'docente' ? conv.unreadCountDocente : conv.unreadCountAlumno, count);
      }, [seed({ unreadCountDocente: count, unreadCountAlumno: count })]);
    }
  }
});

test('bot type OR special ID schedules exactly 900ms after save and synchronous listener', async () => {
  for (const overrides of [{ type: 'bot' as const }, { id: 'dm-foxy-copilot' }]) {
    await withStore(({ store, events, timers, listen, drain }) => {
      listen(() => { assert.equal(timers.length, 0); });
      const conv = store.getConversations()[0];
      assert.equal(store.sendMessage(params({ conversationId: conv.id })), undefined);
      assert.deepEqual(events, [...SEND_EVENTS, 'schedule:900']);
      assert.equal(conv.messages.length, 1); assert.equal(timers.length, 1);
      events.length = 0; drain();
      assert.deepEqual(events, BOT_EVENTS); assert.equal(timers.length, 0);
    }, [seed(overrides)]);
  }
});

test('reentrant listeners mutate type and ID before deciding whether to schedule', async () => {
  for (const [initial, mutate, scheduled] of [
    [seed(), (c: Conversation) => { c.type = 'bot'; }, true],
    [seed(), (c: Conversation) => { c.id = 'dm-foxy-copilot'; }, true],
    [seed({ type: 'bot' }), (c: Conversation) => { c.type = 'direct'; }, false],
    [seed({ id: 'dm-foxy-copilot' }), (c: Conversation) => { c.id = 'changed'; }, false],
  ] as const) {
    await withStore(({ store, events, timers, writes, listen }) => {
      const conv = store.getConversations()[0];
      listen(() => mutate(conv));
      store.sendMessage(params({ conversationId: conv.id }));
      assert.deepEqual(events, scheduled ? [...SEND_EVENTS, 'schedule:900'] : SEND_EVENTS);
      assert.equal(timers.length, scheduled ? 1 : 0);
      assert.equal(writes[0][0].id, initial.id); assert.equal(writes[0][0].type, initial.type);
    }, [initial]);
  }
});

test('throwing listener preserves saved send but prevents later listeners and timer', async () => {
  await withStore(({ store, events, writes, timers, listen }) => {
    const error = new Error('listener failure');
    listen(() => { throw error; }); listen();
    assert.throws(() => store.sendMessage(params()), thrown => thrown === error);
    assert.deepEqual(events, SEND_EVENTS); assert.equal(writes.length, 1);
    assert.equal(writes[0][0].messages.length, 1); assert.equal(timers.length, 0);
  }, [seed({ type: 'bot' })]);
});

const EVALUATION = '📋 **Sugerencia pedagógica para evaluación:**\nPara el ensayo de Vanguardias te recomiendo ponderar:\n1. Comprensión de manifiestos (30%)\n2. Justificación de citas textuales (40%)\n3. Coherencia estilística y DUA (30%)\n\n¿Querés que redacte un mensaje de aviso al aula 3°A con estas pautas?';
const DRAFT = '✍️ **Borrador de comunicado sugerido:**\n"Estimadas familias y alumnos: Les recordamos que las consultas sobre el trabajo práctico pueden realizarse por este canal hasta las 18:00 hs. ¡Muchos éxitos!"\n\nPodés copiarlo o editarlo libremente.';
const STUDY = '💡 **Guía de estudio Foxy:**\nPara tu ensayo recordá que Vicente Huidobro (Creacionismo) proponía que *"el poeta es un pequeño Dios"*, mientras que el Ultraísmo buscaba la imagen pura sin adjetivos inútiles.\n\n¿Querés que formulemos una consulta clara para tu profesora Laura Martínez?';
const TUTOR = '🦊 **Foxy Tutor:** ¡Muy bien planteado! Recordá que podés consultarle directamente a tus docentes por este canal oficial o dejar tu duda en el canal general de tu aula.';
const teacherDefault = (text: string) => `🦊 **Foxy Copiloto:** Entendido. Analicé tu consulta sobre "${text.slice(0, 40)}...". Te sugiero mantener una respuesta concisa con preguntas de activación socrática para fomentar la autonomía del alumno.`;

const branches: [Params['senderRole'], string, string][] = [
  ['docente', 'ENSAYO aviso duda', EVALUATION], ['docente', 'RUBRICA borrador', EVALUATION],
  ['docente', 'EVALUACION mensaje', EVALUATION], ['docente', 'BORRADOR', DRAFT],
  ['docente', 'MENSAJE duda', DRAFT], ['docente', 'AVISO', DRAFT],
  ['docente', 'rúbrica evaluación', teacherDefault('rúbrica evaluación')],
  ['docente', 'x'.repeat(60), teacherDefault('x'.repeat(60))],
  ['alumno', 'DUDA aviso', STUDY], ['alumno', 'ENSAYO', STUDY],
  ['alumno', 'VANGUARDIA', STUDY], ['alumno', 'rubrica evaluacion mensaje', TUTOR],
  ...(['directivo', 'preceptor', 'foxy'] as const).flatMap(role => [
    [role, 'ENSAYO', STUDY] as [Params['senderRole'], string, string],
    [role, 'borrador aviso', TUTOR] as [Params['senderRole'], string, string],
  ]),
];
for (const [role, text, expected] of branches) {
  test(`Foxy full copy and precedence: ${role} / ${text.slice(0, 30)}`, async () => {
    await withStore(({ store, events, writes, listen, drain }) => {
      listen(); const conv = store.getConversations()[0]; const messages = conv.messages;
      store.sendMessage(params({ senderRole: role, text })); events.length = 0;
      drain();
      assert.strictEqual(conv.messages, messages);
      assert.deepEqual(conv.messages[1], { id: 'msg-foxy-1234', senderId: 'bot-foxy',
        senderName: 'Foxy Copiloto IA', senderRole: 'foxy', text: expected,
        timestamp: '12:34', dateGroup: 'Hoy', status: 'read' });
      assert.deepEqual([conv.lastMessage, conv.lastMessageTime, conv.lastMessageSender],
        [expected.slice(0, 70) + '...', '12:34', 'Foxy Copiloto IA']);
      assert.equal(conv.unreadCountDocente, role === 'docente' || role === 'alumno' ? 4 : 3);
      assert.equal(conv.unreadCountAlumno, 3);
      assert.deepEqual(events, BOT_EVENTS); assert.equal(writes.length, 2);
      assert.deepEqual(writes[1], JSON.parse(JSON.stringify(store.getConversations())));
    }, [seed({ type: 'bot' })]);
  });
}

test('timer retains conv and params objects, reads mutated fields at fire and refinds current array', async () => {
  await withStore(({ store, events, writes, listen, drain }) => {
    const [captured, target] = store.getConversations();
    const input = params({ senderRole: 'alumno', text: 'original' });
    listen(() => {
      if (captured.messages.length === 1 && target.messages.length === 0) {
        input.text = 'AVISO'; input.senderRole = 'docente';
      }
    });
    store.sendMessage(input);
    assert.equal(captured.messages[0].text, 'original');
    captured.id = 'target'; input.text = 'RUBRICA'; input.conversationId = 'ignored';
    captured.type = 'direct'; // No cancellation or repeated bot-condition check at fire.
    events.length = 0; drain();
    // Both IDs now match: current-array find chooses captured, not the second object.
    assert.equal(captured.messages[1].text, EVALUATION); assert.equal(target.messages.length, 0);
    assert.equal(captured.unreadCountDocente, 5); assert.equal(captured.unreadCountAlumno, 2);
    assert.deepEqual(events, BOT_EVENTS); assert.equal(writes.length, 2);
  }, [seed({ type: 'bot' }), seed({ id: 'target' })]);
});

test('reset replaces array: timer follows captured late ID into a different current object', async () => {
  await withStore(({ store, events, listen, drain }) => {
    listen(); const captured = store.getConversations()[0];
    const input = params(); store.sendMessage(input);
    store.resetToDefault();
    const current = store.getConversationById('dm-foxy-copilot')!;
    const before = current.messages.length;
    const teacherUnread = current.unreadCountDocente || 0;
    const studentUnread = current.unreadCountAlumno || 0;
    captured.id = current.id; input.text = 'DUDA'; input.senderRole = 'preceptor';
    events.length = 0; drain();
    assert.notStrictEqual(captured, current); assert.equal(captured.messages.length, 1);
    assert.equal(current.messages.length, before + 1); assert.equal(current.messages.at(-1)!.text, STUDY);
    assert.equal(current.unreadCountDocente, teacherUnread);
    assert.equal(current.unreadCountAlumno, studentUnread + 1);
    assert.deepEqual(events, BOT_EVENTS);
  }, [seed({ type: 'bot' })]);
});

test('timer missing current target after reset is a noop before clock and notify', async () => {
  await withStore(({ store, events, writes, listen, drain }) => {
    listen(); store.sendMessage(params()); store.resetToDefault();
    const before = JSON.stringify(store.getConversations()); const saved = writes.length;
    events.length = 0; drain();
    assert.deepEqual(events, []); assert.equal(writes.length, saved);
    assert.equal(JSON.stringify(store.getConversations()), before);
  }, [seed({ type: 'bot' })]);
});

test('timer looks up the private helper late rather than capturing its implementation', async () => {
  await withStore(({ store, events, drain }) => {
    const input = params(); const conv = store.getConversations()[0]; store.sendMessage(input);
    const hook = store as unknown as { simulateFoxyBotReply: (...args: unknown[]) => void };
    const original = Object.getOwnPropertyDescriptor(hook, 'simulateFoxyBotReply');
    try {
      let received: unknown[] = [];
      hook.simulateFoxyBotReply = (...args) => { received = args; };
      conv.id = 'late-id'; input.text = 'late-text'; input.senderRole = 'foxy';
      events.length = 0; drain();
      assert.deepEqual(received, ['late-id', 'late-text', 'foxy']); assert.deepEqual(events, []);
    } finally {
      if (original) Object.defineProperty(hook, 'simulateFoxyBotReply', original);
      else Reflect.deleteProperty(hook, 'simulateFoxyBotReply');
    }
  }, [seed({ type: 'bot' })]);
});
