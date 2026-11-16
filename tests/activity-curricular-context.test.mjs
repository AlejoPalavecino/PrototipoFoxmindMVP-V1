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
  objective: 'Comparar las explicaciones del tema', teacherBrief: 'Idea privada de generación',
  instructionFiles: [], materials: [], questions: [{ type: 'SINGLE_CHOICE', prompt: 'Choose.', points: '2', scoringRule: 'EXACT',
    options: [{ text: 'Answer A', correct: true }, { text: 'Answer B', correct: false }] }] };
function assertContext(html) {
  for (const label of ['Unidad curricular visible', 'Segundo tema visible', 'Primer tema visible']) assert.ok(html.includes(label), label);
  assert.ok(html.indexOf('Segundo tema visible') < html.indexOf('Primer tema visible'), 'Display preserves explicit activity topic order');
}
test('A05 activity detail preserves its unit and every selected topic in activity order', async () => {
  const { Activities } = loadTsModule('apps/web/src/application/academic-Activities.tsx');
  const view = hookView(Activities, { room, api: { call: async path => path.endsWith('/preview')?{activity}:{ activities: [activity] } }, reload: async () => {} });
  try {
    await view.flush(); const card = descendants(view.tree, n => n.type === 'article' && n.props['aria-label'] === activity.title)[0]; assert.ok(card);
    descendants(card,n=>n.type==='button'&&n.props['aria-label']===`Abrir ${activity.title}`)[0].props.onClick();await view.flush();
    const detail=descendants(view.tree,n=>n.type?.name==='AttemptHistory')[0];assert.equal(detail.props.activityPreview,activity);
    const {ActivityPreview}=loadTsModule('apps/web/src/application/academic-activity-preview.tsx');
    assertContext(renderToStaticMarkup(React.createElement(ActivityPreview,{api:{fileUrl:()=>''},room,activity:detail.props.activityPreview,teacher:true})));
  } finally { view.close(); }
});
test('A05 student consultation displays the instructions and curricular context without revealing questions before the attempt or their private keys', () => {
  const { ActivityPreview } = loadTsModule('apps/web/src/application/academic-activity-preview.tsx');
  const html = renderToStaticMarkup(React.createElement(ActivityPreview, { api: { fileUrl: () => '' }, room: { ...room, role: 'student' }, activity, teacher: false }));
  assertContext(html);
  assert.match(html, /aria-label="Consulta de actividad"/);
  assert.match(html, />Compare\.<\/p>/);
  assert.match(html, /Comparar las explicaciones del tema/);
  assert.doesNotMatch(html, /Choose\.|Answer A|Answer B|Idea privada de generación/);
  assert.doesNotMatch(html, /Correcta|Coincidencia exacta|scoringRule|checked|"correct"/i);
});
