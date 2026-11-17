import { authoringFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const id = '11111111-1111-4111-8111-111111111111', unitId = '22222222-2222-4222-8222-222222222222', topicId = '33333333-3333-4333-8333-333333333333';
const room = role => ({ id, revision: '2', role, archived: false, name: 'Ciencias', subject: 'Ciencias', aiGradingEnabled: false,
  division: 'A', academicYear: 2026, teacher: 'Docente', timezone: 'UTC', coverKey: 'explore', plans: [],
  units: [{ id: unitId, name: 'Unidad', topics: [{ id: topicId, name: 'Tema' }] }] });
const textOf = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(textOf).join(' ') : node?.props ? textOf(node.props.children) : '';
const button = (view, text) => descendants(view.tree, node => node.type === 'button' && textOf(node).includes(text))[0];
const field = (tree, pattern, kind) => descendants(tree, node => node.type === 'label' && pattern.test(textOf(node)))
  .flatMap(node => descendants(node, child => child.type === kind))[0];

async function roomView(role) {
  const { ClassroomView } = loadTsModule('apps/web/src/application/workflows/classroom-workspace/ClassroomWorkspace.tsx');
  const calls = [], api = { call: async (...args) => { calls.push(args); return args[0] === `/${id}` ? room(role) : []; } };
  const view = hookView(ClassroomView, { api, id, initialCode: null, onExit() {} }); await view.flush();
  return { view, calls };
}

test('guardar los datos del aula conserva la configuración de corrección IA sin añadir controles ajenos a la maqueta', async () => {
  const { ClassroomSettings } = loadTsModule('apps/web/src/features/classrooms/settings/ClassroomSettings.tsx');
  for (const aiGradingEnabled of [false, true]) {
    const calls = [];
    const view = hookView(ClassroomSettings, {
      api: { call: async (...args) => { calls.push(args); return { revision: '3' }; } }, id,
      room: { ...room('teacher'), aiGradingEnabled, aiGradingAvailable: true },
      settings: { name: 'Ciencias actualizada', subject: 'Ciencias', division: 'A', academicYear: 2026, coverKey: 'explore', aiGradingEnabled },
      setSettings() {}, settingsRevision: '2', setSettingsRevision() {},
      settingsConflict: false, setSettingsConflict() {}, reloadSettings: async () => {},
      isCurrentRoom: () => true, busy: false, load: async () => {}, action: async work => work(), setNotice() {}, setConfirm() {},
    });
    try {
      await view.flush();
      assert.equal(field(view.tree, /correcci[oó]n.*IA/i, 'input'), undefined);
      const form = descendants(view.tree, n => n.type === 'form')[0]; assert.ok(form);
      form.props.onSubmit({ preventDefault() {} }); await view.flush();
      assert.deepEqual(calls, [[`/${id}/settings`, 'PATCH', {
        name: 'Ciencias actualizada', subject: 'Ciencias', division: 'A', academicYear: 2026,
        coverKey: 'explore', aiGradingEnabled, revision: '2',
      }]]);
    } finally { view.close(); }
  }
});

test('alumno no puede acceder al interruptor docente', async () => {
  const { view } = await roomView('student');
  try { assert.equal(button(view, 'Configuración'), undefined); assert.equal(field(view.tree, /correcci[oó]n.*IA/i, 'input'), undefined); }
  finally { view.close(); }
});

test('autoría conserva la rúbrica privada histórica sin exponer un campo ausente de la maqueta', async () => {
  const { ActivityAuthoring } = loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx');
  const calls = [], activity = { id: '44444444-4444-4444-8444-444444444444', type: 'ASSIGNMENT', title: 'Trabajo', status: 'DRAFT',
    unitId, topicId, topicIds: [topicId], instructions: 'Resolver', aiGradingRubric: 'Valorar la justificación', attachmentRequired: false, questions: [],
    instructionFiles: [], materials: [], deadlineAt: null, allowLate: false, locked: false };
  const view = hookView(ActivityAuthoring, authoringFixtureProps('ActivityAuthoring', { api: { call: async (...args) => { calls.push(args); return { revision: '3' }; } },
    room: room('teacher'), data: { revision: '2', activity }, materials: [], onSaved: async () => {}, onClose() {} }));
  try {
    await view.flush(); assert.equal(field(view.tree, /r[uú]brica/i, 'textarea'),undefined);
    const form = descendants(view.tree, n => n.type === 'form')[0]; form.props.onSubmit({ preventDefault() {} }); await view.flush();
    assert.equal(calls[0][2].operation.payload.aiGradingRubric, 'Valorar la justificación');
  } finally { view.close(); }
});

test('vista del alumno no renderiza la rúbrica docente', () => {
  const { ActivityPreview } = loadTsModule('apps/web/src/application/workflows/activity-session/ActivityPreview.tsx');
  const activity = { type: 'ASSIGNMENT', title: 'Trabajo', aiGradingRubric: 'Criterio privado docente', deadlineAt: null, zone: 'UTC',
    instructions: 'Resolver', attachmentRequired: false, instructionFiles: [], materials: [], questions: [], topicIds: [] };
  const html = renderToStaticMarkup(React.createElement(ActivityPreview, { api: { fileUrl: () => '' }, room: room('student'), teacher: false, activity }));
  assert.doesNotMatch(html, /Criterio privado docente/);
});
