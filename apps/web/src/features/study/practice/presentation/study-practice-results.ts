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
