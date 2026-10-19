import { exactActivityObject } from './activity-policy.ts';
import { revision } from './drafts.ts';
import { fail, object, uuid } from './policy.ts';
import { hundredths } from './scoring.ts';

export interface PrivateQuestionInput { questionId: string; points: string | null; feedback: string | null }
export interface PrivateGradingInput { revision: string; overallGrade: string | null; overallFeedback: string | null; questions: PrivateQuestionInput[] }
export function gradingFeedback(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || [...value].length > 5000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)) return fail('INVALID_INPUT');
  return value || null;
}
export function privateGradingInput(input: unknown): PrivateGradingInput {
  const value = object(input, ['revision', 'overallGrade', 'overallFeedback', 'questions']);
  if (!['revision', 'overallGrade', 'questions'].every(key => Object.hasOwn(value, key))) return fail('INVALID_INPUT');
  const expected = revision(value.revision);
  if (value.overallGrade !== null && hundredths(value.overallGrade) > 1000n) return fail('INVALID_INPUT');
  if (!Array.isArray(value.questions)) return fail('INVALID_INPUT');
  const questions = value.questions.map((input: unknown) => {
    const row = object(input, ['questionId', 'points', 'feedback']);
    if (!uuid(row.questionId) || !Object.hasOwn(row, 'points')) return fail('INVALID_INPUT');
    if (row.points !== null) hundredths(row.points);
    return { questionId: row.questionId, points: row.points as string | null, feedback: gradingFeedback(row.feedback) };
  });
  if (new Set(questions.map(row => row.questionId)).size !== questions.length) return fail('INVALID_INPUT');
  return { revision: expected, overallGrade: value.overallGrade as string | null, overallFeedback: gradingFeedback(value.overallFeedback), questions };
}
