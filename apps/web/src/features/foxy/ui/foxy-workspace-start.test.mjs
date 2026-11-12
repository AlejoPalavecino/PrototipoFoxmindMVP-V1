import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { componentWithPorts } from "../../../../../../tests/foxmind-3d-flows-loader.test.mjs";
import { hookView, descendants } from "../../../../../../tests/agenda-ui-helpers.test.mjs";

for (const existing of [true, false]) for (const success of [true, false]) test(`first message creates before sending and preserves text on creation failure: ${success}, previous conversation: ${existing}`, async () => {
  const state = { capabilities: { textGeneration: { enabled: true } }, conversations: [], current: null,
    turns: [], activeTurn: null, nextAfterSequence: null, pending: null, error: null, busy: false };
  if (existing) state.current = { id: randomUUID(), title: 'Anterior', context: { kind: 'GENERAL' } };
  const calls = [];
  const controller = {
    async create(input) { calls.push(['create', input]); if (success) state.current = { id: randomUUID(), title: input.title, context: input.context }; },
    async send(...args) { calls.push(['send', ...args]); return 'accepted'; },
  };
  const { FoxyWorkspace } = componentWithPorts("apps/web/src/features/foxy/ui/foxy-workspace.tsx", {});
  const view = hookView(FoxyWorkspace, { controller, state, classrooms: [] });
  try {
    await view.flush();
    if (existing) {
      descendants(view.tree, n => n.type === 'button' && descendants(n, child => child.props?.name === 'plus').length)[0].props.onClick();
      await view.flush();
    }
    const textarea = () => descendants(view.tree, n => n.type === 'textarea')[0];
    assert.ok(textarea(), 'The initial composer is available without a conversation form');
    textarea().props.onChange({ target: { value: 'Preparar una clase sobre plantas' } }); await view.flush();
    const form = descendants(view.tree, n => n.type === 'form' && descendants(n, c => c.type === 'textarea').length)[0];
    form.props.onSubmit({ preventDefault() {} }); await view.flush();
    assert.equal(calls[0]?.[0], 'create');
    assert.equal(calls.filter(c => c[0] === 'send').length, success ? 1 : 0);
    assert.equal(textarea().props.value, success ? '' : 'Preparar una clase sobre plantas');
  } finally { view.close(); }
});

import { renderToStaticMarkup } from 'react-dom/server';

test('approved tool rail maps rubric to explicit editable text and has no redundant purpose selector', async () => {
  const current = { id: randomUUID(), title: 'Clase', context: { kind: 'GENERAL' } };
  const state = { capabilities: { textGeneration: { enabled: true } }, conversations: [current], current,
    turns: [], activeTurn: null, nextAfterSequence: null, pending: null, error: null, busy: false };
  const calls = [], controller = { async send(...args) { calls.push(args); return 'accepted'; } };
  const { FoxyWorkspace } = componentWithPorts("apps/web/src/features/foxy/ui/foxy-workspace.tsx", {});
  const view = hookView(FoxyWorkspace, { controller, state, classrooms: [] });
  try {
    await view.flush();
    const layout = descendants(view.tree, n => n.type?.name === 'FoxyChatLayout')[0];
    const buttons = descendants(layout.props.tools, n => n.type === 'button');
    for (const label of ['Crear apuntes', 'Crear esquema', 'Crear actividad', 'Crear planificación', 'Crear rúbrica'])
      assert.ok(buttons.some(n => renderToStaticMarkup(n).includes(label)));
    buttons.find(n => renderToStaticMarkup(n).includes('Crear rúbrica')).props.onClick(); await view.flush();
    assert.equal(descendants(view.tree, n => n.type === 'select').length, 0);
    assert.match(renderToStaticMarkup(view.tree), /texto editable/iu);
    descendants(view.tree, n => n.type === 'textarea')[0].props.onChange({ target: { value: 'Evaluar una exposición' } }); await view.flush();
    descendants(view.tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await view.flush();
    assert.equal(calls[0][0], 'RUBRIC'); assert.match(calls[0][1], /rúbrica/iu); assert.match(calls[0][1], /Evaluar una exposición/u);
  } finally { view.close(); }
});

test('diagram mode sends to the real visual callback and never to text chat', async () => {
  const current = { id: randomUUID(), title: 'Clase', context: { kind: 'GENERAL' } };
  const state = { capabilities: { textGeneration: { enabled: true }, diagramGeneration: { enabled: true } }, conversations: [current], current,
    turns: [], activeTurn: null, nextAfterSequence: null, pending: null, error: null, busy: false };
  const sent = [], diagrams = [], controller = { async send(...args) { sent.push(args); } };
  const { FoxyWorkspace } = componentWithPorts("apps/web/src/features/foxy/ui/foxy-workspace.tsx", {});
  const view = hookView(FoxyWorkspace, { controller, state, classrooms: [], onCreateDiagram: async prompt => { diagrams.push(prompt); return true; } });
  try {
    await view.flush();
    const layout = descendants(view.tree, n => n.type?.name === 'FoxyChatLayout')[0];
    descendants(layout.props.tools, n => n.type === 'button').find(n => renderToStaticMarkup(n).includes('Crear esquema')).props.onClick(); await view.flush();
    descendants(view.tree, n => n.type === 'textarea')[0].props.onChange({ target: { value: 'Relacionar agua y plantas' } }); await view.flush();
    descendants(view.tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await view.flush();
    assert.deepEqual(diagrams, ['Relacionar agua y plantas']); assert.equal(sent.length, 0);
  } finally { view.close(); }
});

import React from 'react';
import { loadTsModule } from "../../../../../../tests/helpers/load-ts-module.mjs";

for (const resolution of ['discard', 'save', 'cancel', 'creation-failure']) test(`first send through actual unsaved guard resolves once: ${resolution}`, async () => {
  const current = { id: randomUUID(), title: 'Anterior', context: { kind: 'GENERAL' } };
  const state = { capabilities: { textGeneration: { enabled: true } }, conversations: [current], current,
    turns: [], activeTurn: null, nextAfterSequence: null, pending: null, error: null, busy: false };
  const resource = { dirty: true, busy: false, pending: null, resource: { id: 'resource' }, status: 'ready', draft: { title: 'Editado', markdown: 'Texto' } };
  const calls = []; let refresh = () => {}, ui;
  const runtime = { getState: () => ({ closed: false, resource, chat: state }),
    chat: { async create(input) { calls.push('create'); if (resolution !== 'creation-failure') state.current = { id: randomUUID(), title: input.title, context: input.context }; refresh(); },
      async send() { calls.push('send'); return 'accepted'; } },
    resource: { discardAndClose() { resource.dirty = false; }, async save() { resource.dirty = false; return 'saved'; } } };
  const { createFoxyWorkspaceActions } = loadTsModule("apps/web/src/features/foxy/model/foxy-workspace-actions.ts");
  const actions = createFoxyWorkspaceActions({ runtime, onChange(value) { ui = value; refresh(); } });
  ui = actions.getState();
  const { FoxyWorkspace } = componentWithPorts("apps/web/src/features/foxy/ui/foxy-workspace.tsx", {});
  function BoundWorkspace() { const [, update] = React.useState(0); refresh = () => update(value => value + 1);
    return FoxyWorkspace({ controller: actions.chat, state, classrooms: [], creationBlocked: !!ui.leave }); }
  const view = hookView(BoundWorkspace, {});
  try {
    await view.flush();
    descendants(view.tree, n => n.type === 'button' && descendants(n, child => child.props?.name === 'plus').length)[0].props.onClick(); await view.flush();
    const textarea = () => descendants(view.tree, n => n.type === 'textarea')[0];
    textarea().props.onChange({ target: { value: 'Primer mensaje' } }); await view.flush();
    const submit = () => descendants(view.tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} });
    submit(); await view.flush(); assert.equal(ui.leave?.reason, 'unsaved'); assert.deepEqual(calls, []);
    if (resolution === 'cancel') actions.cancelLeave();
    else if (resolution === 'save') await actions.saveAndContinue();
    else await actions.discardAndContinue();
    await view.flush();
    assert.deepEqual(calls, resolution === 'cancel' ? [] : resolution === 'creation-failure' ? ['create'] : ['create', 'send']);
    assert.equal(textarea().props.value, resolution === 'cancel' || resolution === 'creation-failure' ? 'Primer mensaje' : '');
    if (resolution === 'cancel' || resolution === 'creation-failure') {
      resource.dirty = false; submit(); await view.flush();
      assert.equal(calls.filter(value => value === 'create').length, resolution === 'cancel' ? 1 : 2, 'cancel/failure releases composer for retry');
    }
  } finally { view.close(); actions.dispose(); }
});

test('diagram session callback rechecks live publication locks before changing kind, prompt or starting', async () => {
  const chat = { capabilities: { diagramGeneration: { enabled: true }, imageGeneration: { enabled: true } }, current: { id: randomUUID(), context: { kind: 'GENERAL' } },
    busy: false, pending: null, activeTurn: null, selection: { topicIds: [], sourceIds: [] } };
  const state = { chat, closed: false, classrooms: [], visual: { busy: false, pending: null, jobs: [] }, visualPublication: { busy: false, pending: null } };
  const calls = [], runtime = { getState: () => state, visual: { getState: () => state.visual,
    setKind(value) { calls.push(['kind', value]); }, setPrompt(value) { calls.push(['prompt', value]); },
    async start() { calls.push(['start']); state.visual.jobs.push({ id: randomUUID() }); } } };
  const { FoxyWorkspaceSession } = componentWithPorts("apps/web/src/screens/foxy-workspace-session.tsx", {"../application/foxy-workspace":{useFoxyWorkspace: () => ({ state, runtime, initializing: false })},
"../features/foxy/index.ts":{...componentWithPorts('apps/web/src/features/foxy/index.ts', {}),useFoxyWorkspaceActions: () => ({ actions: { chat: {} }, ui: { leave: null, openingResource: false } }),FoxyWorkspace: () => null,FoxyVisualWorkspace: () => null,FoxyVisualPublicationPanel: () => null},
"./foxy-resource-workspace":{FoxyResourceWorkspace: () => null}});
  const view = hookView(FoxyWorkspaceSession, { subjectId: randomUUID(), onIdentityRequired() {} });
  try {
    await view.flush(); const callback = descendants(view.tree, n => typeof n.props.onCreateDiagram === 'function')[0].props.onCreateDiagram;
    for (const field of ['busy', 'pending']) {
      state.visualPublication[field] = field === 'busy' ? true : { requestId: randomUUID() };
      assert.equal(await callback('Un esquema'), false); assert.deepEqual(calls, []);
      state.visualPublication[field] = field === 'busy' ? false : null;
    }
    assert.equal(await callback('Un esquema'), true);
    assert.deepEqual(calls, [['kind', 'DIAGRAM'], ['prompt', 'Un esquema'], ['start']]);
  } finally { view.close(); }
});
