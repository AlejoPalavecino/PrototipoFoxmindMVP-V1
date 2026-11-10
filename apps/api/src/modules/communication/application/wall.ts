import type { WallRepository } from './wall-repository.ts';
import type { WallReadPort } from './read-ports.ts';
import type { ClassroomAccess } from '../../classrooms/public.ts';
import type { ClassroomFileOperations } from '../../materials/public.ts';
import { revision } from '../../classrooms/public.ts';
import { fail, object, uuid } from '../../classrooms/public.ts';
import { parseWallMutation, type NotificationPageQuery } from '../../../../../../src/core/domain/index.ts';
import type { WallPageQuery } from '../../../../../../src/core/domain/index.ts';
import type { Actor, Transaction } from '../../classrooms/public.ts';
import { academicTarget, type AcademicNotification } from '../../home/public.ts';
import { gradeTarget, type GradeNotification } from '../../home/public.ts';

interface NotificationRow {
  id: string;
  classroomId: string;
  classroomName: string;
  eventType: string;
  postId: string;
  replyId: string | null;
  createdAt: Date;
  readAt: Date | null;
}

// The same target/access predicate is used by list, read and open. Tombstones remain accessible history.
export class WallService {
  private readonly run: ClassroomAccess['run'];
  private readonly classroom: ClassroomAccess['classroom'];
  private readonly advanceRevision: ClassroomFileOperations['advanceRevision'];
  constructor(context: Pick<ClassroomAccess, 'run' | 'classroom'>, dependencies: Pick<ClassroomFileOperations, 'advanceRevision'>, private readonly repository: WallRepository, private readonly read: WallReadPort, private readonly newId: () => string) {
    this.run = context.run.bind(context);
    this.classroom = context.classroom.bind(context);
    this.advanceRevision = dependencies.advanceRevision;
  }
  listWall(request: unknown, classroomId: string, query?: WallPageQuery) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      return this.read.feed(tx, actor, room, classroomId, query);
    });
  }
  wallThread(request: unknown, classroomId: string, postId: string, replyId?: string) {
    if (!uuid(postId) || (replyId !== undefined && !uuid(replyId))) return fail('INVALID_INPUT');
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      return this.read.thread(tx, actor, room, classroomId, postId, replyId);
    });
  }
  listWallReplies(request: unknown, classroomId: string, postId: string, query?: WallPageQuery) {
    if (!uuid(postId)) return fail('INVALID_INPUT');
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      const [post] = await this.repository.readWallPosts01<{ id: string }>(tx, classroomId, postId);
      if (!post) return fail('FORBIDDEN');
      return this.read.repliesPage(tx, actor, room, classroomId, postId, query);
    });
  }

  changeWall(request: unknown, classroomId: string, input: unknown) {
    let body: ReturnType<typeof parseWallMutation>;
    try { body = parseWallMutation(input); } catch { return fail('INVALID_INPUT'); }
    const expected = body.revision, op = body.operation;
    return this.run(request, true, async (tx, actor) => {
      const classroom = await this.classroom(tx, actor, classroomId, true);
      if (classroom.revision.toString() !== expected) return fail('CONFLICT');
      if (op.action === 'publish') {
        const id = this.newId(), teacher = classroom.teacher_id === actor.id;
        await this.repository.insertWallPosts02(tx, id, classroomId, actor.id, teacher ? 'NOTICE' : 'QUERY', op.body, op.title ?? null);
        await this.notify(tx, actor, classroomId, classroom.teacher_id, teacher ? 'WALL_NOTICE' : 'WALL_QUERY', id, null, teacher ? null : classroom.teacher_id);
      } else if (op.action === 'reply') {
        const post = await this.wallTarget(tx, classroomId, op.postId, false);
        if (post.removed_at) return fail('CONFLICT');
        const id = this.newId();
        await this.repository.insertWallReplies03(tx, id, post.id, classroomId, actor.id, op.body);
        await this.notify(tx, actor, classroomId, classroom.teacher_id, 'WALL_REPLY', post.id, id, post.author_id);
      } else {
        const reply = op.action === 'editReply' || op.action === 'removeReply';
        const target = await this.wallTarget(tx, classroomId, op.id, reply);
        const edit = op.action === 'editPost' || op.action === 'editReply';
        if (target.author_id !== actor.id && (edit || classroom.teacher_id !== actor.id)) return fail('FORBIDDEN');
        if (target.removed_at) return fail('CONFLICT');
        // Only these two static table names are interpolated; all supplied values are parameters.
        const table = reply ? 'wall_replies' : 'wall_posts';
        if (op.action === 'editPost' && Object.hasOwn(op, 'title')) await this.repository.updateWallPosts04(tx, target.id, op.title ?? null);
        if (edit && 'body' in op) await this.repository.updateNotifications05(tx, table, target.id, op.body);
        else await this.repository.updateNotifications06(tx, table, reply ? '' : 'title=NULL,', target.id, actor.id);
      }
      return this.advanceRevision(tx, classroomId, classroom.revision);
    });
  }

  private async wallTarget(tx: Transaction, classroomId: string, id: string, reply: boolean) {
    const [row] = await this.repository.readNotifications07<{ id: string; author_id: string; removed_at: Date | null }>(tx, reply ? 'wall_replies' : 'wall_posts', id, classroomId);
    if (!row) return fail('FORBIDDEN');
    return row;
  }

  private async notify(tx: Transaction, actor: Actor, classroomId: string, teacherId: string, event: string, postId: string, replyId: string | null, recipientId: string | null) {
    // Classroom lock + expected revision serialize the event; EXISTS prevents duplicate enrollment joins.
    // The event/recipient guard also makes insertion idempotent without altering historical tables.
    await this.repository.insertNotifications08(tx, classroomId, event, postId, replyId, actor.id, recipientId, teacherId);
  }

  listNotifications(request: unknown) {
    return this.run(request, false, async (tx, actor) => {
      return (await this.read.notificationPage(tx, actor.id)).items;
    });
  }
  listNotificationPage(request: unknown, query?: NotificationPageQuery) {
    return this.run(request, false, async (tx, actor) => this.read.notificationPage(tx, actor.id, query));
  }

  readNotification(request: unknown, id: string) {
    return this.notificationAction(request, id, false);
  }

  readAllNotifications(request: unknown) {
    return this.run(request, true, (tx, actor) => this.read.readAllVisibleNotifications(tx, actor.id));
  }

  openNotification(request: unknown, id: string) {
    return this.notificationAction(request, id, true);
  }

  private notificationAction(request: unknown, id: string, open: boolean) {
    if (!uuid(id)) return fail('FORBIDDEN');
    return this.run(request, true, async (tx, actor) => {
      // Discover only this recipient's room, then acquire the standard classroom lock before rechecking target access.
      const [owned] = await this.repository.readNotifications09<{ classroom_id: string }>(tx, id, actor.id);
      if (!owned) return fail('FORBIDDEN');
      await this.classroom(tx, actor, owned.classroom_id);
      const [wall] = await this.repository.updateOF10<NotificationRow>(tx, actor.id, id);
      const [academic] = wall ? [] : await this.repository.updateOF11<AcademicNotification>(tx, actor.id, id);
      const [grade] = wall || academic ? [] : await this.repository.updateOF12<GradeNotification>(tx, actor.id, id);
      const target = wall ?? academic ?? grade;
      if (!target) return fail('FORBIDDEN');
      await this.repository.updateNotifications13(tx, id);
      return open ? wall ? { classroomId: wall.classroomId, postId: wall.postId, replyId: wall.replyId }
        : academic ? academicTarget(academic) : gradeTarget(grade) : { read: true };
    });
  }
}
