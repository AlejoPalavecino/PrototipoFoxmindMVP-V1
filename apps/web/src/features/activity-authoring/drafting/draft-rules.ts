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
export interface DraftProblem { message: string; tab: 'instructions' | 'questions' | 'rubric'; questionIndex?: number }

function questionProblem(question: ActivityQuestion): string | null {
  const validText = (value: string) => value.trim() && [...value].length <= 20000
    && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value);
  if (!validText(question.prompt)) return 'Completá la consigna con hasta 20.000 caracteres y sin caracteres de control.';
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(question.points) || !/[1-9]/.test(question.points))
    return 'Ingresá puntos positivos con hasta dos decimales.';
  if (question.type === 'DEVELOPMENT') return question.options.length || question.scoringRule != null
    ? 'Una pregunta de desarrollo no admite opciones ni regla de puntuación. Revisá su tipo.' : null;
  if (!['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(question.type)) return 'Elegí un tipo de pregunta válido.';
  if (question.options.length < 2) return 'Agregá al menos dos opciones.';
  const invalidOption = question.options.findIndex(option => !validText(option.text));
  if (invalidOption !== -1) return `Completá la opción ${invalidOption + 1} con hasta 20.000 caracteres y sin caracteres de control.`;
  const correct = question.options.filter(option => option.correct).length;
  if (question.type === 'SINGLE_CHOICE' && correct !== 1) return 'Marcá una sola respuesta correcta.';
  if (question.type === 'MULTIPLE_CHOICE' && correct < 2) return 'Marcá al menos dos respuestas correctas.';
  if (question.type === 'SINGLE_CHOICE' ? question.scoringRule !== 'EXACT' : !['EXACT', 'PARTIAL'].includes(question.scoringRule ?? ''))
    return 'Elegí una regla de puntuación válida para el tipo de pregunta.';
  return null;
}

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
  if (draft.type !== 'ASSIGNMENT') {
    for (const [questionIndex, question] of draft.questions.entries()) {
      const message = questionProblem(question);
      if (message) return { message: `Pregunta ${questionIndex + 1}: ${message}`, tab: 'questions', questionIndex };
    }
  }
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
