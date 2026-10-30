import { enqueueSubmittedAttemptGradingAi } from './grading-ai/enqueue.ts';
import type { IncomingMessage } from 'node:http';
import type { ClassroomCore } from './core.ts';
import type { ActivityAuthoringService } from './activity-authoring.ts';
import type { ActivityRow } from './activity-authoring.ts';
import { assertAttemptWrite, type AttemptRow, type Obligation } from './attempt-access.ts';
import { editorCapability } from './attempt-policy.ts';
import { exactActivityObject } from './activity-policy.ts';
import { fail, uuid } from './policy.ts';
import { revision } from './drafts.ts';
import { submissionReceipt } from './submission-receipt.ts';
import type { Transaction } from './contracts.ts';
import { requireReady } from '../files/service.ts';
import type { FileRow } from '../files/store.ts';
import { activityEvent } from './activity-events.ts';
import { practicalAttachments } from './session-readers.ts';

function capability(request: unknown) {
  const headers = (request as IncomingMessage).headers;
  return editorCapability(headers?.['x-attempt-editor'], headers?.['x-attempt-epoch']);
}

export class PracticalSubmissionService {
  private readonly run: ClassroomCore['run'];
  private readonly classroom: ClassroomCore['classroom'];
  private readonly ports: ClassroomCore['ports'];
  private readonly activity: ActivityAuthoringService['activity'];
  constructor(context: Pick<ClassroomCore, 'run' | 'classroom' | 'ports'>, dependencies: Pick<ActivityAuthoringService, 'activity'>) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context); this.ports = context.ports;
    this.activity = dependencies.activity;
  }
  private async attachmentViews(tx: Transaction, attemptId: string, draft: boolean) {
    return practicalAttachments(tx, attemptId, draft);
  }

  removeAttemptAttachment(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const body = exactActivityObject(input, ['revision','fileId']), expected = revision(body.revision), editor = capability(request);
    if (!uuid(body.fileId)) return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, true);
      const { attempt } = await assertAttemptWrite(tx, actor.id, classroomId, attemptId, editor, expected);
      if (attempt.activity_type !== 'ASSIGNMENT') return fail('FORBIDDEN');
      const [selected] = await tx.query(`SELECT file_id FROM attempt_attachments WHERE attempt_id=$1::uuid
        AND file_id=$2::uuid FOR UPDATE`, attemptId, body.fileId);
      if (selected) {
        // Unlink only this editable selection. Never delete bytes, release quota, or retarget custody/history.
        await tx.query('DELETE FROM attempt_attachments WHERE attempt_id=$1::uuid AND file_id=$2::uuid RETURNING file_id', attemptId, body.fileId);
      } else {
        const [pending] = await tx.query<{ status: string; phase: string }>(`SELECT u.status::text,c.phase FROM files f
          JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
          WHERE f.id=$1::uuid AND f.classroom_id=$2::uuid AND f.uploaded_by_id=$3::uuid AND c.purpose='attachment'
            AND c.target_id=$4::uuid FOR UPDATE OF f,u,c`, body.fileId, classroomId, actor.id, attemptId);
        if (!pending || ['COMPLETED','CANCELLED','FAILED'].includes(pending.status) || ['ready','deleting','deleted'].includes(pending.phase))
          return fail('CONFLICT');
        await tx.query(`UPDATE uploads SET status='CANCELLED',last_activity_at=clock_timestamp(),updated_at=clock_timestamp()
          WHERE file_id=$1::uuid RETURNING id`, body.fileId);
        // Invalidate any receiving/scan operation; keep its reservation until actual incomplete cleanup removes bytes.
        await tx.query(`UPDATE file_custodies SET phase='reserved',operation_id=NULL,lease_until=NULL WHERE file_id=$1::uuid RETURNING file_id`, body.fileId);
      }
      await tx.query('UPDATE attempts SET revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id', attemptId);
      return { revision: (attempt.revision + 1n).toString() };
    });
  }

  submitPracticalAttempt(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const receivedAt = submissionReceipt(request);
    const body = exactActivityObject(input, ['revision','confirm']), expected = revision(body.revision), editor = capability(request);
    if (body.confirm !== true) return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, true);
      const first = await assertAttemptWrite(tx, actor.id, classroomId, attemptId, editor, expected, receivedAt);
      if (first.attempt.activity_type !== 'ASSIGNMENT') return fail('FORBIDDEN');
      const selected = await tx.query<{ file_id: string }>('SELECT file_id FROM attempt_attachments WHERE attempt_id=$1::uuid ORDER BY position,file_id FOR UPDATE', attemptId);
      // Lock all active pending reservations as well as selected files before sampling the receipt clock.
      const pending = await tx.query(`SELECT f.id FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
        WHERE c.purpose='attachment' AND c.target_id=$1::uuid AND u.status NOT IN ('COMPLETED','CANCELLED','FAILED')
        AND u.reservation_released_at IS NULL ORDER BY f.id FOR UPDATE OF f,u,c`, attemptId);
      if (pending.length || selected.length > 5 || (first.attempt.attachments_required && !selected.length)) return fail('CONFLICT');
      for (const link of selected) {
        await tx.query(`SELECT f.id FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
          WHERE f.id=$1::uuid FOR UPDATE OF f,u,c`, link.file_id);
        const file = await this.ports.files.loadAuthorized(tx, request, link.file_id, 'read');
        if (file.classroom_id !== classroomId || file.purpose !== 'attachment' || file.uploaded_by_id !== actor.id
          || file.size_bytes > 50_000_000n) return fail('CONFLICT');
        // A prefilled reference may retain its previous immutable attempt target; it must belong to this activity/student.
        const [origin] = await tx.query(`SELECT a.id FROM attempts a JOIN student_activities sa ON sa.id=a.student_activity_id
          JOIN enrollments e ON e.id=sa.enrollment_id WHERE a.id=$1::uuid AND a.activity_id=$2::uuid
          AND sa.classroom_id=$3::uuid AND e.student_id=$4::uuid FOR SHARE OF a,sa,e`,
        file.target_id, first.attempt.activity_id, classroomId, actor.id);
        if (!origin) return fail('FORBIDDEN');
        requireReady(file);
      }
      // Revalidate current authority and current deadline configuration AFTER all waits.
      // Timeliness remains the trusted complete-body receipt, not later lock/processing time.
      const receipt = await assertAttemptWrite(tx, actor.id, classroomId, attemptId, editor, expected, receivedAt);
      const [submitted] = await tx.query<{ id: string; submitted_at: Date; applied_deadline_at: Date | null; submitted_late: boolean; revision: bigint }>(
        `UPDATE attempts SET status='SUBMITTED',submitted_at=$2,applied_deadline_at=$3,submitted_late=$4,
        editor_token_hash=NULL,editor_epoch=editor_epoch+1,revision=revision+1,updated_at=$2 WHERE id=$1::uuid RETURNING *`,
      attemptId, receivedAt, receipt.reception.deadline, receipt.reception.late);
      await enqueueSubmittedAttemptGradingAi(tx, { classroomId, activityId: first.attempt.activity_id, attemptId }, this.ports.gradingAiAvailable === true);
      await activityEvent(tx, classroomId, first.attempt.activity_id, 'SUBMISSION_RECEIVED', null, attemptId);
      return { id: submitted.id, status: 'SUBMITTED' as const, submittedAt: submitted.submitted_at,
        appliedDeadlineAt: submitted.applied_deadline_at, submittedLate: submitted.submitted_late, revision: submitted.revision.toString() };
    });
  }

  assignmentSubmissions(request: unknown, classroomId: string, activityId: string) {
    return this.run(request, false, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, false, true);
      const activity = await this.activity(tx, classroomId, activityId);
      if (activity.type !== 'ASSIGNMENT') return fail('FORBIDDEN');
      const submissions = await tx.query(`SELECT a.id,a.attempt_number AS number,a.submitted_at AS "submittedAt",
        a.applied_deadline_at AS "appliedDeadlineAt",a.submitted_late AS "submittedLate",
        u.first_name AS "firstName",u.last_name AS "lastName"
        FROM attempts a JOIN student_activities sa ON sa.id=a.student_activity_id
        JOIN enrollments e ON e.id=sa.enrollment_id JOIN users u ON u.id=e.student_id
        WHERE a.activity_id=$1::uuid AND sa.classroom_id=$2::uuid AND a.status='SUBMITTED'
        ORDER BY a.submitted_at DESC,a.id`, activityId, classroomId);
      return { submissions };
    });
  }

  assignmentSubmission(request: unknown, classroomId: string, attemptId: string) {
    return this.run(request, false, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, false, true);
      if (!uuid(attemptId)) return fail('FORBIDDEN');
      const [row] = await tx.query<{ id: string; number: number; submittedAt: Date; appliedDeadlineAt: Date | null; submittedLate: boolean; firstName: string; lastName: string }>(
        `SELECT a.id,a.attempt_number AS number,a.submitted_at AS "submittedAt",a.applied_deadline_at AS "appliedDeadlineAt",
        a.submitted_late AS "submittedLate",u.first_name AS "firstName",u.last_name AS "lastName"
        FROM attempts a JOIN activities activity ON activity.id=a.activity_id JOIN student_activities sa ON sa.id=a.student_activity_id
        JOIN enrollments e ON e.id=sa.enrollment_id JOIN users u ON u.id=e.student_id
        WHERE a.id=$1::uuid AND sa.classroom_id=$2::uuid AND a.status='SUBMITTED' AND activity.type='ASSIGNMENT' FOR SHARE OF a`, attemptId, classroomId);
      if (!row) return fail('FORBIDDEN');
      return { ...row, attachments: await this.attachmentViews(tx, attemptId, false) };
    });
  }
}
