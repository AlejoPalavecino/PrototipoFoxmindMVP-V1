import { withGradingFixture, tableHash, gradingTables } from './p8-grading-helpers.mjs';
import { waitForAttemptClock } from './helpers/attempt-clock.mjs';
export { withGradingFixture, tableHash, gradingTables };
export const academicTables = [...gradingTables, 'units', 'topics'];
export async function withProgressFixture(callback) {
  return withGradingFixture(async f => {
    const change = async operation => f.service.changeActivities(f.T, f.room, { revision: (await f.service.detail(f.T, f.room)).revision, operation });
    const createAssignment = async (title, deadline = null) => {
      const detail = await f.service.detail(f.T, f.room), { id } = await change({ action: 'create', type: 'ASSIGNMENT' });
      await change({ action: 'save', id, payload: { title, unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id,
        instructions: 'Progress fixture instructions', attachmentRequired: false, instructionFileIds: [], materialIds: [],
        deadline, allowLate: true, questions: [] } });
      await change({ action: 'publish', id });
      return { id };
    };
    const submit = async (activity, request = f.S) => {
      let state = await f.service.activitySession(request, f.room, activity.id);
      if (!state.attempt) state = await f.service.startActivity(request, f.room, activity.id, {});
      else state = await f.service.transferAttemptEditor(request, f.room, state.attempt.id, { revision: state.attempt.revision });
      const editorRequest = { ...request, headers: { 'x-attempt-editor': state.editor.token, 'x-attempt-epoch': state.editor.epoch } };
      await waitForAttemptClock(state.attempt.openedAt);
      await f.service.submitPracticalAttempt(editorRequest, f.room, state.attempt.id, { revision: state.attempt.revision, confirm: true });
      return state.attempt.id;
    };
    const reopen = async activity => f.service.reopenActivity(f.T, f.room, activity.id, {
      revision: (await f.service.detail(f.T, f.room)).revision, studentId: f.student, deadline: null, confirm: true });
    return callback({ ...f, change, createAssignment, submit, reopen });
  });
}
