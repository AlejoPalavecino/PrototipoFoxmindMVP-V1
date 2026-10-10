import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { resolveStudentClassroom } from '../index';
import { createUrlNavigation, type HistoryHost } from '../../../app/routing';

// Passing inline-page characterization, then the actual mounted hook/dialog bindings.
// Fake hooks/elements execute resolved statements, not React lifecycle or browser imports.
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
const page = program.getSourceFile(pagePath)!;
const owner = page.statements.find((node): node is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(node) && node.name?.text === 'AulasAlumno')!;
const variables = nodes(owner, ts.isVariableDeclaration);
const mounted = variables.find(node => node.name.getText() === 'membership');
let membership = owner;
if (mounted) {
  assert.ok(mounted.parent.parent.parent === owner.body, 'Membership mount is unconditional at page lifetime');
  assert.ok(mounted.initializer && ts.isCallExpression(mounted.initializer));
  assert.equal(mounted.initializer.arguments.length, 0);
  const declaration = symbol(mounted.initializer.expression)?.valueDeclaration;
  assert.ok(declaration && ts.isFunctionDeclaration(declaration) && declaration.body);
  membership = declaration;
  assert.equal(nodes(owner, (node): node is ts.CallExpression => ts.isCallExpression(node)
    && symbol(node.expression) === symbol(declaration.name!)).length, 1);
  const binding = variables.find(node => ts.isObjectBindingPattern(node.name)
    && node.initializer && symbol(node.initializer) === symbol(mounted.name))!;
  assert.ok(binding && ts.isObjectBindingPattern(binding.name));
  assert.deepEqual(binding.name.elements.map(item => item.name.getText()), ['classrooms', 'setIsJoinModalOpen']);
}
const membershipVariables = nodes(membership, ts.isVariableDeclaration);
const membershipStates = membershipVariables.filter(node => ts.isArrayBindingPattern(node.name)
  && ['classrooms', 'isJoinModalOpen', 'invitationCode'].includes(node.name.elements[0].getText()));
assert.equal(membershipStates.length, 3);
const effect = nodes(membership, (node): node is ts.CallExpression => ts.isCallExpression(node)
  && node.expression.getText() === 'useEffect' && /messagingStore\.subscribe/.test(node.getText()));
assert.equal(effect.length, 1);
assert.equal(effect[0].arguments[1].getText(), '[]');
const handler = membershipVariables.find(node => node.name.getText() === 'handleJoinClassroom')!;
const selected = variables.find(node => node.name.getText() === 'selectedAula')!;
assert.ok(selected.initializer && ts.isCallExpression(selected.initializer));
const resolver = symbol(selected.initializer.expression)?.valueDeclaration;
assert.ok(resolver && ts.isFunctionDeclaration(resolver) && resolver.name?.text === 'resolveStudentClassroom');
assert.deepEqual(selected.initializer.arguments.map(node => node.getText()), ['classrooms', 'navigationParams']);
assert.equal(variables.some(node => ts.isArrayBindingPattern(node.name) && node.name.elements[0].getText() === 'selectedAula'), false);
const membershipStatements = [...membershipStates.map(node => node.parent.parent), effect[0].parent, handler.parent.parent];
const evaluate = (code: string, globals: Record<string, any>) => runInNewContext(ts.transpileModule(code, {
  compilerOptions: { target: ts.ScriptTarget.ESNext, jsx: ts.JsxEmit.React }, fileName: 'membership.tsx',
}).outputText, globals);

function mount() {
  const values: Record<string, any> = {}, calls: any[] = [], effects: (() => any)[] = [];
  let records: any[] = [{ id: 'a-1', subject: 'Historia', course: '2° B' }];
  let result: any = { status: 'rejected' }, subscriber: (() => void) | undefined, reads = 0, index = 0;
  const names = ['classrooms', 'isJoinModalOpen', 'invitationCode'];
  const paths = ['/alumno/aulas'];
  let pathIndex = 0;
  const writes: any[] = [], listeners = new Set<() => void>(), corrections: (() => void)[] = [];
  const host: HistoryHost = {
    location: { pathname: paths[0], search: '', hash: '' },
    history: {
      pushState: (state, _unused, url) => {
        writes.push(['push', state, String(url)]);
        paths.splice(pathIndex + 1); paths.push(String(url)); pathIndex++;
        host.location.pathname = paths[pathIndex];
      },
      replaceState: (state, _unused, url) => {
        writes.push(['replace', state, String(url)]);
        paths[pathIndex] = String(url); host.location.pathname = paths[pathIndex];
      },
    },
    addEventListener: (_event, listener) => { listeners.add(listener); },
    removeEventListener: (_event, listener) => { listeners.delete(listener); },
  };
  const navigation = createUrlNavigation(host);
  navigation.subscribe(() => {});
  const globals: Record<string, any> = {
    useState: (initial: any) => {
      const name = names[index++];
      if (!Object.hasOwn(values, name)) values[name] = typeof initial === 'function' ? initial() : initial;
      return [values[name], (next: any) => { calls.push(['set', name, next]); values[name] = next; }];
    },
    useEffect: (callback: () => any, dependencies: any[]) => {
      if (!dependencies.length && !effects.length) effects.push(callback);
      else if (dependencies.length) corrections.push(callback);
    },
    classroomRepository: { readMembership: () => { reads++; calls.push(['read']); return records; } },
    messagingStore: { subscribe: (callback: () => void) => {
      calls.push(['subscribe']); subscriber = callback; return () => { calls.push(['unsubscribe']); subscriber = undefined; };
    } },
    joinClassroomByCode: (code: string, snapshot: any[]) => { calls.push(['join', code, snapshot]); return result; },
    toast: { show: (text: string, kind: string) => { calls.push(['toast', text, kind]); } },
    useAppContext: () => ({ ...navigation.getSnapshot(), setView: (...args: Parameters<typeof navigation.setView>) => {
      calls.push(['view', ...args]); navigation.setView(...args);
    } }),
    resolveStudentClassroom,
  };
  const membershipCode = mounted ? membership.body!.getText() : `{ ${membershipStatements.map(node => node.getText()).join('\n')}
    return { classrooms, isJoinModalOpen, setIsJoinModalOpen, invitationCode, setInvitationCode, handleJoinClassroom }; }`;
  const render = () => {
    index = 0;
    corrections.length = 0;
    let controller: any;
    globals.useStudentClassroomMembership = () => {
      controller = evaluate(`(function () ${membershipCode})()`, globals);
      return controller;
    };
    const statements = owner.body!.statements.filter(node => !ts.isReturnStatement(node));
    const selection = evaluate(`(function () { ${statements.map(node => node.getText()).join('\n')}
      return { selectedAula, handleSelect, handleBack }; })()`, globals);
    return { ...selection, ...controller };
  };
  return { render, values, calls, records: () => records, reads: () => reads,
    replace: (next: any[]) => { records = next; }, outcome: (next: any) => { result = next; },
    params: (next: any) => navigation.setView('aulas', next), refresh: () => subscriber!(), start: () => effects[0](),
    path: () => host.location.pathname, writes, flushCorrections: () => corrections.forEach(effect => effect()),
    travel: (delta: number) => {
      pathIndex = Math.max(0, Math.min(paths.length - 1, pathIndex + delta));
      host.location.pathname = paths[pathIndex]; listeners.forEach(listener => listener());
    } };
}

function dialog(controller: any) {
  const consumers = nodes(owner, (node): node is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(node)
    && node.tagName.getText() === 'StudentClassroomJoinDialog');
  let expression: ts.Expression;
  if (mounted) {
    assert.equal(consumers.length, 1);
    const consumer = consumers[0];
    assert.deepEqual(consumer.attributes.properties.map(node => ts.isJsxAttribute(node) ? node.name.getText() : ''), ['membership']);
    const prop = consumer.attributes.properties[0] as ts.JsxAttribute;
    assert.ok(prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression);
    assert.equal(symbol(prop.initializer.expression), symbol(mounted.name));
    const leaf = symbol(consumer.tagName)?.valueDeclaration;
    assert.ok(leaf && ts.isFunctionDeclaration(leaf) && leaf.body && ts.isObjectBindingPattern(leaf.parameters[0].name));
    const binding = (leaf.body.statements[0] as ts.VariableStatement).declarationList.declarations[0];
    assert.ok(binding.initializer && ts.isObjectBindingPattern(binding.name));
    assert.equal(symbol(binding.initializer), symbol(leaf.parameters[0].name.elements[0].name));
    const returned = membership.body!.statements.find(ts.isReturnStatement)!.expression;
    assert.ok(returned && ts.isObjectLiteralExpression(returned));
    for (const item of binding.name.elements) {
      const property = returned.properties.find((node): node is ts.ShorthandPropertyAssignment =>
        ts.isShorthandPropertyAssignment(node) && node.name.text === item.name.getText());
      assert.ok(property);
      assert.equal(checker.getShorthandAssignmentValueSymbol(property)?.valueDeclaration?.getSourceFile(), membership.getSourceFile());
    }
    assert.equal(nodes(leaf, (node): node is ts.CallExpression => ts.isCallExpression(node)
      && /useState|useEffect|setTimeout|Repository/.test(node.expression.getText())).length, 0);
    expression = leaf.body.statements.find(ts.isReturnStatement)!.expression!;
  } else {
    const presence = nodes(owner, (node): node is ts.JsxElement => ts.isJsxElement(node)
      && node.openingElement.tagName.getText() === 'AnimatePresence' && /isJoinModalOpen &&/.test(node.getText()));
    assert.equal(presence.length, 1);
    expression = presence[0];
  }
  const tree = evaluate(`(${expression.getText()})`, {
    ...controller, React: { Fragment: 'fragment', createElement: (type: any, props: any, ...children: any[]) =>
      ({ type, props: props ?? {}, children: children.flat(Infinity) }) },
    motion: { div: 'motion.div' }, AnimatePresence: 'presence', Plus: 'plus', X: 'x',
  });
  const elements: any[] = [];
  function visit(node: any) { if (node && typeof node === 'object') { elements.push(node); node.children.forEach(visit); } }
  visit(tree);
  return elements;
}

test('membership initializes lazily, mount copies before subscription, refresh copies and returns exact cleanup', () => {
  const mounted = mount(), first = mounted.render(), record = mounted.records()[0];
  assert.equal(mounted.reads(), 1);
  assert.notEqual(first.classrooms, mounted.records()); assert.equal(first.classrooms[0], record);
  assert.equal(first.isJoinModalOpen, false); assert.equal(first.invitationCode, '');
  const cleanup = mounted.start();
  assert.deepEqual(mounted.calls.map(call => call.slice(0, 2)), [['read'], ['read'], ['set', 'classrooms'], ['subscribe']]);
  assert.notEqual(mounted.values.classrooms, first.classrooms); assert.notEqual(mounted.values.classrooms, mounted.records());
  assert.equal(mounted.values.classrooms[0], record);
  const next = { id: 'a-2' }; mounted.replace([next]); mounted.refresh();
  assert.equal(mounted.values.classrooms[0], next); assert.notEqual(mounted.values.classrooms, mounted.records());
  mounted.render(); assert.equal(mounted.reads(), 3);
  cleanup(); assert.deepEqual(mounted.calls.at(-1), ['unsubscribe']);
  assert.equal(nodes(membership, (node): node is ts.CallExpression => ts.isCallExpression(node)
    && /setTimeout|clearTimeout|useLayoutEffect/.test(node.expression.getText())).length, 0);
});

test('page selection/back and dialog hide preserve membership snapshot and typed code across renders', () => {
  const mounted = mount(); let current = mounted.render(); mounted.start();
  current.setInvitationCode('  HIST-2026  '); current.setIsJoinModalOpen(true);
  current = mounted.render(); const snapshot = current.classrooms;
  const elements = dialog(current), input = elements.find(node => node.type === 'input');
  assert.equal(input.props.value, '  HIST-2026  ');
  input.props.onChange({ target: { value: 'typed code' } });
  const buttons = elements.filter(node => node.type === 'button'); assert.equal(buttons.length, 3);
  buttons[0].props.onClick(); assert.equal(mounted.values.isJoinModalOpen, false);
  assert.equal(mounted.values.invitationCode, 'typed code');
  current.setIsJoinModalOpen(true); dialog(mounted.render()).filter(node => node.type === 'button')[1].props.onClick();
  assert.equal(mounted.values.invitationCode, 'typed code');
  current.handleSelect(snapshot[0]);
  assert.equal(mounted.path(), '/alumno/aulas/a-1');
  assert.deepEqual(mounted.writes, [['push', null, '/alumno/aulas/a-1']]);
  current = mounted.render();
  assert.equal(current.classrooms, snapshot); assert.equal(current.invitationCode, 'typed code');
  assert.equal(current.selectedAula, snapshot[0]);
  mounted.travel(-1);
  assert.equal(mounted.render().selectedAula, undefined, 'browser Back clears rendered detail');
  mounted.travel(1);
  assert.equal(mounted.render().selectedAula, snapshot[0], 'Forward resolves the durable ID');
  mounted.render().handleBack();
  assert.deepEqual(mounted.calls.at(-1), ['view', 'aulas', undefined, 'replace']);
  assert.equal(mounted.path(), '/alumno/aulas');
  assert.deepEqual(mounted.writes.at(-1), ['replace', null, '/alumno/aulas']);
  assert.equal(mounted.render().selectedAula, undefined);
  assert.equal(mounted.render().classrooms, snapshot); assert.equal(mounted.reads(), 2);
  const count = mounted.writes.length;
  mounted.render().handleBack();
  assert.deepEqual(mounted.calls.at(-1), ['view', 'aulas', undefined, 'replace']);
  assert.equal(mounted.writes.length, count, 'same-path Back must not write history again');
});

test('direct route hydration and invalid/empty membership correction leave join drafts and snapshots intact', () => {
  const mounted = mount();
  mounted.params({ aulaId: 'a-1' });
  let current = mounted.render(); mounted.start();
  assert.equal(current.selectedAula, current.classrooms[0], 'direct ID resolves without a selection effect');
  current.setInvitationCode('pending code'); current.setIsJoinModalOpen(true);
  mounted.params({ aulaId: 'missing' }); current = mounted.render();
  const snapshot = current.classrooms;
  assert.equal(current.selectedAula, undefined);
  mounted.flushCorrections();
  assert.equal(mounted.path(), '/alumno/aulas');
  assert.deepEqual(mounted.writes.at(-1), ['replace', null, '/alumno/aulas']);
  const count = mounted.writes.length;
  mounted.render(); mounted.flushCorrections(); assert.equal(mounted.writes.length, count);
  assert.equal(mounted.values.invitationCode, 'pending code'); assert.equal(mounted.values.isJoinModalOpen, true);
  assert.equal(mounted.render().classrooms, snapshot);
  mounted.replace([]); mounted.refresh(); mounted.params({ aulaId: 'a-1' });
  current = mounted.render(); assert.equal(current.selectedAula, undefined); assert.equal(current.classrooms.length, 0);
  mounted.flushCorrections(); assert.equal(mounted.path(), '/alumno/aulas');
  assert.equal(mounted.values.invitationCode, 'pending code'); assert.equal(mounted.values.isJoinModalOpen, true);
});

test('rejected join preserves modal/code and duplicate toasts before close/clear without membership refresh', () => {
  for (const status of ['rejected', 'duplicate']) {
    const mounted = mount(); let current = mounted.render(); mounted.start();
    current.setInvitationCode(' RAW '); current.setIsJoinModalOpen(true); current = mounted.render();
    const snapshot = current.classrooms, aula = snapshot[0]; mounted.outcome({ status, classroom: aula });
    mounted.calls.length = 0; current.handleJoinClassroom();
    assert.equal(mounted.calls[0][1], ' RAW '); assert.equal(mounted.calls[0][2], snapshot);
    assert.equal(mounted.values.classrooms, snapshot); assert.equal(mounted.reads(), 2);
    if (status === 'rejected') {
      assert.deepEqual(mounted.calls.map(call => call[0]), ['join']);
      assert.equal(mounted.values.isJoinModalOpen, true); assert.equal(mounted.values.invitationCode, ' RAW ');
    } else {
      assert.deepEqual(mounted.calls.slice(1), [
        ['toast', 'Ya estás matriculado en Historia (2° B)', 'info'],
        ['set', 'isJoinModalOpen', false], ['set', 'invitationCode', ''],
      ]);
    }
  }
});

test('catalogue and generic success copy current membership then close/clear before their distinct exact toast', () => {
  for (const status of ['catalogue', 'generic']) {
    const mounted = mount(); let current = mounted.render(); mounted.start();
    current.setInvitationCode('untrimmed '); current.setIsJoinModalOpen(true); current = mounted.render();
    const snapshot = current.classrooms, aula = { id: 'joined', subject: 'Literatura', course: '3° A' };
    mounted.replace([aula, snapshot[0]]); mounted.outcome({ status, classroom: aula }); mounted.calls.length = 0;
    const submit = dialog(current).filter(node => node.type === 'button')[2];
    assert.equal(submit.props.disabled, false); assert.equal(submit.props.onClick, current.handleJoinClassroom);
    submit.props.onClick();
    assert.equal(mounted.calls[0][1], 'untrimmed '); assert.equal(mounted.calls[0][2], snapshot);
    assert.deepEqual(mounted.calls.map(call => call.slice(0, 2)), [
      ['join', 'untrimmed '], ['read'], ['set', 'classrooms'], ['set', 'isJoinModalOpen'], ['set', 'invitationCode'],
      ['toast', status === 'catalogue' ? '🎉 ¡Te has unido exitosamente al aula de Literatura (3° A)!'
        : '🎉 Te has unido al aula de Literatura (3° A) mediante tu código de acceso'],
    ]);
    assert.equal(mounted.calls.at(-1)[2], 'success'); assert.equal(mounted.reads(), 3);
    assert.notEqual(mounted.values.classrooms, mounted.records()); assert.notEqual(mounted.values.classrooms, snapshot);
    assert.equal(mounted.values.classrooms[0], aula); assert.equal(mounted.values.classrooms[1], snapshot[0]);
    assert.equal(mounted.values.isJoinModalOpen, false); assert.equal(mounted.values.invitationCode, '');
  }
  const mounted = mount(), current = mounted.render(); current.setIsJoinModalOpen(true); current.setInvitationCode(' \t ');
  assert.equal(dialog(mounted.render()).filter(node => node.type === 'button')[2].props.disabled, true);
});
