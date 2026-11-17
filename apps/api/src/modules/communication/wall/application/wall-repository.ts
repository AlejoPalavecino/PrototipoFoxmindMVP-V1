import type { Transaction } from '../../../classrooms/public.ts';
export interface WallRepository {
 findPost(tx: Transaction, input: { classroomId: string; postId: string }): Promise<{ id: string }[]>;
 createPost(tx: Transaction, input: { postId: string; classroomId: string; authorId: string; type: 'NOTICE'|'QUERY'; body: string; title: string|null }): Promise<{ id: string }[]>;
 createReply(tx: Transaction, input: { replyId: string; postId: string; classroomId: string; authorId: string; body: string }): Promise<{ id: string }[]>;
 updatePostTitle(tx: Transaction, input: { postId: string; title: string|null }): Promise<{ id: string }[]>;
 editContent(tx: Transaction, input: { target: 'post'|'reply'; id: string; body: string }): Promise<{ id: string }[]>;
 removeContent(tx: Transaction, input: { target: 'post'|'reply'; id: string; actorId: string }): Promise<{ id: string }[]>;
 lockTarget(tx: Transaction, input: { target: 'post'|'reply'; id: string; classroomId: string }): Promise<{ id: string; author_id: string; removed_at: Date | null }[]>;
 createWallNotifications(tx: Transaction, input: { classroomId: string; event: 'WALL_NOTICE'|'WALL_QUERY'|'WALL_REPLY'; postId: string; replyId: string|null; actorId: string; recipientId: string|null; teacherId: string }): Promise<{ id: string }[]>;
}
