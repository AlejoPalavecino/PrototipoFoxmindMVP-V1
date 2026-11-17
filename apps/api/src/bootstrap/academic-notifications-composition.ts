import { NotificationInboxService as Application } from '../modules/home/notifications/public.ts';
import { createNotificationInboxRepository } from '../modules/home/notifications/infrastructure/notification-repository.ts';
import { notificationSelection } from '../modules/home/notifications/infrastructure/notification-selection.ts';
import { duePrivateAgendaNotices } from '../modules/agenda/events/infrastructure/due-notices.ts';
import { setProjectedNotificationRead } from '../modules/home/notifications/infrastructure/notification-projections.ts';
import { legacyNotifications, notificationPage, readAllVisibleNotifications } from '../modules/home/notifications/infrastructure/notification-page.ts';
export class NotificationInboxService extends Application {
 constructor(context: ConstructorParameters<typeof Application>[0] & { ports: { signingKey: Buffer } }) {
  const key = context.ports.signingKey;
  super(context, createNotificationInboxRepository(), {
   legacyNotifications: (tx, { actorId }) => legacyNotifications(tx, actorId, notificationSelection),
   notificationPage: (tx, { actorId, query }) => notificationPage(tx, key, actorId, notificationSelection, query, duePrivateAgendaNotices),
   setProjectedNotificationRead: (tx, { actorId, id, read }) => setProjectedNotificationRead(tx, actorId, id, read, duePrivateAgendaNotices),
   readAllVisibleNotifications: (tx, { actorId }) => readAllVisibleNotifications(tx, actorId, notificationSelection, duePrivateAgendaNotices),
  });
 }
}
