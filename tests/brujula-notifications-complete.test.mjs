import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const text = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '');
const notification = (id, eventType) => ({ id, eventType, classroomName: 'Aula sintética',
  activityTitle: 'Actividad', createdAt: '2026-11-05T10:00:00Z', readAt: null });
const centerTree = view => view.tree.type(view.tree.props);

test('el centro filtra y pagina desde el servidor y marca toda la bandeja autorizada como leída', async () => {
  const { Notifications } = loadTsModule('apps/web/src/features/notifications/inbox/Notifications.tsx');
  const calls = [];
  let marked = false;
  const grade = notification('n2', 'GRADE_PUBLISHED');
  const api = { call: async (path, method) => {
    calls.push([path, method]);
    if (path === '/notifications/read-all' && method === 'POST') {
      marked = true;
      return { read: true, updatedCount: 3 };
    }
    const params = new URLSearchParams(path.split('?')[1]);
    const metadata = { unreadCount: marked ? 0 : 3, totalCount: 3 };
    if (marked) return { ...metadata, items: [{ ...grade, readAt: grade.createdAt }], nextCursor: null };
    if (params.has('cursor')) return { ...metadata, items: [notification('n3', 'SUBMISSION_RECEIVED')], nextCursor: null };
    return params.get('kind') === 'activity'
      ? { ...metadata, items: [grade], nextCursor: 'activity-cursor' }
      : { ...metadata, items: [notification('n1', 'WALL_QUERY'), grade], nextCursor: 'global-cursor' };
  } };
  const view = hookView(Notifications, { api, refresh: 0, presentation: 'center', onSelect() {} });
  const find = (type, label) => descendants(centerTree(view), node => node.type === type && text(node) === label)[0];

  try {
    await view.flush();
    assert.ok(find('h3', 'Nueva consulta de estudiante'));
    find('button', 'Actividades').props.onClick();
    await view.flush();
    assert.equal(find('h3', 'Nueva consulta de estudiante'), undefined);
    assert.ok(find('h3', 'Calificación publicada'));
    assert.ok(find('button', 'Todas 3'));
    assert.ok(find('button', 'No leídas 3'));
    find('button', 'Cargar más notificaciones').props.onClick();
    await view.flush();
    assert.ok(calls.some(([path]) => path === '/notifications/page?unread=false&kind=activity&cursor=activity-cursor'));
    assert.ok(find('h3', 'Nueva entrega recibida'));
    find('button', 'Marcar todas como leídas').props.onClick();
    await view.flush();
    assert.deepEqual(calls.filter(([, method]) => method === 'POST'), [['/notifications/read-all', 'POST']]);
    assert.equal(find('button', 'Marcar todas como leídas').props.disabled, true);
    assert.ok(find('button', 'No leídas 0'));
  } finally { view.close(); }
});

test('el acceso navega al centro y conserva el contador sin abrir dialogo', async () => {
  const { Notifications } = loadTsModule('apps/web/src/features/notifications/inbox/Notifications.tsx');
  const calls = [];
  const view = hookView(Notifications, { api: { call: async path => { calls.push(path); return { items: [], nextCursor: null, unreadCount: 3 }; } }, refresh: 0, onSelect() {} });
  try {
    await view.flush();
    const link = descendants(view.tree, node => node.type === 'a' && node.props.href === '/notificaciones')[0];
    assert.ok(link);
    assert.equal(link.props['aria-label'], 'Notificaciones: 3 sin leer');
    assert.equal(descendants(view.tree, node => node.props?.['aria-haspopup'] === 'dialog').length, 0);
    assert.deepEqual(calls, ['/notifications/page?unread=false']);
  } finally { view.close(); }
});

test('el centro muestra identidad y contexto autorizados y permite filtrar tipos fuera de la página', async () => {
  const { Notifications } = loadTsModule('apps/web/src/features/notifications/inbox/Notifications.tsx');
  const row = { ...notification('n', 'WALL_QUERY'), actorName: 'Ana <literal>', classroomDivision: '4.º A', message: '¿Cómo observamos el entorno?' };
  delete row.activityTitle;
  const view = hookView(Notifications, { api: { call: async () => ({ items: [row], nextCursor: null, unreadCount: 1 }) }, refresh: 0, presentation: 'center', onSelect() {} });
  try {
    await view.flush();
    const tree = centerTree(view);
    assert.equal(descendants(tree, node => node.type === 'h3')[0].props.children, 'Consulta de Ana <literal>');
    assert.match(text(tree), /Aula sintética\s+· 4.º A/);
    assert.match(text(tree), /¿Cómo observamos el entorno/);
    assert.ok(descendants(tree, node => node.type === 'button' && text(node) === 'Agenda').length);
    assert.equal(descendants(tree, node => node.type === 'button' && text(node) === 'Actualizar notificaciones').length, 0);
  } finally { view.close(); }
});
