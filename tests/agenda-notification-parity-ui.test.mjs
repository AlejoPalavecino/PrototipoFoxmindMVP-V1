import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const uuid = '998f899a-2c86-4c58-bd3b-d27ffd98ceba';
const date = '2026-11-15';
const item = { id: `invite-${uuid}-1`, title: 'Aula de prueba', actorName: 'Docente de prueba',
  eventType: 'CLASSROOM_INVITATION', classroomName: 'Aula de prueba', createdAt: date + 'T12:30Z', readAt: null };

test('center sends global filters and opens invitation review without an accept request', async () => {
  const { Notifications } = loadTsModule('apps/web/src/features/notifications/inbox/Notifications.tsx');
  const calls = [], navigation = [];
  const api = { async call(path, method) {
    calls.push([path, method]);
    if (path.endsWith('/open')) return { kind: 'invitation', invitationId: uuid };
    if (path.includes('kind=agenda')) return { items: [], totalCount: 31, unreadCount: 7, nextCursor: null };
    return { items: [item], totalCount: 31, unreadCount: 7, nextCursor: null };
  } };
  const view = hookView(Notifications, { api, refresh: 0, presentation: 'center',
    onNavigate: href => navigation.push(href), onSelect: () => assert.fail('Uses projected destination') });
  try {
    await view.flush();
    const tree = () => view.tree.type(view.tree.props);
    const controls = () => descendants(tree(), node => node.type === 'button');
    const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '');
    const button = label => controls().find(node => text(node) === label);
    assert.ok(button('Todas 31'));
    assert.ok(button('No leídas 7'));
    button('Agenda').props.onClick();
    await view.flush();
    assert.ok(calls.some(([path]) => path.includes('kind=agenda')));
    assert.ok(button('No leídas 7'));
    button('Aulas').props.onClick();
    await view.flush();
    button('Revisar invitación').props.onClick();
    await view.flush();
    assert.deepEqual(navigation, [`/mis-aulas?invitacion=${uuid}`]);
    assert.deepEqual(calls.filter(([, method]) => method === 'POST'), [[`/notifications/${item.id}/open`, 'POST']]);
  } finally { view.close(); }
});

test('agenda direct links require a real date and accept only documented local actions', () => {
  const { parseAgendaViewTarget, parseAgendaEventTarget } = loadTsModule('apps/web/src/application/navigation/agenda-target.ts');
  assert.deepEqual(parseAgendaViewTarget({ date, view: 'day' }), { date, view: 'DAY' });
  assert.deepEqual(parseAgendaViewTarget({ create: '1', date }), { create: true, date });
  assert.equal(parseAgendaViewTarget({ create: '1' }).create, true);
  assert.deepEqual(parseAgendaEventTarget({ event: uuid, date }), { eventId: uuid, date });
  for (const query of [{ view: 'day' }, { create: ['1', '2'] }, { create: '1', date: '2026-02-30' },
    { create: '1', view: 'day', date }, { create: '1', next: 'https://example.test' }])
    assert.equal(parseAgendaViewTarget(query), null);
});
