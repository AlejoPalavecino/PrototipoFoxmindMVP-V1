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

function expandGroups(node) {
  if (Array.isArray(node)) return node.map(expandGroups);
  if (!node || typeof node !== 'object') return node;
  if (['HomeLearningGroups', 'HomeFocus'].includes(node.type?.name)) return expandGroups(node.type(node.props));
  return { ...node, props: { ...node.props, children: expandGroups(node.props?.children) } };
}

async function withHome(aggregate, body, accountRole = 'teacher') {
  const previous = { window: globalThis.window, document: globalThis.document, frame: globalThis.requestAnimationFrame };
  globalThis.window = new EventTarget();
  const focus = [], requests = [], calls = [];
  globalThis.document = { querySelector: selector => ({ focus: () => focus.push(selector) }) };
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
    onCreate() {}, onJoin() {}, onClassrooms: () => calls.push('classrooms'), onAgenda() {}, onAction: target => calls.push(target) });
  try { await view.flush(); await body({ view, focus, requests, calls, client }); }
  finally {
    view.close();
    for (const [key, value] of [['window', previous.window], ['document', previous.document], ['requestAnimationFrame', previous.frame]]) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
}

test('Empty participation greeting suggests only the action available to the account role', async t => {
  for (const [role, expected, forbidden] of [
    ['teacher', /crea/i, /ún(e|i)te|unirte/i],
    ['student', /ún(e|i)te|unirte/i, /crea/i],
  ]) await t.test(role, async () => {
    await withHome(data({}, { participation: 'none', memberships: { study: 0, teach: 0, archived: 0 } }), async ({ view }) => {
      const greeting = descendants(view.tree, node => node.type?.name === 'HomeGreeting')[0];
      assert.ok(greeting, 'Home greeting is rendered');
      const accessibleMessage = descendants(greeting.type(greeting.props), node => node.props?.className === 'sr-only')[0];
      assert.ok(accessibleMessage, 'Participation message is available to assistive technology');
      assert.match(text(accessibleMessage), expected);
      assert.doesNotMatch(text(accessibleMessage), forbidden);
    }, role);
  });
});

test('Home renders the approved role sections and retries every failed source including classroom shortcuts', async () => {
  for (const role of ['teacher', 'student']) {
    await withHome(data(Object.fromEntries(names.map(name => [name, error]))), async ({ view, requests }) => {
      const modules = descendants(expandGroups(view.tree), node => node.type?.name === 'HomeModule');
      const expected = role === 'teacher' ? ['review', 'queries', 'classrooms', 'drafts'] : ['pending', 'feedback'];
      assert.deepEqual(modules.map(node => node.props.name), expected);
      if (role === 'student') assert.deepEqual(modules.map(node => node.props.title), ['Mis entregas', 'Mis devoluciones']);
      for (const module of modules) {
        const retry = descendants(module.type(module.props), node => node.type === 'button' && text(node).startsWith('Reintentar'))[0];
        assert.ok(retry, module.props.name); retry.props.onClick(); await view.flush();
      }
      const agenda = descendants(view.tree, node => node.type?.name === 'HomeMiniagenda')[0];
      const agendaView = hookView(agenda.type, agenda.props);
      try {
        await agendaView.flush();
        const retry = descendants(agendaView.tree, node => node.type === 'button' && text(node) === 'Reintentar agenda')[0];
        assert.ok(retry, 'Miniagenda failure retains its own retry'); retry.props.onClick(); await view.flush();
      } finally { agendaView.close(); }
      const shortcuts = descendants(view.tree, node => node.type?.name === (role === 'teacher' ? 'HomeTeacherTools' : 'HomeShortcuts'))[0];
      const actionComponent = shortcuts.type(shortcuts.props);
      const actions = hookView(actionComponent.type, actionComponent.props);
      try {
        await actions.flush();
        assert.match(text(actions.tree), /No pudimos cargar tus aulas/);
        assert.equal(descendants(actions.tree, node => node.props?.className === 'fm-home-shortcut-grid').length, 0);
        descendants(actions.tree, node => node.type === 'button' && text(node) === 'Reintentar aulas')[0].props.onClick();
        await view.flush();
      } finally { actions.close(); }
      assert.deepEqual(requests.slice(1).map(request => request.module), [...expected, 'agenda', 'classrooms']);
    }, role);
  }
});

test('Warm Home removes the resources disclosure and refresh control from the normal view', async () => {
  await withHome(data(), async ({ view }) => {
    assert.equal(descendants(view.tree, node => node.props?.className === 'fm-home-resources').length, 0);
    assert.equal(descendants(view.tree, node => node.props?.['aria-label'] === 'Actualizar Inicio').length, 0);
    assert.equal(descendants(view.tree, node => node.props?.className === 'fm-brujula-home-layout').length, 1);
    const greeting = descendants(view.tree, node => node.type?.name === 'HomeGreeting')[0];
    const art = descendants(greeting.type(greeting.props), node => node.props?.className === 'fm-home-panorama')[0];
    assert.ok(art, 'The panoramic illustration belongs to the welcome banner');
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
    const greeting = descendants(view.tree, node => node.type?.name === 'HomeGreeting')[0];
    assert.match(text(greeting.type(greeting.props)), /Tu espacio para aprender y enseñar/);
    assert.doesNotMatch(text(greeting.type(greeting.props)), /0 entregas|0 consultas/);
    const tabs = descendants(view.tree, node => node.props?.['aria-label'] === 'Filtrar pendientes')[0];
    assert.deepEqual(descendants(tabs, node => node.type === 'span').map(node => node.props.children), [null, null]);
  });
});

test('Home rejects another subject and clears private modules after a revoked classroom retry', async () => {
  await withHome(data({}, { subjectId: 'another-subject' }), async ({ view }) => {
    assert.equal(descendants(view.tree, node => node.type?.name === 'HomeModule').length, 0);
    assert.equal(descendants(view.tree, node => node.type?.name === 'HomeGreeting').length, 0);
    assert.match(text(view.tree), /No pudimos comprobar tu Inicio/);
  }, 'student');
  for (const code of ['FORBIDDEN', 'AUTH_REQUIRED']) {
    await withHome(data({ classrooms: error }), async ({ view, client }) => {
      client.page = async () => { throw Object.assign(new Error(code), { code }); };
      const shortcuts = descendants(view.tree, node => node.type?.name === 'HomeShortcuts')[0];
      shortcuts.props.onRetry(); await view.flush();
      assert.equal(descendants(view.tree, node => node.type?.name === 'HomeModule').length, 0, code);
      assert.equal(descendants(view.tree, node => node.type?.name === 'HomeShortcuts').length, 0, code);
      assert.match(text(view.tree), /No pudimos comprobar tu Inicio/);
    }, 'student');
  }
});

test('Inapplicable learning and teaching groups disappear without hiding archived classroom history', async () => {
  const modules = Object.fromEntries(['pending', 'feedback', 'review', 'queries'].map(name => [name, { status: 'not-applicable' }]));
  modules.classrooms = page(1, { items: [{ id: 'archived', classroom: { archived: true } }] });
  await withHome(data(modules, { participation: 'none' }), async ({ view }) => {
    const tree = expandGroups(view.tree);
    assert.equal(descendants(tree, node => ['Mi aprendizaje', 'Mi actividad docente'].includes(node.props['aria-label'])).length, 0);
    assert.equal(descendants(tree, node => node.type?.name === 'HomeModule' && node.props.name === 'classrooms').length, 1);
  });
});

test('Teacher focus keeps one active authorized room, selected context and access to the full collection', async () => {
  const items = [['student', 'student', false], ['archive', 'teacher', true], ['first', 'teacher', false], ['second', 'teacher', false]]
    .map(([id, role, archived]) => ({ id, title: id, classroom: { id, role, archived }, target: { kind: 'classroom', classroomId: id, section: 'plan' } }));
  await withHome(data({ classrooms: page(23, { items, nextCursor: 'next-real-page' }) }), async ({ view, calls }) => {
    const focus = () => descendants(view.tree, node => node.type?.name === 'HomeFocus')[0];
    const focusedModule = () => descendants(focus().type(focus().props), node => node.type?.name === 'HomeModule')[0];
    assert.deepEqual(focusedModule().props.page.items.map(item => item.id), ['first']);
    assert.equal(focusedModule().props.page.totalItems, null);
    assert.equal(focusedModule().props.page.nextCursor, null);
    const tools = descendants(view.tree, node => node.type?.name === 'HomeTeacherTools')[0];
    tools.props.onSelected('second'); await view.flush();
    assert.deepEqual(focusedModule().props.page.items.map(item => item.id), ['second']);
    const row = descendants(focusedModule().type(focusedModule().props), node => node.type?.name === 'HomeRow')[0];
    row.props.onAction(row.props.item.target); assert.strictEqual(calls[0], items[3].target);
    assert.equal(descendants(focus().type(focus().props),node=>node.type==='button'&&text(node)==='Ver todas mis aulas').length,0,'The focus card follows the reference; collection navigation belongs to the sidebar');
    for (const stale of ['student', 'archive', 'removed']) {
      tools.props.onSelected(stale); await view.flush();
      assert.deepEqual(focusedModule().props.page.items.map(item => item.id), ['first'], `Unsafe stale selection ${stale}`);
    }
  });
});

test('Expanding a paginated work queue preserves its client and cursor and returns focus', async () => {
  await withHome(data({ review: page(23, { nextCursor: 'next-real-page' }) }), async ({ view, focus, client }) => {
    const module = descendants(view.tree, node => node.type?.name === 'HomeModule' && node.props.name === 'review')[0];
    descendants(module.type(module.props), node => node.type === 'button' && node.props['data-home-expand'] === 'review')[0].props.onClick();
    await view.flush();
    const panel = descendants(view.tree, node => node.type?.name === 'HomeModulePanel')[0];
    assert.equal(panel.props.name, 'review'); assert.strictEqual(panel.props.client, client);
    assert.equal(panel.props.data.modules.review.nextCursor, 'next-real-page');
    panel.props.onClose(); await view.flush();
    assert.deepEqual(focus, ['[data-home-expand="review"]']);
  });
});

test('Global drafts retain their aggregate retry and exact target without any focused-room fetch', async () => {
  const item = { id: 'draft', title: 'Draft from another authorized classroom', classroom: { id: 'other', role: 'teacher', archived: false },
    activityType: 'ASSIGNMENT', updatedAt: '2026-11-05T12:00:00Z', target: { kind: 'activity', classroomId: 'other', activityId: 'draft' } };
  await withHome(data({ classrooms: page(0), drafts: error }), async ({ view, requests, calls, client }) => {
    const draftModule = () => descendants(expandGroups(view.tree), node => node.type?.name === 'HomeModule' && node.props.name === 'drafts')[0];
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
