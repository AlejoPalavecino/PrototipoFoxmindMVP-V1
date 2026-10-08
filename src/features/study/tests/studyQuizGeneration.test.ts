import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import type { StudyGeneratedResource } from '../../../views/alumno/estudio/estudioTypes';

const workspacePath = 'src/views/alumno/estudio/StudyChatWorkspace.tsx';
const baseline = execFileSync('git', [
  'show', 'b50c529f7e7fce08fab78e8a87b3a342977128d1:' + workspacePath
], { encoding: 'utf8' });
const candidate = readFileSync(workspacePath, 'utf8');
const operationsUrl = new URL('../application/studyQuizGeneration.ts', import.meta.url);
const helperExists = existsSync(operationsUrl);
const operations = helperExists ? await import(operationsUrl.href) : undefined;
const declarationPrefix = '        const newQuizResource: StudyGeneratedResource = ';
const start = baseline.indexOf(declarationPrefix);
const end = baseline.indexOf('\n\n        aiResponseText = ', start);
assert.ok(start > 0 && end > start);
assert.equal(baseline.indexOf(declarationPrefix, start + 1), -1);
const originalDeclaration = baseline.slice(start, end);
const literal = originalDeclaration.slice(declarationPrefix.length, -1);
assert.ok(literal.startsWith('{') && literal.endsWith('}'));
assert.ok(literal.length < 5000, 'evaluate only the bounded immutable quiz literal');
assert.equal(literal.match(/Date\.now\(\)/g)?.length, 2);
assert.equal(literal.match(/folder\.topics\?\.\[0\]\?\.name \|\| folder\.name/g)?.length, 2);

type Folder = { id: string; name: string; topics?: readonly { name: string }[] };
type Factory = (folder: Folder) => StudyGeneratedResource;
// Evaluate only the immutable literal, never the controller or TSX module.
const oracle = new Function('folder', `return (${literal});`) as Factory;
function withClocks<T>(run: () => T, events?: string[]): T {
  const previous = Date.now;
  const ticks = [1700000000001, 1700000000002];
  let calls = 0;
  Date.now = () => {
    events?.push(`clock ${calls + 1}`);
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
    assert.equal(resource.id, 'res-quiz-1700000000001');
    assert.equal(resource.title, `Quiz Formativo: ${folder.name}`);
    assert.equal(resource.type, 'quiz');
    assert.equal(resource.folderId, folder.id);
    assert.equal(resource.folderName, folder.name);
    assert.equal(resource.topic, topic);
    assert.equal(resource.description, 'Cuestionario de 3 preguntas con retroalimentación socrática.');
    assert.equal(resource.createdAt, 'Justo ahora');
    assert.equal(resource.fileSize, '3 preguntas');
    assert.equal(resource.fileFormat, 'QUIZ');
    const quiz = resource.data!.quiz!;
    assert.equal(quiz.id, 'quiz-1700000000002');
    assert.equal(quiz.title, `Quiz: ${folder.name}`);
    assert.equal(quiz.folderId, folder.id);
    assert.equal(quiz.folderName, folder.name);
    assert.equal(quiz.topic, topic);
    assert.equal(quiz.difficulty, 'intermedio');
    assert.equal(quiz.createdAt, 'Hoy');
    assert.deepEqual(quiz.questions, [
      {
        id: 'q-d-1', question: `¿Cuál de las siguientes afirmaciones describe mejor a ${folder.name}?`,
        options: [
          'Es un proceso estructurado con fases interdependientes.',
          'Ocurre de forma aislada sin relación con el contexto.',
          'No requiere comprobación de variables.',
          'Se limita exclusivamente a definiciones teóricas.'
        ],
        correctIndex: 0,
        explanation: 'Excelente deducción. Todo el modelo se sostiene en la articulación de etapas concatenadas.',
        topic: 'Conceptos Clave'
      },
      {
        id: 'q-d-2', question: 'Al aplicar este método en un examen, ¿cuál es el paso prioritario?',
        options: [
          'Comenzar a escribir sin leer las consignas completas',
          'Identificar las premisas principales y estructurar un esquema previo',
          'Memorizar datos sin comprender la lógica interna',
          'Ignorar las preguntas de desarrollo largo'
        ],
        correctIndex: 1,
        explanation: '¡Exacto! El esquema previo asegura coherencia argumental y evita lagunas conceptuales.',
        topic: 'Metodología'
      }
    ]);
  }
}
function assertEvaluationOrder(factory: Factory) {
  for (const fallback of [false, true]) {
    const events: string[] = [];
    let ids = 0, names = 0, topics = 0;
    const folder: Folder = {
      get id() { events.push(`id ${++ids}`); return `id-${ids}`; },
      get name() { events.push(`name ${++names}`); return `Name ${names}`; },
      get topics() {
        const read = ++topics;
        events.push(`topics ${read}`);
        return [{ get name() { events.push(`topic ${read}`); return fallback ? '' : `Topic ${read}`; } }];
      }
    };
    const resource = withClocks(() => factory(folder), events);
    assert.deepEqual(events, fallback ? [
      'clock 1', 'name 1', 'id 1', 'name 2', 'topics 1', 'topic 1', 'name 3',
      'clock 2', 'name 4', 'id 2', 'name 5', 'topics 2', 'topic 2', 'name 6', 'name 7'
    ] : [
      'clock 1', 'name 1', 'id 1', 'name 2', 'topics 1', 'topic 1',
      'clock 2', 'name 3', 'id 2', 'name 4', 'topics 2', 'topic 2', 'name 5'
    ]);
    assert.equal(resource.title, 'Quiz Formativo: Name 1');
    assert.equal(resource.folderId, 'id-1');
    assert.equal(resource.folderName, 'Name 2');
    assert.equal(resource.topic, fallback ? 'Name 3' : 'Topic 1');
    const quiz = resource.data!.quiz!;
    assert.equal(quiz.title, `Quiz: Name ${fallback ? 4 : 3}`);
    assert.equal(quiz.folderId, 'id-2');
    assert.equal(quiz.folderName, `Name ${fallback ? 5 : 4}`);
    assert.equal(quiz.topic, fallback ? 'Name 6' : 'Topic 2');
    assert.equal(quiz.questions[0].question, `¿Cuál de las siguientes afirmaciones describe mejor a Name ${fallback ? 7 : 5}?`);
  }
}
function assertFresh(factory: Factory) {
  const seen = new Set<object>();
  for (const [, folder] of [...cases, ...cases]) {
    folder.topics?.forEach(Object.freeze);
    if (folder.topics) Object.freeze(folder.topics);
    Object.freeze(folder);
    const snapshot = JSON.stringify(folder);
    const resource = withClocks(() => factory(folder));
    const quiz = resource.data!.quiz!;
    for (const object of [resource, resource.data!, quiz, quiz.questions, ...quiz.questions, ...quiz.questions.map(q => q.options)]) {
      assert.ok(!seen.has(object), 'resource/data/quiz/questions/every question/every options array must be fresh');
      seen.add(object);
      Object.freeze(object);
    }
    assert.equal(JSON.stringify(folder), snapshot, 'no folder mutation');
  }
}

test('immutable quiz literal: exact Spanish payload, fixed IDs and topic fallbacks', () => assertPayload(oracle));
test('immutable quiz literal: ordered clocks and all id/name/topic getter reads', () => assertEvaluationOrder(oracle));
test('immutable quiz literal: frozen input and complete fresh graphs on every call', () => assertFresh(oracle));
test('extracted quiz factory matches immutable payload, clocks, getters and freshness', { skip: !helperExists }, () => {
  assert.equal(typeof operations!.createStudyQuizResource, 'function');
  const factory: Factory = operations!.createStudyQuizResource;
  assertPayload(factory);
  assertEvaluationOrder(factory);
  assertFresh(factory);
  const helper = readFileSync(operationsUrl, 'utf8');
  const typeImport = "import type { StudyGeneratedResource } from '../../../views/alumno/estudio/estudioTypes';";
  assert.ok(helper.startsWith(typeImport + '\n'));
  assert.equal(helper.match(/^import /gm)?.length, 1, 'no runtime import dependencies');
  const helperLiteral = helper.slice(helper.indexOf('  return ') + '  return '.length, helper.lastIndexOf(';'));
  assert.equal(helperLiteral, literal.replace(/^      /gm, ''), 'literal copied exactly except indentation');
});
test('entire live workspace restores quiz baseline by undoing only exact import and call', () => {
  assert.ok(baseline.includes('\n') && !baseline.includes('\r'), 'immutable source must be LF-only');
  assert.ok(candidate.includes('\r\n') && !/(?<!\r)\n|\r(?!\n)/.test(candidate), 'working source must be uniform CRLF');
  const expectedSource = baseline.replace(/\n/g, '\r\n');
  const expectedDeclaration = originalDeclaration.replace(/\n/g, '\r\n');
  const addedImport = "import { createStudyQuizResource } from '../../../features/study/application/studyQuizGeneration';\r\n";
  const call = declarationPrefix + 'createStudyQuizResource(folder);';
  let restored = candidate;
  if (helperExists) {
    assert.equal(candidate.split(addedImport).length, 2);
    assert.equal(candidate.split(call).length, 2);
    restored = restored.replace(addedImport, '').replace(call, expectedDeclaration);
  }
  assert.equal(restored, expectedSource, 'raw full source equality including quiz condition, canvas count 2 and downstream effects');
});
