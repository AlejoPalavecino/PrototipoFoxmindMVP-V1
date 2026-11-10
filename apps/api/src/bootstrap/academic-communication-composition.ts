import { randomUUID } from 'node:crypto';
import { WallService as Application } from '../modules/communication/application/wall.ts';
import { createWallRepository } from '../modules/communication/infrastructure/wall-repository.ts';
import { feed, thread, repliesPage } from '../modules/communication/infrastructure/wall-read.ts';
import { notificationSelection } from '../modules/communication/infrastructure/notification-selection.ts';
import { notificationPage, readAllVisibleNotifications } from '../modules/home/infrastructure/notification-page.ts';
import { academicNotificationSelection } from '../modules/home/infrastructure/academic-notifications.ts';
import { gradeNotificationSelection } from '../modules/home/infrastructure/grade-notifications.ts';
export class WallService extends Application {
 constructor(context: ConstructorParameters<typeof Application>[0] & { ports: { signingKey: Buffer } }, dependencies: ConstructorParameters<typeof Application>[1]) {
  const key = context.ports.signingKey;
  super(context, dependencies, createWallRepository({ academic: academicNotificationSelection, grade: gradeNotificationSelection }), {
   feed: (tx,actor,room,id,query) => feed(tx,actor,room,key,id,query),
   thread: (tx,actor,room,id,post,anchor) => thread(tx,actor,room,key,id,post,anchor),
   repliesPage: (tx,actor,room,id,post,query,anchor) => repliesPage(tx,actor,room,key,id,post,query,anchor),
   notificationPage: (tx,actor,query) => notificationPage(tx,key,actor,notificationSelection,query),
   readAllVisibleNotifications: (tx,actor) => readAllVisibleNotifications(tx,actor,notificationSelection),
  }, randomUUID);
 }
}
