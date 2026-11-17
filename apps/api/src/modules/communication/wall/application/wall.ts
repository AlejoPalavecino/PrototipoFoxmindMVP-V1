import type { WallRepository } from './wall-repository.ts';
import type { WallReadPort } from './read-ports.ts';
import type { ClassroomAccess, RevisionPort } from '../../../classrooms/public.ts';
import { fail, uuid } from '../../../classrooms/public.ts';
import { parseWallMutation } from '../../../../../../../src/core/domain/communication/wall.ts';
import type { WallPageQuery } from '../../../../../../../src/core/domain/communication/wall.ts';
import type { Actor, Transaction } from '../../../classrooms/public.ts';

// Wall mutations and their notification production share the classroom transaction.
export class WallService {
  private readonly run: ClassroomAccess['run'];
  private readonly classroom: ClassroomAccess['classroom'];
  private readonly advanceRevision: RevisionPort;
  constructor(context: Pick<ClassroomAccess, 'run' | 'classroom'>, dependencies: { advanceRevision: RevisionPort }, private readonly repository: WallRepository, private readonly read: WallReadPort, private readonly newId: () => string) {
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
      const [post] = await this.repository.findPost(tx, { classroomId, postId });
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
        await this.repository.createPost(tx, { postId: id, classroomId, authorId: actor.id, type: teacher ? 'NOTICE' : 'QUERY', body: op.body, title: op.title ?? null });
        await this.notify(tx, actor, classroomId, classroom.teacher_id, teacher ? 'WALL_NOTICE' : 'WALL_QUERY', id, null, teacher ? null : classroom.teacher_id);
      } else if (op.action === 'reply') {
        const post = await this.wallTarget(tx, classroomId, op.postId, false);
        if (post.removed_at) return fail('CONFLICT');
        const id = this.newId();
        await this.repository.createReply(tx, { replyId: id, postId: post.id, classroomId, authorId: actor.id, body: op.body });
        await this.notify(tx, actor, classroomId, classroom.teacher_id, 'WALL_REPLY', post.id, id, post.author_id);
      } else {
        const reply = op.action === 'editReply' || op.action === 'removeReply';
        const target = await this.wallTarget(tx, classroomId, op.id, reply);
        const edit = op.action === 'editPost' || op.action === 'editReply';
        if (target.author_id !== actor.id && (edit || classroom.teacher_id !== actor.id)) return fail('FORBIDDEN');
        if (target.removed_at) return fail('CONFLICT');
        // Persistence maps this bounded post/reply target to its static table.
        if (op.action === 'editPost' && Object.hasOwn(op, 'title')) await this.repository.updatePostTitle(tx, { postId: target.id, title: op.title ?? null });
        if (edit && 'body' in op) await this.repository.editContent(tx, { target: reply ? 'reply' : 'post', id: target.id, body: op.body });
        else await this.repository.removeContent(tx, { target: reply ? 'reply' : 'post', id: target.id, actorId: actor.id });
      }
      return this.advanceRevision(tx, classroomId, classroom.revision);
    });
  }

  private async wallTarget(tx: Transaction, classroomId: string, id: string, reply: boolean) {
    const [row] = await this.repository.lockTarget(tx, { target: reply ? 'reply' : 'post', id, classroomId });
    if (!row) return fail('FORBIDDEN');
    return row;
  }

  private async notify(tx: Transaction, actor: Actor, classroomId: string, teacherId: string, event: 'WALL_NOTICE' | 'WALL_QUERY' | 'WALL_REPLY', postId: string, replyId: string | null, recipientId: string | null) {
    // Classroom lock + expected revision serialize the event; EXISTS prevents duplicate enrollment joins.
    // The event/recipient guard also makes insertion idempotent without altering historical tables.
    await this.repository.createWallNotifications(tx, { classroomId, event, postId, replyId, actorId: actor.id, recipientId, teacherId });
  }

}
