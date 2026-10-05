import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  analyzeClassroomPlan, classroomRepository, createClassroomForm,
  createTeacherClassroom, describeStudyPlanFile, getClassroomColorTheme, validateClassroomForm
} from '../index';
import type { ClassroomCreationForm } from '../index';
import { analysisDelayMs, aulaColorPalette, creationDelayMs } from '../data/classroomCreationFixtures';

// Expected values transcribed from HEAD 17d9557 AulasDocente lines 49–188.
// The original behavior was UI-embedded, not runnable through a pure API.
const validForm = (): ClassroomCreationForm => ({
  ...createClassroomForm(), subject: '  Biología General  ', year: '3° Año',
  division: 'División B', observation: 'No se persiste'
});
const file = { name: 'plan.pdf', size: '2.0 MB' };

test('form/open defaults are fresh and preserve blue, empty optional observation and topics', () => {
  const first = createClassroomForm();
  assert.deepEqual(first, {
    subject: '', year: '', division: '', observation: '', color: 'blue', topics: []
  });
  first.topics.push({ id: 'edited', name: 'Unidad', subtopics: [] });
  assert.deepEqual(createClassroomForm().topics, []);
});

test('analysis validation preserves ordered warnings and requires a file', () => {
  assert.equal(validateClassroomForm(createClassroomForm(), null), 'Ingresa el nombre de la materia');
  assert.equal(validateClassroomForm({ ...validForm(), subject: ' \t\n' }, file), 'Ingresa el nombre de la materia');
  for (const missing of [{ year: '' }, { division: '' }, { year: '', division: '' }]) {
    assert.equal(validateClassroomForm({ ...validForm(), ...missing }, null), 'Selecciona año y división del curso');
  }
  assert.equal(validateClassroomForm(validForm(), null), 'Debes cargar el plan de estudios para que la IA lo analice');
  assert.equal(validateClassroomForm(validForm(), file), null);
  // Year/division are truthy checks, not trimmed/enum validation. No topics required.
  assert.equal(validateClassroomForm({ ...validForm(), year: ' ', division: ' ', observation: '' }, file), null);
});

test('file metadata uses one decimal MB without enforcing extension, size or parsing contents', () => {
  assert.deepEqual(describeStudyPlanFile({ name: 'plan.pdf', size: 2 * 1024 * 1024 }), file);
  assert.deepEqual(describeStudyPlanFile({ name: 'empty.any', size: 0 }), { name: 'empty.any', size: '0.0 MB' });
  assert.equal(describeStudyPlanFile({ name: 'plan.doc', size: 1.26 * 1024 * 1024 }).size, '1.3 MB');
});

test('analysis retains all four unit titles/subtopics and separate clock samples', () => {
  let tick = 40;
  const topics = analyzeClassroomPlan('  Biología General  ', () => ++tick);
  assert.equal(tick, 44);
  assert.deepEqual(topics, [
    {
      id: 'u-41-1', name: 'Unidad 1: Fundamentos e Introducción a Biología General',
      subtopics: ['Contexto histórico y marco conceptual', 'Objetivos de aprendizaje y metodología', 'Diagnóstico inicial']
    },
    {
      id: 'u-42-2', name: 'Unidad 2: Núcleo temático y desarrollo de habilidades',
      subtopics: ['Ejes teóricos estructurantes', 'Análisis de fuentes y bibliografía', 'Actividades de fijación']
    },
    {
      id: 'u-43-3', name: 'Unidad 3: Trabajo práctico y producción colaborativa',
      subtopics: ['Casos de estudio aplicados', 'Metodologías activas y talleres', 'Instancias DUA de diversificación']
    },
    {
      id: 'u-44-4', name: 'Unidad 4: Proyecto integrador y evaluación formativa',
      subtopics: ['Consigna y rúbrica de evaluación', 'Presentación grupal / individual', 'Autoevaluación y cierre']
    }
  ]);
  topics[0].subtopics.push('Editado');
  assert.equal(analyzeClassroomPlan('Otra', () => 42)[0].subtopics.length, 3);
});

test('creation retains generated fields, subject-only trimming and omitted observation', () => {
  let calls = 0;
  const form = validForm();
  const before = structuredClone(form);
  const result = createTeacherClassroom(form, () => { calls++; return 123; });
  assert.equal(calls, 1);
  assert.deepEqual(result, {
    classroom: {
      id: 'aula-123', subject: 'Biología General', course: '3° Año División B', color: 'bg-blue-500',
      studentsCount: 25, activeTasks: 1, pendingSubmissions: 0, avgGrade: 0, progress: 0,
      teacherName: 'Docente a cargo', lastActivity: 'Recién creada'
    },
    curriculum: []
  });
  assert.deepEqual(form, before);
  assert.equal(createTeacherClassroom({ ...form, year: ' 3° ', division: ' A ' }, () => 1).classroom.course, ' 3°   A ');
});

test('all palette values and existing theme fallback/priority are retained', () => {
  assert.deepEqual(aulaColorPalette.map(c => [c.id, c.label, c.hex, c.bgClass, c.pillBg, c.textClass, c.borderClass]), [
    ['blue', 'Azul', '#2563eb', 'bg-blue-500', 'bg-blue-500/10', 'text-blue-600', 'border-blue-500'],
    ['orange', 'Naranja', '#f97316', 'bg-fox-orange', 'bg-fox-orange/10', 'text-fox-orange', 'border-fox-orange'],
    ['purple', 'Púrpura', '#a855f7', 'bg-fox-purple', 'bg-fox-purple/10', 'text-fox-purple', 'border-fox-purple'],
    ['green', 'Verde', '#22c55e', 'bg-fox-green', 'bg-fox-green/10', 'text-fox-green', 'border-fox-green'],
    ['red', 'Rojo', '#ef4444', 'bg-red-500', 'bg-red-500/10', 'text-red-500', 'border-red-500'],
    ['pink', 'Rosa', '#ec4899', 'bg-pink-500', 'bg-pink-500/10', 'text-pink-500', 'border-pink-500'],
    ['yellow', 'Amarillo', '#eab308', 'bg-yellow-500', 'bg-yellow-500/10', 'text-yellow-600', 'border-yellow-500']
  ]);
  for (const color of aulaColorPalette) {
    const classroom = createTeacherClassroom({ ...validForm(), subject: 'Geografía', color: color.id }, () => 1).classroom;
    assert.equal(classroom.color, color.bgClass);
    // Theme intentionally only recognizes four color families, not all seven.
    assert.equal(getClassroomColorTheme(classroom.color, classroom.subject).bar,
      ['red', 'pink', 'yellow'].includes(color.id) ? 'bg-fox-primary' : color.id === 'blue' ? 'bg-fox-blue' : color.bgClass);
  }
  assert.equal(createTeacherClassroom({ ...validForm(), color: 'unknown' as ClassroomCreationForm['color'] }, () => 1).classroom.color, 'bg-blue-500');
  assert.equal(getClassroomColorTheme('bg-blue-500', 'Literatura').bar, 'bg-fox-purple');
});

test('curriculum result is a whole replacement with ordered ids/status and shared topic arrays', () => {
  const form = { ...validForm(), topics: [
    { id: 'old-9', name: 'Unidad editada', subtopics: ['Tema', ''] },
    { id: 'old-2', name: '', subtopics: [] }
  ] };
  const result = createTeacherClassroom(form, () => 42);
  assert.deepEqual(result.curriculum, [
    { id: 1, unit: 'Unidad editada', status: 'current', topics: ['Tema', ''] },
    { id: 2, unit: '', status: 'pending', topics: [] }
  ]);
  assert.strictEqual(result.curriculum[0].topics, form.topics[0].subtopics);
  assert.strictEqual(result.curriculum[1].topics, form.topics[1].subtopics);
  assert.deepEqual(createTeacherClassroom({ ...form, topics: [] }, () => 43).curriculum, []);
  // Module replacement itself and detail mount behavior need UI verification.
});

test('planning never mutates catalogue/membership; local prepending does not publish new aulas', () => {
  const catalogue = classroomRepository.readCatalogue();
  const membership = classroomRepository.readMembership();
  const before = structuredClone(catalogue);
  const classroom = createTeacherClassroom(validForm(), () => 42).classroom;
  const localList = [classroom, ...catalogue];
  assert.strictEqual(localList[0], classroom);
  assert.strictEqual(localList[1], catalogue[0]);
  assert.deepEqual(catalogue, before);
  assert.strictEqual(classroomRepository.readCatalogue(), catalogue);
  assert.strictEqual(classroomRepository.readMembership(), membership);
  assert.equal(catalogue.some(c => c.id === classroom.id), false);
});

test('simulation delays preserve analysis 2200 ms and creation 1800 ms', () => {
  assert.equal(analysisDelayMs, 2200);
  assert.equal(creationDelayMs, 1800);
});
