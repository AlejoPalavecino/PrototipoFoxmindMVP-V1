import type { WallNotificationRow } from '../application/notification-records.ts';
import type { AcademicNotification, GradeNotification } from '../application/notification-targets.ts';
import { notificationSelection } from './notification-selection.ts';
import { academicNotificationSelection } from './academic-notifications.ts';
import { gradeNotificationSelection } from './grade-notifications.ts';
import type { NotificationInboxRepository } from '../application/notification-repository.ts';
export function createNotificationInboxRepository(): NotificationInboxRepository { return {
 async findRecipientClassroom(tx, input) { return tx.query<{ classroom_id: string }>('SELECT classroom_id FROM notifications WHERE id=$1::uuid AND recipient_id=$2::uuid', input.notificationId, input.actorId); },
 async lockWallNotification(tx, input) { return tx.query<WallNotificationRow>(`${notificationSelection} AND n.id=$2::uuid FOR UPDATE OF n`, input.actorId, input.notificationId); },
 async lockAcademicNotification(tx, input) { return tx.query<AcademicNotification>(`${academicNotificationSelection} AND n.id=$2::uuid FOR UPDATE OF n`, input.actorId, input.notificationId); },
 async lockGradeNotification(tx, input) { return tx.query<GradeNotification>(`${gradeNotificationSelection} AND n.id=$2::uuid FOR UPDATE OF n`, input.actorId, input.notificationId); },
 async setRead(tx, input) { return tx.query<{ id: string }>(`UPDATE notifications SET read_at=CASE WHEN $2::boolean THEN COALESCE(read_at,clock_timestamp()) ELSE NULL END,
        updated_at=CASE WHEN (read_at IS NOT NULL)<>$2 THEN clock_timestamp() ELSE updated_at END WHERE id=$1::uuid RETURNING id`, input.notificationId, input.read); },
}; }
