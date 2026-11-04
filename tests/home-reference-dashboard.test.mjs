import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const names = ['pending', 'review', 'feedback', 'agenda', 'queries', 'materials', 'classrooms'];
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
  if (node.type?.name === 'HomeLearningGroups') return expandGroups(node.type(node.props));
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
  const { Home } = loadTsModule('apps/classrooms-ui/Home.tsx');
  const view = hookView(Home, { accountRole, displayName: 'Alex', subjectId: 'subject', homeClient: client,
    onCreate() {}, onJoin() {}, onClassrooms() {}, onAgenda() {}, onAction: target => calls.push(target) });
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

test('Four quick links stay visible and point to existing destinations', () => {
  const { HomeShortcuts } = loadTsModule('apps/classrooms-ui/HomeShortcuts.tsx');
  const navigation = HomeShortcuts();
  assert.equal(navigation.props['aria-label'], 'Accesos rápidos');
  const links = descendants(navigation, node => node.type === 'a');
  assert.deepEqual(links.map(node => [text(node).trim(), node.props.href]), [
    ['Mis aulas', '/mis-aulas'], ['Agenda', '/agenda'], ['Configuración', '/settings'], ['Mi perfil', '/profile'],
  ]);
});

test('Home shows only the role-specific modules and keeps each retry reachable', async () => {
  for (const [role, priority, secondary] of [['teacher', 'review', 'queries'], ['student', 'pending', 'feedback']]) {
    await withHome(data(Object.fromEntries(names.map(name => [name, error]))), async ({ view, requests }) => {
      const modules = descendants(view.tree, node => node.type?.name === 'HomeModule');
      const expected = [priority, 'classrooms', secondary, 'materials', 'agenda'];
      assert.deepEqual(modules.map(node => node.props.name), expected);
      for (const module of modules) {
        const rendered = module.type(module.props);
        const retry = descendants(rendered, node => node.type === 'button' && text(node).startsWith('Reintentar'))[0];
        assert.ok(retry, module.props.name); retry.props.onClick(); await view.flush();
      }
      assert.equal(requests.length, 6, 'Initial read and one real retry per visible module');
      assert.deepEqual(requests.slice(1).map(request => request.module), expected);
    }, role);
  }
});

test('Teacher tools select only active teacher rooms and preserve contextual fallback for unloaded rooms', async () => {
  const { HomeTeacherTools } = loadTsModule('apps/classrooms-ui/HomeShortcuts.tsx');
  const rooms = [['student', 'student', false], ['archive', 'teacher', true], ['first', 'teacher', false], ['second', 'teacher', false]]
    .map(([id, role, archived]) => ({ id, classroom: { id, name: id, role, archived, division: 'A' } }));
  const calls = [];
  const view = hookView(HomeTeacherTools, { data: data({ classrooms: page(9, { items: rooms, nextCursor: 'next' }) }),
    onAction: target => calls.push(target), onClassrooms() {} });
  try {
    await view.flush();
    const select = descendants(view.tree, node => node.type === 'select')[0];
    assert.deepEqual(descendants(select, node => node.type === 'option').map(node => node.props.value), ['first', 'second']);
    select.props.onChange({ target: { value: 'second' } }); await view.flush();
    for (const label of ['Crear actividad', 'Subir material', 'Publicar aviso']) {
      descendants(view.tree, node => node.type === 'button' && text(node).trim().startsWith(label))[0].props.onClick();
    }
    assert.deepEqual(calls.map(target => target.classroomId), ['second', 'second', 'second']);
    assert.deepEqual(calls.map(target => target.kind), ['create-activity', 'upload-material', 'publish-notice']);
  } finally { view.close(); }
  let navigated = 0;
  const missing = hookView(HomeTeacherTools, { data: data({ classrooms: page(9, { items: rooms.slice(0, 2), nextCursor: 'next' }) }),
    onAction() { assert.fail('No authorized active teacher room loaded'); }, onClassrooms: () => navigated++ });
  try {
    await missing.flush();
    assert.equal(descendants(missing.tree, node => node.type === 'select').length, 0);
    assert.match(text(missing.tree), /Elige un aula docente/);
    descendants(missing.tree, node => node.type === 'button' && text(node) === 'Mis aulas')[0].props.onClick();
    assert.equal(navigated, 1);
  } finally { missing.close(); }
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

test('All returned classrooms and exact action targets survive presentation; expansion returns focus', async () => {
  const items = Array.from({ length: 5 }, (_, index) => ({ id: `room-${index}`, title: `Aula ${index}`,
    classroom: { id: `room-${index}`, role: index % 2 ? 'teacher' : 'student', archived: index === 4 },
    target: { kind: 'classroom', classroomId: `room-${index}`, section: 'plan' } }));
  await withHome(data({ classrooms: page(23, { items, nextCursor: 'next-real-page' }) }), async ({ view, focus, calls, client }) => {
    const module = descendants(view.tree, node => node.type?.name === 'HomeModule' && node.props.name === 'classrooms')[0];
    const rendered = module.type(module.props);
    const rows = descendants(rendered, node => node.type?.name === 'HomeRow');
    assert.equal(rows.length, 5);
    rows[4].props.onAction(rows[4].props.item.target);
    assert.strictEqual(calls[0], items[4].target);
    descendants(rendered, node => node.type === 'button' && node.props['data-home-expand'] === 'classrooms')[0].props.onClick();
    await view.flush();
    const panel = descendants(view.tree, node => node.type?.name === 'HomeModulePanel')[0];
    assert.equal(panel.props.name, 'classrooms'); assert.strictEqual(panel.props.client, client);
    assert.equal(panel.props.data.modules.classrooms.nextCursor, 'next-real-page');
    panel.props.onClose(); await view.flush();
    assert.deepEqual(focus, ['[data-home-expand="classrooms"]']);
  });
});
