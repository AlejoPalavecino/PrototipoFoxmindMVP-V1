import { randomUUID } from 'node:crypto';
import type { ClassroomCore } from './core.ts';
import type { PlanService } from './plan.ts';
import { revision } from './drafts.ts';
import { fail, object, uuid } from './policy.ts';
import { parseWallMutation, type NotificationPageQuery } from '../../../../src/core/domain/index.ts';
import { notificationPage } from './notification-page.ts';
import { feed, repliesPage, thread } from './wall-read.ts';
import type { WallPageQuery } from '../../../../src/core/domain/index.ts';
import type { Actor, Transaction } from './contracts.ts';
import { academicNotificationSelection, academicTarget, type AcademicNotification } from './academic-notifications.ts';
import { gradeNotificationSelection, gradeTarget, type GradeNotification } from './grade-notifications.ts';

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
const notificationSelection = `SELECT n.id,n.classroom_id AS "classroomId",c.name AS "classroomName",
  n.event_type AS "eventType",n.post_id AS "postId",n.reply_id AS "replyId",n.created_at AS "createdAt",n.read_at AS "readAt"
  FROM notifications n JOIN classrooms c ON c.id=n.classroom_id
  JOIN wall_posts p ON p.id=n.post_id AND p.classroom_id=n.classroom_id
  LEFT JOIN wall_replies r ON r.id=n.reply_id AND r.classroom_id=n.classroom_id AND r.post_id=p.id
  WHERE n.recipient_id=$1::uuid
    AND n.activity_id IS NULL AND n.attempt_id IS NULL AND n.attempt_grade_id IS NULL
    AND ((n.event_type IN ('WALL_NOTICE','WALL_QUERY') AND n.reply_id IS NULL) OR (n.event_type='WALL_REPLY' AND r.id IS NOT NULL))
    AND (c.teacher_id=$1::uuid OR EXISTS(SELECT 1 FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
      WHERE e.classroom_id=c.id AND e.student_id=$1::uuid AND m.ended_at IS NULL))`;

export class WallService {
  private readonly run: ClassroomCore['run'];
  private readonly classroom: ClassroomCore['classroom'];
  private readonly ports: ClassroomCore['ports'];
  private readonly advanceRevision: PlanService['advanceRevision'];
  constructor(context: Pick<ClassroomCore, 'run' | 'classroom' | 'ports'>, dependencies: Pick<PlanService, 'advanceRevision'>) {
    this.run = context.run.bind(context);
    this.classroom = context.classroom.bind(context);
    this.ports = context.ports;
    this.advanceRevision = dependencies.advanceRevision;
  }
  listWall(request: unknown, classroomId: string, query?: WallPageQuery) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      return feed(tx, actor, room, this.ports.signingKey, classroomId, query);
    });
  }
  wallThread(request: unknown, classroomId: string, postId: string, replyId?: string) {
    if (!uuid(postId) || (replyId !== undefined && !uuid(replyId))) return fail('INVALID_INPUT');
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      return thread(tx, actor, room, this.ports.signingKey, classroomId, postId, replyId);
    });
  }
  listWallReplies(request: unknown, classroomId: string, postId: string, query?: WallPageQuery) {
    if (!uuid(postId)) return fail('INVALID_INPUT');
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      const [post] = await tx.query<{ id: string }>('SELECT id FROM wall_posts WHERE classroom_id=$1::uuid AND id=$2::uuid', classroomId, postId);
      if (!post) return fail('FORBIDDEN');
      return repliesPage(tx, actor, room, this.ports.signingKey, classroomId, postId, query);
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
        const id = randomUUID(), teacher = classroom.teacher_id === actor.id;
        await tx.query(`INSERT INTO wall_posts(id,updated_at,classroom_id,author_id,type,body)
          VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4::"PostType",$5) RETURNING id`, id, classroomId, actor.id, teacher ? 'NOTICE' : 'QUERY', op.body);
        await this.notify(tx, actor, classroomId, classroom.teacher_id, teacher ? 'WALL_NOTICE' : 'WALL_QUERY', id, null, teacher ? null : classroom.teacher_id);
      } else if (op.action === 'reply') {
        const post = await this.wallTarget(tx, classroomId, op.postId, false);
        if (post.removed_at) return fail('CONFLICT');
        const id = randomUUID();
        await tx.query(`INSERT INTO wall_replies(id,updated_at,post_id,classroom_id,author_id,body)
          VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4::uuid,$5) RETURNING id`, id, post.id, classroomId, actor.id, op.body);
        await this.notify(tx, actor, classroomId, classroom.teacher_id, 'WALL_REPLY', post.id, id, post.author_id);
      } else {
        const reply = op.action === 'editReply' || op.action === 'removeReply';
        const target = await this.wallTarget(tx, classroomId, op.id, reply);
        const edit = op.action === 'editPost' || op.action === 'editReply';
        if (target.author_id !== actor.id && (edit || classroom.teacher_id !== actor.id)) return fail('FORBIDDEN');
        if (target.removed_at) return fail('CONFLICT');
        // Only these two static table names are interpolated; all supplied values are parameters.
        const table = reply ? 'wall_replies' : 'wall_posts';
        if (edit && 'body' in op) await tx.query(`UPDATE ${table} SET body=$2,edited_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, target.id, op.body);
        else await tx.query(`UPDATE ${table} SET body=NULL,removed_at=clock_timestamp(),removed_by_id=$2::uuid,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, target.id, actor.id);
      }
      return this.advanceRevision(tx, classroomId, classroom.revision);
    });
  }

  private async wallTarget(tx: Transaction, classroomId: string, id: string, reply: boolean) {
    const [row] = await tx.query<{ id: string; author_id: string; removed_at: Date | null }>(
      `SELECT id,author_id,removed_at FROM ${reply ? 'wall_replies' : 'wall_posts'} WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE`, id, classroomId);
    if (!row) return fail('FORBIDDEN');
    return row;
  }

  private async notify(tx: Transaction, actor: Actor, classroomId: string, teacherId: string, event: string, postId: string, replyId: string | null, recipientId: string | null) {
    // Classroom lock + expected revision serialize the event; EXISTS prevents duplicate enrollment joins.
    // The event/recipient guard also makes insertion idempotent without altering historical tables.
    await tx.query(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,post_id,reply_id)
      SELECT gen_random_uuid(),clock_timestamp(),u.id,$1::uuid,$2,$3::uuid,$4::uuid FROM users u
      WHERE u.id<>$5::uuid AND ($6::uuid IS NULL OR u.id=$6::uuid)
      AND (($6::uuid IS NOT NULL AND u.id=$7::uuid) OR EXISTS(SELECT 1 FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
        WHERE e.classroom_id=$1::uuid AND e.student_id=u.id AND m.ended_at IS NULL))
      AND NOT EXISTS(SELECT 1 FROM notifications n WHERE n.recipient_id=u.id AND n.event_type=$2 AND n.post_id=$3::uuid
        AND n.reply_id IS NOT DISTINCT FROM $4::uuid) RETURNING id`, classroomId, event, postId, replyId, actor.id, recipientId, teacherId);
  }

  listNotifications(request: unknown) {
    return this.run(request, false, async (tx, actor) => {
      return (await notificationPage(tx, this.ports.signingKey, actor.id, notificationSelection)).items;
    });
  }
  listNotificationPage(request: unknown, query?: NotificationPageQuery) {
    return this.run(request, false, async (tx, actor) => notificationPage(tx, this.ports.signingKey, actor.id, notificationSelection, query));
  }

  readNotification(request: unknown, id: string) {
    return this.notificationAction(request, id, false);
  }

  openNotification(request: unknown, id: string) {
    return this.notificationAction(request, id, true);
  }

  private notificationAction(request: unknown, id: string, open: boolean) {
    if (!uuid(id)) return fail('FORBIDDEN');
    return this.run(request, true, async (tx, actor) => {
      // Discover only this recipient's room, then acquire the standard classroom lock before rechecking target access.
      const [owned] = await tx.query<{ classroom_id: string }>('SELECT classroom_id FROM notifications WHERE id=$1::uuid AND recipient_id=$2::uuid', id, actor.id);
      if (!owned) return fail('FORBIDDEN');
      await this.classroom(tx, actor, owned.classroom_id);
      const [wall] = await tx.query<NotificationRow>(`${notificationSelection} AND n.id=$2::uuid FOR UPDATE OF n`, actor.id, id);
      const [academic] = wall ? [] : await tx.query<AcademicNotification>(`${academicNotificationSelection} AND n.id=$2::uuid FOR UPDATE OF n`, actor.id, id);
      const [grade] = wall || academic ? [] : await tx.query<GradeNotification>(`${gradeNotificationSelection} AND n.id=$2::uuid FOR UPDATE OF n`, actor.id, id);
      const target = wall ?? academic ?? grade;
      if (!target) return fail('FORBIDDEN');
      await tx.query(`UPDATE notifications SET read_at=COALESCE(read_at,clock_timestamp()),
        updated_at=CASE WHEN read_at IS NULL THEN clock_timestamp() ELSE updated_at END WHERE id=$1::uuid RETURNING id`, id);
      return open ? wall ? { classroomId: wall.classroomId, postId: wall.postId, replyId: wall.replyId }
        : academic ? academicTarget(academic) : gradeTarget(grade) : { read: true };
    });
  }
}
