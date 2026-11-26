import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appStylesheets } from './helpers/global-style-fixture.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants } from './agenda-ui-helpers.test.mjs';

const textOf = node => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(textOf).join('') : textOf(node.props?.children);
const ready = items => ({ status: 'ready', items, totalItems: items.length, nextCursor: null });
const names = ['pending', 'review', 'feedback', 'agenda', 'queries', 'materials', 'classrooms', 'drafts', 'submitted'];
const room = (id, name, coverKey = 'biology', role = 'teacher') => ({ id, name, division: '3.° B', subject: 'Biología', role, coverKey, archived: false, timeZone: 'UTC' });
const data = (modules = {}) => ({ version: 1, subjectId: 'subject', generatedAt: '2026-11-24T12:00:00Z', timeZone: 'UTC', participation: 'mixed',
  memberships: { study: 1, teach: 1, archived: 0 }, setup: { drafts: 0, invitations: 0 },
  modules: { ...Object.fromEntries(names.map(name => [name, ready([])])), ...modules } });
const agendaItem = (id, title, startAt, extra = {}) => ({ id, title, source: 'PRIVATE_EVENT', startAt, date: startAt.slice(0, 10), timeZone: 'UTC', allDay: false,
  classroom: null, target: { kind: 'private-event', eventId: id, occurrenceId: id, date: startAt.slice(0, 10) }, ...extra });
const review = (id, title, classroom, needsReview, readyToPublish, extra = {}) => ({ id, title, classroom, activityType: 'QUESTIONNAIRE', needsReview, readyToPublish,
  oldestSubmittedAt: '2026-11-23T10:00:00Z', target: { kind: 'submissions', classroomId: classroom.id, activityId: `act-${title}`, filter: 'unpublished' }, ...extra });
const pending = (id, title, classroom, extra = {}) => ({ id, title, classroom, activityType: 'QUESTIONNAIRE', state: 'first-submission', attemptId: null,
  deadlineAt: '2026-11-24T23:59:00Z', reception: 'open', late: false, target: { kind: 'activity', classroomId: classroom.id, activityId: id }, ...extra });
const model = () => loadTsModule('apps/web/src/features/home/model/home-expedition.ts');

test('recorrido del día: sólo lo de hoy, ordenado, como mucho tres y vacío si el módulo no está listo', () => {
  const { homeRoute } = model();
  const agenda = ready([
    agendaItem('a', 'Clase: Biología 3.° B', '2026-11-24T13:00:00Z'),
    agendaItem('b', 'Entrega: cuestionario', '2026-11-24T23:59:00Z', { source: 'ACADEMIC_DEADLINE' }),
    agendaItem('c', 'Reunión de mañana', '2026-11-25T14:30:00Z'),
  ]);
  assert.deepEqual(homeRoute(data({ agenda })).map(stop => [stop.time, stop.title]), [['13:00', 'Clase: Biología 3.° B'], ['23:59', 'Entrega: cuestionario']]);
  assert.deepEqual(homeRoute(data({ agenda: { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true } })), []);
  const many = ready(['1', '2', '3', '4'].map(n => agendaItem(n, `Evento ${n}`, `2026-11-24T1${n}:00:00Z`)));
  assert.equal(homeRoute(data({ agenda: many })).length, 3);
});

test('lo más urgente: primera entrega del docente, primera actividad abierta del estudiante, al día o nada si falla', () => {
  const { homeUrgent } = model();
  const bio = room('r1', 'Biología 3.° B');
  assert.deepEqual(homeUrgent(data({ review: ready([review('v1', 'Cuestionario: la célula', bio, 3, 0)]) }), true),
    { label: 'Para revisar primero', text: 'Cuestionario: la célula · Biología 3.° B' });
  const student = homeUrgent(data({ pending: ready([pending('p0', 'Cerrada', bio, { reception: 'closed' }), pending('p1', 'Cuestionario: la célula', bio)]) }), false);
  assert.equal(student.label, 'Tu próxima parada');
  assert.match(student.text, /^Cuestionario: la célula cierra /);
  assert.equal(homeUrgent(data(), true).label, 'Todo al día');
  assert.equal(homeUrgent(data({ review: { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true } }), true), null);
});

test('avance de corrección: cuenta entregas individuales y agrupadas', () => {
  const { reviewProgress } = model();
  const bio = room('r1', 'Biología 3.° B');
  assert.deepEqual(reviewProgress([review('a', 'TP', bio, 3, 2)]), { corrected: 2, total: 5 });
  assert.deepEqual(reviewProgress([review('a', 'TP', bio, 1, 0, { studentName: 'Ada' }), review('b', 'TP', bio, 0, 1, { studentName: 'Bea' })]), { corrected: 1, total: 2 });
});

test('Inicio docente: cada grupo de entregas muestra «X de Y corregidas» con una barra accesible', () => {
  const { HomePriorities } = loadTsModule('apps/web/src/features/home/queue/HomePriorities.tsx');
  const bio = room('r1', 'Biología 3.° B');
  const tree = HomePriorities({ data: data({ review: ready([review('v1', 'Cuestionario', bio, 3, 2)]) }), teacher: true, tab: 'review', onTab() {}, order: 'asc', onOrder() {},
    loading: false, onAction() {}, onRetry() {}, onList() {} });
  const bar = descendants(tree, node => node.props?.role === 'progressbar')[0];
  assert.ok(bar);
  assert.equal(bar.props['aria-valuenow'], 2); assert.equal(bar.props['aria-valuemax'], 5);
  assert.match(textOf(tree), /2 de 5 corregidas/);
});

test('Inicio estudiante: la actividad con preguntas muestra su avance y la que no tiene, no inventa uno', () => {
  const { HomePriorities } = loadTsModule('apps/web/src/features/home/queue/HomePriorities.tsx');
  const bio = room('r1', 'Biología 3.° B', 'biology', 'student');
  const tree = HomePriorities({ data: data({ pending: ready([pending('p1', 'Cuestionario', bio, { questionProgress: { answered: 3, total: 5 } }), pending('p2', 'Lectura', bio)]) }),
    teacher: false, tab: 'review', onTab() {}, order: 'asc', onOrder() {}, loading: false, onAction() {}, onRetry() {}, onList() {} });
  const bars = descendants(tree, node => node.props?.role === 'progressbar');
  assert.equal(bars.length, 1);
  assert.equal(bars[0].props['aria-valuenow'], 3);
  assert.match(textOf(tree), /3 de 5 preguntas respondidas/);
});

test('saludo: paisaje y zorro decorativos, recorrido de hoy y burbuja con lo más urgente', () => {
  const { HomeGreeting } = loadTsModule('apps/web/src/features/home/dashboard/Home.tsx');
  const bio = room('r1', 'Biología 3.° B');
  const tree = HomeGreeting({ data: data({ agenda: ready([agendaItem('a', 'Clase: Biología 3.° B', '2026-11-24T13:00:00Z')]), review: ready([review('v1', 'Cuestionario', bio, 3, 0)]) }),
    teacher: true, displayName: 'Lucía Demo', onCreate() {}, onAction() {} });
  const art = descendants(tree, node => node.props?.className === 'home-illustration')[0];
  assert.equal(art.props['aria-hidden'], 'true');
  const fox = descendants(art, node => node.type === 'img')[0];
  assert.equal(fox.props.src, '/brujula/foxy-bienvenida.webp'); assert.equal(fox.props.alt, '');
  const route = descendants(tree, node => node.type === 'ol' && node.props?.className === 'home-route')[0];
  assert.ok(route); assert.equal(route.props['aria-label'], 'Lo que sigue hoy');
  assert.match(textOf(route), /13:00.*Clase: Biología 3\.° B/);
  assert.match(textOf(descendants(tree, node => node.props?.className === 'home-bubble')[0]), /Para revisar primero.*Cuestionario · Biología 3\.° B/);
  const quiet = HomeGreeting({ data: data(), teacher: false, displayName: 'Marina Demo', onCreate() {}, onAction() {} });
  assert.equal(descendants(quiet, node => node.props?.className === 'home-route').length, 0, 'sin eventos hoy no hay recorrido');
});

test('Inicio: el contador de cada pestaña centra su número dentro del círculo', () => {
  const path = appStylesheets().find(item => item.endsWith('expedition-home.css'));
  const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = css.match(/\.home-queue-tabs > button > span \{([^}]*)\}/)?.[1] ?? '';
  for (const declaration of [/display:\s*inline-grid/, /place-items:\s*center/, /line-height:\s*1\b/, /height:\s*24px/])
    assert.match(rule, declaration, `el contador necesita ${declaration} para no quedar corrido hacia arriba`);
});

test('Inicio: los enlaces «Ver …» llevan la flecha después del texto, todos del mismo lado', () => {
  const sources = ['dashboard/HomeClassCards.tsx', 'dashboard/HomeMiniagenda.tsx', 'queue/HomePriorities.tsx']
    .map(file => readFileSync(`apps/web/src/features/home/${file}`, 'utf8'));
  const links = sources.flatMap(source => [...source.matchAll(/className="text-button"[^>]*>(.*?)<\/button>/g)].map(match => match[1]))
    .filter(body => body.includes('arrow-right'));
  assert.ok(links.length >= 3);
  for (const body of links) assert.match(body, /^[^<]+<FoxmindIcon name="arrow-right"\/>$/, body);
});

test('Inicio estudiante: la fecha de entrega cae en la misma línea con o sin barra de avance', () => {
  const path = appStylesheets().find(item => item.endsWith('expedition-home.css'));
  const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.home-student-queue \.home-progress \{[^}]*margin: auto 0 0/);
  assert.match(css, /\.learning-body:has\(\.home-progress\) \.learning-deadline \{[^}]*order: 2/);
});

test('Inicio: la hoja Expedición está en la cascada y cada regla se ancla con el id raíz duplicado', () => {
  const path = appStylesheets().find(item => item.endsWith('expedition-home.css'));
  assert.ok(path, 'expedition-home.css debe formar parte de la cascada real');
  const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [...css.matchAll(/(?:^|[}\n])\s*([^@{}\n][^{}]*?)\s*\{/g)].map(match => match[1].trim()).filter(selector => selector && !selector.startsWith('@'));
  assert.ok(selectors.length > 20);
  for (const selector of selectors) {
    let depth = 0, part = '';
    for (const char of `${selector},`) {
      if (char === '(') depth++; if (char === ')') depth--;
      if (char === ',' && depth === 0) { assert.match(part.trim(), /^#foxmind-product#foxmind-product\.fm3d-theme /, part.trim()); part = ''; } else part += char;
    }
  }
});
