import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { getClassroomColorTheme } from '../lib/getClassroomColorTheme';

// Passing source/fake-element characterization before and after E10 relocation.
// Resolve the actual page branch; this does not execute React or browser animation.
const pagePath = fileURLToPath(new URL('../../../views/alumno/AulasAlumno.tsx', import.meta.url));
const program = ts.createProgram([pagePath], {
  noEmit: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
});
const checker = program.getTypeChecker();
function nodes<T extends ts.Node>(root: ts.Node, predicate: (node: ts.Node) => node is T): T[] {
  const found: T[] = [];
  function visit(node: ts.Node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }
  visit(root);
  return found;
}
const page = program.getSourceFile(pagePath)!;
const owner = page.statements.find((node): node is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(node) && node.name?.text === 'AulasAlumno')!;
const branches = nodes(owner, ts.isConditionalExpression).filter(node =>
  node.condition.getText() === '!selectedAula' && ts.isJsxExpression(node.parent));
assert.equal(branches.length, 1, 'Resolve the listing JSX branch, not the wrapper className ternary');
const branch = branches[0];
const presence = branch.parent.parent;
assert.ok(ts.isJsxElement(presence) && presence.openingElement.tagName.getText() === 'AnimatePresence');
assert.equal(presence.openingElement.attributes.properties[0].getText(), 'mode="wait"');
const unwrap = (node: ts.Expression): ts.Expression => ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node;
const consumer = unwrap(branch.whenTrue);
let markup = consumer;
if (ts.isJsxSelfClosingElement(consumer)) {
  const alias = checker.getSymbolAtLocation(consumer.tagName)!;
  const declaration = checker.getAliasedSymbol(alias).valueDeclaration;
  assert.ok(declaration && ts.isFunctionDeclaration(declaration) && declaration.body);
  assert.equal(declaration.name!.text, 'StudentClassroomList');
  const expression = declaration.body.statements.find(ts.isReturnStatement)!.expression!;
  markup = unwrap(expression);
  assert.equal(nodes(declaration, (node): node is ts.CallExpression => ts.isCallExpression(node)
    && /useState|useEffect|Repository|localStorage|\.filter$/.test(node.expression.getText())).length, 0);
}
function render(classrooms: any[]) {
  let selected: any, joins = 0;
  const createElement = (type: any, props: any, ...children: any[]) => ({ type, props: props ?? {}, children: children.flat(Infinity) });
  const globals: Record<string, any> = {
    React: { createElement }, motion: { div: 'motion.div' }, classrooms, getClassroomColorTheme,
    onSelect: (aula: any) => { selected = aula; }, onJoin: () => { joins++; },
    setSelectedAula: (aula: any) => { selected = aula; },
    setIsJoinModalOpen: (open: boolean) => { assert.equal(open, true); joins++; },
  };
  for (const name of ['BookOpen', 'Plus', 'Users', 'AlertCircle', 'CheckCircle2', 'Calendar', 'Award', 'Clock', 'ChevronRight']) globals[name] = name;
  const code = ts.transpileModule(`(${markup.getText()})`, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ESNext }, fileName: 'listing.tsx',
  }).outputText;
  const tree = runInNewContext(code, globals);
  const elements: any[] = [];
  function visit(node: any) { if (node && typeof node === 'object') { elements.push(node); node.children.forEach(visit); } }
  visit(tree);
  const text = (node: any): string => node && typeof node === 'object' ? node.children.map(text).join('') : node == null ? '' : String(node);
  return { tree, elements, text, selected: () => selected, joins: () => joins };
}

test('student listing retains header, grid/card/progress animation keys, metrics, theme fallbacks and original callbacks', () => {
  const first = { id: 'a-1', course: '1° A', subject: 'Materia', progress: 0, activeTasks: 0, avgGrade: 0 };
  const second = { id: 'a-2', course: '2° B', subject: 'Historia', color: 'blue', progress: 75, activeTasks: 3,
    teacherName: 'Docente Dos', nextClass: 'Viernes', avgGrade: 9.2, lastActivity: 'Ayer' };
  const mounted = render([first, second]);
  assert.equal(mounted.tree.props.key, 'grid');
  assert.equal(JSON.stringify(mounted.tree.props.initial), '{"opacity":0,"y":10}');
  assert.equal(JSON.stringify(mounted.tree.props.animate), '{"opacity":1,"y":0}');
  assert.equal(JSON.stringify(mounted.tree.props.exit), '{"opacity":0,"y":-10}');
  assert.equal(mounted.tree.props.transition.duration, 0.2);
  const cards = mounted.elements.filter(node => node.type === 'motion.div' && node.props.onClick);
  assert.equal(cards.length, 2);
  cards.forEach((card, index) => {
    assert.equal(card.props.key, [first, second][index].id);
    assert.equal(card.props.transition.delay, index * 0.05);
    assert.equal(JSON.stringify(card.props.initial), '{"opacity":0,"y":20}');
    assert.equal(JSON.stringify(card.props.animate), '{"opacity":1,"y":0}');
    card.props.onClick();
    assert.equal(mounted.selected(), [first, second][index], 'Selection passes the same classroom object');
  });
  const progress = mounted.elements.filter(node => node.type === 'motion.div' && node.props.initial?.width === 0);
  assert.deepEqual(progress.map(node => node.props.animate.width), ['0%', '75%']);
  progress.forEach(node => { assert.equal(node.props.transition.duration, 1); assert.equal(node.props.transition.delay, 0.2); });
  assert.match(mounted.text(cards[0]), /Prof\. Titular/);
  assert.match(mounted.text(cards[0]), /Mañana/);
  assert.match(mounted.text(cards[0]), /8\.8/);
  assert.match(mounted.text(cards[0]), /Activa hoy/);
  assert.match(mounted.text(cards[1]), /Docente Dos.*75%.*3.*Viernes.*9\.2.*Ayer/);
  assert.ok(mounted.elements.some(node => node.type === 'CheckCircle2'));
  assert.ok(mounted.elements.some(node => node.type === 'AlertCircle'));
  assert.ok(mounted.elements.some(node => node.props.title === 'Próxima clase: Mañana'));
  assert.ok(mounted.elements.some(node => node.props.title === 'Próxima clase: Viernes'));
  assert.ok(mounted.elements.some(node => node.props.className?.includes(getClassroomColorTheme(undefined, first.subject).bar)));
  assert.ok(mounted.elements.some(node => node.props.className?.includes(getClassroomColorTheme(second.color, second.subject).bar)));
  assert.match(mounted.text(mounted.tree), /Mis Aulas.*Materias Matriculadas/);
  assert.match(mounted.text(mounted.tree), /Accedé a tus materias, revisá tareas y consignas pendientes, consultá materiales de estudio y enviá tus entregas\./);
  mounted.elements.find(node => node.type === 'button' && mounted.text(node).includes('Unirse a un Aula')).props.onClick();
  assert.equal(mounted.joins(), 1);
});

test('empty student listing retains join action and no invented search/filter/view toggle', () => {
  const mounted = render([]);
  assert.equal(mounted.elements.filter(node => node.type === 'motion.div' && node.props.onClick).length, 0);
  assert.equal(mounted.elements.filter(node => node.type === 'input' || node.type === 'select').length, 0);
  const buttons = mounted.elements.filter(node => node.type === 'button');
  assert.equal(buttons.length, 1);
  buttons[0].props.onClick();
  assert.equal(mounted.joins(), 1);
  assert.equal(mounted.selected(), undefined);
  assert.ok(mounted.elements.some(node => node.props.className === 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6'));
});
