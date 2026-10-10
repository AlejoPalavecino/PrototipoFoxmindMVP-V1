import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

// Progressive E8 follows actual rendered owners, with optional shell files for
// passing characterization before/after relocation. No browser module execution.
const pagePath = fileURLToPath(new URL('../../../views/docente/AulasDocente.tsx', import.meta.url));
const leafPath = fileURLToPath(new URL('../components/teacher/TeacherClassroomDetailProfile.tsx', import.meta.url));
const hookPath = fileURLToPath(new URL('../hooks/useTeacherClassroomDetail.ts', import.meta.url));
const materialsPath = fileURLToPath(new URL('../components/teacher/TeacherClassroomDetailMaterials.tsx', import.meta.url));
const invitationPath = fileURLToPath(new URL('../components/teacher/TeacherClassroomDetailInvitation.tsx', import.meta.url));
const compositionPaths = ['TeacherClassroomDetail', 'TeacherClassroomDetailBody', 'TeacherClassroomDetailModals']
  .map(name => fileURLToPath(new URL(`../components/teacher/${name}.tsx`, import.meta.url)));
const studentPagePath = fileURLToPath(new URL('../../../views/alumno/AulasAlumno.tsx', import.meta.url));
const filenames = [pagePath, leafPath, hookPath, materialsPath, invitationPath, ...compositionPaths, studentPagePath].filter(existsSync);
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

function renderedOwner(parent: ts.FunctionDeclaration, name: string) {
  const consumers = nodesMatching(parent, (node): node is ts.JsxSelfClosingElement =>
    ts.isJsxSelfClosingElement(node) && node.tagName.getText() === name && isReturned(node));
  assert.equal(consumers.length, 1, `Exactly one actual rendered ${name} consumer`);
  const declaration = resolvedSymbol(consumers[0].tagName)?.valueDeclaration;
  assert.ok(declaration && ts.isFunctionDeclaration(declaration) && declaration.body);
  return { owner: declaration, consumer: consumers[0] };
}
function currentDetail() {
  const page = program.getSourceFile(pagePath)!;
  const owner = page.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'AulasDocente')!;
  return renderedOwner(owner, existsSync(compositionPaths[0]) ? 'TeacherClassroomDetail' : 'AulaDetail').owner;
}
function presentationOwner(name: string) {
  const detail = currentDetail();
  if (!existsSync(compositionPaths[0])) return detail;
  const { owner, consumer } = renderedOwner(detail, name);
  assert.deepEqual(consumer.attributes.properties.map(node => ts.isJsxAttribute(node) ? node.name.getText() : undefined), ['aula', 'detail']);
  const mounted = (detail.body!.statements[0] as ts.VariableStatement).declarationList.declarations[0];
  assert.ok(ts.isObjectBindingPattern(detail.parameters[0].name));
  for (const name of ['aula', 'detail']) {
    const prop = consumer.attributes.properties.find(node => ts.isJsxAttribute(node) && node.name.getText() === name) as ts.JsxAttribute;
    assert.ok(prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression);
    const supplied = name === 'detail' ? mounted.name : detail.parameters[0].name.elements.find(item => item.name.getText() === 'aula')!.name;
    assert.equal(resolvedSymbol(prop.initializer.expression), resolvedSymbol(supplied));
  }
  assert.equal(nodesMatching(owner, (node): node is ts.CallExpression => ts.isCallExpression(node)
    && /^(useState|useEffect|useTeacherClassroomDetail)$/.test(node.expression.getText())).length, 0);
  return owner;
}
function controllerBinding(owner: ts.FunctionDeclaration) {
  return (owner.body!.statements[owner === currentDetail() ? 1 : 0] as ts.VariableStatement).declarationList.declarations[0];
}
function currentMaterials() {
  const detail = currentDetail();
  const owner = presentationOwner('TeacherClassroomDetailModals');
  const page = owner.getSourceFile();
  const returned = owner.body!.statements.find(ts.isReturnStatement)!;
  assert.ok(returned.expression && ts.isParenthesizedExpression(returned.expression));
  const root = returned.expression.expression;
  assert.ok(ts.isJsxElement(root) || ts.isJsxFragment(root));
  const leaf = program.getSourceFile(materialsPath)?.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'TeacherClassroomDetailMaterials');
  let children: readonly ts.JsxChild[] = root.children;
  let binding = controllerBinding(owner);
  if (leaf) {
    const consumers = nodesMatching(owner, (node): node is ts.JsxSelfClosingElement =>
      ts.isJsxSelfClosingElement(node) && resolvedSymbol(node.tagName) === resolvedSymbol(leaf.name!));
    assert.equal(consumers.length, 1, 'Resolve the actual materials declaration, not an imported namesake');
    const consumer = consumers[0];
    assert.equal(consumer.parent, root, 'Unconditional sibling at existing detail lifetime');
    assert.equal(consumer.attributes.properties.length, 1, 'Only detail prop; no key or extra callbacks');
    const prop = consumer.attributes.properties[0];
    assert.ok(ts.isJsxAttribute(prop) && prop.name.getText() === 'detail'
      && prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression);
    assert.ok(binding.initializer);
    assert.equal(resolvedSymbol(prop.initializer.expression), resolvedSymbol(binding.initializer));
    const leafReturn = leaf.body!.statements.find(ts.isReturnStatement)!;
    assert.ok(leafReturn.expression && ts.isParenthesizedExpression(leafReturn.expression));
    const fragment = leafReturn.expression.expression;
    assert.ok(ts.isJsxFragment(fragment));
    const index = children.indexOf(consumer);
    children = [...children.slice(0, index), ...fragment.children.slice(1, -1), ...children.slice(index + 1)];
    binding = (leaf.body!.statements[0] as ts.VariableStatement).declarationList.declarations[0];
    assert.equal(binding.initializer!.getText(), 'detail');
    const parameter = leaf.parameters[0].name;
    assert.ok(ts.isObjectBindingPattern(parameter));
    assert.equal(resolvedSymbol(binding.initializer!), resolvedSymbol(parameter.elements[0].name));
    const imports = page.statements.filter(ts.isImportDeclaration).filter(node =>
      /\/TeacherClassroomDetailMaterials$/.test((node.moduleSpecifier as ts.StringLiteral).text));
    assert.equal(imports.length, 1, 'Direct materials import without changing the UI barrel');
    assert.ok(leaf.parameters[0].type && /detail: TeacherClassroomDetailController/.test(print(leaf.parameters[0].type)));
    assert.equal(nodesMatching(leaf, (node): node is ts.CallExpression => ts.isCallExpression(node)
      && /useState|useEffect|setTimeout|Repository/.test(node.expression.getText())).length, 0);
  }
  const mounted = (detail.body!.statements[0] as ts.VariableStatement).declarationList.declarations[0];
  assert.ok(mounted.initializer && ts.isCallExpression(mounted.initializer));
  const controller = program.getSourceFile(hookPath)!.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'useTeacherClassroomDetail')!;
  assert.equal(resolvedSymbol(mounted.initializer.expression), resolvedSymbol(controller.name!));
  assert.equal(mounted.initializer.arguments[0].getText(), 'aula');
  const dialogs = children.filter((node): node is ts.JsxElement => ts.isJsxElement(node)
    && node.openingElement.tagName.getText() === 'AnimatePresence'
    && /isPlanModalOpen|isUploadModalOpen/.test(print(node)));
  assert.equal(dialogs.length, 2);
  return { children, dialogs, binding, controller };
}

function currentInvitation() {
  const detail = presentationOwner('TeacherClassroomDetailModals');
  const page = detail.getSourceFile();
  const returned = detail.body!.statements.find(ts.isReturnStatement)!;
  assert.ok(returned.expression && ts.isParenthesizedExpression(returned.expression));
  const root = returned.expression.expression;
  assert.ok(ts.isJsxElement(root) || ts.isJsxFragment(root));
  const leaf = program.getSourceFile(invitationPath)?.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'TeacherClassroomDetailInvitation');
  let binding = controllerBinding(detail);
  let consumer: ts.JsxSelfClosingElement | undefined;
  let presence: ts.Node;
  if (leaf) {
    const consumers = nodesMatching(detail, (node): node is ts.JsxSelfClosingElement =>
      ts.isJsxSelfClosingElement(node) && resolvedSymbol(node.tagName) === resolvedSymbol(leaf.name!));
    assert.equal(consumers.length, 1, 'Resolve the actual rendered invitation declaration');
    consumer = consumers[0];
    assert.equal(consumer.parent, root, 'Unconditional sibling at the existing detail lifetime');
    assert.deepEqual(consumer.attributes.properties.map(node => ts.isJsxAttribute(node) ? node.name.getText() : undefined), ['aula', 'detail'],
      'Only original classroom and mounted controller props; no key or extra callbacks');
    const suppliedDetail = binding.initializer!;
    assert.ok(ts.isObjectBindingPattern(detail.parameters[0].name));
    assert.ok(ts.isObjectBindingPattern(leaf.parameters[0].name));
    for (const name of ['aula', 'detail']) {
      const prop = consumer.attributes.properties.find(node => ts.isJsxAttribute(node) && node.name.getText() === name)!;
      assert.ok(ts.isJsxAttribute(prop) && prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression);
      const supplied = name === 'detail' ? suppliedDetail : detail.parameters[0].name.elements.find(item => item.name.getText() === 'aula')!.name;
      assert.equal(resolvedSymbol(prop.initializer.expression), resolvedSymbol(supplied));
    }
    assert.ok(binding.initializer);
    assert.equal(resolvedSymbol(binding.initializer), resolvedSymbol(suppliedDetail));
    binding = (leaf.body!.statements[0] as ts.VariableStatement).declarationList.declarations[0];
    assert.ok(binding.initializer);
    const controllerProp = leaf.parameters[0].name.elements.find(item => item.name.getText() === 'detail')!;
    assert.equal(resolvedSymbol(binding.initializer), resolvedSymbol(controllerProp.name));
    const leafReturn = leaf.body!.statements.find(ts.isReturnStatement)!;
    assert.ok(leafReturn.expression && ts.isParenthesizedExpression(leafReturn.expression));
    presence = leafReturn.expression.expression;
    assert.equal(leaf.body!.statements.length, 2, 'Only controller destructuring and presentation return');
    assert.ok(leaf.parameters[0].type);
    assert.equal(print(leaf.parameters[0].type), '{\n    aula: Classroom;\n    detail: TeacherClassroomDetailController;\n}');
    const imports = page.statements.filter(ts.isImportDeclaration).filter(node =>
      /\/TeacherClassroomDetailInvitation$/.test((node.moduleSpecifier as ts.StringLiteral).text));
    assert.equal(imports.length, 1, 'Direct leaf import; no public barrel change');
    assert.deepEqual(leaf.getSourceFile().statements.filter(ts.isImportDeclaration).map(node =>
      (node.moduleSpecifier as ts.StringLiteral).text), [
      'react', 'motion/react', 'lucide-react', '../../../../components/ui/Toaster',
      '../../model/Classroom', '../../hooks/useTeacherClassroomDetail',
    ]);
  } else {
    const matches = root.children.filter((node): node is ts.JsxElement => ts.isJsxElement(node)
      && /isInviteStudentModalOpen &&/.test(print(node)));
    assert.equal(matches.length, 1, 'Pre-relocation invitation characterization');
    presence = matches[0];
  }
  assert.ok(ts.isJsxElement(presence));
  assert.equal(presence.openingElement.tagName.getText(), 'AnimatePresence');
  assert.equal(presence.openingElement.attributes.properties.length, 0);
  return { presence, binding, consumer, detail, leaf };
}

// Captured from the actual E6 page before moving invitation presentation.
// Complete markup fingerprint includes email/code branches, clipboard and close handlers.
test('invitation retains complete Spanish JSX, conditional presence and all mounted controller bindings', () => {
  const { presence, binding } = currentInvitation();
  assert.equal(hash(presence), '1c6bf02cd337ad44308608ecd206b2391a447776aeff868e35e8e9eb1ea3b8cd');
  assert.ok(ts.isObjectBindingPattern(binding.name));
  const controller = program.getSourceFile(hookPath)!.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'useTeacherClassroomDetail')!;
  const returned = controller.body!.statements.find(ts.isReturnStatement)!.expression;
  assert.ok(returned && ts.isObjectLiteralExpression(returned));
  for (const name of ['isInviteStudentModalOpen', 'setIsInviteStudentModalOpen', 'inviteModalTab', 'setInviteModalTab',
    'inviteEmailInput', 'setInviteEmailInput', 'invitedEmailsList', 'setInvitedEmailsList', 'inviteCustomNote',
    'setInviteCustomNote', 'copiedCode', 'setCopiedCode', 'copiedLink', 'setCopiedLink',
    'handleAddInviteEmail', 'handleRemoveInviteEmail', 'handleSendEmailInvitations']) {
    const local = binding.name.elements.find(item => item.name.getText() === name);
    assert.ok(local, `Presentation consumes ${name}`);
    const uses = nodesMatching(presence, (node): node is ts.Identifier => ts.isIdentifier(node) && node.text === name);
    assert.ok(uses.length > 0, `${name} is used in actual returned invitation JSX`);
    uses.forEach(use => assert.equal(resolvedSymbol(use), resolvedSymbol(local.name)));
    const property = returned.properties.find((node): node is ts.ShorthandPropertyAssignment =>
      ts.isShorthandPropertyAssignment(node) && node.name.text === name);
    assert.ok(property, `Mounted controller returns ${name}`);
    assert.equal(checker.getShorthandAssignmentValueSymbol(property)?.valueDeclaration?.getSourceFile(), program.getSourceFile(hookPath));
  }
});

test('invitation keeps both uncancelled clipboard resets in the actual presentation owner', () => {
  const { presence, detail, leaf } = currentInvitation();
  const calls = nodesMatching(leaf ?? detail, (node): node is ts.CallExpression => ts.isCallExpression(node));
  const timers = calls.filter(node => node.expression.getText() === 'setTimeout');
  assert.equal(timers.length, 2, 'Both original timers remain in actual leaf, or page before relocation');
  assert.deepEqual(timers.map(node => print(node)), [
    'setTimeout(() => setCopiedCode(false), 2000)', 'setTimeout(() => setCopiedLink(false), 2000)',
  ]);
  assert.equal(calls.filter(node => /^(clearTimeout|useState|useEffect|useLayoutEffect)$/.test(node.expression.getText())).length, 0);
  assert.equal(nodesMatching(presence, (node): node is ts.CallExpression => ts.isCallExpression(node)
    && node.expression.getText() === 'navigator.clipboard.writeText').length, 3);
});

test('both materials dialogs retain baseline presence boundaries, complete Spanish markup and handlers', () => {
  const { dialogs, binding, controller } = currentMaterials();
  assert.deepEqual(dialogs.map(hash), [
    'da14a9e007936361733a750b629a62f95570a75e9d3455d1bf1357b37e34ecf1',
    '07c51c119608e1a0d75a1582712b660de5db7d40806cd013a7ea7a3300d687c5',
  ]);
  assert.ok(ts.isObjectBindingPattern(binding.name));
  const returned = controller.body!.statements.find(ts.isReturnStatement)!.expression;
  assert.ok(returned && ts.isObjectLiteralExpression(returned));
  for (const name of ['isPlanModalOpen', 'setIsPlanModalOpen', 'isUploadModalOpen', 'setIsUploadModalOpen',
    'newFileTitle', 'setNewFileTitle', 'newFileType', 'setNewFileType', 'handleUploadFile']) {
    const local = binding.name.elements.find(item => item.name.getText() === name);
    assert.ok(local, `Actual presentation consumes ${name}`);
    const uses = dialogs.flatMap(dialog => nodesMatching(dialog, (node): node is ts.Identifier =>
      ts.isIdentifier(node) && node.text === name));
    assert.ok(uses.length > 0, `${name} is used by returned dialog JSX`);
    uses.forEach(use => assert.equal(resolvedSymbol(use), resolvedSymbol(local.name)));
    const property = returned.properties.find((node): node is ts.ShorthandPropertyAssignment =>
      ts.isShorthandPropertyAssignment(node) && node.name.text === name);
    assert.ok(property, `Mounted controller returns ${name}`);
    assert.equal(checker.getShorthandAssignmentValueSymbol(property)?.valueDeclaration?.getSourceFile(), program.getSourceFile(hookPath));
  }
});

test('materials keep wizard-before-plan-before-upload-before-unkeyed-profile-before-invitation order', () => {
  const { children, dialogs } = currentMaterials();
  const wizard = children.findIndex(node => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === 'CreateActivityModal');
  const profilePresence = children.findIndex(node => ts.isJsxElement(node) && /selectedStudentProfile &&/.test(print(node)));
  const current = currentInvitation();
  const invitation = children.indexOf(current.consumer ?? current.presence as ts.JsxElement);
  assert.ok(wizard >= 0 && wizard < children.indexOf(dialogs[0]));
  assert.ok(children.indexOf(dialogs[0]) < children.indexOf(dialogs[1]));
  assert.ok(children.indexOf(dialogs[1]) < profilePresence && profilePresence < invitation);
  const wizardNode = children[wizard] as ts.JsxSelfClosingElement;
  assert.equal(wizardNode.attributes.properties.some(node => ts.isJsxAttribute(node) && node.name.getText() === 'key'), false);
});

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
  const page = presentationOwner('TeacherClassroomDetailModals').getSourceFile();
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
    && /\/TeacherClassroomDetailProfile$/.test(node.moduleSpecifier.text));
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

test('profile selection is supplied by the resolved unconditional controller at the existing detail mount', () => {
  const detail = currentDetail();
  assert.ok(detail?.body);
  const hook = program.getSourceFile(hookPath)!;
  const controller = hook.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'useTeacherClassroomDetail')!;
  assert.ok(controller?.name);
  assert.equal(nodesMatching(detail, (node): node is ts.CallExpression => ts.isCallExpression(node)
    && resolvedSymbol(node.expression) === resolvedSymbol(controller.name!)).length, 1,
  'Exactly one hook call in the actual mounted detail');
  const first = detail.body.statements[0];
  assert.ok(ts.isVariableStatement(first));
  const mounted = first.declarationList.declarations[0];
  assert.ok(ts.isIdentifier(mounted.name) && mounted.initializer && ts.isCallExpression(mounted.initializer));
  assert.equal(resolvedSymbol(mounted.initializer.expression), resolvedSymbol(controller.name));
  assert.equal(mounted.initializer.arguments[0].getText(), 'aula');
  const presentation = presentationOwner('TeacherClassroomDetailModals');
  const second = presentation.body!.statements[presentation === detail ? 1 : 0];
  assert.ok(ts.isVariableStatement(second));
  const binding = second.declarationList.declarations[0];
  assert.ok(ts.isObjectBindingPattern(binding.name) && binding.initializer);
  const controllerProp = presentation === detail ? mounted.name
    : (presentation.parameters[0].name as ts.ObjectBindingPattern).elements.find(item => item.name.getText() === 'detail')!.name;
  assert.equal(resolvedSymbol(binding.initializer), resolvedSymbol(controllerProp));
  assert.equal(detail.body.statements.length, 3, 'Unconditional call, controller destructuring, returned JSX');
  const selected = binding.name.elements.find(item => item.name.getText() === 'selectedStudentProfile')!;
  assert.ok(selected);
  const consumers = nodesMatching(presentation, (node): node is ts.JsxSelfClosingElement =>
    ts.isJsxSelfClosingElement(node) && resolvedSymbol(node.tagName) === resolvedSymbol(profile().name!));
  const student = consumers[0].attributes.properties.find(node => ts.isJsxAttribute(node) && node.name.getText() === 'student') as ts.JsxAttribute;
  assert.equal(resolvedSymbol((student.initializer as ts.JsxExpression).expression!), resolvedSymbol(selected.name));
  const selection = nodesMatching(controller, (node): node is ts.VariableDeclaration =>
    ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.name.elements[0].getText() === 'selectedStudentProfile');
  assert.equal(selection.length, 1);
  assert.equal(selection[0].initializer!.getText(), 'useState<any | null>(null)');
  const returned = controller.body!.statements.find(ts.isReturnStatement)!;
  assert.ok(returned.expression && ts.isObjectLiteralExpression(returned.expression));
  const property = returned.expression.properties.find(node => ts.isShorthandPropertyAssignment(node) && node.name.text === 'selectedStudentProfile') as ts.ShorthandPropertyAssignment;
  const selectionBinding = (selection[0].name as ts.ArrayBindingPattern).elements[0];
  assert.ok(ts.isBindingElement(selectionBinding));
  assert.equal(checker.getShorthandAssignmentValueSymbol(property), resolvedSymbol(selectionBinding.name));
});

// Progressive E9 resolves the actual page consumer and single controller/body path.
test('student composition retains page selection/back props and one controller before the activity early return', () => {
  const page = program.getSourceFile(studentPagePath)!;
  const owner = page.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'AulasAlumno')!;
  const membershipMount = nodesMatching(owner, ts.isVariableDeclaration).find(node => node.name.getText() === 'membership');
  if (membershipMount) {
    assert.ok(membershipMount.initializer && ts.isCallExpression(membershipMount.initializer));
    const hook = resolvedSymbol(membershipMount.initializer.expression)?.valueDeclaration;
    assert.ok(hook && ts.isFunctionDeclaration(hook) && hook.body);
    assert.equal(membershipMount.parent.parent.parent, owner.body);
    assert.equal(membershipMount.initializer.arguments.length, 0);
    const membershipStates = nodesMatching(hook, ts.isVariableDeclaration).filter(node => ts.isArrayBindingPattern(node.name));
    assert.deepEqual(membershipStates.map(node => [node.name.getText(), node.initializer?.getText()]), [
      ['[classrooms, setClassrooms]', 'useState<Classroom[]>(() => [...classroomRepository.readMembership()])'],
      ['[isJoinModalOpen, updateIsJoinModalOpen]', 'useState(false)'],
      ['[invitationCode, updateInvitationCode]', "useState('')"],
      ['[isJoining, setIsJoining]', 'useState(false)'],
      ['[joinError, setJoinError]', 'useState<string | null>(null)'],
    ], 'Membership owns the original snapshot/draft plus pending/error, not the page or dialog');
    const returnedMembership = hook.body.statements.find(ts.isReturnStatement)?.expression;
    assert.ok(returnedMembership && ts.isObjectLiteralExpression(returnedMembership));
    assert.deepEqual(returnedMembership.properties.map(node => node.name?.getText()), [
      'classrooms', 'isJoinModalOpen', 'setIsJoinModalOpen', 'invitationCode', 'setInvitationCode', 'handleJoinClassroom', 'isJoining', 'joinError',
    ]);
    const hookVariables = nodesMatching(hook, ts.isVariableDeclaration);
    for (const [setter, field, update] of [
      ['setIsJoinModalOpen', 'open', 'updateIsJoinModalOpen'],
      ['setInvitationCode', 'code', 'updateInvitationCode'],
    ]) {
      const declaration = hookVariables.find(node => node.name.getText() === setter);
      assert.ok(declaration?.initializer && ts.isArrowFunction(declaration.initializer));
      assert.equal(print(declaration.initializer).replace(/\s+/g, ''),
        `next=>{if(!active.current||!gate.edit())return;constvalue=typeofnext==='function'?next(draft.current.${field}):next;draft.current.${field}=value;${update}(value);setJoinError(null);}`,
        'Both public setters retain functional updates and use the synchronous edit gate');
      const property = returnedMembership.properties.find(node => ts.isShorthandPropertyAssignment(node) && node.name.text === setter);
      assert.ok(property && ts.isShorthandPropertyAssignment(property));
      assert.equal(checker.getShorthandAssignmentValueSymbol(property), resolvedSymbol(declaration.name));
    }
    const pageEffects = nodesMatching(owner, (node): node is ts.CallExpression => ts.isCallExpression(node)
      && node.expression.getText() === 'useEffect');
    const membershipEffects = nodesMatching(hook, (node): node is ts.CallExpression => ts.isCallExpression(node)
      && node.expression.getText() === 'useEffect');
    assert.equal(pageEffects.length, 1); assert.equal(membershipEffects.length, 1);
    assert.equal(pageEffects[0].arguments[1].getText(), '[navigationParams?.aulaId, selectedAula, setView]');
    const pageVariables = nodesMatching(owner, ts.isVariableDeclaration);
    const selection = pageVariables.find(node => node.name.getText() === 'selectedAula');
    assert.ok(selection?.initializer && ts.isCallExpression(selection.initializer));
    assert.equal(selection.initializer.expression.getText(), 'resolveStudentClassroom');
    assert.deepEqual(selection.initializer.arguments.map(node => node.getText()), ['classrooms', 'navigationParams']);
    assert.equal(nodesMatching(owner, ts.isCallExpression).filter(node => node.expression.getText() === 'useState').length, 0,
      'Route identity must not survive in page-local selection state');
    assert.match(pageEffects[0].arguments[0].getText(), /if \(navigationParams\?\.aulaId && !selectedAula\) setView\('aulas', undefined, 'replace'\)/);
    const select = pageVariables.find(node => node.name.getText() === 'handleSelect');
    const back = pageVariables.find(node => node.name.getText() === 'handleBack');
    assert.ok(select?.initializer && back?.initializer);
    assert.match(select.initializer.getText(), /setView\('aulas', \{ aulaId: aula.id \}\)/);
    assert.match(back.initializer.getText(), /setView\('aulas', undefined, 'replace'\)/);
    const list = renderedOwner(owner, 'StudentClassroomList');
    const onSelect = list.consumer.attributes.properties.find(node => ts.isJsxAttribute(node) && node.name.getText() === 'onSelect') as ts.JsxAttribute;
    assert.ok(onSelect.initializer && ts.isJsxExpression(onSelect.initializer) && onSelect.initializer.expression);
    assert.equal(resolvedSymbol(onSelect.initializer.expression), resolvedSymbol(select.name));
    assert.equal(membershipEffects[0].arguments[1].getText(), '[]');
    const gateCall = nodesMatching(hook, ts.isCallExpression).filter(node => node.expression.getText() === 'gate.join');
    assert.equal(gateCall.length, 1, 'One gated operation owns confirmation, not a second direct enrollment');
    assert.deepEqual(gateCall[0].arguments.slice(0, 3).map(node => node.getText()), ['draft.current.code', 'classrooms', 'joinOperation']);
    const callbacks = gateCall[0].arguments[3];
    assert.ok(ts.isObjectLiteralExpression(callbacks));
    assert.deepEqual(callbacks.properties.map(node => node.name?.getText()), ['onPendingChange', 'onError', 'onConfirmed']);
    const pending = callbacks.properties[0];
    const error = callbacks.properties[1];
    const confirmed = callbacks.properties[2];
    assert.ok(ts.isPropertyAssignment(pending) && ts.isPropertyAssignment(error) && ts.isPropertyAssignment(confirmed));
    assert.equal(print(pending.initializer).replace(/\s+/g, ''), 'pending=>{setIsJoining(pending);if(pending)setJoinError(null);}');
    assert.equal(error.initializer.getText(), 'setJoinError');
    const duplicate = nodesMatching(confirmed, ts.isIfStatement);
    assert.deepEqual(duplicate.map(node => node.expression.getText()), ["result.status === 'duplicate'"],
      'Only confirmed duplicates avoid the success membership refresh');
    const catalogue = nodesMatching(confirmed, ts.isConditionalExpression);
    assert.deepEqual(catalogue.map(node => node.condition.getText()), ["result.status === 'catalogue'"],
      'Catalogue and generic confirmations retain their distinct toast branches');
    assert.match(print(confirmed), /draft\.current = \{ open: false, code: '' \};\s*updateIsJoinModalOpen\(false\);\s*updateInvitationCode\(''\);\s*setJoinError\(null\);/);
    assert.match(print(membershipEffects[0]), /active\.current = false;\s*gate\.invalidate\(\);\s*unsubscribe\(\);/);
    const dialog = renderedOwner(owner, 'StudentClassroomJoinDialog');
    const prop = dialog.consumer.attributes.properties[0];
    assert.ok(ts.isJsxAttribute(prop) && prop.name.getText() === 'membership'
      && prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression);
    assert.equal(resolvedSymbol(prop.initializer.expression), resolvedSymbol(membershipMount.name));
    assert.equal(dialog.consumer.attributes.properties.length, 1);
    const dialogBinding = (dialog.owner.body!.statements[0] as ts.VariableStatement).declarationList.declarations[0];
    assert.ok(ts.isObjectBindingPattern(dialogBinding.name) && dialogBinding.initializer);
    assert.ok(ts.isObjectBindingPattern(dialog.owner.parameters[0].name));
    assert.equal(resolvedSymbol(dialogBinding.initializer), resolvedSymbol(dialog.owner.parameters[0].name.elements[0].name));
    for (const item of dialogBinding.name.elements) {
      const property = returnedMembership.properties.find(node => ts.isShorthandPropertyAssignment(node) && node.name.text === item.name.getText());
      assert.ok(property && ts.isShorthandPropertyAssignment(property));
      assert.ok(checker.getShorthandAssignmentValueSymbol(property)?.valueDeclaration?.getSourceFile() === hook.getSourceFile());
      const uses = nodesMatching(dialog.owner.body!.statements.find(ts.isReturnStatement)!,
        (node): node is ts.Identifier => ts.isIdentifier(node) && node.text === item.name.getText());
      assert.ok(uses.length > 0, `Dialog renders the supplied ${item.name.getText()}`);
      uses.forEach(use => assert.equal(resolvedSymbol(use), resolvedSymbol(item.name)));
    }
    assert.deepEqual(nodesMatching(dialog.owner, (node): node is ts.BinaryExpression => ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken).map(node => node.left.getText()),
    ['isJoinModalOpen', 'isJoining', 'joinError'], 'Presence, pending status and error alert have explicit controller conditions');
    assert.equal(nodesMatching(dialog.owner, ts.isCallExpression).filter(node => /^(useState|useEffect|useRef)$/.test(node.expression.getText())).length, 0,
      'Dialog remains presentation-only; membership owns lifecycle and gate');
    assert.equal(nodesMatching(owner, (node): node is ts.ConditionalExpression => ts.isConditionalExpression(node)
      && node.condition.getText() === '!selectedAula').length, 2, 'Original wrapper and list/detail branches');
  }
  const consumer = nodesMatching(owner, (node): node is ts.JsxSelfClosingElement =>
    ts.isJsxSelfClosingElement(node) && /^(AulaDetailAlumno|StudentClassroomDetail)$/.test(node.tagName.getText()));
  assert.equal(consumer.length, 1);
  assert.deepEqual(consumer[0].attributes.properties.map(node => ts.isJsxAttribute(node) ? print(node) : undefined),
    ['aula={selectedAula}', 'onBack={handleBack}']);
  const detail = resolvedSymbol(consumer[0].tagName)?.valueDeclaration;
  assert.ok(detail && ts.isFunctionDeclaration(detail) && detail.body);
  const early = detail.body.statements.find(ts.isIfStatement)!;
  assert.equal(early.expression.getText(), 'activeTask');
  if (detail.name!.text === 'AulaDetailAlumno') return;
  const first = detail.body.statements[0];
  assert.ok(ts.isVariableStatement(first));
  const mounted = first.declarationList.declarations[0];
  assert.ok(mounted.initializer && ts.isCallExpression(mounted.initializer));
  const hook = resolvedSymbol(mounted.initializer.expression)?.valueDeclaration;
  assert.ok(hook && ts.isFunctionDeclaration(hook) && hook.body);
  assert.equal(hook.name!.text, 'useStudentClassroomDetail');
  assert.equal(nodesMatching(detail, (node): node is ts.CallExpression => ts.isCallExpression(node)
    && resolvedSymbol(node.expression) === resolvedSymbol(hook.name!)).length, 1);
  assert.equal(detail.body.statements.indexOf(early), 2, 'Controller remains mounted while activity detail replaces presentation');
  const body = renderedOwner(detail, 'StudentClassroomDetailBody');
  const prop = body.consumer.attributes.properties.find(node => ts.isJsxAttribute(node) && node.name.getText() === 'detail') as ts.JsxAttribute;
  assert.ok(prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression);
  assert.equal(resolvedSymbol(prop.initializer.expression), resolvedSymbol(mounted.name));
  assert.equal(nodesMatching(body.owner, (node): node is ts.CallExpression => ts.isCallExpression(node)
    && /useState|useEffect|Repository/.test(node.expression.getText())).length, 0);
});
