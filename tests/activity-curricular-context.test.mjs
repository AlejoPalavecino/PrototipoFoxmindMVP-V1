import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
const room = { id: 'room', revision: '3', role: 'teacher', archived: false, timezone: 'UTC', plans: [], units: [
  { id: 'unit', name: 'Unidad curricular visible', topics: [{ id: 'first', name: 'Primer tema visible' }, { id: 'second', name: 'Segundo tema visible' }] }] };
const activity = { id: 'activity', type: 'QUESTIONNAIRE', title: 'Integrative activity', status: 'PUBLISHED', unitId: 'unit', topicId: 'second',
  topicIds: ['second', 'first'], instructions: 'Compare.', zone: 'UTC', deadlineAt: null, allowLate: false, locked: false, attachmentRequired: false,
  instructionFiles: [], materials: [], questions: [{ type: 'SINGLE_CHOICE', prompt: 'Choose.', points: '2', scoringRule: 'EXACT',
    options: [{ text: 'Answer A', correct: true }, { text: 'Answer B', correct: false }] }] };
function assertContext(html) {
  for (const label of ['Unidad curricular visible', 'Segundo tema visible', 'Primer tema visible']) assert.ok(html.includes(label), label);
  assert.ok(html.indexOf('Segundo tema visible') < html.indexOf('Primer tema visible'), 'Display preserves explicit activity topic order');
}
test('A05 activity detail preserves its unit and every selected topic in activity order', async () => {
  const { Activities } = loadTsModule('apps/classrooms-ui/Activities.tsx');
  const view = hookView(Activities, { room, api: { call: async path => path.endsWith('/preview')?{activity}:{ activities: [activity] } }, reload: async () => {} });
  try {
    await view.flush(); const card = descendants(view.tree, n => n.type === 'article' && n.props['aria-label'] === activity.title)[0]; assert.ok(card);
    descendants(card,n=>n.type==='button'&&n.props['aria-label']===`Abrir ${activity.title}`)[0].props.onClick();await view.flush();
    const detail=descendants(view.tree,n=>n.type?.name==='AttemptHistory')[0];assert.equal(detail.props.activityPreview,activity);
    const {ActivityPreview}=loadTsModule('apps/classrooms-ui/ActivityAuthoring.tsx');
    assertContext(renderToStaticMarkup(React.createElement(ActivityPreview,{api:{fileUrl:()=>''},room,activity:detail.props.activityPreview,teacher:true})));
  } finally { view.close(); }
});
test('A05 student preview displays curricular context while withholding correct answers and scoring rules', () => {
  const { ActivityPreview } = loadTsModule('apps/classrooms-ui/ActivityAuthoring.tsx');
  const html = renderToStaticMarkup(React.createElement(ActivityPreview, { api: { fileUrl: () => '' }, room, activity, teacher: false }));
  assertContext(html); assert.match(html,/1 pregunta/); assert.doesNotMatch(html,/Answer A|Answer B/);
  assert.doesNotMatch(html, /Correcta|Coincidencia exacta|scoringRule|checked|"correct"/i);
});
