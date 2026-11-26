import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { randomUUID } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { foxyQuizFormat, foxyQuizQuestionCount } from '../src/core/domain/foxy/foxy-quiz.ts';
import { readTeacherLessonTime } from '../apps/web/src/features/foxy/resources/teacher-planning-model.ts';

const conversation = { id: randomUUID(), title: 'Clase', context: { kind: 'GENERAL' }, revision: '0' };
const base = { capabilities: { textGeneration: { enabled: true }, imageGeneration: { enabled: false }, diagramGeneration: { enabled: false } },
  conversations: [conversation], nextConversationCursor: null, current: conversation, turns: [], activeTurn: null, nextAfterSequence: null,
  pending: null, error: null, busy: false, selection: { topicIds: [], sourceIds: [] }, curriculum: null };
const workspace = (state, props = {}) => {
  const { FoxyWorkspace } = componentWithPorts('apps/web/src/features/foxy/workspace/foxy-workspace.tsx', {});
  return hookView(FoxyWorkspace, { controller: { send: async () => 'accepted' }, state, classrooms: [], ...props });
};
const layoutOf = view => descendants(view.tree, node => node.type?.name === 'FoxyChatLayout')[0];

test('an open creation fills the layout panel while the chat and composer stay mounted', async () => {
  const panel = React.createElement('section', { 'aria-label': 'Plan abierto' }, 'La fotosíntesis');
  const view = workspace(base, { panel });
  try {
    await view.flush();
    const layout = layoutOf(view);
    assert.equal(layout.props.panel, panel);
    assert.equal(layout.props.panelLabel, 'Creación abierta');
    assert.ok(descendants(layout.props.children, node => node.type === 'textarea').length, 'the composer is still in the chat column');
    assert.equal(descendants(layout.props.children, node => node.props?.['aria-label'] === 'Plan abierto').length, 0, 'the creation is not duplicated inside the chat');
  } finally { view.close(); }
});

test('the session hands every opened creation to the panel instead of a separate dialog', async () => {
  const subjectId = randomUUID(), rid = randomUUID(), cid = conversation.id;
  const snapshot = { subjectId, closed: false, chat: base, resource: { status: 'editing', resource: { id: rid, markdown: '## Plan' } }, preparation: {}, history: {}, confirmation: {},
    classrooms: [], classroomsError: null };
  const runtime = {}, actions = { chat: {}, resource: { open() {}, close: () => true }, preparation: {}, history: {}, confirmation: {} };
  const { FoxyWorkspaceSession } = componentWithPorts('apps/web/src/application/workflows/foxy-workspace/FoxyWorkspaceSession.tsx', {
    './foxy-workspace': { useFoxyWorkspace: () => ({ state: snapshot, runtime, initializing: false }) },
    '../../../features/foxy/index.ts': { ...componentWithPorts('apps/web/src/features/foxy/index.ts', {}),
      useFoxyWorkspaceActions: () => ({ actions, ui: { leave: null, openingResource: false } }), FoxyWorkspace: () => null,
      createFoxyChatController: () => ({ init: async () => {}, getState: () => base, dispose: () => {} }) },
    './FoxyResourceWorkspace': { FoxyResourceWorkspace: function MarkerResourcePanel() { return null; } },
    '../../../features/foxy/api.ts': { createWebFoxyClient: () => ({}) },
  });
  const view = hookView(FoxyWorkspaceSession, { subjectId, onIdentityRequired: () => {} });
  try {
    await view.flush();
    const chat = descendants(view.tree, node => 'panel' in (node.props ?? {}) && 'onClosePanel' in node.props)[0];
    assert.ok(chat, 'the workspace receives panel and onClosePanel');
    assert.equal(chat.props.panel.type.name, 'MarkerResourcePanel');
    assert.equal(chat.props.panel.props.panel, true, 'the resource renders in panel mode, not as a modal dialog');
    assert.equal(descendants(view.tree, node => node.type?.name === 'MarkerResourcePanel').length, 0, 'no second copy is mounted outside the panel');
    assert.equal(chat.props.onClosePanel(), true);
    assert.ok(cid);
  } finally { view.close(); }
});

function panelFixture(over = {}) {
  const closed = [];
  const saved = { id: 'resource', title: 'La fotosíntesis', markdown: over.markdown ?? '## Inicio · 8 minutos\nPregunta.\n\n## Desarrollo · 24 minutos\nTrabajo.\n\n## Cierre · 8 minutos\nTicket.', revision: '1' };
  const props = { panel: true, creationLabel: over.creationLabel ?? 'Planificar una clase', resource: { status: 'editing', resource: saved, draft: { title: saved.title, markdown: saved.markdown }, dirty: false, busy: false, pending: null, conflict: null, errorCode: null },
    preparation: { destination: null, metadata: { title: '', unitId: null, topicId: null }, canPrepare: false, busy: false, pending: null },
    history: { items: [], inspection: null, loading: false }, confirmation: { review: null, reviewed: false, busy: false, pending: null, canReview: false, canConfirm: false },
    classrooms: [], ui: { leave: null, openingResource: false }, handoffRuntime: { activityHandoff: { reset() {} } }, handoffState: {},
    actions: { resource: { updateDraft() {}, close: () => { closed.push(true); return true; } }, preparation: {}, history: {}, confirmation: {} }, publicationFileUrl: () => '' };
  const { FoxyResourceWorkspace } = componentWithPorts('apps/web/src/application/workflows/foxy-workspace/FoxyResourceWorkspace.tsx', {});
  return { closed, view: hookView(FoxyResourceWorkspace, props) };
}

test('the creation panel names its type, saved state and close control and keeps Leer, Editar and the actions', async () => {
  const f = panelFixture();
  try {
    await f.view.flush();
    const html = renderToStaticMarkup(f.view.tree);
    assert.match(html, /parity-foxy-panelTag[^>]*>Plan de clase</u);
    assert.match(html, /Privado · guardado/u);
    for (const label of ['Leer', 'Editar', 'Descargar PDF', 'Descargar Word', 'Preparar en Actividades', 'Llevar a Biblioteca'])
      assert.match(html, new RegExp(`>${label}<`, 'u'), label);
    assert.doesNotMatch(html, /<dialog/u, 'a creation is no longer a modal dialog');
    assert.match(html, /<button[^>]*aria-label="Cerrar panel"/u);
    descendants(f.view.tree, node => node.type?.name === 'FoxyCreationPanelFrame')[0].props.onClose();
    assert.deepEqual(f.closed, [true]);
  } finally { f.view.close(); }
});

test('a lesson plan shows its phase minutes as a time bar and skips it when they are not parseable', async () => {
  const timed = panelFixture();
  const untimed = panelFixture({ markdown: '## Idea general\nSin minutos.' });
  try {
    await timed.view.flush(); await untimed.view.flush();
    const html = renderToStaticMarkup(timed.view.tree);
    assert.match(html, /Tiempo de la clase · 40 min/u);
    assert.match(html, /Inicio 8&#x27;|Inicio 8'/u);
    assert.match(html, /Desarrollo 24/u);
    assert.doesNotMatch(renderToStaticMarkup(untimed.view.tree), /Tiempo de la clase/u);
  } finally { timed.view.close(); untimed.view.close(); }
  assert.deepEqual(readTeacherLessonTime('## Inicio · 8 min\nA\n\n## Cierre (12 minutos)\nB')?.segments, [{ label: 'Inicio', minutes: 8 }, { label: 'Cierre', minutes: 12 }]);
  assert.equal(readTeacherLessonTime('## Inicio · 8 min\nSolo una fase'), undefined);
});

test('the same panel tags a rubric by what it contains', async () => {
  const rubric = panelFixture({ creationLabel: 'Pensar una rúbrica', markdown: '## Criterio\n- A: bien\n- B: mal' });
  try {
    await rubric.view.flush();
    assert.match(renderToStaticMarkup(rubric.view.tree), /parity-foxy-panelTag[^>]*>Rúbrica</u);
  } finally { rubric.view.close(); }
});

const welcomeTools = view => descendants(view.tree, node => node.type?.name === 'FoxyWelcome')[0];
const menuLabels = { NOTE: 'Preparar un apunte', QUIZ: 'Crear un quiz', PLAN: 'Planificar una clase' };
const menuPick = (view, id) => descendants(layoutOf(view).props.tools, node => node.type === 'button'
  && renderToStaticMarkup(node).includes(menuLabels[id]))[0].props.onClick();

test('the welcome groups the tools by intent and opens them as an inline card that replaces the composer', async () => {
  const view = workspace({ ...base, capabilities: { ...base.capabilities, diagramGeneration: { enabled: true } } });
  try {
    await view.flush();
    const welcome = welcomeTools(view);
    assert.deepEqual(welcome.props.groups.map(group => [group.label, group.items.map(item => item.value)]),
      [['Para tu clase', ['PLAN', 'ACTIVITY', 'QUIZ', 'RUBRIC']], ['Para explicar', ['NOTE', 'DIAGRAM']]]);
    welcome.props.onTool('PLAN'); await view.flush();
    let dialog = descendants(view.tree, node => node.type?.name === 'FoxyToolDialog')[0];
    assert.equal(dialog.props.title, 'Planificar una clase');
    assert.equal(dialog.props.inline, true);
    assert.equal(descendants(layoutOf(view).props.children, node => node.type === 'textarea' && node.props.id).length, 0, 'one text box: the composer steps aside');
    dialog.props.onClose(); await view.flush();
    assert.equal(descendants(view.tree, node => node.type?.name === 'FoxyToolDialog').length, 0);
    welcomeTools(view).props.onTool('QUIZ'); await view.flush();
    dialog = descendants(view.tree, node => node.type?.name === 'FoxyToolDialog')[0];
    assert.equal(dialog.props.title, 'Crear una actividad');
    assert.equal(dialog.props.initialQuiz, true);
  } finally { view.close(); }
});

test('the Herramientas menu opens the same inline card, with Quiz as its own tool', async () => {
  const view = workspace(base);
  try {
    await view.flush();
    menuPick(view, 'NOTE'); await view.flush();
    let dialog = descendants(view.tree, node => node.type?.name === 'FoxyToolDialog')[0];
    assert.equal(dialog.props.inline, true);
    assert.equal(dialog.props.initialQuiz, false);
    dialog.props.onClose(); await view.flush();
    menuPick(view, 'QUIZ'); await view.flush();
    dialog = descendants(view.tree, node => node.type?.name === 'FoxyToolDialog')[0];
    assert.equal(dialog.props.initialQuiz, true);
  } finally { view.close(); }
});

test('Esquema appears only with visuals and «Retomá» opens the latest creations', async () => {
  const opened = [];
  const creations = [1, 2, 3, 4].map(index => ({ id: `c${index}`, kind: 'NOTE', title: `Apunte ${index}`, createdAt: '2026-11-20T10:00:00Z' }));
  const view = workspace(base, { catalog: { creations: { items: creations, next: null, loading: false, error: null }, conversations: { items: [], next: null, loading: false, error: null } }, onOpenCreation: item => opened.push(item.id) });
  try {
    await view.flush();
    const welcome = welcomeTools(view);
    assert.deepEqual(welcome.props.groups[1].items.map(item => item.value), ['NOTE']);
    assert.deepEqual(welcome.props.recent.map(item => item.id), ['c1', 'c2', 'c3']);
    welcome.props.onRecent(creations[1]);
    assert.deepEqual(opened, ['c2']);
    const html = renderToStaticMarkup(welcome.type(welcome.props));
    assert.match(html, /Retomá[\s\S]*Apunte 1[\s\S]*Apunte · /u);
  } finally { view.close(); }
});

test('the quiz format radios and the question count have accessible names and drive the quiz request', async () => {
  const { FoxyToolDialog } = componentWithPorts('apps/web/src/features/foxy/tools/foxy-tool-dialog.tsx', {});
  const sent = [];
  const view = hookView(FoxyToolDialog, { title: 'Crear una actividad', initialQuiz: true, contextName: 'General', materialCount: 0, topics: [], inline: true,
    onPrepare: async (...args) => { sent.push(args); return true; }, onClose() {} });
  try {
    await view.flush();
    const radios = descendants(view.tree, node => node.type === 'input' && node.props.type === 'radio');
    assert.equal(radios.length, 3);
    const labels = descendants(view.tree, node => node.type === 'label' && node.props.htmlFor);
    for (const radio of radios) {
      assert.ok(radio.props.id && radio.props.value && radio.props.name, 'each radio has id, value and group name');
      const label = labels.find(node => node.props.htmlFor === radio.props.id);
      assert.ok(label, 'each radio has a label that points at it');
      assert.match(String(label.props.children), /^(Opción múltiple|Verdadero o falso|Mixto)$/u);
    }
    assert.equal(descendants(view.tree, node => node.type === 'legend')[0].props.children, 'Formato de preguntas');
    assert.equal(renderToStaticMarkup(view.tree).includes('Trabajo práctico'), false, 'the quiz no longer asks for the activity kind');
    radios.find(node => node.props.value === 'TRUE_FALSE').props.onChange(); await view.flush();
    const group = descendants(view.tree, node => node.props?.role === 'group' && node.props['aria-labelledby'])[0];
    const heading = descendants(view.tree, node => node.props?.id === group.props['aria-labelledby'])[0];
    assert.equal(heading.props.children, 'Cantidad de preguntas');
    descendants(view.tree, node => node.props?.['aria-label'] === 'Una pregunta más')[0].props.onClick(); await view.flush();
    descendants(view.tree, node => node.type === 'textarea')[0].props.onChange({ target: { value: 'Fotosíntesis' } }); await view.flush();
    descendants(view.tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await view.flush();
    assert.equal(foxyQuizQuestionCount(sent[0][0]), 4);
    assert.equal(foxyQuizFormat(sent[0][0]), 'TRUE_FALSE');
  } finally { view.close(); }
});

test('an assignment opened as Actividad sends its instructions without asking for a quiz format', async () => {
  const { FoxyToolDialog } = componentWithPorts('apps/web/src/features/foxy/tools/foxy-tool-dialog.tsx', {});
  const sent = [];
  const view = hookView(FoxyToolDialog, { title: 'Crear una actividad', contextName: 'General', materialCount: 0, topics: [], inline: true,
    onPrepare: async (...args) => { sent.push(args); return true; }, onClose() {} });
  try {
    await view.flush();
    assert.equal(descendants(view.tree, node => node.type === 'input' && node.props.type === 'radio').length, 0);
    descendants(view.tree, node => node.type === 'textarea')[0].props.onChange({ target: { value: 'Trabajo en parejas' } }); await view.flush();
    descendants(view.tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await view.flush();
    assert.equal(foxyQuizQuestionCount(sent[0][0]), null);
    assert.match(sent[0][0], /^Trabajo en parejas\n\nIncluí un objetivo observable/u);
  } finally { view.close(); }
});

test('a generated creation waits through real stages only and never shows a percentage', () => {
  const { FoxyWait, waitElapsed } = componentWithPorts('apps/web/src/features/foxy/conversations/foxy-wait.tsx', {});
  const stages = html => [...html.matchAll(/<li data-state="(\w+)"[^>]*>([^<]+)</gu)].map(match => [match[2], match[1]]);
  const queued = renderToStaticMarkup(React.createElement(FoxyWait, { title: 'Tu solicitud está en cola', generating: true, queued: true, onStop() {} }));
  assert.deepEqual(stages(queued), [['Pedido recibido', 'done'], ['En cola', 'current'], ['Preparando la propuesta', 'pending']]);
  const running = renderToStaticMarkup(React.createElement(FoxyWait, { title: 'Dándole forma a la propuesta', generating: true, onStop() {} }));
  assert.deepEqual(stages(running), [['Pedido recibido', 'done'], ['En cola', 'done'], ['Preparando la propuesta', 'current']]);
  assert.match(running, />Detener</u);
  assert.doesNotMatch(queued + running, /%|role="progressbar"/u);
  assert.equal(waitElapsed(0, 4999), '');
  assert.equal(waitElapsed(0, 12000), 'Van 12 s');
  assert.equal(waitElapsed(0, 75000), 'Van 1 min 15 s');
});

test('a finished creation is one card button that opens the panel', () => {
  const { renderFoxyTranscript } = componentWithPorts('apps/web/src/features/foxy/conversations/foxy-transcript.tsx', {});
  const turnId = randomUUID(), opened = [];
  const turn = { id: turnId, sequence: 1, state: 'READY', purpose: 'LESSON_PLAN', message: 'Planificá', createdAt: '2026-01-01T00:00:00.000Z',
    answer: { title: 'La fotosíntesis', markdown: '## Inicio', warnings: [], missingInformation: [] } };
  const tree = renderFoxyTranscript({ state: { ...base, turns: [turn] }, chatFollow: {}, controller: {}, enabled: true, onOpenResource: (...args) => opened.push(args) });
  const card = descendants(tree, node => node.type === 'button' && node.props.className === 'parity-foxy-creationOpen')[0];
  assert.ok(card);
  assert.match(renderToStaticMarkup(card), /Plan de clase[\s\S]*La fotosíntesis/u);
  card.props.onClick();
  assert.deepEqual(opened, [[conversation.id, turnId]]);
});
