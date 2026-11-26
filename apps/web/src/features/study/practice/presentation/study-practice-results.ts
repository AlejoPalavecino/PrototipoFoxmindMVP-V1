import type { StudyPractice } from '../../model/study-contracts.ts';
import { practiceAttemptFamily } from '../../../../../../../src/core/domain/study/practice-attempts.ts';

export function completedPracticeAttempts(current: StudyPractice, practices: StudyPractice[]) {
  return practiceAttemptFamily(current, practices).filter((attempt) => attempt.status === 'FINALIZED');
}

export function practiceQuestionOutcomes(result: unknown) {
  const outcomes = new Map<string, number>();
  if (result && typeof result === 'object' && 'questions' in result && Array.isArray(result.questions)) {
    for (const row of result.questions) {
      if (row && typeof row.id === 'string' && typeof row.score === 'number') outcomes.set(row.id, row.score);
    }
  }
  return outcomes;
}

type Question = StudyPractice['questions'][number];

/** A confirmed choice is correct only when it picks exactly the expected options. */
export function practiceAnswerIsCorrect(question: Pick<Question, 'correctOptionIds'>, given: unknown) {
  return Array.isArray(given) && given.length === (question.correctOptionIds?.length ?? -1)
    && given.every((id) => question.correctOptionIds?.includes(id));
}

export type PracticeStep = 'correct' | 'review' | 'answered' | 'pending';

/** State of each stop on the practice trail: confirmed questions show their outcome, the rest whether they have an answer. */
export function practiceStep(question: Question, answers: Record<string, unknown>, confirmed: boolean, guided: boolean): PracticeStep {
  const given = answers[question.id];
  if (guided && question.type !== 'DEVELOPMENT') {
    if (!confirmed) return 'pending';
    return practiceAnswerIsCorrect(question, given) ? 'correct' : 'review';
  }
  const answered = Array.isArray(given) ? given.length > 0 : typeof given === 'string' && !!given.trim();
  return answered ? 'answered' : 'pending';
}

/** Topics of the questions that were not fully right, in first-seen order, for «Practicar lo que falló». */
export function practiceMissedTopics(result: unknown): string[] {
  const topics: string[] = [];
  if (result && typeof result === 'object' && 'questions' in result && Array.isArray(result.questions)) {
    for (const row of result.questions as { topicId?: unknown; score?: unknown }[]) {
      if (row && typeof row.topicId === 'string' && typeof row.score === 'number' && row.score < 1 && !topics.includes(row.topicId))
        topics.push(row.topicId);
    }
  }
  return topics;
}
