import type { TopicProgressRepository } from '../application/ports.ts';
export function createTopicProgressRepository(): TopicProgressRepository {
 return {
  async lock(tx, topicId, classroomId) { const [topic] = await tx.query('SELECT id FROM topics WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE', topicId, classroomId); return !!topic; },
  async resetNext(tx, classroomId, topicId) { await tx.query("UPDATE topics SET status='PENDING',updated_at=clock_timestamp() WHERE classroom_id=$1::uuid AND status='NEXT' AND id<>$2::uuid RETURNING id", classroomId, topicId); },
  async set(tx, topicId, status) { await tx.query('UPDATE topics SET status=$2::"TopicStatus",updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id',topicId,status); }
 };
}
