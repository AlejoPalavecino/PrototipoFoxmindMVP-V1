import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile);
assert.equal(config.error, undefined);
const options = ts.convertCompilerOptionsFromJson(config.config.compilerOptions, root);
assert.deepEqual(options.errors, []);
const studentComposed = existsSync(resolve(root, 'src/features/classrooms/components/student/StudentClassroomDetail.tsx'));
const studentListed = existsSync(resolve(root, 'src/features/classrooms/components/student/StudentClassroomList.tsx'));
const uiExports = [
  'TeacherParticipantList', 'StudentParticipantList',
  'TeacherActivityList', 'StudentActivityList',
  'TeacherClassroomList', 'TeacherClassroomCreateFlow', 'useTeacherClassroomCreation',
  studentComposed ? 'StudentClassroomDetail' : 'useTeacherClassroomDetail', 'TeacherClassroomDetail',
  ...(studentListed ? ['StudentClassroomList'] : []),
];
const pageExports = new Map([
  ['docente/AulasDocente', [
    'TeacherClassroomList', 'TeacherClassroomCreateFlow',
    'useTeacherClassroomCreation', 'TeacherClassroomDetail',
  ]],
  ['alumno/AulasAlumno', [
    ...(studentComposed ? ['StudentClassroomDetail'] : ['StudentActivityList', 'StudentParticipantList']),
    ...(studentListed ? ['StudentClassroomList'] : []),
  ]],
]);

// Transpile in memory so ordinary imports used only as types are erased too.
// Inspect syntax without executing imports or writing emitted files.
function runtimeSpecifiers(source: string, fileName: string) {
  const result = ts.transpileModule(source, {
    fileName,
    compilerOptions: { ...options.options, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: false },
    reportDiagnostics: true,
  });
  assert.deepEqual(result.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error), [], `cannot parse ${fileName}`);
  const ast = ts.createSourceFile(fileName + '.js', result.outputText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const specifiers = new Set<string>();
  function visit(node: ts.Node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      specifiers.add(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      const [argument] = node.arguments;
      if (argument && ts.isStringLiteralLike(argument)) specifiers.add(argument.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return [...specifiers];
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:[cm]?[jt]sx?)$/.test(path) && !path.endsWith('.d.ts') ? [path] : [];
  });
}

const files = sourceFiles(resolve(root, 'src')).sort();
const fileSet = new Set(files);
const graph = new Map(files.map(file => {
  const edges = runtimeSpecifiers(readFileSync(file, 'utf8'), file).flatMap(specifier => {
    // External packages are outside this graph; resolve relative/project aliases.
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return [];
    const target = ts.resolveModuleName(specifier, file, options.options, ts.sys).resolvedModule?.resolvedFileName;
    if (target && fileSet.has(resolve(target))) return [resolve(target)];
    // Assets are not executable modules. Missing local source must not vanish.
    assert.ok(extname(specifier) && !/\.(?:[cm]?[jt]sx?)$/.test(specifier), `unresolved local module: ${relative(root, file)} -> ${specifier}`);
    return [];
  });
  return [file, [...new Set(edges)].sort()] as const;
}));
const label = (path: string) => relative(root, path).replaceAll('\\', '/');

function cyclesIn(edges: Map<string, readonly string[]>) {
  const cycles: string[][] = [];
  // Each simple cycle starts at its lexical minimum exactly once, including
  // alternate branches that a DFS back-edge count would miss.
  for (const start of [...edges.keys()].sort()) {
    const path = [start];
    const active = new Set(path);
    function walk(node: string) {
      for (const next of edges.get(node) ?? []) {
        if (next === start) cycles.push([...path, start]);
        else if (next > start && !active.has(next)) {
          active.add(next);
          path.push(next);
          walk(next);
          path.pop();
          active.delete(next);
        }
      }
    }
    walk(start);
  }
  return cycles;
}

function reachable(start: string) {
  const visited = new Set<string>();
  function walk(node: string) {
    if (visited.has(node)) return;
    visited.add(node);
    for (const next of graph.get(node) ?? []) walk(next);
  }
  walk(start);
  return [...visited];
}

function sourceAst(file: string) {
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
}

test('runtime graph has zero cycles across all src local imports and reexports', () => {
  const cycles = cyclesIn(graph).map(cycle => cycle.map(label));
  assert.deepEqual(cycles, [], `${cycles.length} runtime cycles:\n${cycles.map(cycle => cycle.join(' -> ')).join('\n')}`);
});

test('runtime parser distinguishes erased types from all supported value edges', () => {
  assert.deepEqual(runtimeSpecifiers(`
    import type { A } from './type-only';
    import { B } from './inferred-type';
    import { type C, value } from './mixed';
    export type { D } from './type-export';
    export { type E, other as alias } from './mixed-export';
    export * from './star';
    export * as namespace from './namespace';
    import './side-effect';
    const b: B = {} as B;
    value(b); import('./dynamic'); require('./required');
    import(\`./literal-template\`); import(variable); require(variable);
  `, 'fixture.ts'), ['./mixed', './mixed-export', './star', './namespace', './side-effect', './dynamic', './required', './literal-template']);
  assert.deepEqual(runtimeSpecifiers(`
    import { View } from './view';
    const node = <View />;
  `, 'fixture.tsx'), ['react/jsx-runtime', './view']);
  assert.throws(() => runtimeSpecifiers('const = ;', 'invalid.ts'), /cannot parse/);
  assert.deepEqual(cyclesIn(new Map([
    ['a', ['b', 'c']], ['b', ['a']], ['c', ['a']], ['isolated', []],
  ])), [['a', 'b', 'a'], ['a', 'c', 'a']]);
});

test('headless public boundary cannot transitively load UI components or hooks', () => {
  const loaded = reachable(resolve(root, 'src/features/classrooms/index.ts')).map(label);
  assert.deepEqual(loaded.filter(path => /\/(?:components|hooks|views)\//.test(path)), []);
});

test('UI hook removal has no current production barrel consumer after teacher composition', () => {
  const ui = resolve(root, 'src/features/classrooms/ui.ts');
  const consumers = [...graph].filter(([file, edges]) => !label(file).includes('/tests/') && edges.includes(ui)).map(([file]) => label(file));
  assert.deepEqual(consumers.sort(), ['src/views/alumno/AulasAlumno.tsx', 'src/views/docente/AulasDocente.tsx']);
  for (const file of consumers) {
    for (const statement of sourceAst(resolve(root, file)).statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)
        || !statement.moduleSpecifier.text.endsWith('classrooms/ui')) continue;
      const bindings = statement.importClause?.namedBindings;
      assert.ok(bindings && ts.isNamedImports(bindings), 'No namespace/default consumer hides hook access');
      assert.ok(bindings.elements.every(item => (item.propertyName ?? item.name).text !== 'useTeacherClassroomDetail'));
    }
  }
});

test('UI boundary exports exactly the current components and hooks from current leaves', () => {
  const file = resolve(root, 'src/features/classrooms/ui.ts');
  const ast = sourceAst(file);
  const names: string[] = [];
  for (const statement of ast.statements) {
    assert.ok(ts.isExportDeclaration(statement) && !statement.isTypeOnly &&
      statement.exportClause && ts.isNamedExports(statement.exportClause) && statement.moduleSpecifier,
    'UI boundary must contain only named value reexports');
    for (const item of statement.exportClause.elements) {
      assert.equal(item.isTypeOnly, false);
      assert.equal(item.propertyName, undefined, 'preserve existing UI names');
      names.push(item.name.text);
    }
  }
  assert.deepEqual(names.sort(), [...uiExports].sort());
  const targets = graph.get(file) ?? [];
  assert.equal(targets.length, uiExports.length);
  assert.ok(targets.every(target => /\/(?:components|hooks)\//.test(label(target)) && dirname(target) !== dirname(file)));
});

test('current role pages import their composed UI symbols through ui, not headless index', () => {
  for (const [role, expected] of pageExports) {
    const file = resolve(root, `src/views/${role}.tsx`);
    const names: string[] = [];
    for (const statement of sourceAst(file).statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const boundary = statement.moduleSpecifier.text;
      if (boundary !== '../../features/classrooms' && boundary !== '../../features/classrooms/ui') continue;
      const clause = statement.importClause;
      if (!clause || clause.isTypeOnly) continue;
      assert.ok(clause.namedBindings && ts.isNamedImports(clause.namedBindings));
      const values = clause.namedBindings.elements.filter(item => !item.isTypeOnly).map(item => (item.propertyName ?? item.name).text);
      if (boundary.endsWith('/ui')) names.push(...values);
      else assert.deepEqual(values.filter(name => uiExports.includes(name)), []);
    }
    assert.deepEqual(names.sort(), [...expected].sort(), role);
    assert.ok(runtimeSpecifiers(readFileSync(file, 'utf8'), file).includes('../../features/classrooms/ui'));
  }
});
