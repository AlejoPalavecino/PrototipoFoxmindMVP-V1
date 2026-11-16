import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

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
    onCreate() {}, onJoin() {}, onClassrooms() {actions.push({kind:'classrooms'});}, onOpenActivities: classroomId=>actions.push({kind:'classroom-activities',classroomId}), onAgenda() {}, onAction: target => actions.push(target) });
  views.push(root); await root.flush();
  async function findButton(pattern) {
    const queue = [root], mounted = new Set();
    for (let index = 0; index < queue.length; index++) {
      const owner = queue[index];
      const button = descendants(owner.tree, node => node.type === 'button' && pattern.test(node.props['aria-label'] ?? text(node).trim()))[0];
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

// Explicit UI parity decision supersedes the old Home shortcuts; backend data remains valid.
test('Inicio omite próximos temas, borradores y orden extra aunque existan datos', async () => {
 const view=await homeView(aggregate('teacher',{drafts:ready([draft(21,1)])}),'teacher');
 try {const html=view.html();assert.doesNotMatch(html,/Tema pendiente exacto|Unidad del próximo tema|Abrir tema|Borrador 21|Actividades en borrador|Más antiguas primero|Más recientes primero/);assert.match(html,/Tus aulas/);} finally {view.close();}
});
test('Inicio estudiante no agrega últimas devoluciones fuera de los widgets aprobados', async () => {
 const view=await homeView(aggregate('student',{feedback:{status:'error',code:'SERVICE_UNAVAILABLE',retryable:true}}),'student');
 try {assert.doesNotMatch(view.html(),/Tus últimas devoluciones|fm-home-module--feedback/);} finally {view.close();}
});

test('Ver actividades del aula abre el aula activa real sin modal global', async () => {
 const view=await homeView(aggregate('student',{submitted:ready([submitted()])}),'student');
 try {const {button}=await view.findButton(/^Ver actividades del aula$/);button.props.onClick();await view.flush();assert.deepEqual(view.actions,[{kind:'classroom-activities',classroomId:id(1)}]);assert.doesNotMatch(view.html(),/Entregadas, en revisión|Intento 2/);}finally{view.close();}
});
test('Ver actividades no abre un aula archivada o inexistente', async () => {
 const archived=classroom(1,'student');archived.classroom.archived=true;
 const view=await homeView(aggregate('student',{classrooms:ready([archived])}),'student');
 try {const {button}=await view.findButton(/^Ver actividades del aula$/);button.props.onClick();assert.deepEqual(view.actions,[{kind:'classrooms'}]);}finally{view.close();}
});

for (const role of ['teacher', 'student']) test(`La bienvenida ${role} con cero pendientes informa que está al día`, async () => {
  const view = await homeView(aggregate(role), role);
  try {
    const greeting = descendants(view.root.tree, node => node.type?.name === 'HomeGreeting')[0];
    const html = renderToStaticMarkup(greeting);
    assert.match(html, role === 'teacher' ? /Tus entregas están al día\./ : /Tus actividades están al día\./);
    assert.doesNotMatch(html, /0 (?:actividades pendientes|entregas pendientes|consultas sin responder)/);
  } finally { view.close(); }
});

test('Un error de borradores no agrega un módulo ajeno al Inicio aprobado', async () => {
 const view=await homeView(aggregate('teacher',{drafts:{status:'error',code:'SERVICE_UNAVAILABLE',retryable:true}}),'teacher');
 try {assert.doesNotMatch(view.html(),/borrador/i);} finally {view.close();}
});
