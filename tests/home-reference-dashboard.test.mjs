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

async function withHome(aggregate, body, accountRole = 'teacher', { readPage = options => aggregate.modules[options.module], agendaClient } = {}) {
  const previous = { window: globalThis.window };
  globalThis.window = new EventTarget();
  const requests = [], calls = [];
  const client = {
    read: async options => { requests.push(options); return aggregate; },
    page: async options => {
      requests.push(options);
      return { subjectId: aggregate.subjectId, generatedAt: aggregate.generatedAt,
        module: options.module, page: readPage(options) };
    },
  };
  const { Home } = loadTsModule('apps/web/src/features/home/ui/Home.tsx');
  const view = hookView(Home, { accountRole, displayName: 'Alex', subjectId: 'subject', homeClient: client, agendaClient,
    onCreate: () => calls.push('create'), onJoin: () => calls.push('join'), onClassrooms: () => calls.push('classrooms'),
    onAgenda() {}, onAction: target => calls.push(target) });
  try { await view.flush(); await body({ view, requests, calls, client }); }
  finally {
    view.close();
    for (const [key, value] of [['window', previous.window]]) {
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

test('Home retries each visible failed source in its role-specific section and in the classroom picker', async () => {
  for (const role of ['teacher', 'student']) {
    const agendaRequests = [];
    const agendaClient = { list: async (range, cursor, signal) => {
      agendaRequests.push({ range, cursor, signal });
      if (agendaRequests.length === 1) throw new Error('Temporary agenda failure');
      return { items: [], nextCursor: null };
    } };
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
      assert.equal(find(view.tree, 'HomeModule'), undefined, 'Inicio ya no incluye borradores ni devoluciones');

      const agenda = find(view.tree, 'HomeMiniagenda');
      const agendaView = hookView(agenda.type, agenda.props);
      try {
        await agendaView.flush();
        assert.equal(agendaRequests.length, 1);
        button(agendaView.tree, /^Reintentar agenda$/).props.onClick();
        await agendaView.flush();
        assert.deepEqual(agendaRequests.map(({ range, cursor }) => ({ range, cursor })), Array(2).fill({
          range: { startDate: '2026-10-26', endDateExclusive: '2026-11-02', timeZone: 'UTC' }, cursor: null,
        }));
        assert.equal(agendaRequests[0].signal.aborted, true);
        assert.doesNotMatch(text(agendaView.tree), /No pudimos cargar tu agenda/);
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
        ? ['review', 'queries', 'classrooms', 'classrooms']
        : ['pending', 'classrooms']);
    }, role, { agendaClient });
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

test('Home completes the paginated review queue and opens the exact attempt from the next page', async () => {
  const classroom = { id: 'room', name: 'Science', role: 'teacher', archived: false };
  const review = (id, studentName) => ({ id, title: 'Lab', classroom, studentName, oldestSubmittedAt: '2026-11-05T12:00:00Z',
    needsReview: 1, readyToPublish: 0, target: { kind: 'submissions', classroomId: classroom.id, activityId: 'lab', attemptId: id } });
  const first = review('first', 'Primera persona'), next = review('next', 'Segunda persona');
  const firstPage = page(2, { items: [first], nextCursor: 'next-real-page' });
  await withHome(data({ review: firstPage }), async ({ view, requests, calls }) => {
    assert.deepEqual(requests.slice(1), [{ module: 'review', timeZone: requests[0].timeZone, order: 'asc', cursor: 'next-real-page' }]);
    const queue = render(find(view.tree, 'HomePriorities'));
    assert.equal(descendants(queue, node => node.type === 'button' && node.props['aria-label'] === 'Revisar Primera persona').length, 1);
    assert.doesNotMatch(text(queue), /Ver todas/);
    button(queue, /^Revisar Segunda persona$/).props.onClick();
    assert.deepEqual(calls, [next.target]);
  }, 'teacher', { readPage(options) {
    assert.equal(options.cursor, 'next-real-page');
    return page(2, { items: [first, next] });
  } });
});

test('Private drafts stay in their classroom and reopen the exact draft without publishing', async () => {
  const { Activities } = loadTsModule('apps/web/src/application/academic-Activities.tsx');
  const room = { id: 'other', name: 'Aula', role: 'teacher', archived: false, units: [] };
  const draft = { id: 'draft', title: 'Borrador privado', type: 'ASSIGNMENT', status: 'DRAFT' };
  const calls = [];
  const view = hookView(Activities, { room, reload: async () => {}, api: { call: async (path, method) => {
    calls.push([path, method]);
    if (path === '/other/activities') return { activities: [draft] };
    if (path === '/other/progress') return { scope: 'classroom', students: [] };
    if (path === '/other/library') return [];
    if (path === '/other/activities/draft/preview') return { activity: draft, revision: '1' };
    assert.fail(path);
  } } });
  try {
    await view.flush();
    assert.ok(!descendants(view.tree, node => node.type === 'button' && node.props['aria-label'] === 'Abrir Borrador privado').length);
    button(view.tree, /^Borradores privados/).props.onClick();
    await view.flush();
    button(view.tree, /^Abrir Borrador privado$/).props.onClick();
    await view.flush();
    assert.strictEqual(find(view.tree, 'ActivityAuthoring').props.data.activity, draft);
    assert.deepEqual(calls.filter(([path]) => path.includes('/preview')), [['/other/activities/draft/preview', 'GET']]);
    assert.ok(calls.every(([, method]) => method === 'GET'));
  } finally { view.close(); }
});
