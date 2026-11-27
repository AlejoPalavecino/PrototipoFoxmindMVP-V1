import { useMemo, useState, type SetStateAction } from 'react';
import { activityMinute } from '../../../../../shared-ui/academic-date.ts';
import type { ActivityData } from '../../../../../../src/core/contracts/activities.ts';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import type { ActivityScope } from '../model/activity-scope.ts';

type Activity = ActivityData['activity'];

function initialFields(activity: Activity, room: Detail, creationContext?: ClassroomCreationContext | null) {
  const local = activityMinute(activity.deadlineAt, room.timezone);
  return {
    title: activity.title ?? '',
    scope: {
      unitIds: [],
      topicIds: creationContext?.topicIds ?? activity.topicIds ?? (activity.topicId ? [activity.topicId] : []),
    } as ActivityScope,
    instructions: activity.instructions ?? '',
    attachmentRequired: activity.attachmentRequired,
    objective: activity.objective ?? '',
    teacherComment: activity.teacherComment ?? '',
    draftType: activity.type,
    typeChosen: Boolean(activity.id || activity.title || activity.instructions),
    aiGradingRubric: activity.aiGradingRubric ?? '',
    evaluationRubric: activity.evaluationRubric ?? [],
    questions: activity.questions,
    files: activity.instructionFiles,
    materialIds: activity.materials.map(m => m.id),
    local,
    allowLate: activity.allowLate,
    offset: activity.deadlineAt ? (Date.parse(`${local}:00Z`) - Date.parse(activity.deadlineAt)) / 60000 : null,
  };
}
type Fields = ReturnType<typeof initialFields>;

/** Editable fields of an activity draft, initialized from the saved activity and the creation context. */
export function useActivityDraft(activity: Activity, room: Detail, creationContext?: ClassroomCreationContext | null) {
  const [fields, setFields] = useState(() => initialFields(activity, room, creationContext));
  // One stable setter per field, with the same contract as a useState setter.
  const set = useMemo(() => {
    const field = <K extends keyof Fields>(key: K) => (next: SetStateAction<Fields[K]>) =>
      setFields(previous => {
        const value = typeof next === 'function' ? (next as (value: Fields[K]) => Fields[K])(previous[key]) : next;
        return Object.is(value, previous[key]) ? previous : { ...previous, [key]: value };
      });
    return {
      setTitle: field('title'), setScope: field('scope'), setInstructions: field('instructions'),
      setRequired: field('attachmentRequired'), setObjective: field('objective'), setTeacherComment: field('teacherComment'),
      setDraftType: field('draftType'), setTypeChosen: field('typeChosen'), setEvaluationRubric: field('evaluationRubric'),
      setQuestions: field('questions'), setMaterialIds: field('materialIds'), setLocal: field('local'),
      setLate: field('allowLate'), setOffset: field('offset'),
    };
  }, []);
  const draft = {
    title: fields.title,
    objective: fields.objective,
    teacherComment: fields.teacherComment,
    scope: fields.scope,
    instructions: fields.instructions,
    type: fields.draftType,
    attachmentRequired: fields.attachmentRequired,
    aiGradingRubric: fields.aiGradingRubric,
    evaluationRubric: fields.evaluationRubric,
    files: fields.files,
    materialIds: fields.materialIds,
    allowLate: fields.allowLate,
    questions: fields.questions,
  };
  return { ...fields, ...set, draft };
}
