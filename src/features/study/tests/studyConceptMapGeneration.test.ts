import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import type { StudyGeneratedResource } from '../../../views/alumno/estudio/estudioTypes';

const workspacePath = 'src/views/alumno/estudio/StudyChatWorkspace.tsx';
const baseline = execFileSync('git', [
  'show', 'd4c1a16c93eeaabfe5470bdbb1476943ad47a434:' + workspacePath
], { encoding: 'utf8' });
const candidate = readFileSync(workspacePath, 'utf8');
const operationsUrl = new URL('../application/studyConceptMapGeneration.ts', import.meta.url);
const helperExists = existsSync(operationsUrl);
const operations = helperExists ? await import(operationsUrl.href) : undefined;
const declarationPrefix = '        const newMapResource: StudyGeneratedResource = ';
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
// Evaluate only bounded payload literals; never import or evaluate the controller/TSX.
const oracle = new Function('folder', `return (${literal});`) as Factory;
const liveStart = candidate.indexOf(declarationPrefix);
const liveEnd = candidate.indexOf('\r\n\r\n        aiResponseText = ', liveStart);
assert.ok(liveStart > 0 && liveEnd > liveStart);
assert.equal(candidate.indexOf(declarationPrefix, liveStart + 1), -1);
const liveLiteral = candidate.slice(liveStart + declarationPrefix.length, liveEnd - 1);
if (!helperExists) assert.equal(liveLiteral, literal.replace(/\n/g, '\r\n'));
const factory: Factory = helperExists ? operations!.createStudyConceptMapResource
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
test('live concept-map payload: exact metadata, five nodes, edges and topic fallbacks', () => {
  for (const [label, folder, topic] of cases) {
    const resource = withClocks(() => factory(folder));
    assert.deepEqual(resource, withClocks(() => oracle(folder)), label);
    assert.deepEqual({ ...resource, data: undefined }, {
      id: 'res-map-1700000000001', title: `Mapa Conceptual: ${folder.name}`, type: 'mapa',
      folderId: folder.id, folderName: folder.name, topic,
      description: 'Esquema jerárquico interactivo con nodos interconectados.',
      createdAt: 'Justo ahora', fileSize: '5 nodos', fileFormat: 'CONCEPT_MAP', data: undefined
    });
    const map = resource.data!.conceptMap!;
    assert.deepEqual({ ...map, nodes: undefined }, {
      id: 'map-1700000000002', title: `Mapa Conceptual: ${folder.name}`,
      folderId: folder.id, folderName: folder.name, centralTopic: folder.name, createdAt: 'Hoy',
      summary: 'Interconexión de conceptos fundamentales, metodologías y casos prácticos.', nodes: undefined
    });
    assert.deepEqual(map.nodes, [
      { id: 'n-core', label: folder.name, description: 'Eje central de estudio y estructuración teórica.',
        category: 'core', connectedTo: ['n-fund', 'n-met'] },
      { id: 'n-fund', label: 'Fundamentos & Orígenes', description: 'Principios rectores y antecedentes históricos o matemáticos.',
        category: 'branch', connectedTo: ['n-sub1'] },
      { id: 'n-met', label: 'Aplicación Práctica', description: 'Resolución de problemas, ejercicios típicos y análisis crítico.',
        category: 'branch', connectedTo: ['n-sub2'] },
      { id: 'n-sub1', label: 'Postulados Básicos', description: 'Reglas y axiomas indispensables.', category: 'subbranch' },
      { id: 'n-sub2', label: 'Ejemplos de Examen', description: 'Casos resueltos y modelos de parcial.', category: 'subbranch' }
    ]);
    for (const leaf of map.nodes.slice(3)) assert.equal(Object.hasOwn(leaf, 'connectedTo'), false);
  }
});
test('live concept-map payload: ordered id/name/topic getters and topic before nested clock', () => {
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
    const resource = withClocks(() => factory(folder), events);
    assert.deepEqual(events, fallback ? [
      'clock 1', 'name 1', 'id 1', 'name 2', 'topics 1', 'topic', 'name 3',
      'clock 2', 'name 4', 'id 2', 'name 5', 'name 6', 'name 7'
    ] : [
      'clock 1', 'name 1', 'id 1', 'name 2', 'topics 1', 'topic',
      'clock 2', 'name 3', 'id 2', 'name 4', 'name 5', 'name 6'
    ]);
    assert.equal(resource.title, 'Mapa Conceptual: Name 1');
    assert.equal(resource.folderId, 'id-1');
    assert.equal(resource.folderName, 'Name 2');
    assert.equal(resource.topic, fallback ? 'Name 3' : 'Topic');
    const map = resource.data!.conceptMap!;
    assert.equal(map.title, `Mapa Conceptual: Name ${fallback ? 4 : 3}`);
    assert.equal(map.folderId, 'id-2');
    assert.equal(map.folderName, `Name ${fallback ? 5 : 4}`);
    assert.equal(map.centralTopic, `Name ${fallback ? 6 : 5}`);
    assert.equal(map.nodes[0].label, `Name ${fallback ? 7 : 6}`);
  }
});
test('live concept-map payload: frozen inputs and fresh complete reference graphs', () => {
  const seen = new Set<object>();
  for (const [, folder] of [...cases, ...cases]) {
    folder.topics?.forEach(Object.freeze);
    if (folder.topics) Object.freeze(folder.topics);
    Object.freeze(folder);
    const snapshot = JSON.stringify(folder);
    const resource = withClocks(() => factory(folder));
    const map = resource.data!.conceptMap!;
    const graph = [resource, resource.data!, map, map.nodes, ...map.nodes,
      ...map.nodes.flatMap(node => node.connectedTo ? [node.connectedTo] : [])];
    for (const object of graph) {
      assert.ok(!seen.has(object), 'every resource/data/map/nodes/node/edge array must be fresh');
      seen.add(object);
      Object.freeze(object);
    }
    assert.equal(JSON.stringify(folder), snapshot, 'no input mutation');
  }
});
test('extracted map helper is an exact literal lift with only a type import', { skip: !helperExists }, () => {
  assert.equal(typeof factory, 'function');
  const helper = readFileSync(operationsUrl, 'utf8');
  assert.ok(helper.startsWith("import type { StudyGeneratedResource } from '../../../views/alumno/estudio/estudioTypes';\n"));
  assert.equal(helper.match(/^import /gm)?.length, 1);
  const helperLiteral = helper.slice(helper.indexOf('  return ') + '  return '.length, helper.lastIndexOf(';'));
  assert.equal(helperLiteral, literal.replace(/^      /gm, ''), 'no changes except indentation');
});
function restoreSummaryExtraction(source: string): string {
  const prefix = '        const newSummaryResource: StudyGeneratedResource = ';
  const start = baseline.indexOf(prefix);
  const end = baseline.indexOf('\n\n        aiResponseText = ', start);
  assert.ok(start > 0 && end > start);
  assert.equal(baseline.indexOf(prefix, start + 1), -1);
  const declaration = baseline.slice(start, end);
  assert.ok(declaration.length < 5000, 'restore only the bounded immutable summary declaration');
  const expected = declaration.replace(/\n/g, '\r\n');
  const addedImport = "import { createStudySummaryResource } from '../../../features/study/application/studySummaryGeneration';\r\n";
  const call = prefix + 'createStudySummaryResource(folder);';
  const imports = source.split(addedImport).length - 1;
  const calls = source.split(call).length - 1;
  assert.equal(source.split(prefix).length, 2);
  if (imports === 0 && calls === 0) {
    assert.equal(source.split(expected).length, 2, 'unchanged inline summary required before extraction');
    assert.ok(!source.includes('createStudySummaryResource'), 'reject partial or unexpected summary extraction');
    return source;
  }
  assert.equal(imports, 1, 'exactly one approved summary import');
  assert.equal(calls, 1, 'exactly one approved summary call');
  assert.equal(source.split(expected).length, 1, 'inline summary must be replaced, not duplicated');
  assert.equal(source.match(/createStudySummaryResource/g)?.length, 2);
  return source.replace(addedImport, '').replace(call, expected);
}

test('whole live workspace restores immutable current HEAD with strict CRLF preservation', () => {
  assert.ok(baseline.includes('\n') && !baseline.includes('\r'), 'Git source must be LF-only');
  assert.ok(candidate.includes('\r\n') && !/(?<!\r)\n|\r(?!\n)/.test(candidate), 'working source must be uniform CRLF');
  const addedImport = "import { createStudyConceptMapResource } from '../../../features/study/application/studyConceptMapGeneration';\r\n";
  const call = declarationPrefix + 'createStudyConceptMapResource(folder);';
  let restored = restoreSummaryExtraction(candidate);
  if (helperExists) {
    assert.equal(candidate.split(addedImport).length, 2);
    assert.equal(candidate.split(call).length, 2);
    assert.equal(candidate.match(/createStudyConceptMapResource/g)?.length, 2);
    restored = restored.replace(addedImport, '').replace(call, originalDeclaration.replace(/\n/g, '\r\n'));
  }
  assert.equal(restored, baseline.replace(/\n/g, '\r\n'), 'all non-newline bytes and unrelated source unchanged');
});
