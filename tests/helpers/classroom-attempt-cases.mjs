// F2 (TASK-009): every grading and participation body the classroom proxy used to reject on its own,
// plus the attempt headers it validated on the routes that carry them (answer, practical, transfer).
// Shared by the database test (the API must reject each one with 400 INVALID_INPUT and no writes)
// and by the proxy test (the proxy must forward each one intact).
// `ids` holds real fixture ids, revisions and editor capabilities so only the body or header is wrong.

const other = 'e2222222-2222-4222-8222-222222222222';
const control = 'respuesta\u0007control';

export function classroomAttemptCases(ids) {
  const { room, roomRevision: rev, student, lateStudent, activity, job, graded, published, questionnaire: q, practical: p } = ids;
  const grading = `/${room}/attempts/${graded.attempt}`, corrected = `/${room}/attempts/${published.attempt}`;
  const answer = `/${room}/attempts/${q.attempt}`, practical = `/${room}/attempts/${p.attempt}`;
  const qEditor = { 'x-attempt-editor': q.editor.token, 'x-attempt-epoch': String(q.editor.epoch) };
  const pEditor = { 'x-attempt-editor': p.editor.token, 'x-attempt-epoch': String(p.editor.epoch) };
  const grade = { revision: graded.revision, overallGrade: null, overallFeedback: null, questions: graded.questions };
  const correction = { revision: published.revision, newGrade: '8', reason: 'Ajuste verificado', confirm: true };
  const draft = { revision: q.revision, questionId: q.question, text: 'Respuesta', optionIds: [] };
  const cases = [
    // Private grading
    ['POST', `${grading}/grading`, 'teacher', { ...grade, ownerId: other }],
    ['POST', `${grading}/grading`, 'teacher', { ...grade, overallGrade: '8.345' }],
    ['POST', `${grading}/grading`, 'teacher', { ...grade, overallGrade: '1e1' }],
    ['POST', `${grading}/grading`, 'teacher', { ...grade, revision: Number(graded.revision) }],
    ['POST', `${grading}/grading`, 'teacher', { ...grade, finalGradeOverride: '10.01' }],
    ['POST', `${grading}/grading`, 'teacher', { ...grade, questions: [{ ...graded.questions[0], finalGrade: '10' }] }],
    ['POST', `${grading}/grading`, 'teacher', { ...grade, rubricMarks: [{ criterionIndex: 'cero', score: '1' }] }],
    ['POST', `${grading}/grading`, 'teacher', { ...grade, questions: [graded.questions[0], graded.questions[0]] }],
    ['POST', `${grading}/grading`, 'teacher', { ...grade, overallGrade: '0.001' }],
    ['POST', `${grading}/grading`, 'teacher', { ...grade, overallFeedback: '😀'.repeat(5001) }],
    // Grading AI
    ['POST', `${grading}/grading-ai/${job}/discard`, 'teacher', { requestId: 'pedido', revision: graded.revision }],
    ['POST', `${grading}/grading-ai/${job}/discard`, 'teacher', { requestId: other, revision: 'uno' }],
    ['POST', `${grading}/grading-ai/${job}/discard`, 'teacher', { requestId: other, revision: graded.revision, forged: true }],
    ['POST', `${grading}/grading-ai/${job}/apply`, 'teacher', { requestId: other, revision: graded.revision, snapshotHash: 'resumen', proposal: {} }],
    ['POST', `${grading}/grading-ai/${job}/apply`, 'teacher', { requestId: other, revision: graded.revision, snapshotHash: 'a'.repeat(64), proposal: null }],
    ['POST', `${grading}/grading-ai/${job}/apply`, 'teacher', { requestId: other, revision: graded.revision, snapshotHash: 'a'.repeat(64), proposal: [] }],
    ['POST', `${grading}/grading-ai/${job}/apply`, 'teacher', { requestId: other, revision: graded.revision, proposal: {} }],
    // Publication
    ['POST', `${grading}/publish-grade`, 'teacher', { revision: graded.revision, confirm: false }],
    ['POST', `${grading}/publish-grade`, 'teacher', { revision: graded.revision }],
    ['POST', `${grading}/publish-grade`, 'teacher', { revision: graded.revision, confirm: true, finalGrade: '10' }],
    ['POST', `${grading}/publish-grade`, 'teacher', { revision: '1e0', confirm: true }],
    // Published grade corrections
    ['POST', `${corrected}/grade-corrections`, 'teacher', { ...correction, reason: '   ' }],
    ['POST', `${corrected}/grade-corrections`, 'teacher', { ...correction, reason: 'x'.repeat(5001) }],
    ['POST', `${corrected}/grade-corrections`, 'teacher', { ...correction, newGrade: '10.01' }],
    ['POST', `${corrected}/grade-corrections`, 'teacher', { ...correction, newGrade: '8.345' }],
    ['POST', `${corrected}/grade-corrections`, 'teacher', { ...correction, newGrade: 8 }],
    ['POST', `${corrected}/grade-corrections`, 'teacher', { ...correction, confirm: false }],
    ['POST', `${corrected}/grade-corrections`, 'teacher', { ...correction, revision: '1e0' }],
    ['POST', `${corrected}/grade-corrections`, 'teacher', { ...correction, actorId: other }],
    ['POST', `${corrected}/grade-corrections`, 'teacher', { ...correction, previousGrade: '1' }],
    // Reopening and first authorization
    ['POST', `/${room}/activities/${activity}/reopen`, 'teacher', { revision: rev, studentId: 'alumno', deadline: null, confirm: true }],
    ['POST', `/${room}/activities/${activity}/reopen`, 'teacher', { revision: rev, studentId: student, deadline: null, confirm: false }],
    ['POST', `/${room}/activities/${activity}/reopen`, 'teacher', { revision: rev, studentId: student, deadline: { local: 7 }, confirm: true }],
    ['POST', `/${room}/activities/${activity}/reopen`, 'teacher', { revision: rev, studentId: student, deadline: null, confirm: true, forged: true }],
    ['POST', `/${room}/activities/${activity}/reopen`, 'teacher', { revision: rev, studentId: student, deadline: { local: '2030-01-01T18:00', offsetMinutes: 'cero' }, confirm: true }],
    // A student who joined after publication is the one a first authorization applies to.
    ['POST', `/${room}/activities/${activity}/authorize-first`, 'teacher', { revision: Number(rev), studentId: lateStudent, deadline: null }],
    // The service checks the obligation (409) before the deadline shape; see conflictFirst below.
    ['POST', `/${room}/activities/${activity}/authorize-first`, 'teacher', { revision: rev, studentId: lateStudent, deadline: { local: 7 } }, {}, true],
    ['POST', `/${room}/activities/${activity}/authorize-first`, 'teacher', { revision: rev, studentId: lateStudent, deadline: null, forged: true }],
    ['POST', `/${room}/activities/${activity}/authorize-first`, 'teacher', { revision: rev, studentId: lateStudent, deadline: { local: '2030-01-01T18:00', zone: 'UTC' } }, {}, true],
    ['POST', `/${room}/activities/${activity}/start`, 'student', { forged: true }],
    // Questionnaire answers
    ['POST', `${answer}/answer`, 'student', { ...draft, questionId: 'pregunta' }, qEditor],
    ['POST', `${answer}/answer`, 'student', { ...draft, optionIds: [4] }, qEditor],
    ['POST', `${answer}/answer`, 'student', { ...draft, text: null }, qEditor],
    ['POST', `${answer}/answer`, 'student', { ...draft, receivedAt: '2000-01-01' }, qEditor],
    ['POST', `${answer}/submit-answers`, 'student', { revision: q.revision, confirm: false, confirmIncomplete: true }, qEditor],
    ['POST', `${answer}/submit-answers`, 'student', { revision: q.revision, confirm: true, confirmIncomplete: 'sí' }, qEditor],
    ['POST', `${answer}/submit-answers`, 'student', { revision: q.revision, confirm: true, confirmIncomplete: true, receivedAt: '2000-01-01' }, qEditor],
    // Practical submission
    ['POST', `${practical}/practical-response`, 'student', { revision: p.revision, text: 7 }, pEditor],
    ['POST', `${practical}/practical-response`, 'student', { revision: p.revision, text: 'x'.repeat(5001) }, pEditor],
    ['POST', `${practical}/practical-response`, 'student', { revision: p.revision, text: control }, pEditor],
    ['POST', `${practical}/attachments-remove`, 'student', { revision: p.revision, fileId: 'archivo' }, pEditor],
    ['POST', `${practical}/submit-practical`, 'student', { revision: p.revision, confirm: false }, pEditor],
    ['POST', `${practical}/submit-practical`, 'student', { revision: p.revision, confirm: true, forged: true }, pEditor],
    // Editor transfer
    ['POST', `${answer}/transfer`, 'student', { revision: Number(q.revision) }],
    ['POST', `${answer}/transfer`, 'student', { revision: q.revision, forged: true }],
    // Attempt headers on the routes that carry them
    ['POST', `${answer}/answer`, 'student', draft, {}],
    ['POST', `${answer}/answer`, 'student', draft, { ...qEditor, 'x-attempt-epoch': 'uno' }],
    ['POST', `${answer}/answer`, 'student', draft, { ...qEditor, 'x-attempt-editor': 'corto' }],
    ['POST', `${practical}/practical-response`, 'student', { revision: p.revision, text: 'Respuesta' }, { 'x-attempt-editor': p.editor.token }],
    ['POST', `${answer}/transfer`, 'student', { revision: q.revision }, { ...qEditor, 'x-attempt-editor': 'corto' }],
    ['POST', `${answer}/transfer`, 'student', { revision: q.revision }, { 'x-attempt-epoch': String(q.editor.epoch) }],
  ];
  // conflictFirst: the API answers 409 CONFLICT for this fixture state before reaching the shape, as the
  // user's F2 ordering decision allows (session, permission and conflict before form).
  return cases.map(([method, path, actor, body, headers = {}, conflictFirst = false]) => ({ method, path, actor, body, headers, conflictFirst }));
}
