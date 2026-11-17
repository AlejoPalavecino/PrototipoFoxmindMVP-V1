import type { Transaction } from '../../../classrooms/public.ts';
import type { WallNotificationRow } from './notification-records.ts';
import type { AcademicNotification, GradeNotification } from './notification-targets.ts';
export interface NotificationInboxRepository {
 findRecipientClassroom(tx: Transaction, input: { notificationId: string; actorId: string }): Promise<{ classroom_id: string }[]>;
 lockWallNotification(tx: Transaction, input: { actorId: string; notificationId: string }): Promise<WallNotificationRow[]>;
 lockAcademicNotification(tx: Transaction, input: { actorId: string; notificationId: string }): Promise<AcademicNotification[]>;
 lockGradeNotification(tx: Transaction, input: { actorId: string; notificationId: string }): Promise<GradeNotification[]>;
 setRead(tx: Transaction, input: { notificationId: string; read: boolean }): Promise<{ id: string }[]>;
}
