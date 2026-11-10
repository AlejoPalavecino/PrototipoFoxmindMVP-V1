import { assertAttemptWrite } from './attempt-access.ts';
import { activityEvent } from './activity-events.ts';
import { practicalAttachments } from './session-readers.ts';
import { submissionReceipt } from './submission-receipt.ts';
import { requireReady } from '../../files/public.ts';
import type { PracticalSubmissionsRepository } from '../application/practical-submissions.ts';
export const repository: Omit<PracticalSubmissionsRepository, 'enqueueSubmittedAttemptGradingAi'> = {
 assertAttemptWrite,activityEvent,practicalAttachments,submissionReceipt,requireReady,
saveResponse(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['saveResponse']>>[number]>('UPDATE attempts SET practical_response=$2,revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id',...values)},
selectedAttachment(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['selectedAttachment']>>[number]>(`SELECT file_id FROM attempt_attachments WHERE attempt_id=$1::uuid
        AND file_id=$2::uuid FOR UPDATE`,...values)},
unlinkAttachment(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['unlinkAttachment']>>[number]>('DELETE FROM attempt_attachments WHERE attempt_id=$1::uuid AND file_id=$2::uuid RETURNING file_id',...values)},
pendingUpload(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['pendingUpload']>>[number]>(`SELECT u.status::text,c.phase FROM files f
          JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
          WHERE f.id=$1::uuid AND f.classroom_id=$2::uuid AND f.uploaded_by_id=$3::uuid AND c.purpose='attachment'
            AND c.target_id=$4::uuid FOR UPDATE OF f,u,c`,...values)},
cancelUpload(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['cancelUpload']>>[number]>(`UPDATE uploads SET status='CANCELLED',last_activity_at=clock_timestamp(),updated_at=clock_timestamp()
          WHERE file_id=$1::uuid RETURNING id`,...values)},
invalidateCustody(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['invalidateCustody']>>[number]>(`UPDATE file_custodies SET phase='reserved',operation_id=NULL,lease_until=NULL WHERE file_id=$1::uuid RETURNING file_id`,...values)},
advanceAttempt(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['advanceAttempt']>>[number]>('UPDATE attempts SET revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id',...values)},
selectedAttachments(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['selectedAttachments']>>[number]>('SELECT file_id FROM attempt_attachments WHERE attempt_id=$1::uuid ORDER BY position,file_id FOR UPDATE',...values)},
pendingAttachments(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['pendingAttachments']>>[number]>(`SELECT f.id FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
        WHERE c.purpose='attachment' AND c.target_id=$1::uuid AND u.status NOT IN ('COMPLETED','CANCELLED','FAILED')
        AND u.reservation_released_at IS NULL ORDER BY f.id FOR UPDATE OF f,u,c`,...values)},
lockAttachment(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['lockAttachment']>>[number]>(`SELECT f.id FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
          WHERE f.id=$1::uuid FOR UPDATE OF f,u,c`,...values)},
attachmentOrigin(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['attachmentOrigin']>>[number]>(`SELECT a.id FROM attempts a JOIN student_activities sa ON sa.id=a.student_activity_id
          JOIN enrollments e ON e.id=sa.enrollment_id WHERE a.id=$1::uuid AND a.activity_id=$2::uuid
          AND sa.classroom_id=$3::uuid AND e.student_id=$4::uuid FOR SHARE OF a,sa,e`,...values)},
submitAttempt(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['submitAttempt']>>[number]>(`UPDATE attempts SET status='SUBMITTED',submitted_at=$2,applied_deadline_at=$3,submitted_late=$4,
        editor_token_hash=NULL,editor_epoch=editor_epoch+1,revision=revision+1,updated_at=$2 WHERE id=$1::uuid RETURNING *`,...values)},
submissions(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['submissions']>>[number]>(`SELECT a.id,a.attempt_number AS number,a.submitted_at AS "submittedAt",
        a.applied_deadline_at AS "appliedDeadlineAt",a.submitted_late AS "submittedLate",
        u.first_name AS "firstName",u.last_name AS "lastName"
        FROM attempts a JOIN student_activities sa ON sa.id=a.student_activity_id
        JOIN enrollments e ON e.id=sa.enrollment_id JOIN users u ON u.id=e.student_id
        WHERE a.activity_id=$1::uuid AND sa.classroom_id=$2::uuid AND a.status='SUBMITTED'
        ORDER BY a.submitted_at DESC,a.id`,...values)},
submission(tx,...values){return tx.query<Awaited<ReturnType<PracticalSubmissionsRepository['submission']>>[number]>(`SELECT a.id,a.attempt_number AS number,a.submitted_at AS "submittedAt",a.applied_deadline_at AS "appliedDeadlineAt",
        a.submitted_late AS "submittedLate",a.practical_response AS "practicalResponse",u.first_name AS "firstName",u.last_name AS "lastName"
        FROM attempts a JOIN activities activity ON activity.id=a.activity_id JOIN student_activities sa ON sa.id=a.student_activity_id
        JOIN enrollments e ON e.id=sa.enrollment_id JOIN users u ON u.id=e.student_id
        WHERE a.id=$1::uuid AND sa.classroom_id=$2::uuid AND a.status='SUBMITTED' AND activity.type='ASSIGNMENT' FOR SHARE OF a`,...values)},
};