import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { parseHomePage } from '../src/core/domain/home/rows-validation.ts';

const id = n => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(text).join(' ') : text(node?.props?.children ?? '');
const ready = (items = [], extra = {}) => ({ status: 'ready', items, totalItems: items.length, nextCursor: null, ...extra });
const room = (n, role = 'teacher') => ({ id: id(n), name: `Aula ${n}`, division: 'A', subject: 'Ciencias', role, coverKey: 'general', archived: false, timeZone: 'UTC' });
const classroom = (n, role = 'teacher') => ({ id: id(n), title: `Aula ${n}`, classroom: room(n, role),
  target: { kind: 'classroom', classroomId: id(n), section: 'plan' }, planProgress: { taught: 1, total: 3 },
  nextTopic: { unitId: id(10), unitName: 'Unidad del próximo tema', topicId: id(11), topicName: 'Tema pendiente exacto' } });
const aggregate = (role, modules = {}) => ({ version: 1, subjectId: id(99), generatedAt: '2026-11-05T12:00:00.000Z', timeZone: 'UTC',
  participation: role === 'teacher' ? 'teach' : 'study', memberships: { teach: Number(role === 'teacher'), study: Number(role === 'student'), archived: 0 }, setup: { drafts: 0, invitations: 0 },
  modules: { pending: ready(), review: ready(), feedback: ready(), agenda: ready(), queries: ready(), materials: ready(), classrooms: ready([classroom(1, role)]),
    drafts: role === 'teacher' ? ready() : { status: 'not-applicable' }, submitted: role === 'student' ? ready() : { status: 'not-applicable' }, ...modules } });

// Mount only real Home component boundaries with the existing hook harness. This
// keeps a child callback bound to its actual hook owner without mocking UI logic.
async function homeView(data, accountRole) {
  const actions = [], retries = [], views = [];
  const client = { read: async () => data, page: async () => { throw new Error('No pagination request expected before explicit action'); } };
  const { Home } = loadTsModule('apps/web/src/features/home/ui/Home.tsx', { stubs: {"../model/use-home.ts":{useHome: () => ({ data, loading: false, ordering:{},orders:{review:'asc',queries:'desc'},changeOrder(){},retry: name => retries.push(name), refresh() {} })}} });
  const root = hookView(Home, { accountRole, displayName: 'Prueba Sintética', subjectId: data.subjectId, homeClient: client,
    onCreate() {}, onJoin() {}, onClassrooms() {}, onAgenda() {}, onAction: target => actions.push(target) });
  views.push(root); await root.flush();
  async function findButton(pattern) {
    const queue = [root], mounted = new Set();
    for (let index = 0; index < queue.length; index++) {
      const owner = queue[index];
      const button = descendants(owner.tree, node => node.type === 'button' && pattern.test(node.props['aria-label'] ?? text(node)))[0];
      if (button) return { button, owner };
      for (const child of descendants(owner.tree, node => typeof node.type === 'function' && /^Home/.test(node.type.name))) {
        if (mounted.has(child)) continue;
        mounted.add(child);
        const view = hookView(child.type, child.props); views.push(view); queue.push(view); await view.flush();
      }
    }
    assert.fail(`Missing accessible action ${pattern}`);
  }
  return { root, actions, retries, html: () => renderToStaticMarkup(root.tree), findButton,
    flush: async () => { for (const view of views) await view.flush(); }, close: () => { for (const view of views.reverse()) view.close(); } };
}

const draft = (n, roomId) => ({ id: id(n), title: `Borrador ${n}`, classroom: room(roomId), activityType: 'ASSIGNMENT', updatedAt: '2026-11-05T11:00:00.000Z',
  target: { kind: 'activity', classroomId: id(roomId), activityId: id(n) } });
const submitted = () => ({ id: id(30), title: 'Entrega enviada propia', classroom: room(1, 'student'), activityType: 'ASSIGNMENT', attemptNumber: 2,
  submittedAt: '2026-11-05T11:30:00.000Z', target: { kind: 'activity', classroomId: id(1), activityId: id(31) } });

test('El aula focal muestra próximo tema y Abrir tema conserva exactamente topicId', async () => {
  const data = aggregate('teacher');
  const view = await homeView(data, 'teacher');
  try {
    assert.match(view.html(), /Tema pendiente exacto/);
    assert.match(view.html(), /Unidad del próximo tema/);
    const { button } = await view.findButton(/^Abrir tema(?:\s|:|$)/);
    button.props.onClick(); await view.flush();
    assert.deepEqual(view.actions, [{ kind: 'classroom', classroomId: id(1), section: 'plan', topicId: id(11) }]);
  } finally { view.close(); }
});

test('Borradores globales muestran dos aulas y acceso al listado completo sin depender del aula focal', async () => {
  const items = [draft(21, 1), draft(22, 2), draft(23, 3)];
  const data = aggregate('teacher', { drafts: ready(items, { nextCursor: 'cursor-global' }) });
  const view = await homeView(data, 'teacher');
  try {
    const html = view.html();
    assert.match(html, /Borrador 21/); assert.match(html, /Borrador 22/); assert.doesNotMatch(html, /Borrador 23/);
    assert.match(html, /Solo visibles para vos/);
    const { button } = await view.findButton(/Ver.*(?:borradores|borrador)/i);
    button.props.onClick(); await view.flush();
    const panel = descendants(view.root.tree, node => node.type?.name === 'HomeModulePanel' && node.props.name === 'drafts')[0];
    assert.ok(panel, 'El acceso completo usa el módulo global paginado y sus permisos');
    assert.equal(panel.props.data.modules.drafts.nextCursor, 'cursor-global');
    assert.deepEqual(panel.props.data.modules.drafts.items.map(item => item.id), items.map(item => item.id));
    assert.match(view.html(), /Borrador 23/);
  } finally { view.close(); }
});

test('Sin aula focal cargada los borradores globales autorizados siguen visibles y navegables', async () => {
  const item = draft(21, 2), view = await homeView(aggregate('teacher', { classrooms: ready(), drafts: ready([item]) }), 'teacher');
  try {
    assert.match(view.html(), /Borrador 21/);
    const { button } = await view.findButton(/Continuar.*(?:borrador|Borrador 21)/i);
    button.props.onClick(); await view.flush(); assert.deepEqual(view.actions, [item.target]);
  } finally { view.close(); }
});

test('Ver listado del alumno incluye entregadas en revisión y conserva el destino sin nota privada', async () => {
  const item = submitted(), view = await homeView(aggregate('student', { submitted: ready([item]) }), 'student');
  try {
    const { button } = await view.findButton(/^Ver listado(?:\s|$)/i);
    button.props.onClick(); await view.flush();
    const html = renderToStaticMarkup(view.root.tree);
    assert.match(html, /Entregadas, en revisión/); assert.match(html, /Entrega enviada propia/); assert.match(html, /Intento 2/);
    assert.doesNotMatch(html, /finalGrade|privateFeedback|aiGrading|9\.99|DEVOLUCIÓN PRIVADA/);
    const entry = await view.findButton(/Ver (?:entrega|actividad).*Entrega enviada propia/i);
    entry.button.props.onClick(); await view.flush(); assert.deepEqual(view.actions, [item.target]);
  } finally { view.close(); }
  const valid = ready([item]);
  assert.deepEqual(parseHomePage('submitted', valid).items[0], item);
  for (const secret of [{ finalGrade: '9.99' }, { privateFeedback: 'DEVOLUCIÓN PRIVADA' }, { aiGradingRubric: 'criterios privados' }]) {
    assert.throws(() => parseHomePage('submitted', ready([{ ...item, ...secret }])), { code: 'INVALID_INPUT' });
  }
});

for (const role of ['teacher', 'student']) test(`La bienvenida ${role} con cero pendientes informa que está al día`, async () => {
  const view = await homeView(aggregate(role), role);
  try {
    const greeting = descendants(view.root.tree, node => node.type?.name === 'HomeGreeting')[0];
    const html = renderToStaticMarkup(greeting);
    assert.match(html, role === 'teacher' ? /Las correcciones y las consultas de tus aulas están al día\./ : /Estás al día con las entregas abiertas de tus aulas\./);
    assert.doesNotMatch(html, /0 (?:actividades pendientes|entregas pendientes|consultas sin responder)/);
  } finally { view.close(); }
});

for (const role of ['teacher', 'student']) test(`Miniagenda ${role} separa dos eventos personales del próximo plazo permitido`, async () => {
  const event = (n, source) => ({ id: id(n), title: `${source === 'PRIVATE_EVENT' ? 'Personal' : 'Plazo'} ${n}`, source, startAt: `2026-11-0${5 + n % 3}T15:00:00.000Z`, date: `2026-11-0${5 + n % 3}`,
    timeZone: 'UTC', allDay: false, classroom: source === 'PRIVATE_EVENT' ? null : room(1, role), target: source === 'PRIVATE_EVENT'
      ? { kind: 'private-event', eventId: id(n), occurrenceId: id(n + 100), date: `2026-11-0${5 + n % 3}` } : { kind: 'activity', classroomId: id(1), activityId: id(n) } });
  const items = [event(40, 'ACADEMIC_DEADLINE'), event(41, 'PRIVATE_EVENT'), event(42, 'PRIVATE_EVENT'), event(43, 'ACADEMIC_DEADLINE'), event(44, 'PRIVATE_EVENT')];
  const view = await homeView(aggregate(role, { agenda: ready(items) }), role);
  try {
    const html = view.html();
    assert.match(html, /Eventos personales/); assert.match(html, /Personal 41/); assert.match(html, /Personal 42/);
    assert.doesNotMatch(html, /Personal 44|Plazo 43/);
    if (role === 'teacher') { assert.match(html, /Próxima fecha de entrega/); assert.match(html, /Plazo 40/); }
    else assert.doesNotMatch(html, /Plazo 40|Próxima fecha de entrega/);
    const target = items.find(item => item.title === 'Personal 41').target;
    const { button } = await view.findButton(/Abrir: Personal 41/);
    button.props.onClick(); await view.flush(); assert.deepEqual(view.actions, [target]);
  } finally { view.close(); }
});

test('Un error de borradores globales conserva reintento real y no aparenta una lista vacía', async () => {
  const view = await homeView(aggregate('teacher', { drafts: { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true } }), 'teacher');
  try {
    assert.match(view.html(), /No pudimos cargar.*borrador/i);
    const { button } = await view.findButton(/Reintentar.*borrador/i);
    button.props.onClick(); await view.flush(); assert.deepEqual(view.retries, ['drafts']);
  } finally { view.close(); }
});
