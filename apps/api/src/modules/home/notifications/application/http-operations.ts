import type { NotificationPageQuery } from '../../../../../../../src/core/domain/home/notifications.ts';
/** Minimal structural operations consumed by the home/notifications transport. */
export interface NotificationsHttpOperations {
    listNotifications(request: unknown): Promise<unknown>;
    listNotificationPage(request: unknown, query: NotificationPageQuery): Promise<unknown>;
    readAllNotifications(request: unknown): Promise<unknown>;
    openNotification(request: unknown, notificationId: string): Promise<unknown>;
    readNotification(request: unknown, notificationId: string, read: boolean): Promise<unknown>;
}
