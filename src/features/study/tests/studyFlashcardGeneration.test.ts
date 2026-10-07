import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import type { StudyGeneratedResource } from '../../../views/alumno/estudio/estudioTypes';

const workspacePath = 'src/views/alumno/estudio/StudyChatWorkspace.tsx';
const baseline = execFileSync('git', [
  'show', 'f40d725bf613ad9fc846165ae0d3b36120743eb4:' + workspacePath
], { encoding: 'utf8' });
const candidate = readFileSync(workspacePath, 'utf8');
const operationsUrl = new URL('../application/studyFlashcardGeneration.ts', import.meta.url);
const helperExists = existsSync(operationsUrl);
const operations = helperExists ? await import(operationsUrl.href) : undefined;
const newline = baseline.includes('\r\n') ? '\r\n' : '\n';
const declarationPrefix = '        const newDeckResource: StudyGeneratedResource = ';
const start = baseline.indexOf(declarationPrefix);
const end = baseline.indexOf(newline + newline + '        aiResponseText = ', start);
assert.ok(start > 0 && end > start);
assert.equal(baseline.indexOf(declarationPrefix, start + 1), -1);
const originalDeclaration = baseline.slice(start, end);
const literal = originalDeclaration.slice(declarationPrefix.length, -1);
assert.ok(literal.startsWith('{') && literal.endsWith('}'));
assert.ok(literal.length < 5000, 'evaluate only the bounded immutable flashcard literal');
assert.equal(literal.match(/Date\.now\(\)/g)?.length, 2);
assert.equal(literal.match(/folder\.topics\?\.\[0\]\?\.name \|\| folder\.name/g)?.length, 3);

type Folder = { id: string; name: string; topics?: readonly { name: string }[] };
type Factory = (folder: Folder) => StudyGeneratedResource;
// No controller/TSX evaluation or runtime imports: the oracle is just this literal.
const oracle = new Function('folder', `return (${literal});`) as Factory;
function withClocks<T>(run: () => T, events?: string[]): T {
  const previous = Date.now;
  const ticks = [1700000000001, 1700000000002];
  let calls = 0;
  Date.now = () => {
    events?.push('clock');
    assert.ok(calls < ticks.length, 'exactly two independent clock reads');
    return ticks[calls++];
  };
  try {
    const result = run();
    assert.equal(calls, 2);
    return result;
  } finally {
    Date.now = previous;
  }
}
const cases: [string, Folder, string][] = [
  ['first topic', { id: 'folder-1', name: 'Biología', topics: [{ name: 'Célula' }, { name: 'ignored' }] }, 'Célula'],
  ['missing topics', { id: 'folder-2', name: 'Historia' }, 'Historia'],
  ['empty topics', { id: 'folder-3', name: 'Álgebra', topics: [] }, 'Álgebra'],
  ['falsy first topic', { id: 'folder-4', name: 'Física', topics: [{ name: '' }, { name: 'ignored' }] }, 'Física'],
  ['empty folder name', { id: '', name: '' }, '']
];
function assertPayload(factory: Factory) {
  for (const [label, folder, topic] of cases) {
    const expected = withClocks(() => oracle(folder));
    const resource = withClocks(() => factory(folder));
    assert.deepEqual(resource, expected, label);
    assert.equal(resource.id, 'res-fc-1700000000001');
    assert.equal(resource.title, `Flashcards de Active Recall: ${folder.name}`);
    assert.equal(resource.type, 'flashcards');
    assert.equal(resource.folderId, folder.id);
    assert.equal(resource.folderName, folder.name);
    assert.equal(resource.topic, topic);
    assert.equal(resource.description, 'Mazo de tarjetas de memorización activa con preguntas y pistas.');
    assert.equal(resource.createdAt, 'Justo ahora');
    assert.equal(resource.fileSize, '4 tarjetas');
    assert.equal(resource.fileFormat, 'FLASHCARDS');
    const deck = resource.data!.flashcardDeck!;
    assert.equal(deck.id, 'deck-1700000000002');
    assert.equal(deck.title, `Flashcards: ${folder.name}`);
    assert.equal(deck.folderId, folder.id);
    assert.equal(deck.folderName, folder.name);
    assert.equal(deck.topic, topic);
    assert.equal(deck.masteryPercentage, 0);
    assert.equal(deck.createdAt, 'Hoy');
    assert.deepEqual(deck.cards, [
      {
        id: 'fc-dyn-1', front: `¿Cuál es el concepto nuclear de ${topic}?`,
        back: 'La base conceptual radica en comprender las relaciones fundamentales y la aplicación práctica de sus principios.',
        hint: 'Pensá en la definición introductoria que vimos en clase.', mastered: false
      },
      {
        id: 'fc-dyn-2', front: '¿Cuáles son los 3 factores determinantes en este proceso?',
        back: '1. Estructura básica\n2. Dinámica funcional\n3. Impacto en el resultado final',
        hint: 'Recordá el desglose en 3 etapas.', mastered: false
      },
      {
        id: 'fc-dyn-3', front: '¿Qué error común se suele cometer al resolver este tipo de problemas?',
        back: 'Omitir la verificación paso a paso y no contrastar con la hipótesis inicial.',
        hint: 'Foco en la autoevaluación.', mastered: false
      }
    ]);
  }
}
function assertEvaluationOrder(factory: Factory) {
  const events: string[] = [];
  let reads = 0;
  const folder: Folder = {
    id: 'folder', name: 'Fallback',
    get topics() {
      events.push('topic');
      return [{ name: `Read ${++reads}` }];
    }
  };
  const resource = withClocks(() => factory(folder), events);
  assert.deepEqual(events, ['clock', 'topic', 'clock', 'topic', 'topic']);
  assert.equal(resource.topic, 'Read 1');
  assert.equal(resource.data!.flashcardDeck!.topic, 'Read 2');
  assert.equal(resource.data!.flashcardDeck!.cards[0].front, '¿Cuál es el concepto nuclear de Read 3?');
}
function assertFresh(factory: Factory) {
  const seen = new Set<object>();
  for (const [, folder] of [...cases, ...cases]) {
    folder.topics?.forEach(Object.freeze);
    if (folder.topics) Object.freeze(folder.topics);
    Object.freeze(folder);
    const snapshot = JSON.stringify(folder);
    const resource = withClocks(() => factory(folder));
    const deck = resource.data!.flashcardDeck!;
    for (const object of [resource, resource.data!, deck, deck.cards, ...deck.cards]) {
      assert.ok(!seen.has(object), 'resource/data/deck/cards/every card must be fresh');
      seen.add(object);
      Object.freeze(object);
    }
    assert.equal(JSON.stringify(folder), snapshot, 'no folder mutation');
  }
}

test('immutable literal: exact Spanish payload, fixed IDs and topic fallbacks', () => assertPayload(oracle));
test('immutable literal: independent clocks and three separate ordered topic evaluations', () => assertEvaluationOrder(oracle));
test('immutable literal: fresh complete resource graph on every call', () => assertFresh(oracle));
test('extracted factory matches immutable payload, clocks, evaluation order and freshness', { skip: !helperExists }, () => {
  assert.equal(typeof operations!.createStudyFlashcardResource, 'function');
  const factory: Factory = operations!.createStudyFlashcardResource;
  assertPayload(factory);
  assertEvaluationOrder(factory);
  assertFresh(factory);
  const helper = readFileSync(operationsUrl, 'utf8');
  const typeImport = "import type { StudyGeneratedResource } from '../../../views/alumno/estudio/estudioTypes';";
  assert.ok(helper.startsWith(typeImport + '\n'));
  assert.equal(helper.match(/^import /gm)?.length, 1, 'no runtime import dependencies');
  const helperLiteral = helper.slice(helper.indexOf('  return ') + '  return '.length, helper.lastIndexOf(';'));
  assert.equal(helperLiteral, literal.replace(/\r\n/g, '\n').replace(/^      /gm, ''), 'literal copied exactly except indentation');
});
test('entire current workspace restores immutable source by undoing only exact import and call', () => {
  // Git canonical LF differs from the approved working CRLF; adapt only the expected source.
  assert.ok(baseline.includes('\n') && !baseline.includes('\r'), 'immutable source must be LF-only');
  assert.ok(candidate.includes('\r\n') && !/(?<!\r)\n|\r(?!\n)/.test(candidate), 'working source must be uniform CRLF');
  const expectedSource = baseline.replace(/\n/g, '\r\n');
  const expectedDeclaration = originalDeclaration.replace(/\n/g, '\r\n');
  const addedImport = "import { createStudyFlashcardResource } from '../../../features/study/application/studyFlashcardGeneration';\r\n";
  const call = declarationPrefix + 'createStudyFlashcardResource(folder);';
  let restored = candidate;
  if (helperExists) {
    assert.equal(candidate.split(addedImport).length, 2);
    assert.equal(candidate.split(call).length, 2);
    restored = restored.replace(addedImport, '').replace(call, expectedDeclaration);
  }
  assert.equal(restored, expectedSource, 'raw full source equality including controller, timers, callbacks and other branches');
});
