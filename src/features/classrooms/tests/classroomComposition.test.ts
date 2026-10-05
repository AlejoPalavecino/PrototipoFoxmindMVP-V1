import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

// Progressive E3 coverage: only the current page and the optional profile leaf.
// No future shell/controller/session/UI-barrel files and no browser module execution.
const pagePath = fileURLToPath(new URL('../../../views/docente/AulasDocente.tsx', import.meta.url));
const leafPath = fileURLToPath(new URL('../components/teacher/TeacherClassroomDetailProfile.tsx', import.meta.url));
const filenames = [pagePath, leafPath].filter(existsSync);
const program = ts.createProgram(filenames, {
  noEmit: true,
  jsx: ts.JsxEmit.Preserve,
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
});
const checker = program.getTypeChecker();
const sources = filenames.map(filename => program.getSourceFile(filename)!);
const printer = ts.createPrinter({ removeComments: true });
function nodesMatching<T extends ts.Node>(root: ts.Node, predicate: (node: ts.Node) => node is T): T[] {
  const matches: T[] = [];
  function visit(node: ts.Node) {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return matches;
}
// The printer preserves spaces on blank JSX lines. Ignore only CRLF and line-end
// whitespace, matching the target leaf formatting without changing literals/copy.
const normalize = (text: string) => text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '');
const print = (node: ts.Node) => normalize(printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()));
const hashText = (text: string) => createHash('sha256').update(text).digest('hex');
const hash = (node: ts.Node) => hashText(print(node));
function resolvedSymbol(node: ts.Node) {
  const symbol = checker.getSymbolAtLocation(node);
  return symbol && (symbol.flags & ts.SymbolFlags.Alias) ? checker.getAliasedSymbol(symbol) : symbol;
}
function isReturned(node: ts.Node): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isReturnStatement(parent)) return true;
    if (ts.isFunctionLike(parent)) return ts.isArrowFunction(parent) && !ts.isBlock(parent.body);
  }
  return false;
}
const profiles = sources.flatMap(source => nodesMatching(source,
  (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === 'StudentProfilePanel'));
function profile() {
  assert.equal(profiles.length, 1, 'Exactly one current production profile implementation');
  assert.ok(profiles[0].body);
  return profiles[0];
}
const declarations = () => nodesMatching(profile(), (node): node is ts.VariableDeclaration => ts.isVariableDeclaration(node));

// Captured before relocation from 19a4353. Passing source characterization,
// not a behavioral RED or proof of browser events/animation/timer execution.
test('profile retains its complete baseline body and returned JSX including risk copy, charts and modals', () => {
  const owner = profile();
  assert.equal(hash(owner.body!), '302c73c3c1656d750c97dd8ff095774df49d050f54c207941c451dc8676c46db');
  assert.equal(hashText(normalize(owner.body!.getText())), 'c1dbed17c2b8b15ed2fb9b22704d1476ced8654347fd5bd3c7ead43e9c50be16',
    'Complete source including comments must remain baseline-identical after whitespace normalization');
  const returned = owner.body!.statements.filter(ts.isReturnStatement);
  assert.equal(returned.length, 1);
  assert.equal(hash(returned[0]), 'dbd50c6df6bd3893fae003cae10139a36a2b515766e05d21089343d85c5e4f66');
});

test('profile retains all seven local initial states and ordered plan/message event callbacks', () => {
  const variables = declarations();
  const states = variables.filter(node => ts.isArrayBindingPattern(node.name));
  assert.equal(states.length, 7);
  assert.equal(hashText(states.map(print).join('\n')), '09522c13c1b8860e076022e50d3b3050c5671f0d3af7e2abaf4e03fa2a2f74a6');
  const callbacks: Record<string, string> = {
    handleGeneratePlan: 'af56bf18bb7938d59b383e28e7532e8038dc7449aeaec3714a3c60345e792c4a',
    handleSendPlan: 'b8aee70ad30956f5b7109f6dd25dd62846179626a03b1b79b24e57e7bf675d36',
    handleDiscardPlan: '73dbd06d75d200494cd843b0b66d89b3dc2b1151aef836bae659acb783476fb7',
    handleDeactivatePlan: 'a213967e406c3b6ba0a26805785a7eef1f057482f9394f272ffedeada193a52e',
    handleContact: '39dd1a20eae59932603dd18b56c1663fca66845b97ee9df9b2d02f8a7e9d5242',
    handleSendMessage: '169f09ca2731dcbbbba9c2ac9d76f850ab659ba51a499471b5a4d598b5559709',
  };
  for (const [name, expected] of Object.entries(callbacks)) {
    const matches = variables.filter(node => ts.isIdentifier(node.name) && node.name.text === name);
    assert.equal(matches.length, 1, name);
    assert.equal(hash(matches[0]), expected, name);
  }
  const calls = nodesMatching(profile(), (node): node is ts.CallExpression => ts.isCallExpression(node));
  const timers = calls.filter(node => node.expression.getText() === 'setTimeout');
  assert.equal(timers.length, 1);
  assert.equal(timers[0].arguments[1].getText(), '2000');
  assert.equal(calls.filter(node => /^(clearTimeout|useEffect|useLayoutEffect)$/.test(node.expression.getText())).length, 0,
    'The original uncancelled timer must not gain cleanup or reset-on-student-change effects');
});

test('actual resolved profile consumer retains conditional AnimatePresence, props, close callback and no key', () => {
  const symbol = resolvedSymbol(profile().name!);
  assert.ok(symbol);
  const consumers = sources.flatMap(source => nodesMatching(source,
    (node): node is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(node)
      && resolvedSymbol(node.tagName) === symbol && isReturned(node)));
  assert.equal(consumers.length, 1, 'An import or namesake is not an active rendered consumer');
  const consumer = consumers[0];
  assert.equal(hash(consumer), 'f6ca4daa5651c0da6dac666c65e53cc3a4c386689223ef7185f7841952907b4b');
  const conditional = consumer.parent.parent.parent;
  assert.ok(ts.isJsxExpression(conditional));
  assert.equal(hash(conditional), '58bd0a63c7aeac5b17cb8867fc2ef051d903bbd93359dfb21375a2fe5aac65cf');
  const presence = conditional.parent;
  assert.ok(ts.isJsxElement(presence));
  assert.equal(presence.openingElement.tagName.getText(), 'AnimatePresence');
  assert.equal(presence.openingElement.attributes.properties.length, 0);
  assert.equal(consumer.attributes.properties.some(node => ts.isJsxAttribute(node) && node.name.getText() === 'key'), false);
});

test('current profile ownership is unique and the extracted leaf uses only existing UI dependencies', () => {
  const owner = profile();
  const page = program.getSourceFile(pagePath)!;
  if (!existsSync(leafPath)) {
    assert.equal(owner.getSourceFile(), page, 'Pre-extraction characterization owner');
    return;
  }
  assert.equal(owner.getSourceFile(), program.getSourceFile(leafPath));
  assert.ok(owner.modifiers?.some(node => node.kind === ts.SyntaxKind.ExportKeyword));
  assert.equal(nodesMatching(page, (node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'StudentProfilePanel').length, 0);
  const imports = page.statements.filter(ts.isImportDeclaration).filter(node =>
    ts.isStringLiteral(node.moduleSpecifier)
    && node.moduleSpecifier.text === '../../features/classrooms/components/teacher/TeacherClassroomDetailProfile');
  assert.equal(imports.length, 1, 'Direct leaf import; no UI barrel introduced in E3');
  const bindings = imports[0].importClause?.namedBindings;
  assert.ok(bindings && ts.isNamedImports(bindings));
  assert.equal(bindings.elements.length, 1);
  assert.equal(resolvedSymbol(bindings.elements[0].name), resolvedSymbol(owner.name!));
  assert.deepEqual(owner.getSourceFile().statements.filter(ts.isImportDeclaration).map(node =>
    (node.moduleSpecifier as ts.StringLiteral).text), [
    'react', 'motion/react', 'lucide-react', '../../../../components/ui/Toaster',
  ], 'No view, repository, session, controller or future data/type dependencies');
});
