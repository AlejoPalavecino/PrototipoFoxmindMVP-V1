import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

// Discover current production owners, not a fixed teacher page or future shell.
// Parse source only: importing UI modules would execute unrelated browser code.
const sourceRoot = fileURLToPath(new URL('../../../', import.meta.url));
function productionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (/^(tests?|__tests__|__fixtures__)$/.test(entry.name)) return [];
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return productionFiles(filename);
    return /\.[cm]?[jt]sx?$/.test(entry.name)
      && !/\.(test|spec)\./.test(entry.name)
      && !/\.d\.ts$/.test(entry.name) ? [filename] : [];
  });
}
const filenames = productionFiles(sourceRoot);
const program = ts.createProgram(filenames, {
  noEmit: true,
  allowJs: true,
  jsx: ts.JsxEmit.Preserve,
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
});
const checker = program.getTypeChecker();
const sources = filenames.map(filename => program.getSourceFile(filename)!);

function nodesMatching<T extends ts.Node>(root: ts.Node, predicate: (node: ts.Node) => node is T): T[] {
  const matches: T[] = [];
  function visit(node: ts.Node) {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return matches;
}

function resolvedSymbol(node: ts.Node) {
  const symbol = checker.getSymbolAtLocation(node);
  return symbol && (symbol.flags & ts.SymbolFlags.Alias)
    ? checker.getAliasedSymbol(symbol) : symbol;
}

function isReturned(node: ts.Node): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isReturnStatement(parent)) return true;
    if (ts.isFunctionLike(parent)) {
      return ts.isArrowFunction(parent) && !ts.isBlock(parent.body);
    }
  }
  return false;
}

const details = sources.flatMap(source => nodesMatching(source,
  (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node)
    && node.name?.text === 'TeacherActivityDetail'));

// Baseline 7291d8c: TypeScript printer normalizes formatting and removes comments.
// These protect the active local-only update and drawer wiring, not UI interactions.
const printer = ts.createPrinter({ removeComments: true });
const normalizedHash = (node: ts.Node) => createHash('sha256')
  .update(printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()))
  .digest('hex');

test('removed dormant ActivityDetailView has no declaration or production consumers', () => {
  const references = sources.flatMap(source => nodesMatching(source,
    (node): node is ts.Identifier => ts.isIdentifier(node) && node.text === 'ActivityDetailView')
    .map(node => `${path.relative(sourceRoot, source.fileName)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`));
  assert.deepEqual(references, [], 'A dormant definition, import, call or JSX consumer reappeared');
});

// E2 baseline c3618f2: the only GradingPanel identifier across 116 production
// sources was its unexported page-local declaration; no unrelated live namesake.
test('removed dormant GradingPanel has no declaration or production consumers', () => {
  const references = sources.flatMap(source => nodesMatching(source,
    (node): node is ts.Identifier => ts.isIdentifier(node) && node.text === 'GradingPanel')
    .map(node => `${path.relative(sourceRoot, source.fileName)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`));
  assert.deepEqual(references, [], 'The removed local panel or a production consumer reappeared');
});

test('active TeacherActivityDetail is rendered by a current production owner with its callback props', () => {
  assert.equal(details.length, 1);
  const detailSymbol = resolvedSymbol(details[0].name!);
  assert.ok(detailSymbol);
  const consumers = sources.flatMap(source => nodesMatching(source,
    (node): node is ts.JsxOpeningElement | ts.JsxSelfClosingElement =>
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && resolvedSymbol(node.tagName) === detailSymbol && isReturned(node)));
  assert.ok(consumers.length > 0, 'An import or declaration alone is not a rendered consumer');
  for (const consumer of consumers) {
    for (const name of ['activity', 'submissions', 'setSubmissions', 'onBack']) {
      const attribute = consumer.attributes.properties.find(property =>
        ts.isJsxAttribute(property) && property.name.getText() === name);
      assert.ok(attribute && ts.isJsxAttribute(attribute)
        && attribute.initializer && ts.isJsxExpression(attribute.initializer)
        && attribute.initializer.expression, `Missing rendered ${name} expression`);
    }
  }
});

test('active detail renders the resolved TeacherGradingDrawer with its local save callback', () => {
  assert.equal(details.length, 1);
  const declarations = sources.flatMap(source => nodesMatching(source,
    (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node)
      && node.name?.text === 'TeacherGradingDrawer'));
  assert.equal(declarations.length, 1);
  const drawerSymbol = resolvedSymbol(declarations[0].name!);
  assert.ok(drawerSymbol);
  const consumers = nodesMatching(details[0],
    (node): node is ts.JsxOpeningElement | ts.JsxSelfClosingElement =>
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && resolvedSymbol(node.tagName) === drawerSymbol && isReturned(node));
  assert.equal(consumers.length, 1, 'The actual drawer, not a same-named local substitute, must render');
  const callbacks = nodesMatching(details[0], (node): node is ts.VariableDeclaration =>
    ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'handleSaveGrading');
  assert.equal(callbacks.length, 1);
  const onSave = consumers[0].attributes.properties.find(property =>
    ts.isJsxAttribute(property) && property.name.getText() === 'onSave');
  assert.ok(onSave && ts.isJsxAttribute(onSave) && onSave.initializer
    && ts.isJsxExpression(onSave.initializer) && onSave.initializer.expression);
  assert.equal(resolvedSymbol(onSave.initializer.expression), resolvedSymbol(callbacks[0].name));
});

test('active grading retains its local setter, feedback, breakdown and rendered drawer callback', () => {
  assert.equal(details.length, 1);
  const grading = nodesMatching(details[0], (node): node is ts.VariableDeclaration =>
    ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'handleSaveGrading');
  const drawers = nodesMatching(details[0], (node): node is ts.JsxSelfClosingElement =>
    ts.isJsxSelfClosingElement(node) && node.tagName.getText() === 'TeacherGradingDrawer' && isReturned(node));
  assert.equal(grading.length, 1);
  assert.equal(drawers.length, 1);
  assert.equal(normalizedHash(grading[0]), 'fe08b64915fc01a2d906ee58eac84d0857d6a3dfd20cca2fc48d9e42b1054107');
  assert.equal(normalizedHash(drawers[0]), '3f62e12c5e1e743973af0a01c009c0d594064b452a142c9f83ef46b6b056ba52');
});
