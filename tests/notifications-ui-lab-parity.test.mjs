import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, deferred } from './agenda-ui-helpers.test.mjs';

const { Notifications } = loadTsModule('apps/web/src/features/notifications/inbox/Notifications.tsx');
const date = '2026-11-16T12:00:00.000Z';
const notice = id => ({ id, eventType: 'WALL_NOTICE', classroomName: 'Aula de prueba', title: 'Aviso '+id, createdAt: date, readAt: null });
const reply = (items, unreadCount, nextCursor = null) => ({ items, unreadCount, totalCount: 2, nextCursor });
const setup = (call, props = {}) => hookView(Notifications, { api: { call }, refresh: 0, presentation: 'center', onSelect() {}, ...props });

test('marking a row on the second page keeps that row and does not return to page one', async () => {
  const first = notice('first'), second = notice('second');
  let read = false;
  const view = setup(async (path, method) => {
    if (method === 'POST') { read = true; return { read }; }
    const count = read ? 1 : 2;
    return path.includes('cursor=') ? reply([{ ...second, readAt: read ? date : null }], count)
      : reply([first], count, 'next');
  });
  try {
    await view.flush(); view.tree.props.onMore(); await view.flush();
    view.tree.props.onToggle(second); await view.flush();
    assert.deepEqual(view.tree.props.items.map(i => i.id), ['first', 'second']);
    assert.ok(view.tree.props.items[1].readAt);
    assert.equal(view.tree.props.unread, 1);
    assert.match(view.tree.props.status, /como leída/);
  } finally { view.close(); }
});

test('read confirmed on the server stays updated when refreshing fails; retry reads only', async () => {
  const row = notice('first');
  let posts = 0, fail = false;
  const view = setup(async (_path, method) => {
    if (method === 'POST') { posts++; fail = true; return { read: true }; }
    if (fail) throw Error('No pudimos actualizar.');
    return reply([{ ...row, readAt: posts ? date : null }], posts ? 0 : 1);
  });
  try {
    await view.flush(); view.tree.props.onToggle(row); await view.flush();
    assert.match(view.tree.props.status, /como leída/);
    assert.match(view.tree.props.error, /actualizar/);
    assert.ok(view.tree.props.items[0].readAt);
    assert.equal(view.tree.props.unread, 0);
    fail = false; view.tree.props.onReload(); await view.flush();
    assert.equal(posts, 1);
    assert.equal(view.tree.props.error, '');
  } finally { view.close(); }
});

test('changing filters cannot abandon a reading write already in flight', async () => {
  const row = notice('first'), post = deferred();
  const calls = [];
  const view = setup(async (path, method, _value, signal) => {
    calls.push({ path, method, signal });
    if (method === 'POST') return post.promise;
    return reply([row], 1);
  });
  try {
    await view.flush(); view.tree.props.onToggle(row); await view.flush();
    view.tree.props.onFilter(true, 'classroom'); await view.flush();
    assert.equal(calls.find(c => c.method === 'POST').signal.aborted, false);
    post.resolve({ read: true }); await view.flush();
    assert.equal(view.tree.props.kind, 'all');
  } finally { post.resolve({ read: true }); view.close(); }
});

test('an authorized event opens above the inbox; a revoked one opens only the neutral recovery dialog', async () => {
  const row = notice('first'), target = { kind: 'event', eventId: 'event-1', date: '2026-11-20' };
  const opened = [], navigated = [];
  let denied = false, read = false;
  const view = setup(async (_path, method) => {
    if (method === 'POST') {
      if (denied) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
      read = true; return target;
    }
    return reply([{ ...row, readAt: read ? date : null }], read ? 0 : 1);
  }, { onReviewProjected: t => opened.push(t), onNavigate: path => navigated.push(path) });
  try {
    await view.flush(); view.tree.props.onOpen(row); await view.flush();
    assert.deepEqual(opened, [target]);
    assert.deepEqual(navigated, []);
    assert.equal(view.tree.props.unread, 0);
    denied = true; view.tree.props.onOpen(row); await view.flush();
    assert.deepEqual(opened, [target]);
    assert.equal(view.tree.props.unavailable, true);
    view.tree.props.onDismissUnavailable(); await view.flush();
    assert.equal(view.tree.props.unavailable, false);
  } finally { view.close(); }
});
