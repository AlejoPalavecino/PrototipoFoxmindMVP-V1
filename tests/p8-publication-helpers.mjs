import assert from 'node:assert/strict';
import { waitForAttemptClock } from './helpers/attempt-clock.mjs';
export { withGradingFixture, tableHash, gradingTables, protectedTables } from './p8-grading-helpers.mjs';

export async function saveComplete(f, attempt, points = '2', overallGrade = '6') {
  const view = await f.service.getAttemptGrading(f.T, f.room, attempt), body = f.input(view);
  body.overallFeedback = 'Published feedback';
  if (view.activity.type === 'ASSIGNMENT') body.overallGrade = overallGrade;
  else for (const row of body.questions) {
    if (view.activity.questions.find(q => q.id === row.questionId).manual) row.points = points;
    row.feedback = 'Question feedback';
  }
  return f.service.saveAttemptGrading(f.T, f.room, attempt, body);
}
export async function publish(f, attempt, view) {
  return f.service.publishAttemptGrade(f.T, f.room, attempt, { revision: (view ?? await f.service.getAttemptGrading(f.T, f.room, attempt)).revision, confirm: true });
}
export async function resubmit(f, activity) {
  await f.service.reopenActivity(f.T, f.room, activity.id, { revision: (await f.service.detail(f.T, f.room)).revision,
    studentId: f.student, deadline: null, confirm: true });
  let state = await f.service.activitySession(f.S, f.room, activity.id);
  state = await f.service.transferAttemptEditor(f.S, f.room, state.attempt.id, { revision: state.attempt.revision });
  const request = { ...f.S, headers: { 'x-attempt-editor': state.editor.token, 'x-attempt-epoch': state.editor.epoch } };
  await waitForAttemptClock(state.attempt.openedAt);
  await f.service.submitPracticalAttempt(request, f.room, state.attempt.id, { revision: state.attempt.revision, confirm: true });
  return state.attempt.id;
}
export function safeResult(result) {
  assert.ok(!/"(?:correct|scoringRule|options|manualPoints|audit|graded_by_id|student_id|actor_id)"/.test(JSON.stringify(result)));
}

export async function exactActivity(f, partial = false) {
  const room = await f.service.detail(f.T, f.room);
  const change = async operation => f.service.changeActivities(f.T, f.room, { revision: (await f.service.detail(f.T, f.room)).revision, operation });
  const { id } = await change({ action: 'create', type: partial ? 'QUESTIONNAIRE' : 'EVALUATION' });
  await change({ action: 'save', id, payload: { title: 'Exact rounding', unitId: room.units[0].id, topicId: room.units[0].topics[0].id,
    instructions: 'Immutable exact criteria', attachmentRequired: false, instructionFileIds: [], materialIds: [], deadline: null, allowLate: false,
    questions: partial ? [{ type: 'MULTIPLE_CHOICE', prompt: 'Two of three', points: '6', scoringRule: 'PARTIAL', options:
      ['One', 'Two', 'Unselected correct', 'Wrong'].map((text, index) => ({ text, correct: index < 3 })) }]
      : [{ type: 'DEVELOPMENT', prompt: 'Exact halfway', points: '20', scoringRule: null, options: [] }] } });
  await change({ action: 'publish', id });
  const state = await f.service.startActivity(f.S, f.room, id, {}), question = state.activity.questions[0];
  const request = { ...f.S, headers: { 'x-attempt-editor': state.editor.token, 'x-attempt-epoch': state.editor.epoch } };
  await f.service.saveAttemptAnswer(request, f.room, state.attempt.id, { revision: state.attempt.revision, questionId: question.id,
    text: partial ? '' : 'Exact answer', optionIds: partial ? question.options.slice(0, 2).map(o => o.id) : [] });
  const latest = await f.service.activitySession(f.S, f.room, id);
  await waitForAttemptClock(state.attempt.openedAt);
  await f.service.submitQuestionnaireAttempt(request, f.room, state.attempt.id, { revision: latest.attempt.revision, confirm: true, confirmIncomplete: false });
  return state.attempt.id;
}
