import type { ActivityQuestion, ActivityType } from '../../../../../../src/core/contracts/activities.ts';
import { parseEvaluationRubric, type EvaluationRubric } from '../../../../../../src/core/domain/grading/evaluation-rubric.ts';
import type { ActivityDeadline, ActivityDraftPayload } from '../model/authoring-operations.ts';
import type { ActivityScope } from '../model/activity-scope.ts';

export interface ActivityDraftValues {
  title: string;
  objective: string;
  teacherComment: string;
  scope: ActivityScope;
  instructions: string;
  type: ActivityType;
  attachmentRequired: boolean;
  aiGradingRubric: string;
  evaluationRubric: EvaluationRubric;
  files: { id: string }[];
  materialIds: string[];
  allowLate: boolean;
  questions: ActivityQuestion[];
}
export interface DraftProblem { message: string; tab: 'instructions' | 'questions' | 'rubric' }

export function activityReviewProblem(draft: ActivityDraftValues): DraftProblem | null {
  if (!draft.objective.trim()) return { message: 'Escribí el objetivo de aprendizaje.', tab: 'instructions' };
  if (!draft.title.trim() || !draft.instructions.trim())
    return { message: 'Completá el título y las consignas de la actividad.', tab: 'instructions' };
  if (draft.type !== 'ASSIGNMENT' && !draft.questions.length)
    return { message: 'Agregá al menos una pregunta.', tab: 'questions' };
  if (!draft.evaluationRubric.length || draft.evaluationRubric.some(row => !row.name.trim() || !row.description.trim()))
    return { message: 'Completá cada criterio de la rúbrica, la evidencia esperada y su peso.', tab: 'rubric' };
  try { parseEvaluationRubric(draft.evaluationRubric); }
  catch { return { message: 'Revisá los criterios y comprobá que sus pesos sumen 100 %.', tab: 'rubric' }; }
  return null;
}

export function assertDraftRubric(rubric: EvaluationRubric) {
  try { parseEvaluationRubric(rubric); }
  catch { throw new Error('Revisá la rúbrica pública: criterios únicos y ponderaciones enteras que sumen 100%.'); }
}

export function buildActivityDraftPayload(draft: ActivityDraftValues, deadline: ActivityDeadline): ActivityDraftPayload {
  if ([...draft.objective].length > 1400 || [...draft.teacherComment].length > 5000)
    throw new Error('Revisá el objetivo (hasta 1.400 caracteres) y el comentario (hasta 5.000).');
  return {
    title: draft.title, objective: draft.objective || null, teacherComment: draft.teacherComment || null,
    ...draft.scope, instructions: draft.instructions,
    attachmentRequired: draft.type === 'ASSIGNMENT' && draft.attachmentRequired,
    aiGradingRubric: draft.aiGradingRubric, evaluationRubric: draft.evaluationRubric,
    instructionFileIds: draft.files.map(file => file.id), materialIds: draft.materialIds,
    deadline, allowLate: draft.allowLate,
    questions: draft.type === 'ASSIGNMENT' ? [] : draft.questions.map(question => ({
      type: question.type, prompt: question.prompt, points: question.points, scoringRule: question.scoringRule ?? null,
      options: question.options.map(option => ({ text: option.text, correct: option.correct ?? false })),
    })),
  };
}
