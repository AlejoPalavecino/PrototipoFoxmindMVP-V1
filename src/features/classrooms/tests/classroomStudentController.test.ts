import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import * as boundary from '../index';

// Passing E9 characterization executes current resolved statements with fake hooks.
// It does not execute browser imports, React lifecycle or animation.
const pagePath = fileURLToPath(new URL('../../../views/alumno/AulasAlumno.tsx', import.meta.url));
const program = ts.createProgram([pagePath], {
  noEmit: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
});
const checker = program.getTypeChecker();
const symbol = (node: ts.Node) => {
  const value = checker.getSymbolAtLocation(node);
  return value && value.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(value) : value;
};
function nodes<T extends ts.Node>(root: ts.Node, predicate: (node: ts.Node) => node is T): T[] {
  const found: T[] = [];
  function visit(node: ts.Node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }
  visit(root);
  return found;
}
function rendered(owner: ts.FunctionDeclaration, names: string[]) {
  const consumers = nodes(owner, (node): node is ts.JsxSelfClosingElement =>
    ts.isJsxSelfClosingElement(node) && names.includes(node.tagName.getText()));
  assert.equal(consumers.length, 1, 'Exactly one actual mounted detail/body consumer');
  const declaration = symbol(consumers[0].tagName)?.valueDeclaration;
  assert.ok(declaration && ts.isFunctionDeclaration(declaration) && declaration.body);
  return { owner: declaration, consumer: consumers[0] };
}
const page = program.getSourceFile(pagePath)!;
const pageOwner = page.statements.find((node): node is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(node) && node.name?.text === 'AulasAlumno')!;
const detail = rendered(pageOwner, ['AulaDetailAlumno', 'StudentClassroomDetail']).owner;
const migrated = detail.name!.text === 'StudentClassroomDetail';
const mounted = migrated ? (detail.body!.statements[0] as ts.VariableStatement).declarationList.declarations[0] : undefined;
const controllerDeclaration = mounted?.initializer && ts.isCallExpression(mounted.initializer)
  ? symbol(mounted.initializer.expression)?.valueDeclaration : detail;
assert.ok(controllerDeclaration && ts.isFunctionDeclaration(controllerDeclaration) && controllerDeclaration.body);
const controller = controllerDeclaration;
const variables = nodes(controller, ts.isVariableDeclaration);
const states = variables.filter(node => ts.isArrayBindingPattern(node.name));
const fixtures = migrated ? (() => {
  const call = variables.find(node => ts.isObjectBindingPattern(node.name))!.initializer! as ts.CallExpression;
  const declaration = symbol(call.expression)?.valueDeclaration;
  assert.ok(declaration && ts.isFunctionDeclaration(declaration) && declaration.body);
  return declaration;
})() : detail;
const fixtureVariables = nodes(fixtures, ts.isVariableDeclaration);
const printer = ts.createPrinter({ removeComments: true });
const print = (node: ts.Node) => printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile())
  .replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '');
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const evaluate = (code: string, globals: Record<string, unknown> = {}) => runInNewContext(ts.transpileModule(code, {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.None },
}).outputText, globals);
const createFixtures = () => migrated ? evaluate(`(function () ${fixtures.body!.getText()})()`)
  : Object.fromEntries(['studentProfile', 'studentCurriculum', 'students'].map(name => [name,
    evaluate(`(${fixtureVariables.find(node => node.name.getText() === name)!.initializer!.getText()})`)]));
const plain = (value: any) => JSON.parse(JSON.stringify(value));

function mount(overrides: Record<string, any> = {}) {
  const values: Record<string, any> = {};
  const calls: string[] = [];
  let records: any[] = [{ id: 1, studentId: 2, status: 'pending' }, { id: 2, studentId: 1, status: 'pending' }];
  let index = 0;
  const globals = {
    studentDetailInitialTab: 'actividades', createStudentDetailFixtures: createFixtures,
    useState: (initial: any) => {
      const name = (states[index++].name as ts.ArrayBindingPattern).elements[0].getText();
      if (!Object.hasOwn(values, name)) {
        const value = typeof initial === 'function' ? initial() : initial;
        values[name] = Object.hasOwn(overrides, name) ? overrides[name] : value;
      }
      return [values[name], (next: any) => {
        calls.push(`set:${name}`);
        values[name] = typeof next === 'function' ? next(values[name]) : next;
      }];
    },
    createStudentActivities: (submissions: any[], studentId: number) => {
      calls.push(`initialize:${studentId}`);
      assert.equal(submissions, records);
      return boundary.createStudentActivities(submissions, studentId);
    },
    submissionRepository: {
      read: () => { calls.push('read'); return records; },
      replace: (next: any[]) => { calls.push('replace'); records = next; },
    },
    deliverSubmission: boundary.deliverSubmission,
  };
  const statements = controller.body!.statements.filter(node => !ts.isReturnStatement(node) && !ts.isIfStatement(node));
  const names = ['tab', 'setTab', 'alumnosViewMode', 'setAlumnosViewMode', 'studentSearchTerm', 'setStudentSearchTerm',
    'activeTask', 'setActiveTask', 'studentProfile', 'studentCurriculum', 'students', 'activities', 'handleDeliverActivity'];
  const code = migrated ? controller.body!.getText()
    : `{ ${statements.map(node => node.getText()).join('\n')} return { ${names.join(',')} }; }`;
  const render = () => { index = 0; return evaluate(`(function () ${code})()`, globals); };
  return { result: render(), render, values, calls, records: () => records };
}

const resolveStudent = (classrooms: any[], navigationParams?: any) => {
  const api = boundary as any;
  if (api.resolveStudentClassroom) return api.resolveStudentClassroom(classrooms, navigationParams);
  const effects = pageOwner.body!.statements.filter((node): node is ts.ExpressionStatement =>
    ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText() === 'useEffect');
  const effect = effects[1].expression as ts.CallExpression;
  let selected: any;
  evaluate(`(${effect.arguments[0].getText()})()`, { classrooms, navigationParams, setSelectedAula: (aula: any) => { selected = aula; } });
  return selected;
};

test('student mount retains five defaults, one lazy shared read for profile 2 and persistent local state across renders', () => {
  const mounted = mount();
  assert.equal(states.length, 5);
  assert.deepEqual(Object.keys(mounted.values), ['tab', 'alumnosViewMode', 'studentSearchTerm', 'activeTask', 'activities']);
  assert.equal(mounted.values.tab, 'actividades');
  assert.equal(mounted.values.alumnosViewMode, 'grid');
  assert.equal(mounted.values.studentSearchTerm, '');
  assert.equal(mounted.values.activeTask, null);
  assert.equal(mounted.result.studentProfile.id, 2);
  assert.deepEqual(mounted.calls, ['read', 'initialize:2']);
  assert.deepEqual(plain(mounted.values.activities), plain(boundary.createStudentActivities(mounted.records(), 2)));
  const initial = mounted.result;
  initial.setTab('alumnos'); initial.setAlumnosViewMode('list'); initial.setStudentSearchTerm('SOFÍA');
  initial.setActiveTask(initial.activities[1]);
  const next = mounted.render();
  assert.equal(next.activities, initial.activities);
  assert.equal(next.activeTask, initial.activities[1]);
  assert.equal(next.tab, 'alumnos'); assert.equal(next.alumnosViewMode, 'list'); assert.equal(next.studentSearchTerm, 'SOFÍA');
  assert.equal(mounted.calls.filter(call => call === 'read').length, 1);
  next.setActiveTask(null);
  assert.equal(mounted.render().activeTask, null);
  assert.doesNotMatch(controller.getText(), /useEffect|subscribe|activityRepository|messagingStore/);
});

test('student fixtures retain original values and fresh nested references on every render', () => {
  const expected: Record<string, string> = {
    studentProfile: 'f4a9783fb664601a760a2ca508b04519cba2e163a0cdbfe62aebc6c3a64f8390',
    studentCurriculum: 'a3fa17f0f70ffe70d4ef09b73cbcaf75e72fd6421b8951a8d398f22949ae0d3a',
    students: 'ace2306c1de2e601ffad6d0a98787562f0efa9a2ebb2df6e1dc55f5a5e97c785',
  };
  for (const [name, hash] of Object.entries(expected)) {
    assert.equal(digest(print(fixtureVariables.find(node => node.name.getText() === name)!.initializer!)), hash);
  }
  const mounted = mount(), first = mounted.result, second = mounted.render();
  for (const name of Object.keys(expected)) { assert.deepEqual(plain(first[name]), plain(second[name])); assert.notEqual(first[name], second[name]); }
  assert.notEqual(first.studentProfile.duaProfile, second.studentProfile.duaProfile);
  first.studentCurriculum.forEach((unit: any, index: number) => {
    assert.notEqual(unit, second.studentCurriculum[index]);
    assert.notEqual(unit.topics, second.studentCurriculum[index].topics);
    assert.notEqual(unit.completedTopics, second.studentCurriculum[index].completedTopics);
  });
  first.students.forEach((student: any, index: number) => assert.notEqual(student, second.students[index]));
});

test('student delivery keeps original handler, shared replace before local Entregada map and null-activeTask behavior', () => {
  const handler = variables.find(node => node.name.getText() === 'handleDeliverActivity')!.initializer!;
  assert.equal(digest(print(handler)), '1bd02bfe32ecd397a4617c4a7d16992639622e614530e5249a53fce0389405c6');
  const mounted = mount();
  const before = mounted.result.activities, oldRecords = mounted.records();
  mounted.result.setActiveTask(before[1]);
  const current = mounted.render();
  current.handleDeliverActivity({ text: 'Trabajo', attachedFile: { name: 'entrega.pdf', size: '1 MB', type: 'PDF' } });
  assert.deepEqual(mounted.calls.slice(-3), ['read', 'replace', 'set:activities']);
  assert.notEqual(mounted.records(), oldRecords);
  assert.equal(mounted.records()[0].status, 'submitted');
  assert.equal(mounted.records()[1], oldRecords[1]);
  assert.equal(mounted.values.activities[0], before[0]);
  assert.equal(mounted.values.activities[2], before[2]);
  assert.notEqual(mounted.values.activities[1], before[1]);
  assert.equal(mounted.values.activities[1].status, 'Entregada');
  assert.equal(mounted.values.activeTask, before[1], 'Selected detail snapshot is not synchronized');
  const missing = mount(), untouched = missing.result.activities;
  missing.result.handleDeliverActivity({ text: 'Sin selección' });
  assert.equal(missing.records()[0].status, 'submitted');
  assert.notEqual(missing.values.activities, untouched);
  untouched.forEach((activity: any, index: number) => assert.equal(missing.values.activities[index], activity));
});

test('student navigation helper retains first exact aulaId match, missing and falsy params without changing page navigation', () => {
  const first = { id: 'a-1' }, duplicate = { id: 'a-1' }, other = { id: 'a-2' };
  assert.equal(resolveStudent([first, duplicate, other], { aulaId: 'a-1' }), first);
  for (const params of [undefined, null, {}, { aulaId: '' }, { aulaId: 'A-1' }, { aulaId: 'missing', openAulaId: 'a-2' }]) {
    assert.equal(resolveStudent([first, other], params), undefined);
  }
  assert.equal(resolveStudent([], { aulaId: 'a-1' }), undefined);
  assert.match(pageOwner.getText(), /const aula = classrooms\.find\(a => a\.id === navigationParams\.aulaId\)/);
  if (migrated) assert.equal((boundary as any).studentDetailInitialTab, 'actividades');
});

test('actual mounted student shell preserves whole JSX, six tabs, early return, callbacks and untouched page body', () => {
  const returned = detail.body!.statements.find(ts.isReturnStatement)!;
  let expanded = print(returned);
  if (migrated) {
    assert.ok(mounted?.initializer && ts.isCallExpression(mounted.initializer));
    assert.equal(symbol(mounted.initializer.expression)?.valueDeclaration, controller);
    assert.equal(mounted.initializer.arguments.length, 0);
    const body = rendered(detail, ['StudentClassroomDetailBody']);
    assert.deepEqual(body.consumer.attributes.properties.map(node => ts.isJsxAttribute(node) ? node.name.getText() : undefined), ['aula', 'detail']);
    const prop = body.consumer.attributes.properties[1] as ts.JsxAttribute;
    assert.ok(prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression);
    assert.equal(symbol(prop.initializer.expression), symbol(mounted.name));
    const binding = (body.owner.body!.statements[0] as ts.VariableStatement).declarationList.declarations[0];
    assert.ok(ts.isObjectBindingPattern(binding.name) && binding.initializer);
    assert.ok(ts.isObjectBindingPattern(body.owner.parameters[0].name));
    assert.equal(symbol(binding.initializer), symbol(body.owner.parameters[0].name.elements[1].name));
    const controllerReturn = controller.body!.statements.find(ts.isReturnStatement)!.expression;
    assert.ok(controllerReturn && ts.isObjectLiteralExpression(controllerReturn));
    for (const item of binding.name.elements) {
      assert.ok(controllerReturn.properties.some(node => ts.isShorthandPropertyAssignment(node) && node.name.text === item.name.getText()));
    }
    const fragment = body.owner.body!.statements.find(ts.isReturnStatement)!.expression! as ts.ParenthesizedExpression;
    assert.ok(ts.isJsxFragment(fragment.expression));
    const children = fragment.expression.children.map(print).join('');
    expanded = expanded.replace(print(body.consumer), children);
    assert.equal(nodes(body.owner, (node): node is ts.CallExpression => ts.isCallExpression(node)
      && /useState|useEffect|Repository/.test(node.expression.getText())).length, 0);
    assert.equal(detail.body!.statements.length, 4, 'Unconditional controller, destructuring, activeTask early return, normal return');
  }
  assert.equal(digest(expanded.replace(/\s+/g, '')), 'a385b1cebe3139f827c7f0edc27c4d2b18ada8186764196b0b2b232b8c202d53');
  assert.equal(digest(print(detail.body!.statements.find(ts.isIfStatement)!).replace(/\s+/g, '')),
    'f3490df3bd6b4a7c15017e62bb2218198d6ed1294a11db34a301c6a1a68a353a');
  let originalPage = print(pageOwner.body!);
  const lists = nodes(pageOwner, (node): node is ts.JsxSelfClosingElement =>
    ts.isJsxSelfClosingElement(node) && node.tagName.getText() === 'StudentClassroomList');
  if (lists.length) {
    const list = rendered(pageOwner, ['StudentClassroomList']);
    const branch = list.consumer.parent;
    assert.ok(ts.isParenthesizedExpression(branch) && ts.isConditionalExpression(branch.parent));
    assert.equal(branch.parent.condition.getText(), '!selectedAula');
    assert.equal(branch.parent.whenTrue, branch);
    const presence = branch.parent.parent.parent;
    assert.ok(ts.isJsxElement(presence) && presence.openingElement.tagName.getText() === 'AnimatePresence');
    assert.equal(presence.openingElement.attributes.properties[0].getText(), 'mode="wait"');
    assert.deepEqual(list.consumer.attributes.properties.map(node => ts.isJsxAttribute(node) ? node.name.getText() : undefined),
      ['classrooms', 'onSelect', 'onJoin'], 'No new key, state or callbacks on the mounted listing');
    assert.ok(ts.isObjectBindingPattern(list.owner.parameters[0].name));
    const pageVariables = nodes(pageOwner, ts.isVariableDeclaration);
    const stateBinding = (name: string) => {
      const binding = pageVariables.find(node => ts.isArrayBindingPattern(node.name)
        && node.name.elements.some(item => ts.isBindingElement(item) && item.name.getText() === name));
      assert.ok(binding && ts.isArrayBindingPattern(binding.name));
      const item = binding.name.elements.find(item => ts.isBindingElement(item) && item.name.getText() === name)!;
      assert.ok(ts.isBindingElement(item));
      return item.name;
    };
    const substitutions = new Map<ts.Symbol, ts.Expression>();
    for (const parameter of list.owner.parameters[0].name.elements) {
      const name = parameter.name.getText();
      const prop = list.consumer.attributes.properties.find(node => ts.isJsxAttribute(node) && node.name.getText() === name);
      assert.ok(prop && ts.isJsxAttribute(prop) && prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression);
      const supplied = prop.initializer.expression;
      if (name === 'onJoin') {
        assert.ok(ts.isArrowFunction(supplied) && ts.isCallExpression(supplied.body));
        assert.equal(symbol(supplied.body.expression), symbol(stateBinding('setIsJoinModalOpen')));
        assert.equal(supplied.body.arguments.length, 1);
        assert.equal(supplied.body.arguments[0].kind, ts.SyntaxKind.TrueKeyword);
      } else {
        assert.equal(symbol(supplied), symbol(stateBinding(name === 'onSelect' ? 'setSelectedAula' : 'classrooms')));
      }
      const resolved = symbol(parameter.name);
      assert.ok(resolved);
      substitutions.set(resolved, supplied);
    }
    assert.equal(substitutions.size, 3);
    const returned = list.owner.body!.statements.find(ts.isReturnStatement)!.expression!;
    assert.ok(ts.isParenthesizedExpression(returned));
    const transformed = ts.transform(returned.expression, [context => root => {
      const visit: ts.Visitor = node => {
        const replacement = ts.isIdentifier(node) ? substitutions.get(symbol(node)!) : undefined;
        return replacement ?? ts.visitEachChild(node, visit, context);
      };
      return ts.visitNode(root, visit) as ts.Expression;
    }]);
    // Updated AST roots lose parent/source-file links. Supply the actual leaf source
    // so the printer preserves original literal spelling rather than inventing quotes.
    const listingJsx = printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0], list.owner.getSourceFile())
      .replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '');
    originalPage = originalPage.replace(print(list.consumer), listingJsx);
    transformed.dispose();
  }
  originalPage = originalPage.replace(/StudentClassroomDetail/g, 'AulaDetailAlumno');
  assert.equal(digest(originalPage.replace(/\s+/g, '')), 'c30e2f00fa92b004ee64d6b61037637872669fa923553020cbd030c845b11c1a');
});
