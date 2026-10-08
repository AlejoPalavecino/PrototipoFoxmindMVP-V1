import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import type { StudyGeneratedResource } from '../../../views/alumno/estudio/estudioTypes';

const workspacePath = 'src/views/alumno/estudio/StudyChatWorkspace.tsx';
const baseline = execFileSync('git', [
  'show', '4e5b44d1ecdaaa8889722cf180609f0c2051d8c6:' + workspacePath
], { encoding: 'utf8' });
const candidate = readFileSync(workspacePath, 'utf8');
const operationsUrl = new URL('../application/studySummaryGeneration.ts', import.meta.url);
const helperExists = existsSync(operationsUrl);
const operations = helperExists ? await import(operationsUrl.href) : undefined;
const declarationPrefix = '        const newSummaryResource: StudyGeneratedResource = ';
const start = baseline.indexOf(declarationPrefix);
const end = baseline.indexOf('\n\n        aiResponseText = ', start);
assert.ok(start > 0 && end > start);
assert.equal(baseline.indexOf(declarationPrefix, start + 1), -1);
const originalDeclaration = baseline.slice(start, end);
const literal = originalDeclaration.slice(declarationPrefix.length, -1);
assert.ok(literal.startsWith('{') && literal.endsWith('}') && literal.length < 5000);
assert.equal(literal.match(/Date\.now\(\)/g)?.length, 2);
assert.equal(literal.match(/folder\.topics\?\.\[0\]\?\.name \|\| folder\.name/g)?.length, 1);

type Folder = { id: string; name: string; topics?: readonly { name: string }[] };
type Factory = (folder: Folder) => StudyGeneratedResource;
// Evaluate only the bounded payload literal; never evaluate the controller or TSX.
const oracle = new Function('folder', `return (${literal});`) as Factory;
const liveStart = candidate.indexOf(declarationPrefix);
const liveEnd = candidate.indexOf('\r\n\r\n        aiResponseText = ', liveStart);
assert.ok(liveStart > 0 && liveEnd > liveStart);
assert.equal(candidate.indexOf(declarationPrefix, liveStart + 1), -1);
const liveLiteral = candidate.slice(liveStart + declarationPrefix.length, liveEnd - 1);
if (!helperExists) assert.equal(liveLiteral, literal.replace(/\n/g, '\r\n'));
const factory: Factory = helperExists ? operations!.createStudySummaryResource
  : new Function('folder', `return (${liveLiteral});`) as Factory;
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
test('live summary payload: exact Spanish Markdown, metadata and asymmetric topics', () => {
  for (const [label, folder, topic] of cases) {
    const resource = withClocks(() => factory(folder));
    assert.deepEqual(resource, withClocks(() => oracle(folder)), label);
    assert.deepEqual(resource, {
      id: 'res-sum-1700000000001', title: `Resumen Foxy: ${folder.name}`, type: 'resumen',
      folderId: folder.id, folderName: folder.name, topic,
      description: 'Síntesis didáctica con puntos esenciales y glosario.',
      createdAt: 'Justo ahora', fileSize: '3 págs', fileFormat: 'MARKDOWN',
      data: {
        summary: {
          id: 'sum-1700000000002', title: `Resumen de Síntesis: ${folder.name}`,
          folderId: folder.id, folderName: folder.name, topic: folder.name,
          readTimeMinutes: 5, createdAt: 'Hoy',
          keyPoints: [
            `La clave de ${folder.name} reside en articular los conceptos con ejemplos prácticos.`,
            'Evitá memorizar de forma mecánica: entendé el "por qué" detrás de cada propiedad.',
            'Repasá este resumen en intervalos de 48 horas para maximizar la curva de retención.'
          ],
          contentMarkdown: `## 📚 Síntesis Didáctica: ${folder.name}\n\n### 1. Ideas Principales\nComprender este tema te permitirá abordar tanto preguntas de opción múltiple como ensayos de desarrollo extenso.\n\n### 2. Consejos para Exámenes\n- Definí con precisión los términos técnicos.\n- Citá ejemplos concretos cuando justifiques tus respuestas.\n- Realizá una lectura global antes de contestar.`,
          glossary: [
            { term: 'Concepto Central', definition: 'Núcleo temático sobre el que se estructuran las consignas de evaluación.' }
          ]
        }
      }
    }, label);
  }
});
test('live summary payload: exact ordered getters, fallback and independent clocks', () => {
  for (const run of [oracle, factory]) {
    for (const fallback of [false, true]) {
      const events: string[] = [];
      let ids = 0, names = 0, topics = 0;
      const folder: Folder = {
        get id() { events.push(`id ${++ids}`); return `id-${ids}`; },
        get name() { events.push(`name ${++names}`); return `Name ${names}`; },
        get topics() {
          events.push(`topics ${++topics}`);
          return [{ get name() { events.push('topic'); return fallback ? '' : 'Topic'; } }];
        }
      };
      const resource = withClocks(() => run(folder), events);
      assert.deepEqual(events, fallback ? [
        'clock 1', 'name 1', 'id 1', 'name 2', 'topics 1', 'topic', 'name 3',
        'clock 2', 'name 4', 'id 2', 'name 5', 'name 6', 'name 7', 'name 8'
      ] : [
        'clock 1', 'name 1', 'id 1', 'name 2', 'topics 1', 'topic',
        'clock 2', 'name 3', 'id 2', 'name 4', 'name 5', 'name 6', 'name 7'
      ]);
      assert.equal(resource.title, 'Resumen Foxy: Name 1');
      assert.equal(resource.folderId, 'id-1');
      assert.equal(resource.folderName, 'Name 2');
      assert.equal(resource.topic, fallback ? 'Name 3' : 'Topic');
      const summary = resource.data!.summary!;
      assert.equal(summary.title, `Resumen de Síntesis: Name ${fallback ? 4 : 3}`);
      assert.equal(summary.folderId, 'id-2');
      assert.equal(summary.folderName, `Name ${fallback ? 5 : 4}`);
      assert.equal(summary.topic, `Name ${fallback ? 6 : 5}`);
      assert.ok(summary.keyPoints[0].includes(`Name ${fallback ? 7 : 6}`));
      assert.ok(summary.contentMarkdown.startsWith(`## 📚 Síntesis Didáctica: Name ${fallback ? 8 : 7}\n`));
    }
  }
});
test('live summary payload: frozen inputs, no mutation and fresh complete graphs', () => {
  const seen = new Set<object>();
  for (const [, folder] of [...cases, ...cases]) {
    folder.topics?.forEach(Object.freeze);
    if (folder.topics) Object.freeze(folder.topics);
    Object.freeze(folder);
    const snapshot = JSON.stringify(folder);
    const resource = withClocks(() => factory(folder));
    const summary = resource.data!.summary!;
    for (const object of [resource, resource.data!, summary, summary.keyPoints, summary.glossary!, ...summary.glossary!]) {
      assert.ok(!seen.has(object), 'every resource/data/summary/keyPoints/glossary/entry must be fresh');
      seen.add(object);
      Object.freeze(object);
    }
    assert.equal(JSON.stringify(folder), snapshot, 'no input mutation');
  }
});
test('extracted summary helper is an exact literal lift with only a type import', { skip: !helperExists }, () => {
  assert.equal(typeof factory, 'function');
  const helper = readFileSync(operationsUrl, 'utf8');
  assert.ok(helper.startsWith("import type { StudyGeneratedResource } from '../../../views/alumno/estudio/estudioTypes';\n"));
  assert.equal(helper.match(/^import /gm)?.length, 1);
  const helperLiteral = helper.slice(helper.indexOf('  return ') + '  return '.length, helper.lastIndexOf(';'));
  assert.equal(helperLiteral, literal.replace(/^      /gm, ''), 'no changes except indentation');
});
test('whole live workspace restores immutable summary HEAD with strict CRLF preservation', () => {
  assert.ok(baseline.includes('\n') && !baseline.includes('\r'), 'Git source must be LF-only');
  assert.ok(candidate.includes('\r\n') && !/(?<!\r)\n|\r(?!\n)/.test(candidate), 'working source must be uniform CRLF');
  const addedImport = "import { createStudySummaryResource } from '../../../features/study/application/studySummaryGeneration';\r\n";
  const call = declarationPrefix + 'createStudySummaryResource(folder);';
  let restored = candidate;
  if (helperExists) {
    assert.equal(candidate.split(addedImport).length, 2);
    assert.equal(candidate.split(call).length, 2);
    assert.equal(candidate.match(/createStudySummaryResource/g)?.length, 2);
    restored = restored.replace(addedImport, '').replace(call, originalDeclaration.replace(/\n/g, '\r\n'));
  } else {
    assert.ok(!candidate.includes('createStudySummaryResource'), 'reject partial or unexpected extraction');
  }
  assert.equal(restored, baseline.replace(/\n/g, '\r\n'), 'all non-newline bytes and unrelated source unchanged');
});
