import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createStudyFlashcardResource } from '../application/studyFlashcardGeneration';
import { createStudyQuizResource } from '../application/studyQuizGeneration';
import { createStudyConceptMapResource } from '../application/studyConceptMapGeneration';
import { createStudySummaryResource } from '../application/studySummaryGeneration';
import { chatBaseline, chatBlock, responseBlock, restoreStudyChatResponse, workspacePath } from './restoreStudyChatResponse';

const live = readFileSync(workspacePath, 'utf8');
const restored = restoreStudyChatResponse(live);
const helperUrl = new URL('../application/studyChatResponse.ts', import.meta.url);
const helperExists = existsSync(helperUrl);
const factories = { createStudyFlashcardResource, createStudyQuizResource, createStudyConceptMapResource, createStudySummaryResource };
const blockFunction = (block: string) => `function decideStudyChatResponse(query, folder, agentMode, setCanvasDocument, onSaveResourceToLibrary) {\n${block}\nreturn { aiResponseText, generatedTool, suggestedActions };\n}`;
const compile = (source: string) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const oracleCode = compile(blockFunction(chatBlock));
const liveCode = compile(blockFunction(responseBlock(restored.replace(/\r\n/g, '\n'))));
const helperCode = helperExists ? compile(readFileSync(helperUrl, 'utf8')) : '';
function observe(code: string, query: string, mode: string, effect = '') {
  const events: string[] = [];
  const ports: Record<string, unknown> = {};
  for (const [name, factory] of Object.entries(factories)) {
    ports[name] = (folder: Parameters<typeof factory>[0]) => {
      events.push(name);
      return factory(folder);
    };
  }
  const context = { ...ports, exports: {}, require: (path: string) => {
    assert.ok(/^\.\/study(Flashcard|Quiz|ConceptMap|Summary)Generation$/.test(path));
    return ports;
  } };
  runInNewContext(code, context);
  const decide = runInNewContext('typeof decideStudyChatResponse === "function" ? decideStudyChatResponse : exports.decideStudyChatResponse', context);
  const folder = { id: 'f1', get name() { events.push('name'); return 'Biología'; },
    get topics() { events.push('topics'); return [{ name: 'Célula' }]; } };
  let canvas: any, saved: any, result: any, error: string | undefined;
  const previous = Date.now;
  let ticks = 0;
  Date.now = () => { events.push('clock'); return 1700000000000 + ++ticks; };
  try {
    result = decide(query, folder, mode, (document: any) => {
      events.push('canvas'); canvas = document;
      if (effect === 'mutate') document.resource.title = 'Mutado en canvas';
      if (effect === 'canvas throw') throw new Error('canvas failure');
    }, (resource: any) => {
      events.push('save'); saved = resource;
      assert.equal(resource, canvas.resource);
      if (effect === 'save throw') throw new Error('save failure');
    });
    events.push('caller AI clock'); Date.now(); events.push('caller update');
    if (result.generatedTool) {
      assert.equal(result.generatedTool, saved);
      assert.equal(result.generatedTool, canvas.resource);
    } else assert.equal(canvas, undefined);
  } catch (caught) { error = (caught as Error).message; }
  finally { Date.now = previous; }
  return JSON.parse(JSON.stringify({ result, canvas, saved, events, error, ticks }));
}
const cases: [string, string, string][] = [
  ['FLASHCARDS quiz mapa resumen', 'socratico', 'Flashcard'], ['tarjeta', 'explicador', 'Flashcard'],
  ['quiz mapa resumen', 'riguroso', 'Quiz'], ['evaluacion', 'socratico', 'Quiz'], ['cuestionario', 'socratico', 'Quiz'],
  ['mapa resumen', 'socratico', 'ConceptMap'], ['red', 'socratico', 'ConceptMap'],
  ['RESUMEN', 'socratico', 'Summary'], ['sintesis', 'socratico', 'Summary'],
  ...['socratico', 'explicador', 'riguroso', 'resumidor'].map(mode => ['guia /plan consulta', mode, ''] as [string, string, string])
];
function characterize(code: string) {
  for (const [query, mode, branch] of cases) {
    const actual = observe(code, query, mode);
    assert.deepEqual(actual, observe(oracleCode, query, mode), `${query}/${mode}: exact Spanish response/actions/canvas`);
    assert.deepEqual(actual.events.filter((event: string) => event.startsWith('createStudy')),
      branch ? [`createStudy${branch}Resource`] : [], 'only matched factory, exactly once');
    assert.equal(actual.ticks, branch ? 3 : 1);
    assert.deepEqual(actual.events.slice(branch ? -5 : -3), branch
      ? ['canvas', 'save', 'caller AI clock', 'clock', 'caller update']
      : ['caller AI clock', 'clock', 'caller update']);
    assert.equal(actual.events.filter((event: string) => event === 'save').length, branch ? 1 : 0);
    for (const effect of branch ? ['mutate', 'canvas throw', 'save throw'] : []) {
      const changed = observe(code, query, mode, effect);
      assert.deepEqual(changed, observe(oracleCode, query, mode, effect), effect);
      if (effect === 'mutate') assert.equal(changed.saved.title, 'Mutado en canvas');
      else {
        assert.equal(changed.events.at(-1), effect === 'canvas throw' ? 'canvas' : 'save');
        assert.equal(changed.result, undefined);
      }
    }
  }
}
test('immutable branch characterization: priority, Spanish outputs, identities, clocks/getters and ordered throwing ports', () => characterize(oracleCode));
test('live branch characterization BEFORE/AFTER with strict immutable full-source inverse', () => {
  assert.equal(restored, chatBaseline.replace(/\n/g, '\r\n'));
  characterize(liveCode);
});
test('extracted response operation parity against immutable branch', { skip: !helperExists }, () => characterize(helperCode));
test('strict inverse rejects partial extraction and unrelated timer/controller/newline changes', () => {
  for (const source of [live.replace('1100', '1101'), live.replace('setIsThinking(false);', ''),
    live.replace(/\r\n/, '\n'), live.replace('import React', 'import { decideStudyChatResponse } from "unexpected";\r\nimport React')]) {
    assert.throws(() => restoreStudyChatResponse(source));
  }
});
