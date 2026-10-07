import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const pagePath = 'src/views/alumno/EstudiaAlumno.tsx';
const operationsUrl = new URL('../application/sessionCollection.ts', import.meta.url);
const operations = existsSync(operationsUrl) ? await import(operationsUrl.href) : {};
const parse = (path: string, text: string) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = parse(pagePath, readFileSync(pagePath, 'utf8'));
let callback: ts.ArrowFunction | undefined;
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(page) === 'handleUpdateSession') {
    assert.equal(callback, undefined);
    callback = node.initializer as ts.ArrowFunction;
  }
  ts.forEachChild(node, visit);
}
visit(page);
assert.ok(callback);

// Execute the actual callback and resolve its actual helper import, including aliases.
function harness() {
  const updates: ((prior: any[]) => any[])[] = [];
  const calls: any[] = [];
  const bindings: Record<string, any> = {
    setSessions: (update: any) => { assert.equal(typeof update, 'function'); updates.push(update); }
  };
  for (const statement of page.statements.filter(ts.isImportDeclaration)) {
    if (!(statement.moduleSpecifier as ts.StringLiteral).text.endsWith('/sessionCollection')) continue;
    const named = statement.importClause?.namedBindings;
    assert.ok(named && ts.isNamedImports(named));
    for (const specifier of named.elements) {
      const exported = (specifier.propertyName || specifier.name).text;
      assert.equal(typeof operations[exported], 'function');
      bindings[specifier.name.text] = (...args: any[]) => { calls.push([exported, ...args]); return operations[exported](...args); };
    }
  }
  const js = ts.transpileModule(`return (${callback!.getText(page)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const update = new Function(...Object.keys(bindings), js)(...Object.values(bindings));
  return { update, updates, calls };
}
const session = (id: string) => Object.freeze({ id, messages: Object.freeze([]) });
function apply(prior: any[], updated: any) {
  const h = harness();
  h.update(updated);
  assert.equal(h.updates.length, 1);
  const snapshot = [...prior];
  const result = h.updates[0](prior);
  assert.notEqual(result, prior);
  assert.deepEqual(prior, snapshot);
  return result;
}

test('existing session replacement preserves order, exact references and only the first duplicate', () => {
  const before = session('before'), old = session('match'), duplicate = session('match'), after = session('after');
  const updated = session('match');
  const prior = Object.freeze([before, old, duplicate, after]);
  const result = apply(prior as any, updated);
  assert.equal(result.length, prior.length);
  for (const [index, expected] of [before, updated, duplicate, after].entries()) assert.equal(result[index], expected);
  assert.equal(result[1].messages, updated.messages);
});

test('missing session prepends the exact object while preserving every unmatched reference', () => {
  const prior = Object.freeze([session('one'), session('two')]);
  const updated = session('missing');
  const result = apply(prior as any, updated);
  assert.equal(result.length, 3);
  for (const [index, expected] of [updated, ...prior].entries()) assert.equal(result[index], expected);
});

test('empty collection inserts the exact session without mutating the input', () => {
  const updated = session('new');
  const result = apply(Object.freeze([]) as any, updated);
  assert.equal(result.length, 1);
  assert.equal(result[0], updated);
});

test('functional setter defers calculation and uses each latest snapshot without extra setter effects', () => {
  const h = harness(), updated = session('match');
  h.update(updated);
  assert.equal(h.updates.length, 1);
  assert.deepEqual(h.calls, []);
  const latest = Object.freeze([session('other'), session('match')]);
  const first = h.updates[0](latest as any);
  assert.equal(first[0], latest[0]);
  assert.equal(first[1], updated);
  const newer = Object.freeze([session('fresh')]);
  const second = h.updates[0](newer as any);
  assert.equal(second[0], updated);
  assert.equal(second[1], newer[0]);
  assert.equal(h.updates.length, 1);
});

test('actual callback consumes the pure generic operation with exact input references', { skip: !existsSync(operationsUrl) }, () => {
  const h = harness(), updated = session('match'), prior = Object.freeze([session('match')]);
  h.update(updated);
  assert.deepEqual(h.calls, []);
  assert.equal(h.updates[0](prior as any)[0], updated);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][0], 'upsertStudySession');
  assert.equal(h.calls[0][1], prior);
  assert.equal(h.calls[0][2], updated);
  const application = parse(operationsUrl.pathname, readFileSync(operationsUrl, 'utf8'));
  assert.equal(application.statements.length, 1);
  assert.ok(ts.isFunctionDeclaration(application.statements[0]));
  assert.equal(application.statements.filter(ts.isImportDeclaration).length, 0);
});
