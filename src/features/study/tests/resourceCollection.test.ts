import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const pagePath = 'src/views/alumno/EstudiaAlumno.tsx';
const operationsUrl = new URL('../application/resourceCollection.ts', import.meta.url);
const operations = existsSync(operationsUrl) ? await import(operationsUrl.href) : {};
const parse = (text: string) => ts.createSourceFile(pagePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = parse(readFileSync(pagePath, 'utf8'));
function find(root: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node {
  const matches: ts.Node[] = [];
  function visit(node: ts.Node) { if (predicate(node)) matches.push(node); ts.forEachChild(node, visit); }
  visit(root);
  assert.equal(matches.length, 1);
  return matches[0];
}
const save = (find(page, n => ts.isVariableDeclaration(n) && n.name.getText(page) === 'handleSaveResourceToLibrary') as ts.VariableDeclaration).initializer!;
const modal = find(page, n => ts.isJsxSelfClosingElement(n) && n.tagName.getText(page) === 'StudyFlashcardModal');
const update = ((find(modal, n => ts.isJsxAttribute(n) && n.name.getText(page) === 'onUpdateDeck') as ts.JsxAttribute).initializer as ts.JsxExpression).expression!;
const bindings: Record<string, any> = {};
for (const statement of page.statements.filter(ts.isImportDeclaration)) {
  if (!(statement.moduleSpecifier as ts.StringLiteral).text.endsWith('/resourceCollection')) continue;
  const named = statement.importClause?.namedBindings;
  assert.ok(named && ts.isNamedImports(named));
  for (const specifier of named.elements) {
    const exported = (specifier.propertyName || specifier.name).text;
    assert.equal(typeof operations[exported], 'function');
    bindings[specifier.name.text] = operations[exported];
  }
}
function harness(callback: ts.Node) {
  const updates: ((prior: any[]) => any[])[] = [], events: any[] = [];
  const js = ts.transpileModule(`return (${callback.getText(page)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const invoke = new Function(...Object.keys(bindings), 'setResources', 'toast', js)(...Object.values(bindings), (updater: any) => {
    assert.equal(typeof updater, 'function');
    updates.push(updater);
    events.push('setter');
  }, { show: (...args: any[]) => events.push(['toast', ...args]) });
  return { invoke, updates, events };
}
const deck = (id: any) => Object.freeze({ id, cards: Object.freeze([]) });
const resource = (id: string, flashcardDeck?: any) => Object.freeze({ id, title: id, type: 'quiz', data: Object.freeze({ flashcardDeck, quiz: Object.freeze({ questions: [] }), contentMarkdown: 'retained' }) });

test('mounted save prepends duplicates by reference using every latest snapshot without mutation', () => {
  const incoming = resource('same'), other = resource('other');
  const h = harness(save);
  h.invoke(incoming);
  assert.equal(h.updates.length, 1);
  for (const prior of [Object.freeze([]), Object.freeze([other, incoming, incoming])]) {
    const result = h.updates[0](prior as any);
    assert.notEqual(result, prior);
    assert.equal(result.length, prior.length + 1);
    for (const [i, expected] of [incoming, ...prior].entries()) assert.equal(result[i], expected);
  }
  assert.deepEqual(h.events, ['setter', ['toast', '✨ "same" guardado en la Biblioteca', 'success']]);
});

test('save toast reads the title after setter invocation and setter errors prevent the toast', () => {
  const incoming = { title: 'before' };
  const js = ts.transpileModule(`return (${save.getText(page)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const events: any[] = [];
  const invoke = new Function(...Object.keys(bindings), 'setResources', 'toast', js)(...Object.values(bindings), () => { incoming.title = 'after'; }, { show: (...args: any[]) => events.push(args) });
  invoke(incoming);
  assert.deepEqual(events, [['✨ "after" guardado en la Biblioteca', 'success']]);
  events.length = 0;
  const failing = new Function(...Object.keys(bindings), 'setResources', 'toast', js)(...Object.values(bindings), () => { throw new Error('setter failure'); }, { show: (...args: any[]) => events.push(args) });
  assert.throws(() => failing(incoming), /setter failure/);
  assert.deepEqual(events, []);
});

test('mounted deck replacement matches all nested IDs regardless of resource ID/type and retains spreads', () => {
  const old = deck('target'), incoming = deck('target');
  const first = resource('different', old), duplicate = resource('duplicate', old), other = resource('target', deck('other'));
  const absent = Object.freeze({ id: 'absent' });
  const prior = Object.freeze([first, other, duplicate, absent]);
  const h = harness(update);
  h.invoke(incoming);
  assert.deepEqual(h.events, ['setter']);
  const result = h.updates[0](prior as any);
  assert.notEqual(result, prior);
  for (const i of [0, 2]) {
    assert.notEqual(result[i], prior[i]);
    assert.notEqual(result[i].data, (prior[i] as any).data);
    assert.deepEqual(result[i], { ...prior[i], data: { ...(prior[i] as any).data, flashcardDeck: incoming } });
    assert.equal(result[i].data.flashcardDeck, incoming);
    assert.equal(result[i].data.quiz, (prior[i] as any).data.quiz);
  }
  assert.equal(result[1], other);
  assert.equal(result[3], absent);
  assert.equal(first.data.flashcardDeck, old);
});

test('deck updater retains strict matching, latest ID reads and fresh arrays on empty/no-match inputs', () => {
  const incoming = { id: 'stale' }, h = harness(update);
  h.invoke(incoming);
  incoming.id = 'latest';
  const latest = resource('one', deck('latest'));
  assert.equal(h.updates[0]([latest])[0].data.flashcardDeck, incoming);
  incoming.id = '1';
  for (const prior of [Object.freeze([]), Object.freeze([resource('one', deck(1))])]) {
    const result = h.updates[0](prior as any);
    assert.notEqual(result, prior);
    assert.deepEqual(result, prior);
    for (const [i, item] of prior.entries()) assert.equal(result[i], item);
  }
  assert.equal(h.updates.length, 1);
  const missing = resource('missing');
  h.invoke(deck(undefined));
  assert.equal(h.updates[1]([missing])[0].data.flashcardDeck.id, undefined);
});

test('callback source preserves immutable ae9fb45 baseline after resolving actual imported helpers', () => {
  const hashes = ['91e488dda02a5a4d7b0d6c40c1d687628b59aa05ae29d4731d9e8edcae48f239', '5a03d37ca011b88ee4205bb27c2c9f163c42ad947604e7aa0803bbae773e8990'];
  const application = existsSync(operationsUrl) ? parse(readFileSync(operationsUrl, 'utf8')) : undefined;
  for (const [i, callback] of [save, update].entries()) {
    let text = callback.getText(page);
    for (const [local, operation] of Object.entries(bindings)) {
      const fn = application!.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === operation.name) as ts.FunctionDeclaration;
      assert.ok(fn);
      const expression = (fn.body!.statements.find(ts.isReturnStatement) as ts.ReturnStatement).expression!;
      text = text.replace(`${local}(${fn.parameters.map(p => p.name.getText(application)).join(', ')})`, expression.getText(application));
    }
    const restored = parse(`const callback = ${text};`);
    const node = (restored.statements[0] as ts.VariableStatement).declarationList.declarations[0].initializer!;
    assert.equal(createHash('sha256').update(ts.createPrinter().printNode(ts.EmitHint.Unspecified, node, restored)).digest('hex'), hashes[i]);
  }
});

test('pure operations preserve the same edge cases without runtime/UI imports', { skip: !existsSync(operationsUrl) }, () => {
  const incoming = resource('new'), prior = Object.freeze([incoming]);
  assert.equal(operations.prependStudyResource(prior, incoming)[0], incoming);
  const updated = deck('new');
  assert.equal(operations.replaceResourceFlashcardDeck([resource('one', updated), resource('two', updated)], updated)[1].data.flashcardDeck, updated);
  const result = operations.replaceResourceFlashcardDeck(prior, updated);
  assert.notEqual(result, prior);
  assert.equal(result[0], incoming);
  const application = parse(readFileSync(operationsUrl, 'utf8'));
  assert.ok(application.statements.filter(ts.isImportDeclaration).every(n => n.importClause?.isTypeOnly));
});
