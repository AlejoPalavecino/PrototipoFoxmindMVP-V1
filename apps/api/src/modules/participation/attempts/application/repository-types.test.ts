import type { Transaction } from '../../../classrooms/public.ts';
import type { QuestionnaireAttemptsRepository } from '../../questionnaires/public.ts';
import type { AttemptAccessRepository } from './attempt-access.ts';

/** Compile-only negative contracts; never invoked or imported by production. */
export function participationRepositoryTypeChecks(tx: Transaction, questionnaire: QuestionnaireAttemptsRepository, access: AttemptAccessRepository) {
  questionnaire.submitAttempt(tx, { attemptId: 'attempt', receivedAt: new Date(), deadline: null, late: false });
  access.lockAttempt(tx, { attemptId: 'attempt', classroomId: 'classroom' });
  // @ts-expect-error SQL positional lists are no longer an application contract.
  questionnaire.submitAttempt(tx, 'attempt', new Date(), null, false);
  // @ts-expect-error Reception must be a trusted Date, not a client string.
  questionnaire.submitAttempt(tx, { attemptId: 'attempt', receivedAt: 'client timestamp', deadline: null, late: false });
  // @ts-expect-error A lock requires the classroom scope as well as the attempt.
  access.lockAttempt(tx, { attemptId: 'attempt' });
}
