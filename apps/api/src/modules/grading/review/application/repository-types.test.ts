import type { Transaction } from '../../../classrooms/public.ts';
import type { GradingRepository } from './grading.ts';
import type { GradeCorrectionsRepository } from '../../corrections/public.ts';

/** Compile-only negative contracts; never invoked or imported by production. */
export function gradingRepositoryTypeChecks(tx: Transaction, review: GradingRepository, corrections: GradeCorrectionsRepository) {
  review.lockAttempt(tx, true, { attemptId: 'attempt', classroomId: 'classroom' });
  corrections.insertCorrection(tx, { gradeId: 'grade', previousGrade: '6.00', newGrade: '7.25', reason: 'Evidence reviewed', actorId: 'teacher' });
  // @ts-expect-error SQL positional lists are no longer an application contract.
  corrections.insertCorrection(tx, 'grade', '6.00', '7.25', 'Evidence reviewed', 'teacher');
  // @ts-expect-error Published correction always records its author.
  corrections.insertCorrection(tx, { gradeId: 'grade', previousGrade: '6.00', newGrade: '7.25', reason: 'Evidence reviewed' });
  // @ts-expect-error Lock mode cannot be an arbitrary string.
  review.lockAttempt(tx, 'write', { attemptId: 'attempt', classroomId: 'classroom' });
}
