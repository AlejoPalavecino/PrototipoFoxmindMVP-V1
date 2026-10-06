import assert from 'node:assert/strict';
import test from 'node:test';
import { classroomRepository } from '../../classrooms';
import type { Conversation, DirectMessageItem } from '../../../types';

type Store = typeof import('../messagingStore').messagingStore;
type Send = Parameters<Store['sendClassroomInvitation']>[0];
const KEY = 'foxmind_shared_messages_v5';
const teacher = { senderTeacherId: 'docente-t4b', senderTeacherName: 'Prof. T4b' };
const classroom = { id: 't4b-invitation-only', subject: 'Materia T4b', course: '4°Z' };
const base: Send = { ...teacher, classroom, code: 'T4B-2026', recipientStudentName: 'Ana Pérez' };
const suffix = '\n\nPuedes aceptar la invitación directamente desde esta tarjeta interactiva o ingresar con el código de clase.';
let importId = 0;

// Characterize the actual singleton, not an imitation of the application layer.
// Query imports isolate messaging fixtures; classrooms retain their real shared owner.
async function withStore(run: (store: Store, harness: Harness) => void | Promise<void>, initial: Conversation[] | null = []) {
  const descriptors = ['localStorage', 'Date'].map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  const randomDescriptor = Object.getOwnPropertyDescriptor(Math, 'random')!;
  const membership = classroomRepository.readMembership();
  const RealDate = Date;
  const harness: Harness = { events: [], writes: [], onTime: undefined, onWrite: undefined };
  let tick = 1000;
  class Clock extends RealDate {
    constructor() { super('2026-04-15T10:24:00Z'); harness.events.push('new Date'); }
    static now() { harness.events.push('Date.now'); return tick++; }
    toLocaleTimeString(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
      assert.deepEqual(locales, []);
      assert.deepEqual(options, { hour: '2-digit', minute: '2-digit' });
      harness.events.push('time');
      harness.onTime?.();
      return '10:24';
    }
  }
  try {
    Object.defineProperty(globalThis, 'Date', { configurable: true, writable: true, value: Clock });
    Object.defineProperty(Math, 'random', { configurable: true, writable: true, value: () => {
      harness.events.push('random'); return 0.5;
    } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: {
      getItem(key: string) { assert.equal(key, KEY); return initial === null ? null : JSON.stringify(initial); },
      setItem(key: string, value: string) {
        assert.equal(key, KEY);
        harness.events.push('write');
        harness.writes.push(JSON.parse(value));
        harness.onWrite?.();
      },
    } });
    const url = new URL('../messagingStore.ts', import.meta.url);
    url.searchParams.set('invitation-characterization', String(++importId));
    const { messagingStore } = await import(url.href);
    harness.events.length = 0;
    harness.writes.length = 0;
    await run(messagingStore, harness);
  } finally {
    classroomRepository.replaceMembership(membership);
    assert.strictEqual(classroomRepository.readMembership(), membership);
    Object.defineProperty(Math, 'random', randomDescriptor);
    ['localStorage', 'Date'].forEach((key, index) => {
      if (descriptors[index]) Object.defineProperty(globalThis, key, descriptors[index]!);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
}

interface Harness {
  events: string[];
  writes: Conversation[][];
  onTime?: () => void;
  onWrite?: () => void;
}

function seed(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'existing', type: 'direct', title: 'Keep title', subtitle: 'Keep subtitle', avatarInitial: 'KT',
    colorScheme: 'fox-orange', classroomLink: 'keep-link', isPinned: true, tags: ['Keep tag'],
    participants: [
      { id: teacher.senderTeacherId, name: teacher.senderTeacherName, role: 'docente', status: 'online' },
      { id: 'alumno-anaprez', name: 'Ana Pérez', role: 'alumno', status: 'online' },
    ],
    messages: [], lastMessage: 'Before', lastMessageTime: 'Before', lastMessageSender: 'Before',
    unreadCountAlumno: 4, unreadCountDocente: 3, ...overrides,
  };
}

function invite(store: Store, params: Send = base) {
  const result = store.sendClassroomInvitation(params);
  const conv = store.getConversationById(result.conversationId)!;
  const msg = conv.messages.find(m => m.id === result.messageId)!;
  return { result, conv, msg };
}

function respond(store: Store, conv: Conversation, msg: DirectMessageItem, response: 'accepted' | 'declined') {
  store.respondToClassroomInvitation({ conversationId: conv.id, messageId: msg.id, response,
    responderId: 'alumno-response', responderName: 'Ana Responde' });
}

function assertReply(conv: Conversation, msg: DirectMessageItem, response: 'accepted' | 'declined', id: number) {
  const text = response === 'accepted'
    ? `✅ ¡Muchas gracias ${msg.senderName}! He aceptado la invitación y ya me sumé al aula virtual de ${msg.invitation!.subject} (${msg.invitation!.course}).`
    : `He recibido la invitación para ${msg.invitation!.subject} (${msg.invitation!.course}), pero en este momento no me será posible cursarla. ¡Muchas gracias por la convocatoria!`;
  assert.deepEqual(conv.messages.at(-1), {
    id: `msg-resp-${id}`, senderId: 'alumno-response', senderName: 'Ana Responde', senderRole: 'alumno',
    text, timestamp: '10:24', dateGroup: 'Hoy', status: 'sent',
    replyTo: { id: msg.id, senderName: msg.senderName, text: `Invitación al aula: ${msg.invitation!.subject}` },
    categoryTag: response === 'accepted' ? 'Confirmación' : 'Consulta',
  });
  assert.equal(conv.lastMessage, text);
  assert.equal(conv.lastMessageTime, '10:24');
  assert.equal(conv.lastMessageSender, 'Ana Responde');
  assert.equal(msg.invitation!.status, response);
}

test('new invitation has the exact Spanish payload, defaults, normalized ID and initial unread two', async () => {
  await withStore((store, h) => {
    const unsubscribe = store.subscribe(() => { h.events.push('listener'); });
    try {
      const { result, conv, msg } = invite(store);
      assert.deepEqual(result, { conversationId: 'dm-t4b-anaprez-1000', messageId: 'msg-inv-1001-i' });
      assert.deepEqual(msg, {
        id: result.messageId, senderId: teacher.senderTeacherId, senderName: teacher.senderTeacherName,
        senderRole: 'docente', text: '¡Hola Ana Pérez! Te envío la invitación oficial para unirte a nuestra aula virtual de Materia T4b (4°Z).' + suffix,
        timestamp: '10:24', dateGroup: 'Hoy', status: 'delivered', categoryTag: 'Invitación',
        invitation: { classroomId: classroom.id, subject: classroom.subject, course: classroom.course,
          teacherName: teacher.senderTeacherName, code: 'T4B-2026', status: 'pending', color: 'bg-fox-purple',
          schedule: ['Martes 10:00 hs', 'Jueves 11:30 hs'], description: 'Espacio pedagógico oficial de Materia T4b en FoxMind.', activeTasks: 1 },
      });
      assert.deepEqual(conv, {
        id: result.conversationId, type: 'direct', title: 'Ana Pérez', subtitle: 'Alumna/o — 4°Z', avatarInitial: 'AN',
        colorScheme: 'fox-purple', classroomLink: classroom.id,
        participants: [
          { id: teacher.senderTeacherId, name: teacher.senderTeacherName, role: 'docente', course: 'Materia T4b 4°Z', status: 'online' },
          { id: 'alumno-anaprez', name: 'Ana Pérez', role: 'alumno', course: '4°Z', email: undefined, status: 'online' },
        ],
        lastMessage: '🎓 Invitación al aula Materia T4b (4°Z)', lastMessageTime: '10:24', lastMessageSender: teacher.senderTeacherName,
        unreadCountDocente: 0, unreadCountAlumno: 2, isPinned: false,
        tags: ['Materia T4b', '4°Z', 'Invitación'], messages: [msg],
      });
      assert.deepEqual(h.events, ['new Date', 'time', 'Date.now', 'Date.now', 'random', 'write', 'listener']);
      assert.deepEqual(h.writes, [JSON.parse(JSON.stringify([conv]))]);
    } finally { unsubscribe(); }
  });
});

test('custom note, supplied schedule identity and zero tasks survive sending', async () => {
  await withStore(store => {
    const schedule = ['Viernes 12:00'];
    const { msg } = invite(store, { ...base, customNote: '  Nota personal  ',
      classroom: { ...classroom, schedule, color: 'bg-custom', description: 'Descripción propia', activeTasks: 0 } });
    assert.equal(msg.text, 'Nota personal' + suffix);
    assert.strictEqual(msg.invitation!.schedule, schedule);
    assert.deepEqual(msg.invitation, { classroomId: classroom.id, subject: classroom.subject, course: classroom.course,
      teacherName: teacher.senderTeacherName, code: base.code, status: 'pending', color: 'bg-custom',
      description: 'Descripción propia', activeTasks: 0, schedule });
  });
});

for (const [name, input, expectedName, expectedId] of [
  ['email prefix', { recipientEmail: 'alex.sur@school.test' }, 'alex.sur', 'alumno-alexsur'],
  ['student fallback', {}, 'Estudiante', 'alumno-estudiante'],
  ['explicit ID', { recipientStudentName: 'Á É!', recipientStudentId: 'student-explicit' }, 'Á É!', 'student-explicit'],
] as const) {
  test(`${name} determines recipient while blank note/color/description use defaults`, async () => {
    await withStore(store => {
      const { conv, msg } = invite(store, { ...teacher, code: base.code, classroom: { ...classroom, color: '', description: '' },
        ...input, customNote: '  ' });
      assert.equal(conv.title, expectedName);
      assert.equal(conv.participants[1].id, expectedId);
      assert.equal(conv.participants[1].email, 'recipientEmail' in input ? input.recipientEmail : undefined);
      assert.equal(msg.text, `¡Hola ${expectedName}! Te envío la invitación oficial para unirte a nuestra aula virtual de Materia T4b (4°Z).` + suffix);
      assert.equal(msg.invitation!.color, 'bg-fox-purple');
      assert.equal(msg.invitation!.description, 'Espacio pedagógico oficial de Materia T4b en FoxMind.');
    });
  });
}

for (const match of ['id', 'name', 'email', 'teacher name'] as const) {
  test(`existing direct conversation reuses ${match} match without replacing metadata`, async () => {
    const existing = seed();
    if (match === 'name') { existing.participants[1].id = 'different'; existing.participants[1].name = 'ANA PÉREZ'; }
    if (match === 'email') { existing.participants[1].id = 'different'; existing.participants[1].name = 'Other'; existing.participants[1].email = 'ana@school.test'; }
    if (match === 'teacher name') existing.participants[0].id = 'different-teacher-id';
    await withStore((store, h) => {
      const before = store.getConversations()[0];
      const { conv, result } = invite(store, { ...base, recipientEmail: 'ana@school.test' });
      assert.strictEqual(conv, before);
      assert.deepEqual(result, { conversationId: 'existing', messageId: 'msg-inv-1000-i' });
      assert.equal(conv.unreadCountAlumno, 5);
      assert.equal(conv.unreadCountDocente, 3);
      assert.deepEqual([conv.title, conv.subtitle, conv.classroomLink, conv.tags, conv.colorScheme, conv.isPinned],
        ['Keep title', 'Keep subtitle', 'keep-link', ['Keep tag'], 'fox-orange', true]);
      assert.deepEqual(h.events, ['new Date', 'time', 'Date.now', 'random', 'write']);
    }, [existing]);
  });
}

for (const excluded of ['channel', 'other teacher', 'non-teacher name'] as const) {
  test(`${excluded} does not match; new conversation is unshifted`, async () => {
    const existing = seed();
    if (excluded === 'channel') existing.type = 'channel';
    else { existing.participants[0].id = 'different';
      if (excluded === 'other teacher') existing.participants[0].name = 'Other';
      else existing.participants[0].role = 'alumno'; }
    await withStore(store => {
      const before = store.getConversations()[0];
      const { conv } = invite(store);
      assert.deepEqual(store.getConversations(), [conv, before]);
      assert.equal(before.messages.length, 0);
    }, [existing]);
  });
}

test('duplicate invitations append distinct messages and increment unread without extra conversations', async () => {
  await withStore((store, h) => {
    const first = invite(store);
    const second = invite(store);
    assert.strictEqual(first.conv, second.conv);
    assert.deepEqual(first.conv.messages.map(m => m.id), ['msg-inv-1001-i', 'msg-inv-1002-i']);
    assert.equal(first.conv.unreadCountAlumno, 3);
    assert.equal(store.getConversations().length, 1);
    assert.equal(h.writes.length, 2);
  });
});

for (const response of ['accepted', 'declined'] as const) {
  test(`${response} response overwrites status on repeat, appends exact replies and notifies once per operation`, async () => {
    await withStore((store, h) => {
      const beforeMembership = classroomRepository.readMembership();
      const { conv, msg } = invite(store);
      h.events.length = 0; h.writes.length = 0;
      let calls = 0;
      const unsubscribe = store.subscribe(() => { calls++; h.events.push('listener'); });
      try {
        respond(store, conv, msg, response);
        assertReply(conv, msg, response, 1002);
        const enrolled = classroomRepository.readMembership();
        if (response === 'accepted') {
          assert.notStrictEqual(enrolled, beforeMembership);
          assert.deepEqual(enrolled[0], { ...classroom, studentsCount: 26, progress: 0, activeTasks: 1,
            pendingSubmissions: 0, avgGrade: 0, color: 'bg-fox-purple', teacherName: teacher.senderTeacherName,
            nextClass: 'Próximamente', lastActivity: 'Recién unida' });
          assert.strictEqual(enrolled[1], beforeMembership[0]);
        } else assert.strictEqual(enrolled, beforeMembership);
        respond(store, conv, msg, response);
        assertReply(conv, msg, response, 1003);
        assert.strictEqual(classroomRepository.readMembership(), enrolled);
        assert.equal(conv.messages.length, 3);
        assert.equal(conv.unreadCountDocente, 2);
        assert.equal(conv.unreadCountAlumno, 2);
        assert.equal(calls, 2);
        assert.equal(h.writes.length, 2);
        assert.deepEqual(h.events, ['new Date', 'time', 'Date.now', 'write', 'listener', 'new Date', 'time', 'Date.now', 'write', 'listener']);
      } finally { unsubscribe(); }
    });
  });
}

test('accept then decline retains real membership; enrollment precedes clock, reply, storage and listener refresh', async () => {
  await withStore((store, h) => {
    const { conv, msg } = invite(store, { ...base, classroom: { ...classroom, activeTasks: 0 } });
    msg.invitation!.teacherName = '';
    msg.invitation!.color = '';
    h.events.length = 0;
    const readEnrollment = () => {
      const enrolled = classroomRepository.readMembership()[0];
      assert.equal(enrolled.id, classroom.id);
      assert.equal(enrolled.activeTasks, 1, 'zero becomes one only for enrollment');
      assert.equal(enrolled.teacherName, msg.senderName);
      assert.equal(enrolled.color, 'bg-fox-blue');
      return enrolled;
    };
    h.onTime = () => { readEnrollment(); assert.equal(conv.messages.length, 1, 'enroll before reply'); };
    h.onWrite = () => { readEnrollment(); assert.equal(conv.messages.length, 2); };
    const unsubscribe = store.subscribe(() => {
      const refreshed = classroomRepository.readMembership();
      assert.strictEqual(refreshed[0], readEnrollment());
      assert.equal(h.events.at(-1), 'write');
      assert.equal(h.writes.at(-1)![0].messages.length, 2);
      h.events.push('listener');
    });
    try { respond(store, conv, msg, 'accepted'); } finally { unsubscribe(); }
    assert.deepEqual(h.events, ['new Date', 'time', 'Date.now', 'write', 'listener']);
    const membership = classroomRepository.readMembership();
    h.onTime = undefined; h.onWrite = undefined;
    respond(store, conv, msg, 'declined');
    assertReply(conv, msg, 'declined', 1003);
    assert.strictEqual(classroomRepository.readMembership(), membership);
    assert.equal(msg.invitation!.activeTasks, 0);
  });
});

test('real repository duplicate by subject/course returns existing reference without replacing membership', async () => {
  await withStore(store => {
    const existing = classroomRepository.add({ ...classroom, id: 't4b-existing-owner', activeTasks: 7 });
    const membership = classroomRepository.readMembership();
    const { conv, msg } = invite(store);
    respond(store, conv, msg, 'accepted');
    assert.strictEqual(classroomRepository.readMembership(), membership);
    assert.strictEqual(classroomRepository.readMembership()[0], existing);
    assert.equal(existing.activeTasks, 7);
    assert.equal(classroomRepository.readMembership().some(c => c.id === classroom.id), false);
  });
});

test('missing conversation, missing message and non-invitation are no-ops without clocks, writes or listeners', async () => {
  await withStore((store, h) => {
    const { conv, msg } = invite(store);
    const membership = classroomRepository.readMembership();
    const before = JSON.stringify(store.getConversations());
    h.events.length = 0; h.writes.length = 0;
    let calls = 0;
    const unsubscribe = store.subscribe(() => { calls++; });
    try {
      store.respondToClassroomInvitation({ conversationId: 'absent', messageId: msg.id, response: 'accepted', responderId: 'a', responderName: 'A' });
      store.respondToClassroomInvitation({ conversationId: conv.id, messageId: 'absent', response: 'accepted', responderId: 'a', responderName: 'A' });
      delete msg.invitation;
      const noInvitation = JSON.stringify(store.getConversations());
      respond(store, conv, msg, 'accepted');
      assert.equal(JSON.stringify(store.getConversations()), noInvitation);
      assert.notEqual(noInvitation, before);
      assert.deepEqual(h.events, []);
      assert.deepEqual(h.writes, []);
      assert.equal(calls, 0);
      assert.strictEqual(classroomRepository.readMembership(), membership);
    } finally { unsubscribe(); }
  });
});

for (const lookup of ['global', 'setItem'] as const) {
  test(`invitation keeps T4a late reference reads under reentrant ${lookup} storage`, async () => {
    await withStore((store, h) => {
      const storage = globalThis.localStorage;
      const target = lookup === 'global' ? globalThis : storage;
      const key = lookup === 'global' ? 'localStorage' : 'setItem';
      const original = Object.getOwnPropertyDescriptor(target, key);
      const setItem = storage.setItem;
      let armed = true;
      const unsubscribe = store.subscribe(() => { assert.equal(h.writes.at(-1)!.length, 11); });
      try {
        Object.defineProperty(target, key, { configurable: true, get() {
          if (armed) { armed = false; store.resetToDefault(); }
          return lookup === 'global' ? storage : setItem;
        } });
        const result = store.sendClassroomInvitation(base);
        assert.equal(result.conversationId, 'dm-t4b-anaprez-1000');
        assert.deepEqual(h.writes.map(value => value.length), [11, 11]);
        assert.equal(store.getConversations().length, 11);
      } finally {
        unsubscribe();
        if (original) Object.defineProperty(target, key, original);
        else Reflect.deleteProperty(target, key);
      }
    });
  });
}

test('conversation insertion reads current store state after reentrant time formatting', async () => {
  await withStore((store, h) => {
    h.onTime = () => { h.onTime = undefined; store.resetToDefault(); };
    const { conv } = invite(store);
    assert.strictEqual(store.getConversations()[0], conv);
    assert.equal(store.getConversations().length, 12);
    assert.deepEqual(h.writes.map(value => value.length), [11, 12]);
  });
});

test('query imports isolate messaging singleton and fixtures while membership owner remains shared', async () => {
  await withStore(async first => {
    const firstConv = first.getConversations()[0];
    firstConv.isPinned = false;
    const enrolled = classroomRepository.add({ ...classroom, id: 't4b-shared-import-owner' });
    await withStore(second => {
      assert.notStrictEqual(first, second);
      assert.notStrictEqual(firstConv, second.getConversations()[0]);
      assert.equal(second.getConversations()[0].isPinned, true);
      assert.strictEqual(classroomRepository.readMembership()[0], enrolled);
    }, null);
  }, null);
});
