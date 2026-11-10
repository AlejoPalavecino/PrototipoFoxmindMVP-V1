import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants, deferred } from './agenda-ui-helpers.test.mjs';

const row = { id: 'notification-1', eventType: 'SUBMISSION_RECEIVED', classroomId: 'classroom-1',
  classroomName: 'Ciencias Naturales', activityId: 'activity-1', activityTitle: 'Los ecosistemas',
  attemptId: 'attempt-1', createdAt: '2026-11-02T14:06:00Z', readAt: null };
const find = (view, predicate) => descendants(view.tree, predicate);
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) :
  Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
async function setup(handler) {
  const calls = [], targets = [];
  const api = { call: async (path, method, body, signal) => {
    calls.push({ path, method });
    return handler?.(path, method, body, signal) ?? { items: [row], unreadCount: 1, nextCursor: null };
  } };
  const { Notifications } = loadTsModule('apps/web/src/features/notifications/ui/Notifications.tsx');
  const view = hookView(Notifications, { api, refresh: 0, onOpen: target => targets.push(target) });
  await view.flush();
  find(view, n => n.type === 'button' && n.props['aria-haspopup'] === 'dialog')[0].props.onClick();
  await view.flush();
  return { view, calls, targets };
}

test('Notifications expose a heading, classroom, activity and explicit filter group for scanning', async () => {
  const { view } = await setup();
  try {
    assert.equal(find(view, n => n.type === 'h3' && text(n) === 'Nueva entrega recibida').length, 1);
    assert.ok(text(view.tree).includes('Ciencias Naturales'));
    assert.ok(text(view.tree).includes('Los ecosistemas'));
    assert.equal(find(view, n => n.props.role === 'group' && n.props['aria-label'] === 'Filtrar notificaciones').length, 1);
    assert.equal(find(view, n => n.type === 'time' && n.props.dateTime === row.createdAt).length, 1);
  } finally { view.close(); }
});

test('Read stays pending, prevents duplicate actions and refreshes the unread indicator after success', async () => {
  const pending = deferred(); let read = false;
  const { view, calls } = await setup(async (path, method) => {
    if (method === 'POST') { await pending.promise; read = true; return; }
    return { items: [{ ...row, readAt: read ? row.createdAt : null }], unreadCount: read ? 0 : 1, nextCursor: null };
  });
  try {
    const action = find(view, n => n.type === 'button' && text(n) === 'Marcar como leída')[0];
    action.props.onClick(); await view.flush();
    assert.ok(find(view, n => n.type === 'button' && text(n) === 'Ver actividad')[0].props.disabled);
    assert.equal(calls.filter(c => c.method === 'POST').length, 1);
    pending.resolve(); await view.flush();
    assert.equal(find(view, n => n.type === 'button' && text(n) === 'Marcar como leída').length, 0);
    assert.equal(find(view, n => n.type === 'button' && n.props['aria-haspopup'] === 'dialog')[0].props['aria-label'], 'Notificaciones');
  } finally { pending.resolve(); view.close(); }
});

test('Open keeps the exact authorized destination and closes only after successful readback', async () => {
  const target = { kind: 'activity', classroomId: row.classroomId, activityId: row.activityId };
  const { view, targets } = await setup(path => path.endsWith('/open') ? target : undefined);
  try {
    find(view, n => n.type === 'button' && text(n) === 'Ver actividad')[0].props.onClick();
    await view.flush();
    assert.deepEqual(targets, [target]);
    assert.equal(find(view, n => n.props.className === 'entry-notifications').length, 0);
  } finally { view.close(); }
});

test('Empty unread filter and failed update keep clear feedback and a reachable retry', async () => {
  let fail = false;
  const { view } = await setup(path => {
    if (fail) throw new Error('No pudimos cargar tus notificaciones.');
    return { items: [], unreadCount: 0, nextCursor: null };
  });
  try {
    find(view, n => n.type === 'button' && text(n).startsWith('Sin leer'))[0].props.onClick(); await view.flush();
    assert.match(text(view.tree), /No tenés novedades pendientes/);
    fail = true;
    find(view, n => n.type === 'button' && n.props['aria-label'] === 'Actualizar notificaciones')[0].props.onClick();
    await view.flush();
    assert.match(text(view.tree), /No pudimos cargar/);
    assert.doesNotMatch(text(view.tree), /Estás al día/);
    assert.equal(find(view, n => n.type === 'button' && n.props['aria-label'] === 'Actualizar notificaciones')[0].props.disabled, false);
  } finally { view.close(); }
});
