import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

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

test('rendered participant lists keep distinct roster, search, view mode and callback ownership in each role view', () => {
  const teacher = readSource('../../../views/docente/AulasDocente.tsx');
  const student = readSource('../../../views/alumno/AulasAlumno.tsx');
  for (const [source, component] of [[teacher, 'TeacherParticipantList'], [student, 'StudentParticipantList']]) {
    assert.match(source, /useState<'grid'\s*\|\s*'list'>\('grid'\)/);
    assert.match(source, /\[studentSearchTerm, setStudentSearchTerm\] = useState\(''\)/);
    const start = source.indexOf(`<${component}`);
    const wiring = source.slice(start, source.indexOf('/>', start));
    assert.match(wiring, /students=\{students\.filter\(s => s\.name\.toLowerCase\(\)\.includes\(studentSearchTerm\.toLowerCase\(\)\)\)\}/);
    assert.match(wiring, /studentSearchTerm=\{studentSearchTerm\}/);
    assert.match(wiring, /alumnosViewMode=\{alumnosViewMode\}/);
    assert.match(wiring, /onSearchChange=\{setStudentSearchTerm\}/);
    assert.match(wiring, /onViewModeChange=\{setAlumnosViewMode\}/);
  }
  assert.match(teacher, /\[students, setStudents\] = useState\(sessionStudents\)/);
  assert.match(teacher, /onSelect=\{setSelectedStudentProfile\}/);
  assert.match(teacher, /onGenerateReports=\{handleGenerateReports\}/);
  assert.match(teacher, /onInvite=\{\(\) => setIsInviteStudentModalOpen\(true\)\}/);
  assert.match(teacher, /messagingStore\.sendClassroomInvitation\(/);
  assert.match(student, /const students = \[/);
  assert.match(student, /name: 'Sofía Herrera \(Tú\)'/);
  assert.match(student, /messagingStore\.subscribe\(/);
});
