import type { EditorCapability } from '../../domain/attempt-policy.ts';
import type { assertAttemptWrite } from '../../attempts/public.ts';

import type { AcademicFeatureContext } from '../../../classrooms/public.ts';
import { type AttemptRow, type Obligation } from '../../attempts/public.ts';
import { editorCapability } from '../../domain/attempt-policy.ts';
import { exactActivityObject } from '../../../activities/public.ts';
import { draftAnswer, validateAnswer, type AnswerQuestion } from '../../domain/questionnaire-policy.ts';
import { revision } from '../../../classrooms/public.ts';
import { fail } from '../../../classrooms/public.ts';

import type { ActivityRow } from '../../../activities/public.ts';
import type { Transaction } from '../../../classrooms/public.ts';



function capability(request: unknown) {
  const headers = (request as {headers?: Record<string, string | string[] | undefined>}).headers;
  return editorCapability(headers?.['x-attempt-editor'], headers?.['x-attempt-epoch']);
}

export class QuestionnaireAttemptService {
  private readonly run: AcademicFeatureContext['run'];
  private readonly classroom: AcademicFeatureContext['classroom'];
  private readonly ports: AcademicFeatureContext['ports'];
  constructor(context: Pick<AcademicFeatureContext, 'run' | 'classroom' | 'ports'>, private readonly repository: QuestionnaireAttemptsRepository) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context); this.ports = context.ports;
  }
  private async unanswered(tx: Transaction, activityId: string, attemptId: string) {
    return this.repository.questionnaireUnanswered(tx, activityId, attemptId);
  }

  saveAttemptAnswer(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const answer = draftAnswer(input), expected = revision((input as { revision: unknown }).revision), editor = capability(request);
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, true);
      const { attempt } = await this.repository.assertAttemptWrite(tx, actor.id, classroomId, attemptId, editor, expected);
      if (!['QUESTIONNAIRE', 'EVALUATION'].includes(attempt.activity_type)) return fail('FORBIDDEN');
      const [question] = await this.repository.question(tx, { questionId: answer.questionId, activityId: attempt.activity_id });
      if (!question) return fail('INVALID_INPUT');
      validateAnswer(answer, question);
      const [saved] = await this.repository.saveAnswer(tx, { id: this.repository.randomUUID(), attemptId: attemptId, activityId: attempt.activity_id, questionId: answer.questionId, text: question.type === 'DEVELOPMENT' ? answer.text : null });
      await this.repository.deleteSelections(tx, { answerId: saved.id });
      for (const optionId of answer.optionIds) await this.repository.insertSelection(tx, { answerId: saved.id, questionId: answer.questionId, optionId: optionId });
      const [updated] = await this.repository.advanceAttempt(tx, { attemptId: attemptId });
      return { revision: updated.revision.toString(), answer: { questionId: answer.questionId,
        text: question.type === 'DEVELOPMENT' ? answer.text : null, optionIds: [...answer.optionIds].sort(), savedAt: saved.saved_at } };
    });
  }

  submitQuestionnaireAttempt(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const receivedAt = this.repository.submissionReceipt(request);
    const body = exactActivityObject(input, ['revision', 'confirm', 'confirmIncomplete']);
    const expected = revision(body.revision), editor = capability(request);
    if (body.confirm !== true || typeof body.confirmIncomplete !== 'boolean') return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, true);
      const first = await this.repository.assertAttemptWrite(tx, actor.id, classroomId, attemptId, editor, expected, receivedAt);
      if (!['QUESTIONNAIRE', 'EVALUATION'].includes(first.attempt.activity_type)) return fail('FORBIDDEN');
      // The shared attempt/activity lock serializes saves and submission; never grade or reveal the answer key here.
      const unansweredCount = await this.unanswered(tx, first.attempt.activity_id, attemptId);
      if (unansweredCount > 0 && !body.confirmIncomplete) return fail('CONFLICT');
      const receipt = await this.repository.assertAttemptWrite(tx, actor.id, classroomId, attemptId, editor, expected, receivedAt);
      const [saved] = await this.repository.submitAttempt(tx, { attemptId: attemptId, receivedAt: receivedAt, deadline: receipt.reception.deadline, late: receipt.reception.late });
      await this.repository.enqueueSubmittedAttemptGradingAi(tx, { classroomId, activityId: first.attempt.activity_id, attemptId }, this.ports.gradingAiAvailable === true);
      await this.repository.activityEvent(tx, classroomId, first.attempt.activity_id, 'SUBMISSION_RECEIVED', null, attemptId);
      return { id: saved.id, status: 'SUBMITTED' as const, submittedAt: saved.submitted_at,
        appliedDeadlineAt: saved.applied_deadline_at, submittedLate: saved.submitted_late,
        revision: saved.revision.toString(), unansweredCount };
    });
  }
}

export interface QuestionnaireAttemptsRepository {
 randomUUID: () => string;
 assertAttemptWrite: (tx: Transaction, userId: string, classroomId: string, attemptId: string, capability: EditorCapability, expectedRevision?: unknown, receivedAt?: Date) => ReturnType<typeof assertAttemptWrite>;
 activityEvent: (tx: Transaction, classroomId: string, activityId: string, event: import('../../attempts/public.ts').ActivityEvent, recipient?: string | null, attemptId?: string | null) => Promise<void>;
 questionnaireUnanswered: (tx: Transaction, activityId: string, attemptId: string) => Promise<number>;
 enqueueSubmittedAttemptGradingAi: (tx: Transaction, target: {classroomId: string; activityId: string; attemptId: string}, available: boolean) => Promise<boolean>;
 submissionReceipt: (request: unknown) => Date;
 question(tx: Transaction, input: { questionId: string; activityId: string }): Promise<(AnswerQuestion)[]>;
 saveAnswer(tx: Transaction, input: { id: string; attemptId: string; activityId: string; questionId: string; text: string | null }): Promise<({ id: string; saved_at: Date })[]>;
 deleteSelections(tx: Transaction, input: { answerId: string }): Promise<({ option_id: string })[]>;
 insertSelection(tx: Transaction, input: { answerId: string; questionId: string; optionId: string }): Promise<({ option_id: string })[]>;
 advanceAttempt(tx: Transaction, input: { attemptId: string }): Promise<({ revision: bigint })[]>;
 submitAttempt(tx: Transaction, input: { attemptId: string; receivedAt: Date; deadline: Date | null; late: boolean }): Promise<(AttemptRow)[]>;
}
