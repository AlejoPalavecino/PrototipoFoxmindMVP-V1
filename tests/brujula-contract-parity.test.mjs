import test from 'node:test';
import assert from 'node:assert/strict';
import { activityPayload } from '../apps/api/src/classrooms/activity-policy.ts';
import { privateGradingInput, parsePublishedGradeResult } from '../src/core/domain/classroom-grading.ts';
import { parseWallMutation } from '../src/core/domain/classroom-wall.ts';
import { rubricSuggestion } from '../src/core/domain/rubric-marks.ts';

const activity = { title: 'Actividad', unitId: null, topicIds: [], instructions: 'Explicá con ejemplos.',
  attachmentRequired: false, instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false };
const grading = { revision: '3', overallGrade: '7.50', overallFeedback: 'Seguí trabajando.', questions: [] };
const snapshot = [{ name: 'Evidencias', description: 'Cita fuentes.', weight: 60 }, { name: 'Claridad', description: '', weight: 40 }];
const marks = [{ criterionIndex: 0, score: '8.25' }, { criterionIndex: 1, score: '6.50' }];

test('Brújula authoring preserves objective, instructions and classroom comment independently', () => {
  const input = { ...activity, objective: 'Relacionar conceptos.', teacherComment: 'Podés consultar el material.' };
  const parsed = activityPayload(input, 'ASSIGNMENT', false);
  assert.equal(parsed.objective, input.objective);
  assert.equal(parsed.teacherComment, input.teacherComment);
  assert.equal(parsed.instructions, input.instructions);
});

test('Brújula legacy authoring still accepts omitted new fields', () => {
  assert.equal(activityPayload(activity, 'ASSIGNMENT', false).instructions, activity.instructions);
});

test('Brújula wall publication accepts a separate title and body', () => {
  const operation = { action: 'publish', title: 'Salida de campo', body: 'Traigan el cuaderno.' };
  assert.deepEqual(parseWallMutation({ revision: '3', operation }).operation, operation);
});

test('Brújula wall edit accepts a separate title without rewriting body', () => {
  const operation = { action: 'editPost', id: '00000000-0000-4000-8000-000000000001', title: 'Nuevo título', body: 'Mensaje original' };
  assert.deepEqual(parseWallMutation({ revision: '3', operation }).operation, operation);
});

test('Brújula wall legacy body-only publication remains accepted', () => {
  const operation = { action: 'publish', body: 'Aviso anterior.' };
  assert.deepEqual(parseWallMutation({ revision: '3', operation }).operation, operation);
});

test('Brújula private grade accepts canonical criterion scores and keeps explicit overall grade', () => {
  const parsed = privateGradingInput({ ...grading, rubricMarks: marks });
  assert.deepEqual(parsed.rubricMarks, marks);
  assert.equal(parsed.overallGrade, grading.overallGrade);
});

test('Brújula private grade rejects duplicate, invalid-index and noncanonical criterion scores', () => {
  for (const invalid of [[marks[0], marks[0]], [{ criterionIndex: -1, score: '5' }], [{ criterionIndex: 0.5, score: '5' }],
    [{ criterionIndex: 0, score: '10.01' }], [{ criterionIndex: 0, score: '-1' }], [{ criterionIndex: 0, score: 5 }],
    [{ criterionIndex: 0, score: '5e0' }], [{ criterionIndex: 0, score: '5.001' }]]) {
    assert.throws(() => privateGradingInput({ ...grading, rubricMarks: invalid }));
  }
});

test('Brújula private grading legacy payload preserves grade without inventing criterion scores', () => {
  const parsed = privateGradingInput(grading);
  assert.equal(parsed.overallGrade, '7.50');
  assert.ok(parsed.rubricMarks === undefined || parsed.rubricMarks === null);
});

test('Brújula published grade carries its own rubric snapshot and criterion marks', () => {
  const result = { status: 'published', activity: { id: 'activity', title: 'Actividad', type: 'ASSIGNMENT' },
    attempt: { id: 'attempt', number: 1, submittedAt: '2026-11-05T12:00:00Z' },
    grade: { id: 'grade', finalGrade: '7.50', publishedAt: '2026-11-05T13:00:00Z', overallFeedback: null, isEffective: true,
      rubricSnapshot: snapshot, rubricMarks: marks, suggestedGrade: '7.55' }, questions: [], attachments: [] };
  const parsed = parsePublishedGradeResult(result);
  assert.deepEqual(parsed.grade.rubricSnapshot, snapshot);
  assert.deepEqual(parsed.grade.rubricMarks, marks);
  assert.equal(parsed.grade.finalGrade, '7.50');
});

test('Brújula pending published-result projection never exposes draft rubric marks', () => {
  assert.deepEqual(parsePublishedGradeResult({ status: 'pending', attemptId: 'attempt', rubricMarks: marks, rubricSnapshot: snapshot }),
    { status: 'pending', attemptId: 'attempt' });
});

test('Brújula weighted suggestion uses exact decimals, bounds and complete criteria', () => {
  assert.equal(rubricSuggestion(snapshot, marks), '7.55');
  assert.equal(rubricSuggestion(snapshot, [{ criterionIndex: 0, score: '8.25' }]), null);
  assert.equal(rubricSuggestion(snapshot, [{ criterionIndex: 0, score: null }, marks[1]]), null);
  assert.throws(() => rubricSuggestion(snapshot, [{ criterionIndex: 2, score: '8.25' }]));
  assert.throws(() => rubricSuggestion([{ ...snapshot[0], weight: 80 }], [marks[0]]));
});

test('Brújula override is explicit and omission stays distinct from clearing', () => {
  assert.equal(Object.hasOwn(privateGradingInput(grading), 'finalGradeOverride'), false);
  assert.equal(privateGradingInput({ ...grading, finalGradeOverride: null }).finalGradeOverride, null);
  assert.equal(privateGradingInput({ ...grading, finalGradeOverride: '8.50' }).finalGradeOverride, '8.50');
  for (const invalid of ['10.01', '-1', 5, '5.001']) assert.throws(() => privateGradingInput({ ...grading, finalGradeOverride: invalid }));
});
