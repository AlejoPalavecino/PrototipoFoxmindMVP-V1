import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Use the existing real-TSX render runner pattern: no emitted files, fake renderer or Git-history dependency.
const require = createRequire(import.meta.url), cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} }; cache.set(path, module);
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023,
  } });
  new Function('require', 'module', 'exports', outputText)(specifier => specifier.startsWith('.')
    ? load(resolve(dirname(path), specifier)) : require(specifier), module, module.exports);
  return module.exports;
}
const { AttemptSession } = load(resolve('apps/classrooms-ui/AttemptSession.tsx'));
const room = { id: 'a1111111-1111-4111-8111-111111111111' };
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

test('both activity types preserve safe read-only question/option overview before explicit start', () => {
  for (const type of ['QUESTIONNAIRE', 'EVALUATION']) {
    const data = initial(type), before = structuredClone(data), html = render(data);
    assert.match(html, /First &lt;script&gt;literal&lt;\/script&gt;\nquestion/);
    for (const text of ['Second question', 'Third question', 'Single &amp; first', 'Single second', 'Multiple first', 'Multiple second']) assert.ok(html.includes(text), text);
    assert.equal((html.match(/<h4>/g) ?? []).length, 3); assert.match(html, />Comenzar<\/button>/);
    assert.doesNotMatch(html, /<textarea|type="(?:radio|checkbox)"|Enviar respuestas|Reintentar guardado|Navegación de preguntas/);
    assert.doesNotMatch(html, /<script|correct|scoringRule|EXACT|PARTIAL|Selección confirmada/);
    assert.deepEqual(data, before, 'Read-only rendering must not create an attempt or alter the supplied projection');
  }
});

test('after explicit start, taking controls appear once without duplicating the pre-start overview', () => {
  for (const type of ['QUESTIONNAIRE', 'EVALUATION']) {
    const data = initial(type); data.canStart = false; data.canTransfer = true;
    data.editor = { token: 'a'.repeat(43), epoch: '1' };
    data.attempt = { id: 'attempt', number: 1, status: 'DRAFT', openedAt: data.serverTime, submittedAt: null,
      appliedDeadlineAt: null, submittedLate: null, epoch: '1', revision: '0', answers: [] };
    const html = render(data);
    assert.equal((html.match(/<h4>/g) ?? []).length, 1); assert.equal((html.match(/<textarea/g) ?? []).length, 1);
    assert.match(html, /Navegación de preguntas/); assert.match(html, /Enviar respuestas/);
    assert.doesNotMatch(html, /Single &amp; first|Multiple first|>Comenzar<\/button>|correct|scoringRule|EXACT|PARTIAL/);
  }
});
