import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { deferred, descendants, hookView } from './agenda-ui-helpers.test.mjs';

const screenPath = 'apps/web/src/screens/notifications-screen.tsx';
const reviewPath = 'apps/web/src/application/workflows/notification-review/NotificationReview.tsx';
const invitation = {
  id: 'a113cc1c-c934-4e73-bc67-236ba15ac355', name: 'Ciencias', teacher: 'Ana Luna',
  subject: 'Biología', division: '2º B', expiresAt: '2026-11-30T12:00:00Z', coverKey: 'math',
};
const inviteTarget = { kind: 'invitation', invitationId: invitation.id };
const event = {
  id: 'f50253e1-0b6d-43e7-93a7-6df6b2f794dd', title: 'Preparar la clase', description: '',
  revision: 3, category: 'CLASS', repeat: { kind: 'DAILY', untilDate: '2026-11-21' },
  schedule: { kind: 'TIMED', startLocal: '2026-11-18T10:00', endLocal: '2026-11-18T11:00', timeZone: 'America/Argentina/Buenos_Aires' },
};
const eventTarget = { kind: 'event', eventId: event.id, date: '2026-11-20' };
const component = (view, name) => descendants(view.tree, node => node.type?.name === name)[0];
const button = (view, label) => descendants(view.tree, node => node.type === 'button'
  && (Array.isArray(node.props.children) ? node.props.children.includes(label) : node.props.children === label))[0];

test('la pantalla abre el recurso autorizado sin navegar y refresca la bandeja cuando cambia', async () => {
  const routes = [];
  const router = { isReady: true, push: href => routes.push(href) };
  const { NotificationsScreen } = loadTsModule(screenPath, { stubs: {
    'next/router': { useRouter: () => router },
    '../features/identity/index.ts': { createAccountClient: () => ({ session: async () => ({
      authenticated: true, user: { id: 'synthetic', emailVerified: true, accountRole: 'student' },
    }) }) },
  } });
  const view = hookView(NotificationsScreen, {});
  try {
    await view.flush();
    assert.equal(component(view, 'Notifications').props.refresh, 0);
    component(view, 'Notifications').props.onReviewProjected(inviteTarget);
    await view.flush();
    assert.deepEqual(component(view, 'NotificationReview').props.target, inviteTarget);
    assert.deepEqual(routes, []);
    component(view, 'NotificationReview').props.onChanged('Ya sos parte de Ciencias.');
    await view.flush();
    assert.equal(component(view, 'NotificationReview'), undefined);
    assert.equal(component(view, 'Notifications').props.refresh, 1);
    assert.deepEqual(routes, []);
  } finally { view.close(); }
});

function review(target, api, agenda) {
  const { NotificationReview } = loadTsModule(reviewPath);
  const changes = [], closes = [];
  const view = hookView(NotificationReview, {
    api, agenda, target, onClose: refresh => closes.push(refresh), onChanged: (...args) => changes.push(args),
  });
  return { view, changes, closes };
}

test('Ahora no y el cierre son neutrales; aceptar usa una sola escritura al destino exacto', async () => {
  const calls = [], request = deferred();
  const api = { call: (...args) => {
    const [path, method, data] = args;
    calls.push([path, method, data]);
    return method === 'POST' ? request.promise : Promise.resolve([{ ...invitation, id: 'other' }, invitation]);
  } };
  const { view, changes, closes } = review(inviteTarget, api, {});
  try {
    await view.flush();
    assert.equal(component(view, 'InvitationPreview').props.classroom, invitation);
    button(view, 'Ahora no').props.onClick();
    component(view, 'Dialog').props.onClose();
    assert.deepEqual(closes, [undefined, undefined]);
    assert.deepEqual(calls, [['/invitations', 'GET', undefined]]);
    const accept = button(view, 'Aceptar y unirme').props.onClick;
    accept(); accept();
    await view.flush();
    assert.deepEqual(calls[1], [`/invitations/${invitation.id}/accept`, 'POST', {}]);
    assert.equal(calls.length, 2);
    request.resolve();
    await view.flush();
    assert.deepEqual(changes, [['Ya sos parte de Ciencias. La encontrás en tus aulas.']]);
  } finally { view.close(); }
});

test('invitación revocada o ajena usa un aviso rojo y no ofrece aceptación', async () => {
  const { view, changes } = review(inviteTarget, { call: async () => [{ ...invitation, id: 'other' }] }, {});
  try {
    await view.flush();
    assert.ok(descendants(view.tree, node => node.type?.name === 'Notice' && node.props.error).length);
    assert.equal(button(view, 'Aceptar y unirme'), undefined);
    assert.deepEqual(changes, []);
  } finally { view.close(); }
});

test('la ocurrencia recurrente mantiene su fecha; cancelar edición vuelve al detalle', async () => {
  const reads = [];
  const { view, changes } = review(eventTarget, {}, { get: async id => { reads.push(id); return event; } });
  try {
    await view.flush();
    assert.deepEqual(reads, [event.id]);
    assert.equal(component(view, 'EventDetails').props.occurrenceDate, eventTarget.date);
    component(view, 'EventDetails').props.onEdit('single');
    await view.flush();
    const editor = component(view, 'EventForm').props;
    assert.equal(editor.initialScope, 'single');
    assert.equal(editor.occurrenceDate, eventTarget.date);
    editor.onClose();
    await view.flush();
    assert.ok(component(view, 'EventDetails'));
    component(view, 'EventDetails').props.onRemoved();
    assert.deepEqual(changes, [['Evento eliminado.']]);
  } finally { view.close(); }
});

test('una ocurrencia cancelada no muestra otro día ni permite editar o eliminar', async () => {
  const { view, changes } = review(eventTarget, {}, { get: async () => ({
    ...event, exceptions: [{ date: eventTarget.date, replacement: null }],
  }) });
  try {
    await view.flush();
    assert.equal(component(view, 'EventDetails'), undefined);
    assert.ok(descendants(view.tree, node => node.type?.name === 'Notice' && node.props.error).length);
    assert.deepEqual(changes, []);
  } finally { view.close(); }
});

test('si la invitación vence después de abrirse, rechaza la escritura y refresca al cerrar el aviso', async () => {
  const calls = [];
  const api = { call: async (path, method) => {
    calls.push([path, method]);
    if (method === 'GET') return [invitation];
    throw Object.assign(new Error('Unavailable'), { status: 409, code: 'ENROLLMENT_UNAVAILABLE' });
  } };
  const { view, changes, closes } = review(inviteTarget, api, {});
  try {
    await view.flush();
    button(view, 'Aceptar y unirme').props.onClick();
    await view.flush();
    assert.equal(component(view, 'Dialog').props.title, 'Este contenido ya no está disponible');
    assert.equal(button(view, 'Aceptar y unirme'), undefined);
    assert.equal(button(view, 'Reintentar'), undefined);
    assert.deepEqual(changes, []);
    button(view, 'Volver a notificaciones').props.onClick();
    assert.deepEqual(closes, [true]);
    assert.equal(calls.length, 2);
  } finally { view.close(); }
});

test('si se cierra mientras carga, el listado no deja una lectura activa', async () => {
  const request = deferred();
  let signal;
  const { view, changes } = review(inviteTarget, { call: (_path, _method, _data, abort) => {
    signal = abort;
    return request.promise;
  } }, {});
  await view.flush();
  view.close();
  assert.equal(signal.aborted, true);
  request.resolve([invitation]);
  await view.flush();
  assert.equal(component(view, 'InvitationPreview'), undefined);
  assert.deepEqual(changes, []);
});
