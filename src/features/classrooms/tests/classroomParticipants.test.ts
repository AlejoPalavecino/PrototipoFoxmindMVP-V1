import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

// Baseline dbf38e3: hash the complete rendered roster JSX, normalizing whitespace,
// callback aliases, and the filter now explicitly passed by the existing view owner.
// This is source-equivalence evidence, NOT a browser interaction test.
function normalizedJsxHash(source: string) {
  const start = source.indexOf('<div className="space-y-6 animate-in fade-in">');
  const jsx = source.slice(start, source.indexOf('\n  );', start)).trim();
  return createHash('sha256').update(jsx.replace(/\s+/g, '')).digest('hex');
}

test('teacher participant presentation retains normalized baseline JSX for toolbar/grid/list and selection bubbling', () => {
  const source = readSource('../components/teacher/TeacherParticipantList.tsx');
  assert.equal(normalizedJsxHash(source), 'c7006bf03f259d25942c507e4ad9fbab1ccdf49efe38469f50abbb69ce1579aa');
  assert.doesNotMatch(source, /useState|useEffect|messagingStore|Repository|\.filter\(/);
});

test('student participant presentation retains normalized baseline JSX without inventing selection or messaging', () => {
  const source = readSource('../components/student/StudentParticipantList.tsx');
  assert.equal(normalizedJsxHash(source), '527046afbdb4048d830cf34d371779b2d0b34e13936842a2399cbc5e85f07293');
  assert.doesNotMatch(source, /useState|useEffect|messagingStore|Repository|\.filter\(|onSelect/);
});

test('rendered participant lists keep distinct roster, search, view mode and callback ownership in current role owners', () => {
  const teacher = readSource('../../../views/docente/AulasDocente.tsx');
  const student = readSource('../../../views/alumno/AulasAlumno.tsx');
  // Resolve the hook actually called by the mounted teacher detail, not a detached
  // source file that merely contains matching state names. No browser execution.
  const pagePath = fileURLToPath(new URL('../../../views/docente/AulasDocente.tsx', import.meta.url));
  const hookPath = fileURLToPath(new URL('../hooks/useTeacherClassroomDetail.ts', import.meta.url));
  const program = ts.createProgram([pagePath, hookPath], {
    noEmit: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const checker = program.getTypeChecker();
  const page = program.getSourceFile(pagePath)!;
  const hook = program.getSourceFile(hookPath)!;
  const detail = page.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'AulaDetail');
  const controller = hook.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'useTeacherClassroomDetail');
  assert.ok(detail?.body && controller?.name && controller.body);
  const first = detail.body.statements[0];
  assert.ok(ts.isVariableStatement(first));
  const mounted = first.declarationList.declarations[0];
  assert.ok(ts.isIdentifier(mounted.name) && mounted.initializer && ts.isCallExpression(mounted.initializer));
  const imported = checker.getSymbolAtLocation(mounted.initializer.expression)!;
  assert.ok(imported.flags & ts.SymbolFlags.Alias);
  assert.equal(checker.getAliasedSymbol(imported), checker.getSymbolAtLocation(controller.name));
  assert.equal(mounted.initializer.arguments[0].getText(), 'aula');
  const second = detail.body.statements[1];
  assert.ok(ts.isVariableStatement(second));
  const binding = second.declarationList.declarations[0];
  assert.ok(ts.isObjectBindingPattern(binding.name) && binding.initializer && ts.isIdentifier(binding.initializer));
  assert.equal(checker.getSymbolAtLocation(binding.initializer), checker.getSymbolAtLocation(mounted.name),
    'Participant bindings consume the single unconditional mounted controller return');
  const returned = controller.body.statements.find(ts.isReturnStatement)!;
  assert.ok(returned.expression && ts.isObjectLiteralExpression(returned.expression));
  for (const name of ['students', 'studentSearchTerm', 'setStudentSearchTerm', 'alumnosViewMode',
    'setAlumnosViewMode', 'setSelectedStudentProfile', 'handleGenerateReports', 'setIsInviteStudentModalOpen']) {
    assert.ok(binding.name.elements.some(item => item.name.getText() === name), `Mounted detail consumes ${name}`);
    const property = returned.expression.properties.find((node): node is ts.ShorthandPropertyAssignment =>
      ts.isShorthandPropertyAssignment(node) && node.name.text === name);
    assert.ok(property, `Actual controller returns ${name}`);
    const symbol = checker.getShorthandAssignmentValueSymbol(property);
    assert.equal(symbol?.valueDeclaration?.getSourceFile(), hook, `${name} remains hook-owned`);
  }
  const teacherState = controller.body.getText();
  for (const [source, stateOwner, component] of [[teacher, teacherState, 'TeacherParticipantList'], [student, student, 'StudentParticipantList']]) {
    assert.match(stateOwner, /useState<'grid'\s*\|\s*'list'>\('grid'\)/);
    assert.match(stateOwner, /\[studentSearchTerm, setStudentSearchTerm\] = useState\(''\)/);
    const start = source.indexOf(`<${component}`);
    const wiring = source.slice(start, source.indexOf('/>', start));
    assert.match(wiring, /students=\{students\.filter\(s => s\.name\.toLowerCase\(\)\.includes\(studentSearchTerm\.toLowerCase\(\)\)\)\}/);
    assert.match(wiring, /studentSearchTerm=\{studentSearchTerm\}/);
    assert.match(wiring, /alumnosViewMode=\{alumnosViewMode\}/);
    assert.match(wiring, /onSearchChange=\{setStudentSearchTerm\}/);
    assert.match(wiring, /onViewModeChange=\{setAlumnosViewMode\}/);
  }
  assert.match(teacherState, /\[students, setStudents\] = useState\(classroomDetailSession\.readStudents\(\)\)/);
  assert.match(teacher, /onSelect=\{setSelectedStudentProfile\}/);
  assert.match(teacher, /onGenerateReports=\{handleGenerateReports\}/);
  assert.match(teacher, /onInvite=\{\(\) => setIsInviteStudentModalOpen\(true\)\}/);
  assert.match(teacherState, /messagingStore\.sendClassroomInvitation\(/);
  assert.match(student, /const students = \[/);
  assert.match(student, /name: 'Sofía Herrera \(Tú\)'/);
  assert.match(student, /messagingStore\.subscribe\(/);
});
