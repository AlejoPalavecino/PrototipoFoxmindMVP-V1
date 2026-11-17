import type { Transaction } from '../../../classrooms/public.ts';
import type { ClassroomNotification, NotificationPage, NotificationPageQuery } from '../../../../../../../src/core/domain/home/notifications.ts';
import type { ProjectedNotificationTarget } from '../../../../../../../src/core/contracts/notifications.ts';
export interface NotificationInboxReadPort {
 legacyNotifications(tx: Transaction, input: { actorId: string }): Promise<ClassroomNotification[]>;
 notificationPage(tx: Transaction, input: { actorId: string; query?: NotificationPageQuery }): Promise<NotificationPage>;
 setProjectedNotificationRead(tx: Transaction, input: { actorId: string; id: string; read: boolean }): Promise<ProjectedNotificationTarget>;
 readAllVisibleNotifications(tx: Transaction, input: { actorId: string }): Promise<{ read: boolean; updatedCount: number }>;
}

export interface AgendaNotice { id: string; eventId: string; occurrenceDate: string; title: string; startsAt: string; createdAt: string }
export type AgendaNoticeSource = (tx: Transaction, actor: string, now: string, eventId: string | null) => Promise<AgendaNotice[]>;
