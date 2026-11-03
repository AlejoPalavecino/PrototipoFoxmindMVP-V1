import { enqueueSubmittedAttemptGradingAi } from './grading-ai/enqueue.ts';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { ClassroomCore } from './core.ts';
import { assertAttemptWrite, type AttemptRow, type Obligation } from './attempt-access.ts';
import { editorCapability } from './attempt-policy.ts';
import { exactActivityObject } from './activity-policy.ts';
import { draftAnswer, validateAnswer, type AnswerQuestion } from './questionnaire-policy.ts';
import { revision } from './revision.ts';
import { fail } from './policy.ts';
import { submissionReceipt } from './submission-receipt.ts';
import type { ActivityRow } from './activity-authoring.ts';
import type { Transaction } from './contracts.ts';
import { activityEvent } from './activity-events.ts';
import { questionnaireUnanswered } from './session-readers.ts';

function capability(request: unknown) {
  const headers = (request as IncomingMessage).headers;
  return editorCapability(headers?.['x-attempt-editor'], headers?.['x-attempt-epoch']);
}

export class QuestionnaireAttemptService {
  private readonly run: ClassroomCore['run'];
  private readonly classroom: ClassroomCore['classroom'];
  private readonly ports: ClassroomCore['ports'];
  constructor(context: Pick<ClassroomCore, 'run' | 'classroom' | 'ports'>) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context); this.ports = context.ports;
  }
  private async unanswered(tx: Transaction, activityId: string, attemptId: string) {
    return questionnaireUnanswered(tx, activityId, attemptId);
  }

  saveAttemptAnswer(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const answer = draftAnswer(input), expected = revision((input as { revision: unknown }).revision), editor = capability(request);
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, true);
      const { attempt } = await assertAttemptWrite(tx, actor.id, classroomId, attemptId, editor, expected);
      if (!['QUESTIONNAIRE', 'EVALUATION'].includes(attempt.activity_type)) return fail('FORBIDDEN');
      const [question] = await tx.query<AnswerQuestion>(`SELECT q.id,q.type::text,
        COALESCE((SELECT array_agg(o.id ORDER BY o.id) FROM question_options o WHERE o.question_id=q.id),'{}'::uuid[]) AS "optionIds"
        FROM questions q WHERE q.id=$1::uuid AND q.activity_id=$2::uuid FOR SHARE OF q`, answer.questionId, attempt.activity_id);
      if (!question) return fail('INVALID_INPUT');
      validateAnswer(answer, question);
      const [saved] = await tx.query<{ id: string; saved_at: Date }>(`INSERT INTO answers(id,attempt_id,activity_id,question_id,development_text,saved_at,updated_at)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,clock_timestamp(),clock_timestamp())
        ON CONFLICT(attempt_id,question_id) DO UPDATE SET development_text=EXCLUDED.development_text,
          saved_at=EXCLUDED.saved_at,updated_at=EXCLUDED.updated_at RETURNING id,saved_at`,
      randomUUID(), attemptId, attempt.activity_id, answer.questionId, question.type === 'DEVELOPMENT' ? answer.text : null);
      await tx.query('DELETE FROM answer_selections WHERE answer_id=$1::uuid RETURNING option_id', saved.id);
      for (const optionId of answer.optionIds) await tx.query(`INSERT INTO answer_selections(answer_id,question_id,option_id)
        VALUES($1::uuid,$2::uuid,$3::uuid) RETURNING option_id`, saved.id, answer.questionId, optionId);
      const [updated] = await tx.query<{ revision: bigint }>(`UPDATE attempts SET revision=revision+1,updated_at=clock_timestamp()
        WHERE id=$1::uuid RETURNING revision`, attemptId);
      return { revision: updated.revision.toString(), answer: { questionId: answer.questionId,
        text: question.type === 'DEVELOPMENT' ? answer.text : null, optionIds: [...answer.optionIds].sort(), savedAt: saved.saved_at } };
    });
  }

  submitQuestionnaireAttempt(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const receivedAt = submissionReceipt(request);
    const body = exactActivityObject(input, ['revision', 'confirm', 'confirmIncomplete']);
    const expected = revision(body.revision), editor = capability(request);
    if (body.confirm !== true || typeof body.confirmIncomplete !== 'boolean') return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, true);
      const first = await assertAttemptWrite(tx, actor.id, classroomId, attemptId, editor, expected, receivedAt);
      if (!['QUESTIONNAIRE', 'EVALUATION'].includes(first.attempt.activity_type)) return fail('FORBIDDEN');
      // The shared attempt/activity lock serializes saves and submission; never grade or reveal the answer key here.
      const unansweredCount = await this.unanswered(tx, first.attempt.activity_id, attemptId);
      if (unansweredCount > 0 && !body.confirmIncomplete) return fail('CONFLICT');
      const receipt = await assertAttemptWrite(tx, actor.id, classroomId, attemptId, editor, expected, receivedAt);
      const [saved] = await tx.query<AttemptRow>(`UPDATE attempts SET status='SUBMITTED',submitted_at=$2,
        applied_deadline_at=$3,submitted_late=$4,editor_token_hash=NULL,editor_epoch=editor_epoch+1,
        revision=revision+1,updated_at=$2 WHERE id=$1::uuid RETURNING *`,
      attemptId, receivedAt, receipt.reception.deadline, receipt.reception.late);
      await enqueueSubmittedAttemptGradingAi(tx, { classroomId, activityId: first.attempt.activity_id, attemptId }, this.ports.gradingAiAvailable === true);
      await activityEvent(tx, classroomId, first.attempt.activity_id, 'SUBMISSION_RECEIVED', null, attemptId);
      return { id: saved.id, status: 'SUBMITTED' as const, submittedAt: saved.submitted_at,
        appliedDeadlineAt: saved.applied_deadline_at, submittedLate: saved.submitted_late,
        revision: saved.revision.toString(), unansweredCount };
    });
  }
}
