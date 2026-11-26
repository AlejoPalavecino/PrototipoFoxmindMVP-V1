import { strictObject } from '../curriculum/plan.ts';
import type { ActivityQuestion } from '../activities/activity-generation.ts';
import { arrangeChoices } from '../activities/choice-order.ts';

export const foxyQuizFence = '~~~foxy-quiz-v1\n';
const quizRequest = /^Prepará un quiz interactivo de ([1-9]|10) preguntas?\.$/mu;
export type FoxyQuizOption = { text: string; correct: boolean; feedback: string };
export type FoxyQuiz = {
  objective: string;
  instructions: string;
  questions: { prompt: string; options: FoxyQuizOption[] }[];
};

export function foxyQuizQuestionCount(message: string): number | null {
  const match = quizRequest.exec(message);
  return match ? Number(match[1]) : null;
}

/** Question format of a teacher quiz. Every format stays single-answer, so the quiz model and Activities are unchanged. */
export type FoxyQuizFormat = 'CHOICE' | 'TRUE_FALSE' | 'MIXED';
const formatLines: Record<Exclude<FoxyQuizFormat, 'CHOICE'>, string> = {
  TRUE_FALSE: 'Formato: verdadero o falso.',
  MIXED: 'Formato: mixto, opción múltiple y verdadero o falso.',
};
const formatLine = /^Formato: (verdadero o falso|mixto, opción múltiple y verdadero o falso)\.$/mu;

export function foxyQuizRequest(count: number, brief: string, format: FoxyQuizFormat = 'CHOICE') {
  // Multiple choice keeps the historical request so saved conversations read the same.
  const head = `Prepará un quiz interactivo de ${count} ${count === 1 ? 'pregunta' : 'preguntas'}.`;
  return format === 'CHOICE' ? `${head}\n${brief}` : `${head}\n${formatLines[format]}\n${brief}`;
}

export function foxyQuizFormat(message: string): FoxyQuizFormat {
  if (foxyQuizQuestionCount(message) === null) return 'CHOICE';
  const match = formatLine.exec(message);
  return !match ? 'CHOICE' : match[1] === 'verdadero o falso' ? 'TRUE_FALSE' : 'MIXED';
}

export function foxyQuizBrief(message: string) {
  return message.replace(quizRequest, '').replace(formatLine, '').trim();
}

function quizText(value: unknown, maximum: number) {
  if (typeof value !== 'string' || !value.trim() || [...value].length > maximum
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)) throw new Error('INVALID_INPUT');
  return value.trim();
}

export function parseFoxyQuiz(value: unknown, count?: number): FoxyQuiz {
  const quiz = strictObject(value, ['objective', 'instructions', 'questions']);
  if (!Array.isArray(quiz.questions) || !quiz.questions.length || quiz.questions.length > 10
    || (count !== undefined && quiz.questions.length !== count)) throw new Error('INVALID_INPUT');
  const questions = quiz.questions.map((item) => {
    const question = strictObject(item, ['prompt', 'options']);
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 5) throw new Error('INVALID_INPUT');
    const options = question.options.map((item) => {
      const option = strictObject(item, ['text', 'correct', 'feedback']);
      if (typeof option.correct !== 'boolean') throw new Error('INVALID_INPUT');
      return { text: quizText(option.text, 500), correct: option.correct, feedback: quizText(option.feedback, 400) };
    });
    if (options.filter((option) => option.correct).length !== 1
      || new Set(options.map((option) => option.text.toLocaleLowerCase('es'))).size !== options.length) throw new Error('INVALID_INPUT');
    return { prompt: quizText(question.prompt, 2000), options };
  });
  if (new Set(questions.map((question) => question.prompt.toLocaleLowerCase('es'))).size !== questions.length) throw new Error('INVALID_INPUT');
  return { objective: quizText(quiz.objective, 1400), instructions: quizText(quiz.instructions, 5000), questions };
}

/** Reorders the options of a freshly generated quiz; saved quizzes keep the order the teacher sees. */
export function arrangeFoxyQuizOptions(quiz: FoxyQuiz): FoxyQuiz {
  return { ...quiz, questions: quiz.questions.map((question, index) => ({
    ...question,
    options: arrangeChoices(question.options, `${index}\u0000${question.prompt}\u0000${question.options.map(option => option.text).join('\u0000')}`),
  })) };
}

export function encodeFoxyQuiz(quiz: FoxyQuiz) {
  return `${foxyQuizFence}${JSON.stringify(quiz)}\n~~~`;
}

export function readFoxyQuiz(markdown: string): FoxyQuiz | null {
  if (!markdown.startsWith(foxyQuizFence) || !markdown.endsWith('\n~~~') || markdown.length > 50000) return null;
  try {
    return parseFoxyQuiz(JSON.parse(markdown.slice(foxyQuizFence.length, -4)));
  } catch {
    return null;
  }
}

export function foxyQuizActivityQuestions(quiz: FoxyQuiz): ActivityQuestion[] {
  return quiz.questions.map(({ prompt, options }) => ({
    type: 'SINGLE_CHOICE', prompt, points: '1', scoringRule: 'EXACT',
    options: options.map(({ text, correct }) => ({ text, correct })),
  }));
}
