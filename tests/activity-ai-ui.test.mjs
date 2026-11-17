import { authoringFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
const room = { id: '11111111-1111-4111-8111-111111111111', revision: '2', role: 'teacher', archived: false, name: 'Luz',
  subject: 'Arte', division: 'A', academicYear: 2026, teacher: 'Synthetic Teacher', timezone: 'UTC', coverKey: 'explore', plans: [],
  units: [{ id: '22222222-2222-4222-8222-222222222222', name: 'Luz', topics: [
    { id: '33333333-3333-4333-8333-333333333333', name: 'Exposición' }, { id: '44444444-4444-4444-8444-444444444444', name: 'Contraste' }] }] };
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

test('A5 only a teacher in an active classroom can choose manual or Foxy authoring', async () => {
  const { Activities } = loadTsModule('apps/web/src/application/workflows/activity-session/Activities.tsx');
  const calls = [], props = { api: { call: async (path, method) => {
    calls.push([path, method]);
    if (path.endsWith('/library')) return [];
    if (path.endsWith('/progress')) return { scope: 'classroom', students: [] };
    return { activities: [] };
  } }, room, reload: async () => {} };
  const html = render(Activities, props);
  assert.match(html, /Crear actividad/); assert.doesNotMatch(html, /Manualmente|Con ayuda de Foxy/);
  const view = hookView(Activities, props);
  try {
    await view.flush();
    button(view, 'Crear actividad').props.onClick();
    await view.flush();
    const editor = descendants(view.tree, node => node.type?.name === 'ActivityAuthoring')[0];
    assert.ok(editor, 'Creating opens the scope step in the shared editor');
    const wizard = hookView(editor.type, editor.props);
    try {
      await wizard.flush();
      const choices = descendants(wizard.tree, node => node.type === 'label' &&
        descendants(node, input => input.type === 'input' && input.props.name === 'activity-method').length);
      assert.equal(choices.length, 2);
      assert.match(textOf(choices[0]), /Manualmente/);
      assert.match(textOf(choices[1]), /Con ayuda de Foxy/);
      descendants(choices[1], node => node.type === 'input')[0].props.onChange();
      await wizard.flush();
      assert.ok(descendants(wizard.tree, node => node.type === 'label' && textOf(node).includes('Tu idea para Foxy')).length);
      button(wizard, 'Ajustes y fuentes').props.onClick();
      await wizard.flush();
      assert.ok(calls.some(([path, method]) => path.endsWith('/activity-generations/sources') && method === 'GET'));
      assert.ok(calls.every(([, method]) => method === 'GET'), 'Opening and choosing Foxy with optional settings never starts generation');
    } finally { wizard.close(); }
  } finally { view.close(); }
  for (const scope of [{ ...room, role: 'student' }, { ...room, archived: true }]) {
    const denied = hookView(Activities, { ...props, room: scope, openAuthoring: true });
    try {
      await denied.flush();
      assert.equal(descendants(denied.tree, n => n.type?.name === 'ActivityAuthoring' || n.type?.name === 'ActivityGeneration').length, 0);
      assert.equal(descendants(denied.tree, n => n.type === 'button' && textOf(n).includes('Crear actividad')).length, 0);
    } finally { denied.close(); }
  }
});

test('A5 generation form opens with explicit pedagogical controls and performs no consumption on render', async () => {
  const { ActivityGeneration } = loadTsModule('apps/web/src/features/activity-authoring/generation/ActivityGeneration.tsx');
  const calls = [], props = { room, api: { call: async (...args) => {
    calls.push(args); return args[0].endsWith('/sources') ? { revision: room.revision, sources: [] } : { jobs: [] };
  } }, onApplied: async () => {}, onClose() {} };
  const html = render(ActivityGeneration, props);
  for (const label of [/Tu idea para Foxy/i, /Objetivo/i, /Nivel/i, /Dificultad/i, /Duración/i, /Contexto/i, /Generar propuesta/i]) assert.match(html, label);
  assert.equal(calls.length, 0);
  const view = hookView(ActivityGeneration, authoringFixtureProps('ActivityGeneration', props));
  try {
    await view.flush();
    const base = `/${room.id}/activity-generations`;
    assert.deepEqual(calls.map(([path, method]) => [path, method]), [[`${base}/sources`, 'GET'], [base, 'GET']],
      'Opening only reads available sources and recent jobs');
  } finally { view.close(); }
});

test('D1 manual editor exposes every selected topic and saves the ordered list instead of dropping secondary topics', async () => {
  const { ActivityAuthoring } = loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx');
  const calls = [], topicIds = room.units[0].topics.map(x => x.id), activity = { id: '55555555-5555-4555-8555-555555555555', type: 'ASSIGNMENT',
    title: 'Integrative', status: 'DRAFT', unitId: room.units[0].id, topicId: topicIds[0], topicIds, instructions: 'Compare.',
    attachmentRequired: false, questions: [], instructionFiles: [], materials: [], deadlineAt: null, allowLate: false, locked: false };
  const view = hookView(ActivityAuthoring, authoringFixtureProps('ActivityAuthoring', { api: { call: async (...args) => { calls.push(args); return { revision: '3' }; } },
    room, data: { revision: '2', activity }, materials: [], onSaved: async () => {}, onClose() {} }));
  try {
    await view.flush();
    const tree = view.tree, multi = descendants(tree, n => n.type === 'select' && n.props.multiple);
    const assignment = descendants(tree, n => n.type?.name === 'ActivityAssignment')[0];
    const assignmentView = assignment ? hookView(assignment.type, assignment.props) : null;
    await assignmentView?.flush();
    const topicChecks = descendants(assignmentView?.tree ?? tree, n => n.type === 'input' && n.props.type === 'checkbox' && n.props.checked === true);
    assignmentView?.close();
    assert.ok(multi.length > 0 || topicChecks.length >= 2, 'Both topics are represented by a real multi-select control');
    const form = descendants(tree, n => n.type === 'form')[0]; assert.ok(form);
    form.props.onSubmit({ preventDefault() {} }); await view.flush();
    assert.equal(calls.length, 1); assert.deepEqual(calls[0][2].operation.payload.topicIds, topicIds);
    assert.equal(calls[0][0], `/${room.id}/activities`);
  } finally { view.close(); }
});

const readyProposal = title => ({ schemaVersion: 'activity-proposal-v1', type: 'QUESTIONNAIRE', title, objective: 'Comparar', instructions: 'Elegir.',
  assignmentPrompts: [], questions: [{ type: 'SINGLE_CHOICE', prompt: '¿Cuál corresponde?', points: '2.50', scoringRule: 'EXACT',
    options: [{ text: 'Exposición', correct: true }, { text: 'Contraste', correct: false }] }],
  evidence: [{ item: 'question', index: 0, references: [{ sourceId: 'teacher-context', page: null }] }], warnings: [] });
const readyJob = (id, title) => ({ id, classroomId: room.id, baseRevision: room.revision, state: 'READY', type: 'QUESTIONNAIRE',
  unitId: room.units[0].id, topicIds: [room.units[0].topics[0].id], proposal: readyProposal(title), error: null, retryable: false,
  missingInformation: [], sourceReport: [], appliedActivityId: null, createdAt: '2026-10-25T12:00:00Z' });
const textOf = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(textOf).join(' ') : node?.props ? textOf(node.props.children) : '';
const button = (view, label) => {
  const found = descendants(view.tree, n => n.type === 'button' && textOf(n).includes(label))[0]; assert.ok(found, label); return found;
};
async function recoveredGeneration() {
  const { ActivityGeneration } = loadTsModule('apps/web/src/features/activity-authoring/generation/ActivityGeneration.tsx');
  const jobs = [readyJob('55555555-5555-4555-8555-555555555555', 'Original'), readyJob('66666666-6666-4666-8666-666666666666', 'Nueva propuesta')], calls = [], applied = [];
  const api = { call: async (...args) => { calls.push(args); const [path, method] = args;
    if (path.endsWith('/sources')) return { revision: room.revision, sources: [] };
    if (path.endsWith('/apply')) return { generationId: jobs[0].id, activityId: 'created-draft', revision: '3' };
    if (method === 'GET' && path.endsWith('/activity-generations')) return { jobs };
    return jobs.find(job => path.endsWith(job.id));
  } };
  const view = hookView(ActivityGeneration, authoringFixtureProps('ActivityGeneration', { room, api, onApplied: async id => applied.push(id), onClose() {} })); await view.flush();
  return { view, jobs, calls, applied };
}

async function recover(view, index = 0) {
  button(view, 'Generaciones recientes').props.onClick(); await view.flush();
  const options = descendants(view.tree, n => n.type === 'button' && textOf(n).includes('Recuperar generación'));
  assert.ok(options[index]);
  options[index].props.onClick(); await view.flush();
}

test('A5 recovery and reviewed local edits apply explicitly, preserve private keys and never call publish', async () => {
  const f = await recoveredGeneration();
  try {
    await recover(f.view);
    const editor = descendants(f.view.tree, n => n.type?.name === 'ActivityGenerationProposal')[0]; assert.ok(editor);
    editor.props.update({ ...editor.props.proposal, title: 'Título docente editado', questions: [{ ...editor.props.proposal.questions[0], points: '4.25' }] }); await f.view.flush();
    assert.equal(f.calls.filter(([, method]) => method === 'POST').length, 0);
    button(f.view, 'Usar propuesta revisada como borrador').props.onClick(); await f.view.flush();
    const apply = f.calls.find(([path]) => path.endsWith('/apply')); assert.ok(apply);
    assert.equal(apply[2].proposal.title, 'Título docente editado'); assert.equal(apply[2].proposal.questions[0].points, '4.25');
    assert.equal(apply[2].proposal.questions[0].options[0].correct, true); assert.deepEqual(f.applied, ['created-draft']);
    assert.equal(f.calls.some(([path]) => path.includes('/publish')), false);
  } finally { f.view.close(); }
});

test('A5 loading another result preserves dirty local edits until explicit replacement consent', async () => {
  const f = await recoveredGeneration();
  try {
    await recover(f.view);
    let editor = descendants(f.view.tree, n => n.type?.name === 'ActivityGenerationProposal')[0];
    editor.props.update({ ...editor.props.proposal, title: 'Mi edición' }); await f.view.flush();
    await recover(f.view, 1);
    editor = descendants(f.view.tree, n => n.type?.name === 'ActivityGenerationProposal')[0]; assert.equal(editor.props.proposal.title, 'Mi edición');
    button(f.view, 'Revisar esta propuesta').props.onClick(); await f.view.flush();
    editor = descendants(f.view.tree, n => n.type?.name === 'ActivityGenerationProposal')[0]; assert.equal(editor.props.proposal.title, 'Mi edición');
    button(f.view, 'Reemplazar ediciones').props.onClick(); await f.view.flush();
    editor = descendants(f.view.tree, n => n.type?.name === 'ActivityGenerationProposal')[0]; assert.equal(editor.props.proposal.title, 'Nueva propuesta');
    assert.equal(f.calls.some(([, method]) => method === 'POST'), false);
  } finally { f.view.close(); }
});

test('A5 student preview renders prompts/options/points without any answer-key controls or rule', async () => {
  const { ActivityGenerationProposal } = loadTsModule('apps/web/src/features/activity-authoring/generation/ActivityGenerationProposal.tsx');
  const view = hookView(ActivityGenerationProposal, { proposal: readyProposal('Vista privada'), update() {}, disabled: false });
  try {
    await view.flush(); button(view, 'Previsualizar como estudiante').props.onClick(); await view.flush();
    const preview = descendants(view.tree, n => n.props['aria-label'] === 'Vista estudiante de propuesta')[0]; assert.ok(preview);
    const html = renderToStaticMarkup(preview);
    assert.match(html, /Exposición/); assert.match(html, /Contraste/); assert.match(html, /2.50 puntos/);
    assert.doesNotMatch(html, /Correcta|EXACT|PARTIAL|checked|checkbox|scoringRule|correct/i);
  } finally { view.close(); }
});
