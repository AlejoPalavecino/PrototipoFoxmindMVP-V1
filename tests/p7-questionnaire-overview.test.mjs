import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Resolve extensionless shared UI imports with the repository's real-source loader.
const { AttemptSession } = loadTsModule('apps/web/src/application/workflows/activity-session/AttemptSession.tsx');
const room = { id: 'a1111111-1111-4111-8111-111111111111', units: [] };
const questions = [
  { id: 'development', type: 'DEVELOPMENT', prompt: 'First <script>literal</script>\nquestion', points: '2', options: [] },
  { id: 'single', type: 'SINGLE_CHOICE', prompt: 'Second question', points: '3', scoringRule: 'EXACT',
    options: [{ id: 'single-first', text: 'Single & first', correct: true }, { id: 'single-second', text: 'Single second', correct: false }] },
  { id: 'multiple', type: 'MULTIPLE_CHOICE', prompt: 'Third question', points: '5', scoringRule: 'PARTIAL',
    options: [{ id: 'multiple-first', text: 'Multiple first', correct: true }, { id: 'multiple-second', text: 'Multiple second', correct: true }] },
];
function initial(type) {
  return { activity: { id: 'activity', title: type, type, zone: 'UTC', instructions: 'Existing instructions', instructionFiles: [], materials: [], questions },
    expected: true, eligibilityReason: 'INITIAL_ENROLLMENT', archived: false, serverTime: '2026-10-18T12:00:00Z',
    reception: { deadlineAt: null, open: true, late: false }, canStart: true, canTransfer: false, attempt: null };
}
function render(data) {
  let calls = 0;
  const api = { call: async () => { calls++; throw Error('Render must not call the API'); },
    attempt: async () => { calls++; throw Error('Render must not start or mutate'); }, fileUrl: () => '' };
  const html = renderToStaticMarkup(React.createElement(AttemptSession, { api, room, initial: data, onClose: () => {}, onChanged: async () => {} }));
  assert.equal(calls, 0); return html;
}
test('response sheet shows the effective individual deadline instead of the general classroom deadline',()=>{
 const data=initial('QUESTIONNAIRE');data.activity.deadlineAt='2026-06-01T18:00:00Z';data.reception.deadlineAt='2026-11-12T19:00:00Z';
 const html=render(data);assert.match(html,/12 nov, 19:00/);assert.doesNotMatch(html,/1 jun, 18:00/);
});

test('consultation preserves individual deadlines, explicit no deadline and general fallback in the classroom zone',()=>{
 const {AttemptHistory}=loadTsModule('apps/web/src/application/workflows/activity-session/AttemptHistory.tsx');
 const activity={...initial('ASSIGNMENT').activity,deadlineAt:'2026-06-01T18:00:00Z',zone:'America/Argentina/Buenos_Aires'};
 const preview=effectiveDeadlineAt=>renderToStaticMarkup(React.createElement(AttemptHistory,{api:{fileUrl:()=>''},
   room:{...room,role:'student'},activityId:activity.id,activityPreview:activity,effectiveDeadlineAt,onClose(){}}));
 for (const [effective, label] of [
   ['2026-11-12T19:00:00Z', /12 nov 2026, 16:00/],
   [null, /Sin fecha límite/],
   [undefined, /1 jun 2026, 15:00/],
 ]) {
   const html=preview(effective);
   const heading=html.match(/<header class="parity-participation-heading[^"]*"[^>]*>(.*?)<\/header>/s)?.[1];
   assert.ok(heading,'Deadline belongs to the consultation heading');
   assert.match(heading,label);
   assert.match(heading,/America\/Argentina\/Buenos_Aires/);
   if (effective !== undefined) assert.doesNotMatch(heading,/1 jun/);
   assert.match(html,/Existing instructions/);
   assert.doesNotMatch(html,/First &lt;script|Second question|Single &amp; first|correct|scoringRule|EXACT|PARTIAL/);
 }
});

test('both activity types preserve safe read-only question/option overview before explicit start', () => {
  for (const type of ['QUESTIONNAIRE', 'EVALUATION']) {
    const data = initial(type), before = structuredClone(data), html = render(data);
    assert.match(html, /First &lt;script&gt;literal&lt;\/script&gt;\nquestion/);
    for (const text of ['Second question', 'Third question', 'Single &amp; first', 'Single second', 'Multiple first', 'Multiple second']) assert.ok(html.includes(text), text);
    assert.equal((html.match(/<article><h4>Pregunta/g) ?? []).length, 3); assert.match(html, />Comenzar<\/button>/);
    assert.doesNotMatch(html, /<textarea|type="(?:radio|checkbox)"|Enviar respuestas|Reintentar guardado|Navegación de preguntas/);
    assert.doesNotMatch(html, /<script|correct|scoringRule|EXACT|PARTIAL|Selección confirmada/);
    assert.deepEqual(data, before, 'Read-only rendering must not create an attempt or alter the supplied projection');
  }
});

test('after explicit start, only the current question appears with navigation and taking controls', () => {
  for (const type of ['QUESTIONNAIRE', 'EVALUATION']) {
    const data = initial(type); data.canStart = false; data.canTransfer = true;
    data.editor = { token: 'a'.repeat(43), epoch: '1' };
    data.attempt = { id: 'attempt', number: 1, status: 'DRAFT', openedAt: data.serverTime, submittedAt: null,
      appliedDeadlineAt: null, submittedLate: null, epoch: '1', revision: '0', answers: [] };
    const html = render(data);
    assert.equal((html.match(/aria-label="Pregunta 1"/g) ?? []).length, 1);
    assert.equal((html.match(/<textarea/g) ?? []).length, 1);
    assert.match(html, /Revisar entrega/);
    assert.match(html, />Guardar y salir<\/button>/);
    assert.match(html, /Borrador guardado/);
    assert.match(html, /aria-label="Preguntas"/);
    for (const index of [1, 2, 3]) assert.match(html, new RegExp(`aria-label="Pregunta ${index}, sin responder"`));
    assert.doesNotMatch(html, /Second question|Third question|Single &amp; first|Multiple first|>Comenzar<\/button>|correct|scoringRule|EXACT|PARTIAL/);
  }
});
