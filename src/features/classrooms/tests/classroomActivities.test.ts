import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as legacy from '../../../mockData';
import { activityRepository } from '../data/inMemoryActivityRepository';
import { createActivity, mapCreatedActivity, createStudentActivities } from '../application/classroomActivities';
import { createActivityFixtures, createStudentActivityFixtures } from '../data/activityFixtures';
import { createSubmissionFixtures } from '../data/submissionFixtures';
import type { ActivityCreationInput } from '../model/Activity';

const input = (): ActivityCreationInput => ({
  activityTitle: '  Ensayo sin recortar  ',
  activityType: 'Trabajo práctico',
  startDate: '2026-05-12',
  dueDate: '2026-05-19',
  activityDescription: 'Descripción\ncon consignas',
  effectiveTopic: 'Ultraísmo',
  studentCount: 5,
  uploadedActivityDoc: null,
  attachedMaterial: null,
  activityRubric: [{ criteria: 'Análisis', points: 10 }],
  duaAdaptations: [{ studentName: 'Sofía', duaProfile: 'Dislexia', adaptedContent: 'Lectura fácil', confirmed: true }],
  activeCreationMode: 'ai',
});

test('creation preserves every field, instructions, whitespace, dates and nested references', () => {
  const form = input();
  const before = structuredClone(form);
  let calls = 0;
  const created = createActivity(form, () => { calls += 1; return 123; });
  assert.deepEqual(created, {
    id: 123,
    title: '  Ensayo sin recortar  ',
    type: 'Trabajo práctico',
    status: 'Activa',
    startDate: '2026-05-12',
    due: '2026-05-19',
    submissions: '0/5',
    description: 'Descripción\ncon consignas',
    topic: 'Ultraísmo',
    longInstructions: [
      { title: 'Pautas de trabajo', content: 'Descripción\ncon consignas' },
      { title: 'Criterios de evaluación', content: 'Revisa la rúbrica asociada para guiar la elaboración de tus respuestas.' },
    ],
    attachment: undefined,
    rubric: form.activityRubric,
    duaAdaptations: form.duaAdaptations,
    createdVia: 'ai',
  });
  assert.equal(calls, 1);
  assert.deepEqual(form, before);
  assert.strictEqual(created.rubric, form.activityRubric);
  assert.strictEqual(created.duaAdaptations, form.duaAdaptations);
});

test('creation uses Date.now by default and retains zero-student fallback without validation', t => {
  t.mock.method(Date, 'now', () => 456);
  const created = createActivity({ ...input(), studentCount: 0, activityTitle: '', dueDate: '', activityDescription: '' });
  assert.equal(created.id, 456);
  assert.equal(created.submissions, '0/28');
  assert.equal(created.title, '');
  assert.equal(created.due, '');
  assert.equal(created.description, '');
});

test('uploaded activity document wins over library material and copies only attachment metadata', () => {
  const form = {
    ...input(),
    activeCreationMode: 'upload' as const,
    uploadedActivityDoc: { name: 'Consignas.docx', size: '1.0 MB', type: 'DOCX' },
    attachedMaterial: { name: 'Lectura.pdf', size: '2.0 MB', fromLibrary: true },
  };
  const created = createActivity(form, () => 1);
  assert.deepEqual(created.attachment, { name: 'Consignas.docx', size: '1.0 MB', url: '#' });
  assert.notStrictEqual(created.attachment, form.uploadedActivityDoc);
  assert.equal(created.createdVia, 'upload');
});

test('material attachment retains true, false or absent fromLibrary with a fresh object', () => {
  for (const fromLibrary of [true, false, undefined]) {
    const attachedMaterial = { name: 'Lectura.pdf', size: '2.0 MB', fromLibrary };
    const created = createActivity({ ...input(), attachedMaterial }, () => 1);
    assert.deepEqual(created.attachment, { name: 'Lectura.pdf', size: '2.0 MB', url: '#', fromLibrary });
    assert.notStrictEqual(created.attachment, attachedMaterial);
  }
});

test('assignment prepends a projected record, drops wizard-only fields and retains references/order', () => {
  const records = createActivityFixtures();
  const created = createActivity(input(), () => 99);
  const next = [mapCreatedActivity(created), ...records];
  assert.notStrictEqual(next, records);
  assert.notStrictEqual(next[0], created);
  assert.deepEqual(Object.keys(next[0]), [
    'id', 'title', 'type', 'status', 'due', 'submissions', 'description',
    'longInstructions', 'attachment', 'rubric', 'duaAdaptations',
  ]);
  const { startDate, topic, createdVia, ...assignedFields } = created;
  assert.deepEqual(next[0], assignedFields);
  assert.strictEqual(next[0].longInstructions, created.longInstructions);
  assert.strictEqual(next[0].rubric, created.rubric);
  assert.strictEqual(next[0].duaAdaptations, created.duaAdaptations);
  assert.deepEqual(next.map(a => a.id), [99, 1, 2, 3]);
  assert.deepEqual(records.map(a => a.id), [1, 2, 3]);
  records.forEach((record, i) => assert.strictEqual(next[i + 1], record));
  assert.deepEqual(mapCreatedActivity(created).attachment, created.attachment);
});

test('assignment preserves draft status and attachment reference without mutating wizard data', () => {
  const created = createActivity({
    ...input(),
    attachedMaterial: { name: 'Lectura.pdf', size: '2.0 MB', fromLibrary: true },
  }, () => 99);
  created.status = 'Borrador';
  const before = structuredClone(created);
  const assigned = mapCreatedActivity(created);
  assert.equal(assigned.status, 'Borrador');
  assert.strictEqual(assigned.attachment, created.attachment);
  assert.deepEqual(created, before);
});

test('repository and legacy copilot-style writes share a live owner, not local snapshots', () => {
  const original = activityRepository.read();
  try {
    assert.strictEqual(original, legacy.sharedActivities);
    const localSnapshot = [...original];
    const next = [mapCreatedActivity(createActivity(input(), () => 88)), ...localSnapshot];
    assert.equal(activityRepository.replace(next), undefined);
    assert.strictEqual(legacy.sharedActivities, next);
    assert.strictEqual(activityRepository.read(), next);
    assert.equal(localSnapshot.length, 3);
    const copilotAssignment = { ...next[0], id: 77 };
    const copilotNext = [copilotAssignment, ...legacy.sharedActivities];
    legacy.updateSharedActivities(copilotNext);
    assert.strictEqual(activityRepository.read(), copilotNext);
    assert.deepEqual(activityRepository.read().map(a => a.id), [77, 88, 1, 2, 3]);
    const empty: typeof original = [];
    activityRepository.replace(empty);
    assert.strictEqual(legacy.sharedActivities, empty);
  } finally {
    activityRepository.replace(original);
  }
});

test('student mount fixtures preserve role-specific order, status, copy and attachments', () => {
  const activities = createStudentActivities([], 2);
  assert.deepEqual(activities, createStudentActivityFixtures());
  assert.deepEqual(activities.map(a => [a.id, a.title, a.status, a.due, a.attachment.name]), [
    [1, 'Ensayo: Vanguardias Literarias', 'Pendiente', 'Mañana', 'Manifiestos_Vanguardias.pdf'],
    [2, 'Foro: El Boom Latinoamericano', 'Pendiente', 'En 3 días', 'Guia_Realismo_Magico.pdf'],
    [3, 'Cuestionario: Modernismo y Simbolismo', 'Completada', 'Semana pasada', 'Resumen_Modernismo.pdf'],
  ]);
  assert.equal(activities[0].description, 'Lee los manifiestos adjuntos de Vicente Huidobro y Guillermo de Torre. Luego, redacta un breve ensayo comparando cómo cada movimiento aborda la creación de imágenes poéticas.');
  assert.equal(activities[1].description, 'Participa en el foro debatiendo sobre el impacto del Realismo Mágico en la literatura contemporánea. Debes comentar al menos a dos compañeros.');
  assert.equal(activities[2].description, 'Cuestionario de opción múltiple y preguntas conceptuales sobre el movimiento modernista.');
  assert.equal(activities[2].grade, '9.0');
  assert.equal(activities[2].feedback, '¡Excelente trabajo! Has demostrado una comprensión sistemática de las características del Modernismo y la obra de Rubén Darío.');
  const anotherMount = createStudentActivities([], 2);
  assert.notStrictEqual(anotherMount, activities);
  assert.notStrictEqual(anotherMount[0].attachment, activities[0].attachment);
});

test('student initialization reads only first matching submission for activity 1 with existing grade semantics', () => {
  const sub = createSubmissionFixtures()[1];
  for (const status of ['missing', 'submitted', 'graded'] as const) {
    const records = [{ ...sub, status, grade: 0, feedback: 'Comentario' }];
    const before = structuredClone(records);
    const activities = createStudentActivities(records, sub.studentId);
    assert.equal(activities[0].status, status === 'missing' ? 'Pendiente' : status === 'graded' ? 'Completada' : 'Entregada');
    assert.equal(activities[0].grade, status === 'missing' ? undefined : '0');
    assert.equal(activities[0].feedback, status === 'missing' ? undefined : 'Comentario');
    assert.equal(activities[1].status, 'Pendiente');
    assert.equal(activities[2].grade, '9.0');
    assert.deepEqual(records, before);
  }
  assert.equal(createStudentActivities([sub], 999)[0].status, 'Pendiente');
  assert.equal(createStudentActivities([sub], sub.studentId)[0].grade, undefined);
  assert.equal(createStudentActivities([{ ...sub, status: 'missing' }, sub], sub.studentId)[0].status, 'Pendiente');
});
