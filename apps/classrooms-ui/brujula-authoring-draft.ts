import type { ActivityData, ActivityType, Detail } from './api.ts';

/** Unsaved form state: the empty id is never sent to the API. */
export function localActivityDraft(room: Detail, type: ActivityType): ActivityData {
  return { revision: room.revision, preview: true, activity: {
    id: '', type, title: null, objective: null, teacherComment: null,
    unitId: null, topicId: null, topicIds: [], status: 'DRAFT', publishedAt: null,
    deadlineAt: null, allowLate: false, locked: false, zone: room.timezone,
    instructions: null, attachmentRequired: false, questions: [], instructionFiles: [], materials: [],
    evaluationRubric: [], aiGradingRubric: '',
  } };
}
