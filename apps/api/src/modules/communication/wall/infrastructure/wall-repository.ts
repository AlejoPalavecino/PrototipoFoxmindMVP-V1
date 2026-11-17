import type { WallRepository } from '../application/wall-repository.ts';
export function createWallRepository(): WallRepository { return {
 async findPost(tx, input) { return tx.query<{ id: string }>('SELECT id FROM wall_posts WHERE classroom_id=$1::uuid AND id=$2::uuid', input.classroomId, input.postId); },
 async createPost(tx, input) { return tx.query<{ id: string }>(`INSERT INTO wall_posts(id,updated_at,classroom_id,author_id,type,body,title)
          VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4::"PostType",$5,$6) RETURNING id`, input.postId, input.classroomId, input.authorId, input.type, input.body, input.title); },
 async createReply(tx, input) { return tx.query<{ id: string }>(`INSERT INTO wall_replies(id,updated_at,post_id,classroom_id,author_id,body)
          VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4::uuid,$5) RETURNING id`, input.replyId, input.postId, input.classroomId, input.authorId, input.body); },
 async updatePostTitle(tx, input) { return tx.query<{ id: string }>('UPDATE wall_posts SET title=$2 WHERE id=$1::uuid RETURNING id', input.postId, input.title); },
 async editContent(tx, input) { return tx.query<{ id: string }>(`UPDATE ${input.target === 'reply' ? 'wall_replies' : 'wall_posts'} SET body=$2,edited_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, input.id, input.body); },
 async removeContent(tx, input) { return tx.query<{ id: string }>(`UPDATE ${input.target === 'reply' ? 'wall_replies' : 'wall_posts'} SET ${input.target === 'reply' ? '' : 'title=NULL,'}body=NULL,removed_at=clock_timestamp(),removed_by_id=$2::uuid,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, input.id, input.actorId); },
 async lockTarget(tx, input) { return tx.query<{ id: string; author_id: string; removed_at: Date | null }>(`SELECT id,author_id,removed_at FROM ${input.target === 'reply' ? 'wall_replies' : 'wall_posts'} WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE`, input.id, input.classroomId); },
 async createWallNotifications(tx, input) { return tx.query<{ id: string }>(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,post_id,reply_id)
      SELECT gen_random_uuid(),clock_timestamp(),u.id,$1::uuid,$2,$3::uuid,$4::uuid FROM users u
      WHERE u.id<>$5::uuid AND ($6::uuid IS NULL OR u.id=$6::uuid)
      AND (($6::uuid IS NOT NULL AND u.id=$7::uuid) OR EXISTS(SELECT 1 FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
        WHERE e.classroom_id=$1::uuid AND e.student_id=u.id AND m.ended_at IS NULL))
      AND NOT EXISTS(SELECT 1 FROM notifications n WHERE n.recipient_id=u.id AND n.event_type=$2 AND n.post_id=$3::uuid
        AND n.reply_id IS NOT DISTINCT FROM $4::uuid) RETURNING id`, input.classroomId, input.event, input.postId, input.replyId, input.actorId, input.recipientId, input.teacherId); },
}; }
