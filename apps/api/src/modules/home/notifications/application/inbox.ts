import type { ClassroomAccess } from '../../../classrooms/public.ts';
import { fail, uuid } from '../../../classrooms/public.ts';
import { isProjectedNotificationId, type NotificationPageQuery } from '../../../../../../../src/core/domain/home/notifications.ts';
import { academicTarget, gradeTarget } from './notification-targets.ts';
import type { NotificationInboxRepository } from './notification-repository.ts';
import type { NotificationInboxReadPort } from './read-port.ts';

/** List/read/open share recipient and current-target authorization in the existing unit of work. */
export class NotificationInboxService {
 private readonly run: ClassroomAccess['run'];
 private readonly classroom: ClassroomAccess['classroom'];
 constructor(context: Pick<ClassroomAccess, 'run' | 'classroom'>, private readonly repository: NotificationInboxRepository, private readonly read: NotificationInboxReadPort) {
  this.run = context.run.bind(context); this.classroom = context.classroom.bind(context);
 }
  listNotifications(request: unknown) {
    return this.run(request, false, async (tx, actor) => {
      return this.read.legacyNotifications(tx, { actorId: actor.id });
    });
  }
  listNotificationPage(request: unknown, query?: NotificationPageQuery) {
    return this.run(request, false, async (tx, actor) => this.read.notificationPage(tx, { actorId: actor.id, query }));
  }

  readNotification(request: unknown, id: string, read = true) {
    return this.notificationAction(request, id, read ? 'read' : 'unread');
  }

  readAllNotifications(request: unknown) {
    return this.run(request, true, (tx, actor) => this.read.readAllVisibleNotifications(tx, { actorId: actor.id }));
  }

  openNotification(request: unknown, id: string) {
    return this.notificationAction(request, id, 'open');
  }

  private notificationAction(request: unknown, id: string, action: 'open' | 'read' | 'unread') {
    const projected = isProjectedNotificationId(id), read = action !== 'unread', open = action === 'open';
    if (!projected && !uuid(id)) return fail('FORBIDDEN');
    return this.run(request, true, async (tx, actor) => {
      if (projected) {
        const target = await this.read.setProjectedNotificationRead(tx, { actorId: actor.id, id: id.toLowerCase(), read });
        return open ? target : { read };
      }
      // Discover only this recipient's room, then acquire the standard classroom lock before rechecking target access.
      const [owned] = await this.repository.findRecipientClassroom(tx, { notificationId: id, actorId: actor.id });
      if (!owned) return fail('FORBIDDEN');
      await this.classroom(tx, actor, owned.classroom_id);
      const [wall] = await this.repository.lockWallNotification(tx, { actorId: actor.id, notificationId: id });
      const [academic] = wall ? [] : await this.repository.lockAcademicNotification(tx, { actorId: actor.id, notificationId: id });
      const [grade] = wall || academic ? [] : await this.repository.lockGradeNotification(tx, { actorId: actor.id, notificationId: id });
      const target = wall ?? academic ?? grade;
      if (!target) return fail('FORBIDDEN');
      await this.repository.setRead(tx, { notificationId: id, read });
      return open ? wall ? { classroomId: wall.classroomId, postId: wall.postId, replyId: wall.replyId }
        : academic ? academicTarget(academic) : gradeTarget(grade) : { read };
    });
  }
}
