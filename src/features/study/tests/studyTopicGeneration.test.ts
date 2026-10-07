import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const pagePath = 'src/views/alumno/EstudiaAlumno.tsx';
const baseline = execFileSync('git', ['show', 'b0a18f9773f1838c4191200a38eafefaf27ec85d:' + pagePath], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
const candidate = readFileSync(pagePath, 'utf8').replace(/\r\n/g, '\n');
const operationsUrl = new URL('../application/studyTopicGeneration.ts', import.meta.url);
const operations = existsSync(operationsUrl) ? await import(operationsUrl.href) : {};
const parse = (text: string) => ts.createSourceFile(pagePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(root: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node {
  const matches: ts.Node[] = [];
  function visit(node: ts.Node) { if (predicate(node)) matches.push(node); ts.forEachChild(node, visit); }
  visit(root);
  assert.equal(matches.length, 1);
  return matches[0];
}
function callback(text: string) {
  const file = parse(text);
  const declaration = find(file, n => ts.isVariableDeclaration(n) && n.name.getText(file) === 'handleAnalyzeStudyMaterial') as ts.VariableDeclaration;
  return { file, declaration, expression: declaration.initializer! };
}
function evaluate(text: string, bindings: Record<string, any>) {
  const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(bindings), js)(...Object.values(bindings));
}
const original = callback(baseline);
const branchStart = baseline.indexOf('      let detectedTopics:', original.expression.getStart(original.file));
const branchEnd = baseline.indexOf('      setNewFolderForm', branchStart);
assert.ok(branchStart > 0 && branchEnd > branchStart);
const originalBranch = baseline.slice(branchStart, branchEnd);
const oracle = (name: string) => evaluate(originalBranch + '\nreturn detectedTopics;', { newFolderForm: { name } });
function harness(text: string, form: any) {
  const { file, expression } = callback(text);
  const events: any[] = [], timers: (() => void)[] = [], updates: ((prev: any) => any)[] = [], calls: any[] = [];
  const bindings: Record<string, any> = {};
  for (const statement of file.statements.filter(ts.isImportDeclaration)) {
    if (!(statement.moduleSpecifier as ts.StringLiteral).text.endsWith('/studyTopicGeneration')) continue;
    const named = statement.importClause?.namedBindings;
    assert.ok(named && ts.isNamedImports(named));
    for (const specifier of named.elements) {
      const exported = (specifier.propertyName || specifier.name).text;
      assert.equal(typeof operations[exported], 'function');
      bindings[specifier.name.text] = (...args: any[]) => { calls.push(args); return operations[exported](...args); };
    }
  }
  const invoke = evaluate(`return (${expression.getText(file)});`, {
    ...bindings, newFolderForm: form,
    setCreationStep: (step: string) => events.push(['step', step]),
    setTimeout: (fn: () => void, delay: number) => { timers.push(fn); events.push(['timer', delay]); return 17; },
    setNewFolderForm: (update: any) => { assert.equal(typeof update, 'function'); updates.push(update); events.push(['setter']); },
    toast: { show: (...args: any[]) => events.push(['toast', ...args]) }
  });
  return { invoke, events, timers, updates, calls };
}

const history = [
  { id: 'top-1', name: 'Unidad 1: Crisis del Antiguo Régimen y Estados Generales', subtopics: ['Monarquía absoluta y privilegios', 'Toma de la Bastilla (1789)', 'Declaración de Derechos del Hombre'], selected: true },
  { id: 'top-2', name: 'Unidad 2: La Convención Nacional y el Terror', subtopics: ['Girondinos vs Jacobinos', 'Robespierre y el Comité de Salvación Pública', 'Constitución de 1793'], selected: true },
  { id: 'top-3', name: 'Unidad 3: Directorio y Ascenso Napoleónico', subtopics: ['Reacción termidoriana', 'Golpe del 18 de Brumario', 'Código Civil y expansión europea'], selected: true }
];
const biology = [
  { id: 'top-1', name: 'Unidad 1: Estructura y Función Celular', subtopics: ['Células procariotas y eucariotas', 'Membrana plasmática y transporte', 'Organelas y metabolismo'], selected: true },
  { id: 'top-2', name: 'Unidad 2: Genética y Ciclo Celular', subtopics: ['Mitosis y Meiosis', 'Leyes de Mendel', 'Estructura del ADN y replicación'], selected: true },
  { id: 'top-3', name: 'Unidad 3: Ecosistemas y Dinámica Poblacional', subtopics: ['Cadenas tróficas', 'Ciclos biogeoquímicos', 'Impacto antropogénico'], selected: true }
];
const fallback = (name: string) => [
  { id: 'top-1', name: `Unidad 1: Fundamentos y Conceptos Clave de ${name}`, subtopics: ['Definición y principios rectores', 'Evolución histórica y contexto', 'Axiomas y postulados básicos'], selected: true },
  { id: 'top-2', name: 'Unidad 2: Desarrollo Analítico y Aplicación Práctica', subtopics: ['Metodología de resolución', 'Estudio de casos tipo parcial', 'Errores conceptuales frecuentes'], selected: true },
  { id: 'top-3', name: 'Unidad 3: Síntesis e Integración para Exámenes', subtopics: ['Cuadros comparativos clave', 'Simulacro de preguntas socráticas', 'Esquema de repaso espaciado'], selected: true }
];
const cases: [string, ReturnType<typeof fallback>][] = [];
for (const [tokens, expected] of [[['historia', 'revoluci', 'social'], history], [['biolog', 'cienc', 'celul'], biology]] as const) {
  for (const token of tokens) for (const name of [token, token.toUpperCase(), `prefix ${token} suffix`]) cases.push([name, expected]);
}
for (const name of ['biolog historia', 'CIENC REVOLUCI', 'celul SOCIAL']) cases.push([name, history]);
for (const name of ['Álgebra', '  Tema  ', 'histo', 'célula', '', ' \t\n ']) cases.push([name, fallback(name)]);

for (const [label, text] of [['immutable baseline', baseline], ['mounted candidate', candidate]]) {
  test(`${label}: literal branches, substring/case matching and history precedence`, () => {
    for (const [name, expected] of cases.filter(([name]) => name.trim())) {
      const h = harness(text, { name });
      h.invoke();
      assert.deepEqual(h.events, [['step', 'analyzing'], ['timer', 2000]]);
      assert.equal(h.updates.length, 0);
      assert.deepEqual(h.calls, []);
      h.timers[0]();
      assert.deepEqual(h.updates[0]({}).topics, expected, name);
      assert.deepEqual(h.events, [['step', 'analyzing'], ['timer', 2000], ['setter'], ['step', 'review']]);
    }
  });
  test(`${label}: blank guard toasts only and does not schedule work`, () => {
    for (const name of ['', ' \t\n ']) {
      const h = harness(text, { name });
      h.invoke();
      assert.deepEqual(h.events, [['toast', 'Ingresa un nombre para la carpeta de estudio', 'error']]);
      assert.equal(h.timers.length, 0);
      assert.equal(h.updates.length, 0);
      assert.deepEqual(h.calls, []);
    }
  });
  test(`${label}: uncancelled callbacks read captured form inside timer and merge every latest snapshot`, () => {
    const captured = { name: 'historia', topics: ['old'] }, h = harness(text, captured);
    h.invoke();
    captured.name = '  Tema  ';
    // A later render supplies another object; it must not replace this closure's captured object.
    const later = harness(text, { name: 'biolog' });
    later.invoke();
    h.timers[0]();
    later.timers[0]();
    assert.deepEqual(later.updates[0]({}).topics, biology);
    const topics = h.updates[0]({}).topics;
    assert.deepEqual(topics, fallback('  Tema  '));
    for (const prev of [Object.freeze({ name: 'latest', extra: Object.freeze({}), topics: [] }), Object.freeze({ classroom: 'personal' })]) {
      const next = h.updates[0](prev);
      assert.notEqual(next, prev);
      assert.deepEqual(next, { ...prev, topics });
      assert.equal(next.topics, topics);
      for (const key of Object.keys(prev).filter(key => key !== 'topics')) assert.equal(next[key], prev[key]);
    }
    assert.deepEqual(captured, { name: '  Tema  ', topics: ['old'] });
    h.invoke();
    assert.equal(h.timers.length, 2);
    h.timers[1]();
    assert.notEqual(h.updates[1]({}).topics, topics);
    if (text === candidate && existsSync(operationsUrl)) assert.deepEqual(h.calls, [['  Tema  '], ['  Tema  ']]);
  });
}

function assertFresh(factory: (name: string) => any[]) {
  const seen = new Set<object>();
  for (const [name, expected] of [...cases, ...cases]) {
    const result = factory(name);
    assert.deepEqual(result, expected, name);
    for (const object of [result, ...result, ...result.map(topic => topic.subtopics)]) {
      assert.ok(!seen.has(object), 'every array/topic/subtopics reference must be fresh');
      seen.add(object);
      Object.freeze(object);
    }
  }
}
test('existing branch factory accepts blank/untrimmed names and owns a fresh nonmutating graph', () => assertFresh(oracle));
test('pure extracted factory matches literal baseline including empty names with no imports', { skip: !existsSync(operationsUrl) }, () => {
  assertFresh(operations.detectStudyFolderTopics);
  const application = parse(readFileSync(operationsUrl, 'utf8'));
  assert.equal(application.statements.filter(ts.isImportDeclaration).length, 0);
  assert.equal(application.statements.length, 1);
});
test('entire page restores immutable b0a18f source after undoing only this extraction', () => {
  let restored = candidate;
  const file = parse(candidate);
  const imported = file.statements.filter(ts.isImportDeclaration).find(n => (n.moduleSpecifier as ts.StringLiteral).text.endsWith('/studyTopicGeneration'));
  if (imported) {
    const statement = find(file, n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(file) === 'detectedTopics'));
    restored = restored.slice(0, statement.getStart(file)) + originalBranch.trim() + restored.slice(statement.end);
    restored = restored.slice(0, imported.getStart(file)) + restored.slice(imported.end + 1);
  }
  assert.equal(restored, baseline);
});
