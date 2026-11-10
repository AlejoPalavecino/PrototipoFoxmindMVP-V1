import type { QuestionnaireAttemptsRepository } from './questionnaire-attempts.ts';
import type { ActivitySessionRepository } from './activity-session.ts';

import type { AcademicFeatureContext } from '../../classrooms/public.ts';
import type { ActivityReadPort } from '../../activities/public.ts';
import type { ActivityRow } from '../../activities/public.ts';
import type {  AttemptRow, Obligation  } from './attempt-access.ts';
import { editorCapability } from '../domain/attempt-policy.ts';
import { exactActivityObject } from '../../activities/public.ts';
import { fail, uuid } from '../../classrooms/public.ts';
import { revision } from '../../classrooms/public.ts';

import type { Transaction } from '../../classrooms/public.ts';

import type { FileRow } from '../../files/public.ts';



function capability(request: unknown) {
  const headers = (request as {headers?: Record<string,string|string[]|undefined>}).headers;
  return editorCapability(headers?.['x-attempt-editor'], headers?.['x-attempt-epoch']);
}

export class PracticalSubmissionService {
  private readonly run: AcademicFeatureContext['run'];
  private readonly classroom: AcademicFeatureContext['classroom'];
  private readonly ports: AcademicFeatureContext['ports'];
  private readonly activity: ActivityReadPort['activity'];
  constructor(context: Pick<AcademicFeatureContext, 'run' | 'classroom' | 'ports'>, dependencies: Pick<ActivityReadPort, 'activity'>, private readonly repository: PracticalSubmissionsRepository) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context); this.ports = context.ports;
    this.activity = dependencies.activity;
  }
  private async attachmentViews(tx: Transaction, attemptId: string, draft: boolean) {
    return this.repository.practicalAttachments(tx, attemptId, draft);
  }
  savePracticalResponse(request:unknown,classroomId:string,attemptId:string,input:unknown){
    const body=exactActivityObject(input,['revision','text']),expected=revision(body.revision),editor=capability(request);
    if(typeof body.text!=='string'||[...body.text].length>5000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(body.text))return fail('INVALID_INPUT');
    return this.run(request,true,async(tx,actor)=>{
      await this.classroom(tx,actor,classroomId,true);
      const {attempt}=await this.repository.assertAttemptWrite(tx,actor.id,classroomId,attemptId,editor,expected);
      if(attempt.activity_type!=='ASSIGNMENT')return fail('FORBIDDEN');
      await this.repository.saveResponse(tx,attemptId,body.text);
      return {revision:(attempt.revision+1n).toString(),text:body.text};
    });
  }

  removeAttemptAttachment(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const body = exactActivityObject(input, ['revision','fileId']), expected = revision(body.revision), editor = capability(request);
    if (!uuid(body.fileId)) return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, true);
      const { attempt } = await this.repository.assertAttemptWrite(tx, actor.id, classroomId, attemptId, editor, expected);
      if (attempt.activity_type !== 'ASSIGNMENT') return fail('FORBIDDEN');
      const [selected] = await this.repository.selectedAttachment(tx,attemptId,body.fileId);
      if (selected) {
        // Unlink only this editable selection. Never delete bytes, release quota, or retarget custody/history.
        await this.repository.unlinkAttachment(tx,attemptId,body.fileId);
      } else {
        const [pending] = await this.repository.pendingUpload(tx,body.fileId,classroomId,actor.id,attemptId);
        if (!pending || ['COMPLETED','CANCELLED','FAILED'].includes(pending.status) || ['ready','deleting','deleted'].includes(pending.phase))
          return fail('CONFLICT');
        await this.repository.cancelUpload(tx,body.fileId);
        // Invalidate any receiving/scan operation; keep its reservation until actual incomplete cleanup removes bytes.
        await this.repository.invalidateCustody(tx,body.fileId);
      }
      await this.repository.advanceAttempt(tx,attemptId);
      return { revision: (attempt.revision + 1n).toString() };
    });
  }

  submitPracticalAttempt(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const receivedAt = this.repository.submissionReceipt(request);
    const body = exactActivityObject(input, ['revision','confirm']), expected = revision(body.revision), editor = capability(request);
    if (body.confirm !== true) return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, true);
      const first = await this.repository.assertAttemptWrite(tx, actor.id, classroomId, attemptId, editor, expected, receivedAt);
      if (first.attempt.activity_type !== 'ASSIGNMENT') return fail('FORBIDDEN');
      const selected = await this.repository.selectedAttachments(tx,attemptId);
      // Lock all active pending reservations as well as selected files before sampling the receipt clock.
      const pending = await this.repository.pendingAttachments(tx,attemptId);
      if (pending.length || selected.length > 5 || (first.attempt.attachments_required && !selected.length)) return fail('CONFLICT');
      for (const link of selected) {
        await this.repository.lockAttachment(tx,link.file_id);
        const file = await this.ports.files.loadAuthorized(tx, request, link.file_id, 'read');
        if (file.classroom_id !== classroomId || file.purpose !== 'attachment' || file.uploaded_by_id !== actor.id
          || file.size_bytes > 50_000_000n) return fail('CONFLICT');
        // A prefilled reference may retain its previous immutable attempt target; it must belong to this activity/student.
        const [origin] = await this.repository.attachmentOrigin(tx,file.target_id,first.attempt.activity_id,classroomId,actor.id);
        if (!origin) return fail('FORBIDDEN');
        this.repository.requireReady(file);
      }
      // Revalidate current authority and current deadline configuration AFTER all waits.
      // Timeliness remains the trusted complete-body receipt, not later lock/processing time.
      const receipt = await this.repository.assertAttemptWrite(tx, actor.id, classroomId, attemptId, editor, expected, receivedAt);
      const [submitted] = await this.repository.submitAttempt(tx,attemptId,receivedAt,receipt.reception.deadline,receipt.reception.late);
      await this.repository.enqueueSubmittedAttemptGradingAi(tx, { classroomId, activityId: first.attempt.activity_id, attemptId }, this.ports.gradingAiAvailable === true);
      await this.repository.activityEvent(tx, classroomId, first.attempt.activity_id, 'SUBMISSION_RECEIVED', null, attemptId);
      return { id: submitted.id, status: 'SUBMITTED' as const, submittedAt: submitted.submitted_at,
        appliedDeadlineAt: submitted.applied_deadline_at, submittedLate: submitted.submitted_late, revision: submitted.revision.toString() };
    });
  }

  assignmentSubmissions(request: unknown, classroomId: string, activityId: string) {
    return this.run(request, false, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, false, true);
      const activity = await this.activity(tx, classroomId, activityId);
      if (activity.type !== 'ASSIGNMENT') return fail('FORBIDDEN');
      const submissions = await this.repository.submissions(tx,activityId,classroomId);
      return { submissions };
    });
  }

  assignmentSubmission(request: unknown, classroomId: string, attemptId: string) {
    return this.run(request, false, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, false, true);
      if (!uuid(attemptId)) return fail('FORBIDDEN');
      const [row] = await this.repository.submission(tx,attemptId,classroomId);
      if (!row) return fail('FORBIDDEN');
      return { ...row, attachments: await this.attachmentViews(tx, attemptId, false) };
    });
  }
}

export interface PracticalSubmissionsRepository {
 assertAttemptWrite: QuestionnaireAttemptsRepository['assertAttemptWrite'];
 activityEvent: QuestionnaireAttemptsRepository['activityEvent'];
 practicalAttachments: ActivitySessionRepository['practicalAttachments'];
 submissionReceipt: (request: unknown) => Date;
 enqueueSubmittedAttemptGradingAi: QuestionnaireAttemptsRepository['enqueueSubmittedAttemptGradingAi'];
 requireReady(file: import('../../files/public.ts').FileRow): void;
saveResponse(tx: Transaction,...values: unknown[]): Promise<(Record<string,unknown>)[]>;
selectedAttachment(tx: Transaction,...values: unknown[]): Promise<(Record<string,unknown>)[]>;
unlinkAttachment(tx: Transaction,...values: unknown[]): Promise<(Record<string,unknown>)[]>;
pendingUpload(tx: Transaction,...values: unknown[]): Promise<({ status: string; phase: string })[]>;
cancelUpload(tx: Transaction,...values: unknown[]): Promise<(Record<string,unknown>)[]>;
invalidateCustody(tx: Transaction,...values: unknown[]): Promise<(Record<string,unknown>)[]>;
advanceAttempt(tx: Transaction,...values: unknown[]): Promise<(Record<string,unknown>)[]>;
selectedAttachments(tx: Transaction,...values: unknown[]): Promise<({ file_id: string })[]>;
pendingAttachments(tx: Transaction,...values: unknown[]): Promise<(Record<string,unknown>)[]>;
lockAttachment(tx: Transaction,...values: unknown[]): Promise<(Record<string,unknown>)[]>;
attachmentOrigin(tx: Transaction,...values: unknown[]): Promise<(Record<string,unknown>)[]>;
submitAttempt(tx: Transaction,...values: unknown[]): Promise<({ id: string; submitted_at: Date; applied_deadline_at: Date | null; submitted_late: boolean; revision: bigint })[]>;
submissions(tx: Transaction,...values: unknown[]): Promise<(Record<string,unknown>)[]>;
submission(tx: Transaction,...values: unknown[]): Promise<({ id: string; number: number; submittedAt: Date; appliedDeadlineAt: Date | null; submittedLate: boolean; firstName: string; lastName: string })[]>;
}
