import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const names = ['pending', 'review', 'feedback', 'agenda', 'queries', 'materials', 'classrooms', 'drafts', 'submitted'];
const page = (totalItems = null, extra = {}) => ({ status: 'ready', items: [], totalItems, nextCursor: null, ...extra });
const data = (modules = {}, extra = {}) => ({ version: 1, subjectId: 'subject', generatedAt: '2026-10-28T12:00:00Z',
  timeZone: 'UTC', participation: 'mixed', memberships: { study: 7, teach: 4, archived: 2 },
  setup: { drafts: 0, invitations: 0 }, modules: { ...Object.fromEntries(names.map(name => [name, page()])), ...modules }, ...extra });
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) :
  Array.isArray(node) ? node.map(text).join(' ') : text(node?.props?.children ?? '');
const error = { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true };

const find = (tree, name) => descendants(tree, node => node.type?.name === name)[0];
function button(tree, pattern) {
  const control = descendants(tree, node => node.type === 'button' && pattern.test(node.props['aria-label'] ?? text(node).trim()))[0];
  assert.ok(control, `Missing button: ${pattern}`);
  return control;
}
const render = component => component.type(component.props);

async function withHome(aggregate, body, accountRole = 'teacher') {
  const previous = { window: globalThis.window, document: globalThis.document, frame: globalThis.requestAnimationFrame };
  globalThis.window = new EventTarget();
  const focus = [], requests = [], calls = [];
  const queueTrigger = { getAttribute: () => 'Ver todas', focus: () => focus.push('queue trigger') };
  globalThis.document = {
    activeElement: queueTrigger,
    querySelectorAll: () => [queueTrigger],
    querySelector: () => ({ focus: () => focus.push('home heading') }),
  };
  globalThis.requestAnimationFrame = callback => callback();
  const client = {
    read: async options => { requests.push(options); return aggregate; },
    page: async options => {
      requests.push(options);
      return { subjectId: aggregate.subjectId, generatedAt: aggregate.generatedAt,
        module: options.module, page: aggregate.modules[options.module] };
    },
  };
  const { Home } = loadTsModule('apps/web/src/features/home/ui/Home.tsx');
  const view = hookView(Home, { accountRole, displayName: 'Alex', subjectId: 'subject', homeClient: client,
    onCreate: () => calls.push('create'), onJoin: () => calls.push('join'), onClassrooms: () => calls.push('classrooms'),
    onAgenda() {}, onAction: target => calls.push(target) });
  try { await view.flush(); await body({ view, focus, requests, calls, client }); }
  finally {
    view.close();
    for (const [key, value] of [['window', previous.window], ['document', previous.document], ['requestAnimationFrame', previous.frame]]) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
}

test('Empty participation offers the correct classroom action for each account role', async t => {
  for (const [role, label, action, forbidden] of [
    ['teacher', /^Crear mi primera aula$/, 'create', /unirme con código/i],
    ['student', /^Unirme con código$/, 'join', /crear mi primera aula/i],
  ]) await t.test(role, async () => {
    await withHome(data({}, { participation: 'none', memberships: { study: 0, teach: 0, archived: 0 } }), async ({ view, calls }) => {
      assert.doesNotMatch(text(view.tree), forbidden);
      button(view.tree, label).props.onClick();
      assert.deepEqual(calls, [action]);
    }, role);
  });
});

test('Student greeting resumes the first open activity and only consults a closed activity', async () => {
  const classroom = { id: 'student-room', name: 'Ciencias', role: 'student', archived: false };
  const makePending = (id, reception) => ({
    id, title: id, classroom, reception, activityType: 'ASSIGNMENT', attemptId: null, deadlineAt: null,
    target: { kind: 'activity', classroomId: classroom.id, activityId: id },
  });
  const closed = makePending('closed', 'closed');
  const open = makePending('open', 'open');
  for (const [items, label, target] of [
    [[closed, open], /^Continuar actividad$/, { ...open.target, mode: 'respond' }],
    [[closed], /^Consultar actividad$/, closed.target],
  ]) {
    await withHome(data({ pending: page(items.length, { items }) }), async ({ view, calls }) => {
      const greeting = render(find(view.tree, 'HomeGreeting'));
      assert.equal(descendants(greeting, node => node.type === 'button').length, 1);
      button(greeting, label).props.onClick();
      assert.deepEqual(calls, [target]);
    }, 'student');
  }
});

test('Home retries every failed source in its role-specific section and in the classroom picker', async () => {
  for (const role of ['teacher', 'student']) {
    await withHome(data(Object.fromEntries(names.map(name => [name, error]))), async ({ view, requests }) => {
      const retry = /^Reintentar/;
      const priority = () => render(find(view.tree, 'HomePriorities'));
      button(priority(), retry).props.onClick();
      await view.flush();
      if (role === 'teacher') {
        button(priority(), /^Consultas/).props.onClick();
        await view.flush();
        button(priority(), retry).props.onClick();
        await view.flush();
      }
      const secondary = descendants(view.tree, node => node.type?.name === 'HomeModule');
      assert.deepEqual(secondary.map(node => node.props.name), role === 'teacher' ? ['drafts'] : ['feedback']);
      button(render(secondary[0]), retry).props.onClick();
      await view.flush();

      const agenda = find(view.tree, 'HomeMiniagenda');
      const agendaView = hookView(agenda.type, agenda.props);
      try {
        await agendaView.flush();
        button(agendaView.tree, /^Reintentar agenda$/).props.onClick();
        await view.flush();
      } finally { agendaView.close(); }

      const cards = render(find(view.tree, 'HomeClassCards'));
      assert.match(text(cards), /No pudimos cargar tus aulas/);
      button(cards, retry).props.onClick();
      await view.flush();

      if (role === 'teacher') {
        button(render(find(view.tree, 'HomeGreeting')), /^Crear actividad$/).props.onClick();
        await view.flush();
        const picker = find(view.tree, 'HomeRoomPicker');
        const pickerView = hookView(picker.type, picker.props);
        try {
          await pickerView.flush();
          assert.match(text(pickerView.tree), /No pudimos cargar tus aulas/);
          button(pickerView.tree, retry).props.onClick();
          await pickerView.flush();
        } finally { pickerView.close(); }
      }
      assert.deepEqual(requests.slice(1).map(request => request.module), role === 'teacher'
        ? ['review', 'queries', 'drafts', 'agenda', 'classrooms', 'classrooms']
        : ['pending', 'feedback', 'agenda', 'classrooms']);
    }, role);
  }
});

test('Home keeps its main widgets and decorative illustration inside the welcome layout', async () => {
  await withHome(data(), async ({ view }) => {
    assert.equal(descendants(view.tree, node => node.props?.['aria-label'] === 'Actualizar Inicio').length, 0);
    assert.ok(find(view.tree, 'HomePriorities'));
    assert.ok(find(view.tree, 'HomeMiniagenda'));
    const greeting = render(find(view.tree, 'HomeGreeting'));
    const art = descendants(greeting, node => node.props?.className === 'home-illustration')[0];
    assert.ok(art);
    assert.equal(art.props['aria-hidden'], 'true');
    assert.equal(descendants(art, node => node.type === 'img')[0].props.alt, '');
  });
});

for (const teacher of [true, false]) test(`Contextual ${teacher ? 'teacher' : 'student'} actions select only authorized active rooms through the approved dialog`, async () => {
  const { ClassroomActions } = loadTsModule('apps/web/src/features/home/ui/HomeShortcuts.tsx');
  const role = teacher ? 'teacher' : 'student', otherRole = teacher ? 'student' : 'teacher';
  const rooms = [['forbidden', otherRole, false], ['archive', role, true], ['first', role, false], ['second', role, false]]
    .map(([id, role, archived]) => ({ id, classroom: { id, name: id, role, archived, division: 'A' } }));
  const calls = [], selected = []; let navigated = 0;
  const view = hookView(ClassroomActions, { teacher, data: data({ classrooms: page(null, { items: rooms, nextCursor: 'next' }) }),
    onAction: target => calls.push(target), onSelected: id => selected.push(id), onClassrooms: () => navigated++ });
  const labels = teacher ? ['Crear actividad', 'Agregar material', 'Publicar aviso', 'Ver progreso'] : ['Materiales', 'Mi progreso', 'Plan de estudio', 'Muro del aula'];
  try {
    await view.flush();
    assert.equal(descendants(view.tree, node => node.type === 'select').length, 0);
    assert.equal(descendants(view.tree, node => node.type === 'a').length, 0);
    for (const label of labels) descendants(view.tree, node => node.type === 'button' && text(node).trim() === label)[0].props.onClick();
    assert.ok(calls.every(target => target.classroomId === 'first'));
    calls.length = 0;
    descendants(view.tree, node => node.type === 'button' && text(node).startsWith('Cambiar aula'))[0].props.onClick();
    await view.flush();
    const dialog = descendants(view.tree, node => node.type?.name === 'Dialog')[0];
    assert.equal(dialog.props.title, 'Elegí un aula');
    const options = descendants(dialog, node => node.type === 'button');
    assert.deepEqual(options.map(node => text(node).trim()), ['first A', 'second A']);
    assert.deepEqual(options.map(node => node.props['aria-pressed']), [true, false]);
    options[1].props.onClick(); await view.flush();
    assert.deepEqual(selected, ['second'], 'The same chosen context reaches the parent focus card');
    assert.equal(descendants(view.tree, node => node.type?.name === 'Dialog').length, 0);
    for (const label of labels) descendants(view.tree, node => node.type === 'button' && text(node).trim() === label)[0].props.onClick();
    assert.deepEqual(calls, teacher ? [
      { kind: 'create-activity', classroomId: 'second' }, { kind: 'upload-material', classroomId: 'second' },
      { kind: 'publish-notice', classroomId: 'second' }, { kind: 'classroom', classroomId: 'second', section: 'progress' },
    ] : ['library', 'progress', 'plan', 'wall'].map(section => ({ kind: 'classroom', classroomId: 'second', section })));
    descendants(view.tree, node => node.type === 'button' && text(node) === 'Ver todas mis aulas')[0].props.onClick();
    assert.equal(navigated, 1, 'Pagination preserves navigation without inventing a total');
  } finally { view.close(); }
  for (const items of [rooms.slice(0, 2), rooms.slice(2, 3)]) {
    const fallback = hookView(ClassroomActions, { teacher, data: data({ classrooms: page(null, { items }) }),
      onAction() { assert.fail('No action was requested'); }, onClassrooms: () => navigated++ });
    try {
      await fallback.flush();
      assert.equal(descendants(fallback.tree, node => node.type === 'button' && text(node).startsWith('Cambiar aula')).length, 0);
      if (items.length === 2) {
        assert.equal(descendants(fallback.tree, node => node.props?.className === 'fm-home-shortcut-grid').length, 0);
        descendants(fallback.tree, node => node.type === 'button' && text(node) === 'Elegir un aula en Mis aulas')[0].props.onClick();
        assert.equal(navigated, 2);
      }
    } finally { fallback.close(); }
  }
});

test('Unknown classroom totals and unavailable queues do not become fabricated zero counts', async () => {
  await withHome(data({ review: error, queries: page(null), pending: page(null), classrooms: error }), async ({ view }) => {
    const greeting = render(find(view.tree, 'HomeGreeting'));
    assert.match(text(greeting), /Un espacio para tus ideas y tus próximos pasos/);
    assert.doesNotMatch(text(greeting), /0 entregas|0 consultas/);
    const priorities = render(find(view.tree, 'HomePriorities'));
    const tabs = descendants(priorities, node => node.props['aria-label'] === 'Pendientes docentes')[0];
    assert.deepEqual(descendants(tabs, node => node.type === 'span').map(node => node.props.children), ['—', '—']);
  });
});

test('Home rejects another subject and clears private modules after a revoked classroom retry', async () => {
  await withHome(data({}, { subjectId: 'another-subject' }), async ({ view }) => {
    assert.equal(descendants(view.tree, node => node.type?.name === 'HomeModule').length, 0);
    assert.equal(descendants(view.tree, node => node.type?.name === 'HomeGreeting').length, 0);
    assert.match(text(view.tree), /No pudimos cargar tus actividades/);
  }, 'student');
  for (const code of ['FORBIDDEN', 'AUTH_REQUIRED']) {
    await withHome(data({ classrooms: error }), async ({ view, client }) => {
      client.page = async () => { throw Object.assign(new Error(code), { code }); };
      button(render(find(view.tree, 'HomeClassCards')), /^Reintentar$/).props.onClick();
      await view.flush();
      for (const name of ['HomeGreeting', 'HomeModule', 'HomeClassCards', 'HomePriorities']) assert.equal(find(view.tree, name), undefined, code);
      assert.match(text(view.tree), /No pudimos cargar tus actividades/);
    }, 'student');
  }
});

test('Inapplicable work queues disappear while archived classroom history stays reachable', async () => {
  const modules = Object.fromEntries(['pending', 'feedback', 'review', 'queries'].map(name => [name, { status: 'not-applicable' }]));
  modules.classrooms = page(1, { items: [{ id: 'archived', classroom: { name: 'Private archive', archived: true } }] });
  for (const role of ['teacher', 'student']) {
    await withHome(data(modules, { participation: 'none', memberships: { study: 0, teach: 0, archived: 1 } }), async ({ view, calls }) => {
      assert.equal(render(find(view.tree, 'HomePriorities')), null);
      const cards = render(find(view.tree, 'HomeClassCards'));
      assert.doesNotMatch(text(cards), /Private archive/);
      button(cards, /^Ver mis aulas$/).props.onClick();
      assert.deepEqual(calls, ['classrooms']);
    }, role);
  }
});

test('Creating an activity from Home only allows explicit selection of an active teaching room', async () => {
  const items = [['student', 'student', false], ['archive', 'teacher', true], ['first', 'teacher', false], ['second', 'teacher', false]]
    .map(([id, role, archived]) => ({ id, title: id, classroom: { id, name: id, role, archived }, target: { kind: 'classroom', classroomId: id, section: 'plan' } }));
  await withHome(data({ classrooms: page(23, { items, nextCursor: 'next-real-page' }) }), async ({ view, calls }) => {
    button(render(find(view.tree, 'HomeGreeting')), /^Crear actividad$/).props.onClick();
    await view.flush();
    const picker = find(view.tree, 'HomeRoomPicker');
    const pickerView = hookView(picker.type, picker.props);
    try {
      await pickerView.flush();
      const options = descendants(pickerView.tree, node => node.type === 'input' && node.props.type === 'radio');
      assert.deepEqual(options.map(node => node.props.value), ['first', 'second']);
      assert.equal(button(pickerView.tree, /^Continuar$/).props.disabled, true);
      assert.deepEqual(calls, []);
      options[1].props.onChange();
      await pickerView.flush();
      assert.equal(button(pickerView.tree, /^Continuar$/).props.disabled, false);
      button(pickerView.tree, /^Continuar$/).props.onClick();
      await view.flush();
      assert.deepEqual(calls, [{ kind: 'create-activity', classroomId: 'second' }]);
      assert.equal(find(view.tree, 'HomeRoomPicker'), undefined);
    } finally { pickerView.close(); }
    button(render(find(view.tree, 'HomeClassCards')), /^Ver mis aulas$/).props.onClick();
    assert.equal(calls.at(-1), 'classrooms');
  });
});

test('Expanding a paginated work queue preserves its client and cursor and returns focus', async () => {
  await withHome(data({ review: page(23, { nextCursor: 'next-real-page' }) }), async ({ view, focus, client }) => {
    button(render(find(view.tree, 'HomePriorities')), /^Ver todas$/).props.onClick();
    await view.flush();
    const panel = descendants(view.tree, node => node.type?.name === 'HomeModulePanel')[0];
    assert.equal(panel.props.name, 'review'); assert.strictEqual(panel.props.client, client);
    assert.equal(panel.props.data.modules.review.nextCursor, 'next-real-page');
    panel.props.onClose(); await view.flush();
    assert.deepEqual(focus, ['queue trigger']);
  });
});

test('Global drafts retain their aggregate retry and exact target without any focused-room fetch', async () => {
  const item = { id: 'draft', title: 'Draft from another authorized classroom', classroom: { id: 'other', role: 'teacher', archived: false },
    activityType: 'ASSIGNMENT', updatedAt: '2026-11-05T12:00:00Z', target: { kind: 'activity', classroomId: 'other', activityId: 'draft' } };
  await withHome(data({ classrooms: page(0), drafts: error }), async ({ view, requests, calls, client }) => {
    const draftModule = () => descendants(view.tree, node => node.type?.name === 'HomeModule' && node.props.name === 'drafts')[0];
    assert.ok(draftModule(), 'Drafts remain independent of the focused classroom');
    const retry = descendants(draftModule().type(draftModule().props), node => node.type === 'button' && text(node).startsWith('Reintentar'))[0];
    assert.ok(retry);
    client.page = async options => { requests.push(options); return { subjectId: 'subject', module: 'drafts', page: page(1, { items: [item] }) }; };
    retry.props.onClick(); await view.flush();
    assert.deepEqual(requests.slice(1).map(request => request.module), ['drafts']);
    const row = descendants(draftModule().type(draftModule().props), node => node.type?.name === 'HomeRow')[0];
    assert.ok(row); row.props.onAction(row.props.item.target); assert.deepEqual(calls, [item.target]);
    assert.equal(draftModule().props.previewLimit, 2);
  });
});
