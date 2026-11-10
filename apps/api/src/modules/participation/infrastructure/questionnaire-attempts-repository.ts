import { randomUUID, randomBytes } from 'node:crypto';
import { assertAttemptWrite, type AttemptRow, type Obligation } from './attempt-access.ts';
import { activityEvent } from './activity-events.ts';
import { questionnaireUnanswered } from './session-readers.ts';
import { submissionReceipt } from './submission-receipt.ts';
import type { QuestionnaireAttemptsRepository } from '../application/questionnaire-attempts.ts';
export const repository: Omit<QuestionnaireAttemptsRepository, 'enqueueSubmittedAttemptGradingAi'> = {
 randomUUID,
 assertAttemptWrite,
 activityEvent,
 questionnaireUnanswered,

 submissionReceipt,
 question(tx,...values) {return tx.query<Awaited<ReturnType<QuestionnaireAttemptsRepository['question']>>[number]>(`SELECT q.id,q.type::text,
        COALESCE((SELECT array_agg(o.id ORDER BY o.id) FROM question_options o WHERE o.question_id=q.id),'{}'::uuid[]) AS "optionIds"
        FROM questions q WHERE q.id=$1::uuid AND q.activity_id=$2::uuid FOR SHARE OF q`,...values);},
 saveAnswer(tx,...values) {return tx.query<Awaited<ReturnType<QuestionnaireAttemptsRepository['saveAnswer']>>[number]>(`INSERT INTO answers(id,attempt_id,activity_id,question_id,development_text,saved_at,updated_at)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,clock_timestamp(),clock_timestamp())
        ON CONFLICT(attempt_id,question_id) DO UPDATE SET development_text=EXCLUDED.development_text,
          saved_at=EXCLUDED.saved_at,updated_at=EXCLUDED.updated_at RETURNING id,saved_at`,...values);},
 deleteSelections(tx,...values) {return tx.query<Awaited<ReturnType<QuestionnaireAttemptsRepository['deleteSelections']>>[number]>('DELETE FROM answer_selections WHERE answer_id=$1::uuid RETURNING option_id',...values);},
 insertSelection(tx,...values) {return tx.query<Awaited<ReturnType<QuestionnaireAttemptsRepository['insertSelection']>>[number]>(`INSERT INTO answer_selections(answer_id,question_id,option_id)
        VALUES($1::uuid,$2::uuid,$3::uuid) RETURNING option_id`,...values);},
 advanceAttempt(tx,...values) {return tx.query<Awaited<ReturnType<QuestionnaireAttemptsRepository['advanceAttempt']>>[number]>(`UPDATE attempts SET revision=revision+1,updated_at=clock_timestamp()
        WHERE id=$1::uuid RETURNING revision`,...values);},
 submitAttempt(tx,...values) {return tx.query<Awaited<ReturnType<QuestionnaireAttemptsRepository['submitAttempt']>>[number]>(`UPDATE attempts SET status='SUBMITTED',submitted_at=$2,
        applied_deadline_at=$3,submitted_late=$4,editor_token_hash=NULL,editor_epoch=editor_epoch+1,
        revision=revision+1,updated_at=$2 WHERE id=$1::uuid RETURNING *`,...values);},
};
