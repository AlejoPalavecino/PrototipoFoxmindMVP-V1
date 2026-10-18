import { exactActivityObject } from './activity-policy.ts';
import { fail, uuid } from './policy.ts';

export interface DraftAnswer { questionId: string; text: string; optionIds: string[] }
export interface AnswerQuestion { id: string; type: string; optionIds: string[] }

/** One question per request keeps every valid 20,000-character answer inside the existing ingress budget. */
export function draftAnswer(input: unknown): DraftAnswer {
  const value = exactActivityObject(input, ['revision', 'questionId', 'text', 'optionIds']);
  if (!uuid(value.questionId) || typeof value.text !== 'string' || [...value.text].length > 20_000
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value.text)
    || !Array.isArray(value.optionIds) || !value.optionIds.every(uuid)
    || new Set(value.optionIds).size !== value.optionIds.length) return fail('INVALID_INPUT');
  return { questionId: value.questionId, text: value.text, optionIds: value.optionIds };
}

export function validateAnswer(answer: DraftAnswer, question: AnswerQuestion) {
  if (question.type === 'DEVELOPMENT') {
    if (answer.optionIds.length) return fail('INVALID_INPUT');
  } else {
    if (!['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(question.type) || answer.text !== ''
      || (question.type === 'SINGLE_CHOICE' && answer.optionIds.length > 1)
      || answer.optionIds.some(id => !question.optionIds.includes(id))) return fail('INVALID_INPUT');
  }
  return answer;
}
