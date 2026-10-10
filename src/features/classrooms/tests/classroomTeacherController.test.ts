import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import * as boundary from '../index';

// E5 passing characterization: execute extracted current statements with fake hooks,
// not React/browser imports. After extraction, inspect the actual hook and public
// headless helpers and actual rendered E8 composition leaves. No student files.
const filename = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
const parse = (file: string) => ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = parse(filename('../../../views/docente/AulasDocente.tsx'));
const hookPath = filename('../hooks/useTeacherClassroomDetail.ts');
const migrated = existsSync(hookPath);
const ownerSource = migrated ? parse(hookPath) : page;
const owner = ownerSource.statements.find((node): node is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(node) && node.name?.text === (migrated ? 'useTeacherClassroomDetail' : 'AulaDetail'))!;
assert.ok(owner?.body);
const statements = owner.body.statements.filter(node => !ts.isReturnStatement(node));
const variables = statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]);
const states = variables.filter(node => ts.isArrayBindingPattern(node.name));
const printer = ts.createPrinter({ removeComments: true });
const print = (node: ts.Node) => printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()).replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '');
const hash = (node: ts.Node) => createHash('sha256').update(print(node)).digest('hex');
const evaluate = (code: string, globals: Record<string, unknown> = {}) => runInNewContext(ts.transpileModule(code, {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.None },
}).outputText, globals);
const fixtureSource = migrated ? parse(filename('../data/classroomSession.ts')) : page;
const fixture = (name: string): any[] => {
  const declaration = fixtureSource.statements.filter(ts.isVariableStatement)
    .flatMap(node => [...node.declarationList.declarations]).find(node => node.name.getText() === name)!;
  return evaluate(`(${declaration.initializer!.getText()})`);
};
const publicApi = boundary as any;
const legacyInitializer = !migrated ? variables.find(node => ts.isArrayBindingPattern(node.name)
  && node.name.elements[0].getText() === 'curriculum')!.initializer as ts.CallExpression : undefined;
const initialize = migrated ? publicApi.initializeTeacherCurriculum : (curriculum: any[]) =>
  evaluate(legacyInitializer!.arguments[0].getText(), { sessionCurriculum: curriculum });
const pageOwner = page.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === 'AulasDocente')!;
const pageEffect = pageOwner.body!.statements.find(node => ts.isExpressionStatement(node)
  && ts.isCallExpression(node.expression) && node.expression.expression.getText() === 'useEffect') as ts.ExpressionStatement;
const resolveClassroom = migrated ? publicApi.resolveTeacherClassroom : (classrooms: any[], navigationParams?: any) => {
  const expression = pageEffect.expression as ts.CallExpression;
  let selected: any;
  evaluate(`(${expression.arguments[0].getText()})()`, { classrooms, navigationParams, setSelectedAula: (aula: any) => { selected = aula; } });
  return selected;
};
const resolveActivity = migrated ? publicApi.resolveTeacherActivity : (activities: any[], taskTitle: string) => {
  const effect = statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
    && node.expression.expression.getText() === 'useEffect') as ts.ExpressionStatement;
  const callback = (effect.expression as ts.CallExpression).arguments[0] as ts.ArrowFunction;
  const branch = (callback.body as ts.Block).statements[0] as ts.IfStatement;
  const activity = (branch.thenStatement as ts.Block).statements.filter(ts.isVariableStatement)[0].declarationList.declarations[0];
  return evaluate(activity.initializer!.getText(), { activities, navigationParams: { taskTitle } });
};
const plain = (value: any) => JSON.parse(JSON.stringify(value));
const aula = { id: 'a-1', subject: 'Literatura', course: '3° B' };

function mount(overrides: Record<string, any> = {}, navigationParams?: any) {
  const values: Record<string, any> = {};
  const effects: Array<() => void> = [];
  const views: any[] = [], toasts: any[] = [], invitations: any[] = [], replacements: any[] = [];
  const students = fixture('sessionStudents'), curriculum = fixture('sessionCurriculum');
  const activities = [{ id: 1, title: 'Primera' }, { id: 2, title: 'Segunda' }];
  const submissions = [{ id: 'submission' }];
  let stateIndex = 0;
  const globals = {
    aula, sessionStudents: students, sessionCurriculum: curriculum,
    classroomDetailSession: { readStudents: () => students, readCurriculum: () => curriculum },
    initializeTeacherCurriculum: initialize, teacherDetailInitialTab: 'alumnos', resolveTeacherActivity: resolveActivity,
    useAppContext: () => ({ navigationParams, setView: (...args: any[]) => views.push(args) }),
    useState: (initial: any) => {
      const name = (states[stateIndex++].name as ts.ArrayBindingPattern).elements[0].getText();
      // Evaluate lazy reads even for overrides, preserving read-call characterization.
      const value = typeof initial === 'function' ? initial() : initial;
      values[name] = Object.hasOwn(overrides, name) ? overrides[name] : value;
      return [values[name], (next: any) => { values[name] = typeof next === 'function' ? next(values[name]) : next; }];
    },
    useRef: (current: any) => ({ current }),
    useEffect: (effect: () => void) => effects.push(effect),
    activityRepository: { read: () => activities, replace: (next: any) => replacements.push(next) },
    submissionRepository: { read: () => submissions },
    mapCreatedActivity: (data: any) => ({ ...data, mapped: true }),
    messagingStore: { sendClassroomInvitation: (invitation: any) => invitations.push(invitation) },
    toast: { show: (...args: any[]) => toasts.push(args) },
  };
  const names = variables.flatMap(node => ts.isIdentifier(node.name) ? [node.name.text]
    : ts.isArrayBindingPattern(node.name) ? node.name.elements.map(item => item.getText()) : []);
  const body = migrated ? owner.body!.getText()
    : `{ ${statements.map(node => node.getText()).join('\n')} return { ${names.join(',')} }; }`;
  const controller = evaluate(`(function () ${body})()`, globals);
  return { controller, values, effects, views, toasts, invitations, replacements, students, curriculum, activities, submissions };
}

test('teacher mount defaults retain all 24 states, eager curriculum and repository snapshots without subscriptions', () => {
  const mounted = mount();
  assert.equal(states.length, 24);
  assert.deepEqual(plain(mounted.values), {
    tab: 'alumnos', isActivityModalOpen: false, isPlanModalOpen: false,
    isInviteStudentModalOpen: false, inviteModalTab: 'email', inviteEmailInput: '', invitedEmailsList: [],
    inviteCustomNote: '', copiedCode: false, copiedLink: false, alumnosViewMode: 'grid',
    selectedActivity: null, selectedStudentProfile: null, students: plain(mounted.students),
    activities: mounted.activities, submissions: mounted.submissions, studentSearchTerm: '',
    libraryFiles: [
      { id: 1, title: 'Manual de Biología Celular', type: 'PDF', size: '2.4 MB', date: '12 may 2026', color: 'text-red-500', bg: 'bg-red-100' },
      { id: 2, title: 'Diapositivas - Tema 1', type: 'PPTX', size: '5.1 MB', date: '10 may 2026', color: 'text-orange-500', bg: 'bg-orange-100' },
      { id: 3, title: 'Guía de Trabajos Prácticos', type: 'PDF', size: '1.1 MB', date: '05 may 2026', color: 'text-red-500', bg: 'bg-red-100' },
    ],
    isUploadModalOpen: false, newFileTitle: '', newFileType: 'PDF', librarySearchTerm: '',
    curriculum: plain(initialize(mounted.curriculum)), foxySuggestion: null,
  });
  assert.equal(mounted.values.students, mounted.students);
  assert.equal(mounted.values.activities, mounted.activities);
  assert.equal(mounted.values.submissions, mounted.submissions);
  assert.equal(mounted.controller.fileInputRef.current, null);
  assert.equal(mounted.effects.length, 1);
  const source = statements.map(print).join('\n');
  assert.doesNotMatch(source, /subscribe|clearTimeout|useLayoutEffect/);
  assert.match(source, /useState\(\(\) => activityRepository.read\(\)\)/);
  assert.match(source, /useState\(\(\) => submissionRepository.read\(\)\)/);
  assert.doesNotMatch(source, /useState\(\(\) => (?:initializeTeacherCurriculum|sessionCurriculum)/);
});

test('session fixtures and whole curriculum replacement retain identity and completed-topic reference rules', () => {
  const initializers: Record<string, string> = {
    sessionStudents: '2a48269cc700279f70231a096902fa516b3e5204459c7efe2e4fa3a21a5a3385',
    sessionCurriculum: '23902edcd67abf9eb0657b2b9ebc1a58d50aa47cf6eab826b69daa1cb63d07c9',
  };
  for (const [name, expected] of Object.entries(initializers)) {
    const declaration = fixtureSource.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations])
      .find(node => node.name.getText() === name)!;
    assert.equal(hash(declaration.initializer!), expected, name);
  }
  const units = fixture('sessionCurriculum');
  units.push({ id: 5, unit: 'Empty current', status: 'current', topics: [] });
  const projected = initialize(units);
  assert.notEqual(projected, units);
  projected.forEach((unit: any, index: number) => {
    assert.notEqual(unit, units[index]);
    assert.equal(unit.topics, units[index].topics);
  });
  assert.notEqual(projected[0].completedTopics, units[0].topics);
  assert.deepEqual(plain(projected.map((unit: any) => unit.completedTopics)), [plain(units[0].topics), [units[1].topics[0]], [], [], [null]]);
  assert.deepEqual(plain(initialize([])), []);
  if (migrated) {
    const session = publicApi.classroomDetailSession;
    const original = session.readCurriculum(), students = session.readStudents();
    try {
      session.replaceCurriculum(units);
      assert.equal(session.readCurriculum(), units);
      assert.equal(session.readStudents(), students);
      const mountedSnapshot = initialize(session.readCurriculum());
      const empty: any[] = [];
      session.replaceCurriculum(empty);
      assert.equal(session.readCurriculum(), empty);
      assert.equal(mountedSnapshot[0].topics, units[0].topics);
    } finally { session.replaceCurriculum(original); }
  } else {
    assert.match(pageOwner.getText(), /sessionCurriculum = curriculum;/);
  }
});

test('teacher navigation retains task-subject precedence, truthiness, exact first lookup and empty activity fallback', () => {
  const classrooms = [aula, { ...aula, id: 'a-2' }];
  assert.equal(resolveClassroom(classrooms, { openTask: true, subject: 'Literatura 3° B', openAulaId: 'a-2' }), aula);
  assert.equal(resolveClassroom(classrooms, { openTask: true, subject: 'missing', openAulaId: 'a-2' }), undefined);
  assert.equal(resolveClassroom(classrooms, { openTask: true, subject: '', openAulaId: 'a-2' }), classrooms[1]);
  assert.equal(resolveClassroom(classrooms, { openTask: false, subject: 'Literatura 3° B', openAulaId: 'a-2' }), classrooms[1]);
  for (const params of [undefined, null, {}, { openAulaId: '' }, { openTask: true, subject: 'literatura 3° B' }])
    assert.equal(resolveClassroom(classrooms, params), undefined);
  assert.equal(resolveClassroom([], { openAulaId: 'a-1' }), undefined);
  const activities = [{ title: 'A' }, { title: 'B' }, { title: 'B' }];
  assert.equal(resolveActivity(activities, 'B'), activities[1]);
  assert.equal(resolveActivity(activities, 'b'), activities[0]);
  assert.equal(resolveActivity([], 'B'), undefined);
});

test('teacher navigation effect opens selected activity and consumes only transient task params via ID-preserving replace', () => {
  for (const [params, expected] of [[{ openTask: true, taskTitle: 'Segunda', openAulaId: 'different-id', subject: 'Literatura 3° B' }, 1], [{ openTask: true, taskTitle: 'missing' }, 0]] as const) {
    const mounted = mount({}, params);
    mounted.effects[0]();
    assert.equal(mounted.values.tab, 'actividades');
    assert.equal(mounted.values.selectedActivity, mounted.activities[expected]);
    assert.deepEqual(plain(mounted.views), [['aulas', { openAulaId: aula.id }, 'replace']]);
  }
  const empty = mount({ activities: [] }, { openTask: true, taskTitle: 'missing' });
  empty.effects[0]();
  assert.equal(empty.values.selectedActivity, undefined);
  for (const params of [undefined, {}, { openTask: false, taskTitle: 'Segunda' }, { openTask: true, taskTitle: '' }]) {
    const mounted = mount({}, params);
    mounted.effects[0]();
    assert.equal(mounted.values.tab, 'alumnos');
    assert.deepEqual(mounted.views, []);
  }
  const effect = statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
    && node.expression.expression.getText() === 'useEffect') as ts.ExpressionStatement;
  assert.equal(print((effect.expression as ts.CallExpression).arguments[1]), '[navigationParams, setView, aula.id]');
});

test('teacher topic, report, invitation, material and activity callback bodies remain normalized baseline-identical', () => {
  const expected: Record<string, string> = {
    handleToggleTopic: '461533805e56bde2d11d4bd31dd51b22075d0668c036de11638d135bf375ded5',
    handleGenerateReports: '1b6b0e0db6f598d6d9fa39169be2ef5be9303773ea128d02dce9e1cdb3ea0189',
    handleAddInviteEmail: '7b645279b69572aaa1473d4281d7b1657fa879d61e05b4a20ed3c8e78126f9af',
    handleRemoveInviteEmail: 'c81e0893df785b54f55867060ab2543b1e1df59bf3b9b23bd42c0ae792e361b2',
    handleSendEmailInvitations: '7d670e61829ee5e34a03631e0b2bf50e6e97daafe631b9ee6ca96e9a3d88cca9',
    handleUploadFile: 'c769e8e64238e0eaa6763b83fadfde2dbd60747fb849dd02af53ca56a14a3009',
    handleDeleteFile: '267ccab2821938bb6913b180ff29e93e429a0370f4d4bb2cf6821f4011ad16b1',
    filteredLibraryFiles: '62ac6d27769d6d7b226db2e4e6de77151f9fac6a377e920df1ab18a032f9bf38',
    handleCreateActivityFromModal: '6e608038392fff69f60283038c2d1a105596c76d87c12eba7a6c0704f51146e8',
    handleAddLibraryFile: '09f0e41feb310b38dd2c74c54e2d9e82d2806814e97b2eb4f55371883191bd99',
  };
  for (const [name, fingerprint] of Object.entries(expected)) {
    const matches = variables.filter(node => ts.isIdentifier(node.name) && node.name.text === name);
    assert.equal(matches.length, 1, name);
    assert.equal(hash(matches[0]), fingerprint, name);
  }
});

test('teacher callback characterization exercises topic toggles, report navigation, invite guards and local activity writes', () => {
  const mounted = mount({ inviteEmailInput: ' A@EXAMPLE.EDU ; bad ', invitedEmailsList: ['old@example.edu'], inviteCustomNote: ' note ' });
  const { controller, values } = mounted;
  controller.handleToggleTopic(3, mounted.curriculum[2].topics[0]);
  assert.deepEqual(plain(values.foxySuggestion), { topic: 'Realismo Mágico', nextTopic: 'García Márquez' });
  controller.handleToggleTopic(3, mounted.curriculum[2].topics[0]);
  assert.equal(values.foxySuggestion, null);
  controller.handleGenerateReports();
  assert.equal(mounted.views[0][0], 'copiloto');
  assert.match(mounted.views[0][1].initialPrompt, /Literatura 3° B/);
  controller.handleAddInviteEmail();
  assert.deepEqual(plain(values.invitedEmailsList), ['old@example.edu', 'a@example.edu']);
  assert.equal(values.inviteEmailInput, '');
  assert.equal(mounted.toasts[1][1], 'warning');
  controller.handleRemoveInviteEmail('old@example.edu');
  assert.deepEqual(plain(values.invitedEmailsList), ['a@example.edu']);
  // Callbacks keep their invocation snapshot until a React rerender, as before.
  controller.handleSendEmailInvitations();
  assert.equal(mounted.invitations.length, 1);
  assert.equal(mounted.invitations[0].classroom, aula);
  assert.equal(mounted.invitations[0].customNote, 'note');
  assert.equal(mounted.invitations[0].code, '3° -2026-A-1');
  assert.deepEqual(plain(values.invitedEmailsList), []);
  assert.equal(values.inviteCustomNote, '');
  const blank = mount();
  blank.controller.handleSendEmailInvitations();
  blank.controller.handleUploadFile();
  assert.equal(blank.invitations.length, 0);
  assert.deepEqual(blank.toasts.map(args => args[1]), ['warning', 'error']);
  const file = { id: 99, title: 'Extra' };
  controller.handleAddLibraryFile(file);
  assert.equal(values.libraryFiles[0], file);
  controller.handleCreateActivityFromModal({ title: 'New' });
  assert.equal(mounted.replacements[0], values.activities);
  assert.equal(values.activities[0].mapped, true);
  assert.equal(values.activities[1], mounted.activities[0]);
  assert.equal(values.submissions, mounted.submissions);
});

test('actual teacher grading preserves every attachment reference, order and byte content', async () => {
  const source = parse(filename('../../../components/aulas/TeacherActivityDetail.tsx'));
  let handler: ts.VariableDeclaration | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText() === 'handleSaveGrading') handler = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(handler?.initializer);
  const files = [new File([new Uint8Array([0, 255])], 'Repetido.txt'), new File(['distinto'], 'Repetido.txt')];
  const attachments = files.map(file => ({ name: file.name, type: 'TXT', size: '0 MB', file }));
  const records = boundary.deliverSubmission([{ studentId: 2, name: 'Sofía', status: 'missing', grade: null,
    date: null, dua: [], content: null }], 2, { attachments, text: 'Nota del alumno' });
  const other = { ...records[0], studentId: 3 };
  let updated: any[] = [], selected: any = records[0];
  const save = evaluate(`(${handler.initializer.getText()})`, {
    submissions: [records[0], other], selectedSubmissionToGrade: records[0],
    setSubmissions: (next: any[]) => { updated = next; },
    toast: { show: () => {} }, setSelectedSubmissionToGrade: (value: any) => { selected = value; },
  });
  const breakdown = [{ criteria: 'Análisis', max: 10, earned: 9 }];
  save(9, 'Buena entrega', breakdown);
  assert.equal(updated[0].status, 'graded');
  assert.equal(updated[0].grade, 9);
  assert.equal(updated[0].feedback, 'Buena entrega');
  assert.strictEqual(updated[0].rubricBreakdown, breakdown);
  assert.strictEqual(updated[0].attachments, records[0].attachments);
  assert.strictEqual(updated[0].attachedFile, attachments[0]);
  assert.strictEqual(updated[1], other);
  assert.equal(selected, null);
  assert.deepEqual(await Promise.all(updated[0].attachments.map(async (item: any) =>
    [...new Uint8Array(await item.file.arrayBuffer())])), [[0, 255], [...new TextEncoder().encode('distinto')]]);
});

// Expand only the actually resolved rendered leaf, mapping its local bindings to
// the mounted controller's returned property names. Keep the original whole-return
// fingerprint: materials/invitation extraction must not hide unrelated JSX changes.
function expandedDetailReturn() {
  const pagePath = filename('../../../views/docente/AulasDocente.tsx');
  const program = ts.createProgram([pagePath, hookPath], {
    noEmit: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const checker = program.getTypeChecker();
  const symbol = (node: ts.Node) => {
    const value = checker.getSymbolAtLocation(node);
    return value && value.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(value) : value;
  };
  const source = program.getSourceFile(pagePath)!;
  function consumers(owner: ts.Node, name: string) {
    const matches: ts.JsxSelfClosingElement[] = [];
    function visit(node: ts.Node) {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText() === name) matches.push(node);
      ts.forEachChild(node, visit);
    }
    visit(owner);
    return matches;
  }
  function rendered(owner: ts.FunctionDeclaration, name: string) {
    const matches = consumers(owner, name);
    assert.equal(matches.length, 1, `Actual rendered ${name}`);
    const declaration = symbol(matches[0].tagName)?.valueDeclaration;
    assert.ok(declaration && ts.isFunctionDeclaration(declaration) && declaration.body);
    return declaration;
  }
  const page = source.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'AulasDocente')!;
  const composed = existsSync(filename('../components/teacher/TeacherClassroomDetail.tsx'));
  const detail = rendered(page, composed ? 'TeacherClassroomDetail' : 'AulaDetail');
  const returned = detail.body!.statements.find(ts.isReturnStatement)!;
  assert.ok(returned.expression && ts.isParenthesizedExpression(returned.expression));
  const root = returned.expression.expression;
  assert.ok(ts.isJsxElement(root));
  const first = detail.body!.statements[0];
  assert.ok(ts.isVariableStatement(first));
  const mounted = first.declarationList.declarations[0];
  assert.ok(mounted.initializer && ts.isCallExpression(mounted.initializer));
  const controller = symbol(mounted.initializer.expression)?.valueDeclaration;
  assert.ok(controller && ts.isFunctionDeclaration(controller) && controller.body);
  const controllerReturn = controller.body.statements.find(ts.isReturnStatement)!.expression;
  assert.ok(controllerReturn && ts.isObjectLiteralExpression(controllerReturn));
  const controllerProperties = controllerReturn.properties;
  assert.ok(ts.isObjectBindingPattern(detail.parameters[0].name));
  const classroom = detail.parameters[0].name.elements.find(item => item.name.getText() === 'aula')!;
  let invitationOwner = detail;
  function expand(current: ts.FunctionDeclaration, mapping = new Map<ts.Symbol, string>()): string {
    const replacements: Array<{ start: number; end: number; text: string }> = [];
    const expression = current.body!.statements.find(ts.isReturnStatement)!.expression;
    assert.ok(expression && ts.isParenthesizedExpression(expression));
    const jsx = expression.expression;
    assert.ok(ts.isJsxFragment(jsx) || ts.isJsxElement(jsx));
    const nodes = ts.isJsxFragment(jsx) ? jsx.children.slice(1, -1) : [jsx];
    const start = nodes[0].getStart(), end = nodes[nodes.length - 1].getEnd();
    for (const leafName of ['TeacherClassroomDetailBody', 'TeacherClassroomDetailModals',
      'TeacherClassroomDetailMaterials', 'TeacherClassroomDetailInvitation']) {
      const matches = consumers(current, leafName);
      if (matches.length === 0) continue;
      const leafPath = filename(`../components/teacher/${leafName}.tsx`);
      const leaf = program.getSourceFile(leafPath)?.statements.find((node): node is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(node) && node.name?.text === leafName);
      if (!leaf) {
        assert.equal(leafName, 'TeacherClassroomDetailInvitation', 'Materials must already be extracted');
        assert.equal(existsSync(leafPath), false, 'Only pre-relocation invitation may remain inline');
        continue;
      }
      assert.ok(leaf.body);
      assert.equal(matches.length, 1, `Expand the actual resolved ${leafName} consumer`);
      const consumer = matches[0];
      assert.equal(symbol(consumer.tagName)?.valueDeclaration, leaf);
      const expectedProps = leafName === 'TeacherClassroomDetailMaterials' ? ['detail'] : ['aula', 'detail'];
      assert.deepEqual(consumer.attributes.properties.map(node => ts.isJsxAttribute(node) ? node.name.getText() : undefined), expectedProps);
      assert.ok(ts.isObjectBindingPattern(leaf.parameters[0].name));
      const leafMapping = new Map<ts.Symbol, string>();
      const currentBinding = (current.body!.statements[current === detail ? 1 : 0] as ts.VariableStatement).declarationList.declarations[0];
      assert.ok(currentBinding.initializer);
      assert.ok(ts.isObjectBindingPattern(current.parameters[0].name));
      for (const name of expectedProps) {
        const prop = consumer.attributes.properties.find(node => ts.isJsxAttribute(node) && node.name.getText() === name)!;
        assert.ok(ts.isJsxAttribute(prop) && prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression);
        const supplied = name === 'detail' ? currentBinding.initializer
          : current.parameters[0].name.elements.find(item => item.name.getText() === 'aula')!.name;
        assert.equal(symbol(prop.initializer.expression), symbol(supplied));
        const parameter = leaf.parameters[0].name.elements.find(item => (item.propertyName ?? item.name).getText() === name)!;
        assert.ok(parameter, `Leaf receives ${name}`);
        if (name === 'aula') leafMapping.set(symbol(parameter.name)!, mapping.get(symbol(supplied)!) ?? classroom.name.getText());
      }
      const binding = (leaf.body.statements[0] as ts.VariableStatement).declarationList.declarations[0];
      assert.ok(ts.isObjectBindingPattern(binding.name) && binding.initializer);
      const controllerProp = leaf.parameters[0].name.elements.find(item => (item.propertyName ?? item.name).getText() === 'detail')!;
      assert.equal(symbol(binding.initializer), symbol(controllerProp.name));
      for (const item of binding.name.elements) {
        const name = (item.propertyName ?? item.name).getText();
        assert.ok(controllerProperties.some(node => ts.isShorthandPropertyAssignment(node) && node.name.text === name));
        leafMapping.set(symbol(item.name)!, name);
      }
      // The inline body had one extra blank JSX separator before its first tab.
      // Restore only that extraction boundary whitespace for the unchanged oracle.
      replacements.push({ start: consumer.getStart(), end: consumer.getEnd(),
        text: (leafName === 'TeacherClassroomDetailBody' ? '\n' : '') + expand(leaf, leafMapping) });
      if (leafName === 'TeacherClassroomDetailInvitation') invitationOwner = leaf;
    }
    function visit(node: ts.Node) {
      if (replacements.some(item => node.getStart() >= item.start && node.getEnd() <= item.end)) return;
      const name = ts.isIdentifier(node) ? mapping.get(symbol(node)!) : undefined;
      if (name) replacements.push({ start: node.getStart(), end: node.getEnd(), text: name });
      // Canonical shell narrows this erased type assertion; preserve the original
      // source oracle's spelling without changing any runtime expression or JSX.
      if (ts.isAsExpression(node) && node.expression.getText() === 'newTab' && node.type.getText() === 'AulaTabId') {
        replacements.push({ start: node.type.getStart(), end: node.type.getEnd(), text: 'any' });
      }
      ts.forEachChild(node, visit);
    }
    nodes.forEach(visit);
    let text = current.getSourceFile().text.slice(start, end);
    replacements.sort((a, b) => b.start - a.start).forEach(item => {
      text = text.slice(0, item.start - start) + item.text + text.slice(item.end - start);
    });
    return text;
  }
  const reconstructed = ts.createSourceFile(pagePath, `function AulaDetail() { return (${expand(detail)}); }`,
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const originalInline = reconstructed.statements[0] as ts.FunctionDeclaration;
  return { returned: originalInline.body!.statements.find(ts.isReturnStatement)!, invitationOwner, detail,
    body: composed ? rendered(detail, 'TeacherClassroomDetailBody') : detail };
}

test('expanded teacher JSX retains selection, tab reset, clipboard timers, modals and active local-grading setter', () => {
  const { returned, invitationOwner, detail, body } = expandedDetailReturn();
  assert.equal(hash(returned), '1e633acb50d7bb8b11f8b5306a689335cef7a801d95f1cf1b9197216443665f8');
  assert.match(detail.getText(), /setTab\(newTab as (?:any|AulaTabId)\);\s*setSelectedActivity\(null\);/);
  assert.match(body.getText(), /setSubmissions=\{setSubmissions\}/);
  assert.match(body.getText(), /students=\{students.filter/);
  const timers: ts.CallExpression[] = [];
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText() === 'setTimeout') timers.push(node);
    ts.forEachChild(node, visit);
  }
  visit(invitationOwner);
  assert.equal(timers.length, 2, 'Exactly two timers in actual resolved invitation leaf, or original page before relocation');
  assert.deepEqual(timers.map(print), [
    'setTimeout(() => setCopiedCode(false), 2000)', 'setTimeout(() => setCopiedLink(false), 2000)',
  ]);
  if (migrated) {
    assert.match(pageOwner.getText(), /classroomDetailSession\.replaceCurriculum\(curriculum\);\s*setClassrooms\(\[classroom, \.\.\.classrooms\]\);/);
    assert.match(pageOwner.getText(), /const selectedAula = resolveTeacherClassroom\(classrooms, navigationParams\)/);
    assert.match(pageEffect.getText(), /if \(navigationParams\?\.openAulaId && !selectedAula\) setView\('aulas', undefined, 'replace'\)/);
    assert.equal(print((pageEffect.expression as ts.CallExpression).arguments[1]), '[navigationParams?.openAulaId, selectedAula, setView]');
    const first = detail.body!.statements[0];
    assert.ok(ts.isVariableStatement(first));
    assert.match(first.getText(), /= useTeacherClassroomDetail\(aula\)/);
    assert.equal(detail.body!.statements.length, 3, 'Only unconditional controller call, detail destructuring and original composition');
    const mounted = first.declarationList.declarations[0];
    assert.equal(mounted.name.getText(), 'detail');
    const second = detail.body!.statements[1];
    assert.ok(ts.isVariableStatement(second));
    assert.equal(second.declarationList.declarations[0].initializer!.getText(), 'detail');
  }
});
