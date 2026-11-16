import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';
import { gradingView } from './helpers/audit-grade-dto.mjs';

const { Activities } = loadTsModule('apps/web/src/application/academic-Activities.tsx');
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '');
const select = (view, predicate) => descendants(view.tree, predicate)[0];
const room = { id: 'room', name: 'Ciencias', role: 'teacher', archived: false, revision: '1', timezone: 'UTC', units: [] };
const activity = { id: 'activity', title: 'Ambientes', type: 'ASSIGNMENT', status: 'PUBLISHED', topicIds: [], zone: 'UTC', deadlineAt: null, pendingReviewCount: 2 };
const apiFor = (activities, calls) => ({ call: async (path, method = 'GET') => {
  calls.push({ path, method });
  if (path.endsWith('/progress')) return { scope: 'classroom', students: [] };
  if (path.endsWith('/library')) return [];
  if (path.endsWith('/preview')) return { activity: activities[0], revision: '1' };
  if (path.endsWith('/session')) return { activity: activities[0], attempt: { id: 'attempt', status: 'SUBMITTED' } };
  return { activities };
} });

test('listado estudiantil muestra las actividades sin filtros extra y abre la consigna sin escrituras', async () => {
  const calls = [];
  const activities = ['PENDING', 'DRAFT', 'SUBMITTED', 'REVIEWED'].map((studentState, index) => ({ ...activity, id: String(index), title: `Actividad ${index}`, studentState }));
  const view = hookView(Activities, { api: apiFor(activities, calls), room: { ...room, role: 'student' }, reload: async () => {} });
  try {
    await view.flush();
    assert.match(text(view.tree), /Tu próxima oportunidad de aprender/);
    assert.equal(descendants(view.tree, node => node.props?.['aria-label'] === 'Filtrar actividades por estado').length, 0);
    assert.equal(descendants(view.tree, node => node.type === 'article').length, 4);
    for (const label of ['Para empezar', 'Borrador guardado', 'Entrega recibida', 'Devolución publicada']) assert.ok(text(view.tree).includes(label));
    const open = select(view, node => node.type === 'button' && node.props['aria-label'] === 'Abrir Actividad 3');
    assert.equal(text(open), 'Abrir actividad');
    open.props.onClick(); await view.flush();
    const detail = select(view, node => node.type?.name === 'AttemptHistory');
    assert.equal(detail.props.initialView, 'overview');
    assert.equal(detail.props.attemptId, undefined);
    assert.ok(calls.every(call => call.method === 'GET'));
  } finally { view.close(); }
});

test('borrador docente continúa creando directamente sin publicar ni abrir historial', async () => {
  const calls = [];
  const view = hookView(Activities, { api: apiFor([{ ...activity, status: 'DRAFT' }], calls), room, reload: async () => {} });
  try {
    await view.flush();
    select(view, node => node.type === 'button' && text(node).startsWith('Borradores privados')).props.onClick();
    await view.flush();
    const open = select(view, node => node.type === 'button' && node.props['aria-label'] === 'Abrir Ambientes');
    assert.equal(text(open), 'Seguir creando');
    open.props.onClick(); await view.flush();
    assert.equal(select(view, node => node.type?.name === 'ActivityAuthoring').props.data.activity.status, 'DRAFT');
    assert.equal(select(view, node => node.type?.name === 'AttemptHistory'), undefined);
    assert.ok(calls.every(call => call.method === 'GET'));
  } finally { view.close(); }
});

test('actividad docente con pendientes abre consigna y conserva acceso posterior a entregas', async () => {
  const calls = [];
  const view = hookView(Activities, { api: apiFor([activity], calls), room, reload: async () => {} });
  try {
    await view.flush();
    const open = select(view, node => node.type === 'button' && node.props['aria-label'] === 'Abrir Ambientes');
    assert.equal(text(open), 'Ver actividad');
    open.props.onClick(); await view.flush();
    assert.equal(select(view, node => node.type?.name === 'AttemptHistory').props.initialView, 'overview');
    assert.ok(calls.every(call => call.method === 'GET'));
  } finally { view.close(); }
});

test('entregas separa revisiones privadas guardadas de pendientes y conserva historial de reentregas', async () => {
  const { AttemptHistory } = loadTsModule('apps/web/src/application/academic-AttemptHistory.tsx');
  const attempts = [
    { id: 'old', studentId: 'one', number: 1, reviewState: 'published', gradePublished: true },
    { id: 'pending', studentId: 'one', number: 2, reviewState: 'pending', gradePublished: false },
    { id: 'saved', studentId: 'two', number: 1, reviewState: 'saved', gradePublished: false },
    { id: 'published', studentId: 'three', number: 1, reviewState: 'published', gradePublished: true },
  ].map(item => ({ ...item, status: 'SUBMITTED', firstName: item.id, lastName: 'Sintético', currentMember: true }));
  const view = hookView(AttemptHistory, { room, activityId: activity.id, initialView: 'history',
    onClose() {}, onChanged: async () => {}, onResume() {},
    api: { call: async () => ({ activity, attempts, expectedStudentCount: 4, waitingStudents: [{ studentId: 'four', firstName: 'En camino', lastName: 'Sintético' }] }) } });
  const click = async name => { select(view, node => node.type === 'button' && text(node) === name).props.onClick(); await view.flush(); };
  const rows = () => descendants(view.tree, node => node.type === 'li').map(node => node.key);
  try {
    await view.flush();
    assert.match(text(view.tree), /Una mirada a cada entrega/);
    assert.deepEqual(rows(), ['pending', 'saved', 'published']);
    await click('Revisadas'); assert.deepEqual(rows(), ['saved']);
    assert.match(text(view.tree), /Revisión privada guardada/);
    await click('Por revisar'); assert.deepEqual(rows(), ['pending']);
    await click('Publicadas'); assert.deepEqual(rows(), ['published']);
    await click('Todas');
    assert.match(text(view.tree), /Todavía no confirmaron una entrega/);
    assert.equal(select(view, node => node.type === 'button' && text(node) === 'Historial de intentos'), undefined);
    select(view, node => node.type === 'button' && node.props['aria-label'] === 'Revisar entrega · Intento 2').props.onClick(); await view.flush();
    select(view, node => node.type?.name === 'GradingEditor').props.onHistory(); await view.flush();
    assert.deepEqual(rows(), ['old', 'pending']);
  } finally { view.close(); }
});

for (const scenario of [
  { name: 'primera entrega única', numbers: [1], selected: 1, allowed: true },
  { name: 'última de varias entregas', numbers: [1, 2], selected: 2, allowed: true },
  { name: 'entrega anterior', numbers: [1, 2], selected: 1, allowed: false },
  { name: 'nuevo borrador ya habilitado', numbers: [1, 2], selected: 1, draft: 2, allowed: false },
  { name: 'intento todavía sin entregar', numbers: [1], selected: 1, draft: 1, allowed: false },
  { name: 'estudiante que salió', numbers: [1], selected: 1, currentMember: false, allowed: false },
  { name: 'aula sin permiso de reabrir', numbers: [1], selected: 1, canReopen: false, allowed: false },
]) test(`reentrega contextual: ${scenario.name}`, async () => {
  const { AttemptHistory } = loadTsModule('apps/web/src/application/academic-AttemptHistory.tsx');
  const attempts = scenario.numbers.map(number => ({ id: `attempt-${number}`, studentId: 'student', number,
    status: scenario.draft === number ? 'DRAFT' : 'SUBMITTED', currentMember: scenario.currentMember ?? true,
    firstName: 'Alumno', lastName: 'Sintético', gradePublished: false }));
  const writes = [];
  const view = hookView(AttemptHistory, { room, activityId: activity.id, attemptId: `attempt-${scenario.selected}`,
    onClose() {}, onChanged: async () => {}, onResume() {},
    api: { call: async (path, method, payload) => {
      if (method === 'POST') { writes.push({ path, payload }); return {}; }
      return { activity, revision: '7', canReopen: scenario.canReopen ?? true, attempts };
    } } });
  try {
    await view.flush();
    const grading = select(view, node => node.type?.name === 'GradingEditor');
    assert.equal(typeof grading.props.onReopen === 'function', scenario.allowed);
    if (scenario.allowed) {
      grading.props.onReopen(); await view.flush();
      assert.equal(writes.length, 0, 'abrir confirmación nunca crea un intento');
      assert.ok(select(view, node => node.type?.name === 'Dialog' && node.props.title === 'Confirmar nuevo intento'));
      select(view, node => node.type === 'button' && text(node) === 'Confirmar nuevo intento').props.onClick(); await view.flush();
      assert.deepEqual(writes, [{ path: '/room/activities/activity/reopen', payload: { revision: '7', studentId: 'student', deadline: null, confirm: true } }]);
    }
  } finally { view.close(); }
});

test('el historial del estudiante no ofrece habilitar intentos', async () => {
  const { AttemptHistory } = loadTsModule('apps/web/src/application/academic-AttemptHistory.tsx');
  const view = hookView(AttemptHistory, { room: { ...room, role: 'student' }, activityId: activity.id, initialView: 'history',
    onClose() {}, onChanged: async () => {}, onResume() {},
    api: { call: async () => ({ activity, canReopen: true, attempts: [{ id: 'attempt', studentId: 'student', number: 1,
      status: 'SUBMITTED', currentMember: true, firstName: 'Alumno', lastName: 'Sintético' }] }) } });
  try {
    await view.flush();
    assert.equal(select(view, node => node.type?.name === 'GradingEditor'), undefined);
    assert.equal(select(view, node => node.type === 'button' && text(node) === 'Habilitar otro intento'), undefined);
  } finally { view.close(); }
});

test('reabrir desde corrección protege cambios privados antes de habilitar el intento', async () => {
  const { GradingEditor } = loadTsModule('apps/web/src/features/grading/ui/GradingEditor.tsx');
  let opened = 0;
  const view = hookView(GradingEditor, { api: { call: async () => structuredClone(gradingView) }, roomId: room.id,
    attemptId: gradingView.attempt.id, onClose() {}, onChanged: async () => {}, onReopen: () => opened++ });
  const click = async label => { select(view, node => node.type === 'button' && text(node) === label).props.onClick(); await view.flush(); };
  try {
    await view.flush();
    select(view, node => node.type === 'textarea' && node.props['aria-label'] === 'Devolución general opcional').props.onChange({ target: { value: 'Cambio privado sin guardar' } }); await view.flush();
    await click('Habilitar otro intento');
    assert.equal(opened, 0);
    assert.ok(select(view, node => node.type?.name === 'Dialog' && node.props.title === 'Tenés cambios sin guardar'));
    await click('Volver a la corrección');
    assert.equal(select(view, node => node.type === 'textarea' && node.props['aria-label'] === 'Devolución general opcional').props.value, 'Cambio privado sin guardar');
    await click('Habilitar otro intento'); await click('Descartar cambios');
    assert.equal(opened, 1);
  } finally { view.close(); }
});
