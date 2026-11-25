import { foxyQuizBrief, foxyQuizQuestionCount } from '../../../../../../src/core/domain/foxy/foxy-quiz.ts';

/** The quiz tool prefixes an instruction for Foxy; the teacher sees a label and their own words. */
export function foxyRequestDisplay(message: string): { label: string | null; text: string } {
  const count = foxyQuizQuestionCount(message);
  if (count === null) return { label: null, text: message };
  return { label: `Quiz · ${count} ${count === 1 ? 'pregunta' : 'preguntas'}`, text: foxyQuizBrief(message) };
}
