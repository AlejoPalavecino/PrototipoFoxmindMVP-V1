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

// The unchanged page oracle ignores whitespace. Every authorized inversion must
// find its exact expected fragment; unrelated markup/handlers remain hashed.
function restoreHistoricalJsx(text: string, edits: [string, string, number?][]) {
  let restored = text.replace(/\s+/g, '');
  for (const [before, after, count = 1] of edits) {
    const match = before.replace(/\s+/g, '');
    assert.equal(restored.split(match).length - 1, count, `Authorized JSX inverse: ${before}`);
    restored = restored.split(match).join(after.replace(/\s+/g, ''));
  }
  return restored;
}

function mount(overrides: Record<string, any> = {}, replaceError?: Error) {
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
      replace: (next: any[]) => { calls.push('replace'); if (replaceError) throw replaceError; records = next; },
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

test('student delivery replaces shared records before local Entregada state and preserves null-activeTask behavior', () => {
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

test('student controller preserves all ordered File contents in shared session state', async () => {
  const mounted = mount();
  mounted.result.setActiveTask(mounted.result.activities[0]);
  const files = [new File(['uno'], 'Uno.pdf'), new File(['dos'], 'Dos.txt')];
  const attachments = files.map(file => ({ name: file.name, size: '0 MB', type: 'TXT', file }));
  mounted.render().handleDeliverActivity({ attachments });
  const record = mounted.records()[0];
  assert.deepEqual(record.attachments?.map((item: any) => item.file), files);
  assert.deepEqual(await Promise.all(record.attachments.map((item: any) => item.file.text())), ['uno', 'dos']);
  assert.strictEqual(record.attachedFile, attachments[0]);
  assert.equal(mounted.values.activities[0].status, 'Entregada');
});

test('invalid delivery and repository failure propagate without marking local activity as Entregada', () => {
  const invalid = mount();
  const before = invalid.result.activities;
  assert.throws(() => invalid.result.handleDeliverActivity({ text: '   ' }), /adjunta un archivo o escribe/);
  assert.strictEqual(invalid.values.activities, before);
  assert.equal(invalid.calls.includes('replace'), false);
  const failure = new Error('Repository unavailable');
  const failed = mount({}, failure);
  failed.result.setActiveTask(failed.result.activities[0]);
  const current = failed.render();
  assert.throws(() => current.handleDeliverActivity({ text: 'Trabajo' }), error => error === failure);
  assert.strictEqual(failed.values.activities, current.activities);
  assert.equal(failed.records()[0].status, 'pending');
});

test('student navigation helper retains first exact aulaId match, missing and falsy params without changing page navigation', () => {
  const first = { id: 'a-1' }, duplicate = { id: 'a-1' }, other = { id: 'a-2' };
  assert.equal(resolveStudent([first, duplicate, other], { aulaId: 'a-1' }), first);
  for (const params of [undefined, null, {}, { aulaId: '' }, { aulaId: 'A-1' }, { aulaId: 'missing', openAulaId: 'a-2' }]) {
    assert.equal(resolveStudent([first, other], params), undefined);
  }
  assert.equal(resolveStudent([], { aulaId: 'a-1' }), undefined);
  const helperCalls = nodes(pageOwner, (node): node is ts.CallExpression => ts.isCallExpression(node)
    && node.expression.getText() === 'resolveStudentClassroom');
  if (helperCalls.length) {
    assert.equal(helperCalls.length, 1);
    const helper = symbol(helperCalls[0].expression)?.valueDeclaration;
    assert.ok(helper && ts.isFunctionDeclaration(helper) && helper.body);
    assert.match(helper.getText(), /if \(params\?\.aulaId\) return classrooms\.find\(a => a\.id === params\.aulaId\)/);
    assert.deepEqual(helperCalls[0].arguments.map(node => node.getText()), ['classrooms', 'navigationParams']);
  } else assert.match(pageOwner.getText(), /const aula = classrooms\.find\(a => a\.id === navigationParams\.aulaId\)/);
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
  const pageVariables = nodes(pageOwner, ts.isVariableDeclaration);
  const membershipMount = pageVariables.find(node => node.name.getText() === 'membership');
  if (membershipMount) {
    // Keep the immutable pre-extraction page oracle. Invert only the explicitly
    // verified R2 navigation changes; actual callback behavior is exercised in
    // classroomStudentMembership.test.ts against the real history controller.
    const selection = pageVariables.find(node => node.name.getText() === 'selectedAula')!;
    const select = pageVariables.find(node => node.name.getText() === 'handleSelect')!;
    const back = pageVariables.find(node => node.name.getText() === 'handleBack')!;
    assert.ok(selection.initializer && ts.isCallExpression(selection.initializer));
    assert.equal(selection.initializer.expression.getText(), 'resolveStudentClassroom');
    assert.deepEqual(selection.initializer.arguments.map(node => node.getText()), ['classrooms', 'navigationParams']);
    const helper = symbol(selection.initializer.expression)?.valueDeclaration;
    assert.ok(helper && ts.isFunctionDeclaration(helper) && helper.body);
    const guard = helper.body.statements[0];
    assert.ok(ts.isIfStatement(guard) && ts.isReturnStatement(guard.thenStatement) && guard.thenStatement.expression);
    assert.equal(helper.body.statements.length, 1);
    assert.equal(guard.expression.getText(), 'params?.aulaId');
    assert.equal(guard.thenStatement.expression.getText(), 'classrooms.find(a => a.id === params.aulaId)');
    // Invert only the local activation intent, never refresh the historical
    // page/body hashes. Behavior and late-ref cleanup are exercised separately
    // in classroomActivationFocus.test.ts with explicit hook/ref doubles.
    const focusBindings = pageVariables.filter(node => node.name.getText() === 'activationFocus');
    assert.equal(focusBindings.length, 1);
    const focusBinding = focusBindings[0];
    assert.equal(focusBinding.parent.parent.parent, pageOwner.body);
    assert.ok(ts.isVariableDeclarationList(focusBinding.parent));
    assert.equal(focusBinding.parent.declarations.length, 1);
    const focusCalls = nodes(pageOwner, (node): node is ts.CallExpression => ts.isCallExpression(node)
      && node.expression.getText() === 'useClassroomActivationFocus');
    assert.equal(focusCalls.length, 1);
    assert.equal(focusBinding.initializer, focusCalls[0]);
    assert.deepEqual(focusCalls[0].arguments.map(node => node.getText()), ['selectedAula?.id']);
    const focusHook = symbol(focusCalls[0].expression)?.valueDeclaration;
    assert.ok(focusHook && ts.isFunctionDeclaration(focusHook) && focusHook.body);
    assert.equal(focusHook.parent, page);
    assert.equal(focusHook.modifiers, undefined, 'Focus lifecycle remains private to this page');
    const compact = (node: ts.Node) => print(node).replace(/\s+/g, '');
    assert.equal(compact(focusHook), `function useClassroomActivationFocus(selectedId: string | undefined) {
      const pendingId = useRef<string | null>(null);
      useEffect(() => {
        if (pendingId.current !== selectedId) pendingId.current = null;
      }, [selectedId]);
      useEffect(() => () => { pendingId.current = null; }, []);
      return {
        request: (id: string) => { pendingId.current = id; },
        cancel: () => { pendingId.current = null; },
        detailRef: (node: HTMLDivElement | null) => {
          if (!node || !selectedId || pendingId.current !== selectedId) return;
          pendingId.current = null;
          node.closest<HTMLElement>('main')?.focus({ preventScroll: true });
        },
      };
    }`.replace(/\s+/g, ''));
    assert.equal(compact(select.initializer!), `(aula: Classroom) => {
      activationFocus.request(aula.id); setView('aulas', { aulaId: aula.id });
    }`.replace(/\s+/g, ''));
    assert.equal(compact(back.initializer!), `() => {
      activationFocus.cancel(); setView('aulas', undefined, 'replace');
    }`.replace(/\s+/g, ''));
    for (const method of ['request', 'cancel']) {
      const calls = nodes(pageOwner, (node): node is ts.CallExpression => ts.isCallExpression(node)
        && node.expression.getText() === `activationFocus.${method}`);
      assert.equal(calls.length, 1, `One explicit ${method} owner`);
      assert.ok(ts.isPropertyAccessExpression(calls[0].expression));
      assert.equal(symbol(calls[0].expression.expression), symbol(focusBinding.name));
      assert.equal(calls[0].parent.parent, method === 'request'
        ? (select.initializer as ts.ArrowFunction).body : (back.initializer as ts.ArrowFunction).body);
    }
    const effects = nodes(pageOwner, (node): node is ts.CallExpression => ts.isCallExpression(node)
      && node.expression.getText() === 'useEffect');
    assert.equal(effects.length, 1);
    assert.equal(effects[0].arguments[1].getText(), '[navigationParams?.aulaId, selectedAula, setView]');
    assert.equal(print(effects[0].arguments[0]).replace(/\s+/g, ''),
      "()=>{if(navigationParams?.aulaId&&!selectedAula)setView('aulas',undefined,'replace');}");
    const keys = nodes(pageOwner, (node): node is ts.JsxAttribute => ts.isJsxAttribute(node)
      && node.name.getText() === 'key' && node.initializer?.getText() === '{selectedAula.id}');
    assert.equal(keys.length, 1);
    assert.ok(ts.isJsxOpeningElement(keys[0].parent.parent));
    assert.equal(keys[0].parent.parent.tagName.getText(), 'motion.div');
    const focusRefs = nodes(pageOwner, (node): node is ts.JsxAttribute => ts.isJsxAttribute(node)
      && node.name.getText() === 'ref');
    assert.equal(focusRefs.length, 1, 'Only the keyed detail host owns the commit ref');
    assert.equal(focusRefs[0].parent, keys[0].parent);
    assert.equal(focusRefs[0].initializer?.getText(), '{activationFocus.detailRef}');
    assert.ok(focusRefs[0].initializer && ts.isJsxExpression(focusRefs[0].initializer)
      && focusRefs[0].initializer.expression && ts.isPropertyAccessExpression(focusRefs[0].initializer.expression));
    assert.equal(symbol(focusRefs[0].initializer.expression.expression), symbol(focusBinding.name));
    const replacements = [
      { node: focusBinding.parent.parent, text: '' },
      { node: focusRefs[0], text: '' },
      { node: membershipMount.parent.parent, text: `const [selectedAula, setSelectedAula] = useState<Classroom | null>(null);\n${membershipMount.parent.parent.getText()}` },
      { node: selection.parent.parent, text: '' },
      { node: select.parent.parent, text: '' },
      { node: effects[0].parent, text: `useEffect(() => { if (navigationParams?.aulaId) {
        const aula = classrooms.find(a => a.id === navigationParams.aulaId);
        if (aula) { setSelectedAula(aula); }
      } }, [navigationParams, classrooms]);` },
      { node: back.parent.parent, text: `const handleBack = () => {
        setSelectedAula(null);
        if (navigationParams?.aulaId) { setView('aulas', undefined); }
      };` },
      { node: keys[0], text: 'key="detail"' },
    ];
    const start = pageOwner.body!.getStart();
    let inverse = pageOwner.body!.getText();
    replacements.sort((a, b) => b.node.getStart() - a.node.getStart()).forEach(({ node, text }) => {
      inverse = inverse.slice(0, node.getStart() - start) + text + inverse.slice(node.getEnd() - start);
    });
    const source = ts.createSourceFile('navigationInverse.tsx', `function reconstructed() ${inverse}`,
      ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const restored = source.statements[0];
    assert.ok(ts.isFunctionDeclaration(restored) && restored.body);
    originalPage = print(restored.body);
  }
  let membership: ts.FunctionDeclaration | undefined;
  let membershipBinding: ts.VariableDeclaration | undefined;
  if (membershipMount) {
    assert.ok(membershipMount.initializer && ts.isCallExpression(membershipMount.initializer));
    const hook = symbol(membershipMount.initializer.expression)?.valueDeclaration;
    assert.ok(hook && ts.isFunctionDeclaration(hook) && hook.body);
    membership = hook;
    assert.equal(membershipMount.parent.parent.parent, pageOwner.body);
    assert.equal(membershipMount.initializer.arguments.length, 0);
    membershipBinding = pageVariables.find(node => ts.isObjectBindingPattern(node.name)
      && node.initializer && symbol(node.initializer) === symbol(membershipMount.name));
    assert.ok(membershipBinding && ts.isObjectBindingPattern(membershipBinding.name));
    assert.deepEqual(membershipBinding.name.elements.map(item => item.name.getText()), ['classrooms', 'setIsJoinModalOpen']);
    const statements = [...hook.body.statements];
    const returned = statements.pop()!;
    assert.ok(ts.isReturnStatement(returned) && returned.expression && ts.isObjectLiteralExpression(returned.expression));
    const handler = statements.pop()!;
    assert.ok(ts.isVariableStatement(handler) && handler.declarationList.declarations[0].name.getText() === 'handleJoinClassroom');
    assert.equal(statements.length, 4, 'Three membership states and the original mount subscription effect');
    originalPage = originalPage.replace(print(membershipMount.parent.parent), statements.map(print).join('\n'))
      .replace(print(membershipBinding.parent.parent), '');
    const reconstruction = () => {
      const prefix = 'function reconstructed() ';
      const source = ts.createSourceFile('reconstructed.tsx', prefix + originalPage,
        ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const owner = source.statements[0];
      assert.ok(ts.isFunctionDeclaration(owner) && owner.body);
      return { source, body: owner.body, prefix };
    };
    const beforeJoin = reconstruction();
    const statementOrder = (body: ts.Block) => body.statements.map(node =>
      ts.isVariableStatement(node) ? node.declarationList.declarations[0].name.getText()
        : ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
          ? node.expression.expression.getText() : ts.SyntaxKind[node.kind]);
    assert.deepEqual(statementOrder(beforeJoin.body), [
      '{ navigationParams, setView }', '[selectedAula, setSelectedAula]', '[classrooms, setClassrooms]',
      '[isJoinModalOpen, setIsJoinModalOpen]', '[invitationCode, setInvitationCode]',
      'useEffect', 'useEffect', 'handleBack', 'ReturnStatement',
    ], 'Restore HEAD order: membership effect, navigation effect, back, join handler, return');
    const returnAnchor = beforeJoin.body.statements[8];
    assert.ok(ts.isReturnStatement(returnAnchor));
    const insertion = returnAnchor.getStart(beforeJoin.source) - beforeJoin.prefix.length;
    originalPage = originalPage.slice(0, insertion) + `${print(handler)}\n` + originalPage.slice(insertion);
    assert.deepEqual(statementOrder(reconstruction().body), [
      ...statementOrder(beforeJoin.body).slice(0, -1), 'handleJoinClassroom', 'ReturnStatement',
    ]);
    assert.doesNotMatch(originalPage, /resolveStudentClassroom\(/,
      'The verified R2 inverse restores the original inline lookup for the immutable page oracle');
    const dialog = rendered(pageOwner, ['StudentClassroomJoinDialog']);
    assert.equal(dialog.consumer.attributes.properties.length, 1);
    const prop = dialog.consumer.attributes.properties[0];
    assert.ok(ts.isJsxAttribute(prop) && prop.name.getText() === 'membership'
      && prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression);
    assert.equal(symbol(prop.initializer.expression), symbol(membershipMount.name));
    const binding = (dialog.owner.body!.statements[0] as ts.VariableStatement).declarationList.declarations[0];
    assert.ok(ts.isObjectBindingPattern(dialog.owner.parameters[0].name) && ts.isObjectBindingPattern(binding.name) && binding.initializer);
    assert.equal(symbol(binding.initializer), symbol(dialog.owner.parameters[0].name.elements[0].name));
    const substitutions = new Map<ts.Symbol, ts.Node>();
    for (const item of binding.name.elements) {
      const property = returned.expression.properties.find((node): node is ts.ShorthandPropertyAssignment =>
        ts.isShorthandPropertyAssignment(node) && node.name.text === item.name.getText());
      assert.ok(property);
      const value = checker.getShorthandAssignmentValueSymbol(property)!;
      const declaration = value.valueDeclaration;
      assert.ok(declaration && ts.isBindingElement(declaration) || declaration && ts.isVariableDeclaration(declaration));
      substitutions.set(symbol(item.name)!, declaration.name);
    }
    const returnedDialog = dialog.owner.body!.statements.find(ts.isReturnStatement)!.expression!;
    assert.ok(ts.isParenthesizedExpression(returnedDialog) && ts.isJsxFragment(returnedDialog.expression));
    const transformed = ts.transform(returnedDialog.expression, [context => root => {
      const visit: ts.Visitor = node => ts.isIdentifier(node) && substitutions.has(symbol(node)!)
        ? substitutions.get(symbol(node)!)! : ts.visitEachChild(node, visit, context);
      return ts.visitNode(root, visit) as ts.JsxFragment;
    }]);
    const fragment = transformed.transformed[0];
    const dialogJsx = fragment.children.map(node => printer.printNode(ts.EmitHint.Unspecified, node, dialog.owner.getSourceFile())).join('');
    originalPage = originalPage.replace(print(dialog.consumer), dialogJsx);
    transformed.dispose();
  }
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
      membership ? ['key', 'classrooms', 'onSelect', 'onJoin'] : ['classrooms', 'onSelect', 'onJoin'],
      'Only canonical grid key and original snapshot/selection/join bindings');
    if (membership) assert.equal(list.consumer.attributes.properties[0].getText(), 'key="grid"');
    assert.ok(ts.isObjectBindingPattern(list.owner.parameters[0].name));
    const stateBinding = (name: string) => {
      if (membership && name !== 'handleSelect') {
        assert.ok(membershipBinding && ts.isObjectBindingPattern(membershipBinding.name));
        const consumed = membershipBinding.name.elements.find(item => item.name.getText() === name);
        assert.ok(consumed, `Actual page consumes ${name}`);
        const returned = membership.body!.statements.find(ts.isReturnStatement)!.expression;
        assert.ok(returned && ts.isObjectLiteralExpression(returned));
        const property = returned.properties.find((node): node is ts.ShorthandPropertyAssignment =>
          ts.isShorthandPropertyAssignment(node) && node.name.text === name);
        assert.ok(property);
        assert.equal(checker.getShorthandAssignmentValueSymbol(property)?.valueDeclaration?.getSourceFile(), membership.getSourceFile());
        return consumed.name;
      }
      if (name === 'handleSelect') {
        const callback = pageVariables.find(node => node.name.getText() === name);
        assert.ok(callback?.initializer && ts.isArrowFunction(callback.initializer));
        return callback.name;
      }
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
        assert.equal(symbol(supplied), symbol(stateBinding(name === 'onSelect' ? 'handleSelect' : 'classrooms')));
      }
      const resolved = symbol(parameter.name);
      assert.ok(resolved);
      substitutions.set(resolved, name === 'onSelect' ? ts.factory.createIdentifier('setSelectedAula') : supplied);
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
    let listingJsx = printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0], list.owner.getSourceFile())
      .replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '');
    const selectButtons = nodes(list.owner, ts.isJsxElement).filter(node => node.openingElement.tagName.getText() === 'button'
      && node.openingElement.attributes.properties.some(prop => ts.isJsxAttribute(prop) && prop.name.getText() === 'aria-label'));
    assert.equal(selectButtons.length, 1, 'One native classroom action replaces the non-keyboard card click');
    const selectButton = selectButtons[0];
    assert.deepEqual(selectButton.openingElement.attributes.properties.map(print), [
      'type="button"', 'onClick={() => onSelect(aula)}', 'aria-label={`Ingresar a ${aula.subject} · ${aula.course}`}',
      'className="flex items-center gap-1 text-fox-primary font-bold text-xs cursor-pointer after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-fox-primary focus-visible:outline-offset-2"',
    ]);
    const card = nodes(list.owner, ts.isJsxElement).find(node => node.openingElement.tagName.getText() === 'motion.div'
      && node.openingElement.attributes.properties.some(prop => ts.isJsxAttribute(prop) && prop.name.getText() === 'key' && prop.initializer?.getText() === '{aula.id}'));
    assert.ok(card);
    assert.equal(card.openingElement.attributes.properties.some(prop => ts.isJsxAttribute(prop) && prop.name.getText() === 'onClick'), false,
      'The noninteractive card must not own a second selection callback');
    const cardClass = card.openingElement.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText() === 'className')!;
    listingJsx = restoreHistoricalJsx(listingJsx, [
      [print(cardClass), print(cardClass).replace(' focus-within:ring-2 focus-within:ring-fox-primary focus-within:ring-offset-2', '') + ' onClick={() => setSelectedAula(aula)}'],
      ['<button type="button" onClick={() => setSelectedAula(aula)} aria-label={`Ingresar a ${aula.subject} · ${aula.course}`} className="flex items-center gap-1 text-fox-primary font-bold text-xs cursor-pointer after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-fox-primary focus-visible:outline-offset-2">',
        '<div className="flex items-center gap-1 text-fox-primary font-bold text-xs group-hover:translate-x-1 transition-transform">'],
      ['<span>Ingresar</span><ChevronRight size={15} aria-hidden="true"/></button>',
        '<span>Ingresar</span><ChevronRight size={15}/></div>'],
    ]);
    originalPage = originalPage.replace(print(list.consumer), listingJsx);
    transformed.dispose();
  }
  originalPage = originalPage.replace(/StudentClassroomDetail/g, 'AulaDetailAlumno');
  assert.equal(digest(originalPage.replace(/\s+/g, '')), 'c30e2f00fa92b004ee64d6b61037637872669fa923553020cbd030c845b11c1a');
});
