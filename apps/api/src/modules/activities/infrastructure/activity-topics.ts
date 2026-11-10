import { fail, uuid } from '../../classrooms/public.ts';
import type { Transaction } from '../../classrooms/public.ts';

export { activityTopics } from '../domain/topic-selection.ts';

export async function validateActivityTopics(tx: Transaction, classroomId: string, unitId: string | null, topicIds: string[]) {
  if (unitId !== null) {
    const [unit] = await tx.query('SELECT id FROM units WHERE id=$1::uuid AND classroom_id=$2::uuid FOR SHARE', unitId, classroomId);
    if (!unit) return fail('FORBIDDEN');
  }
  for (const topicId of topicIds) {
    const [topic] = await tx.query('SELECT id FROM topics WHERE id=$1::uuid AND unit_id=$2::uuid AND classroom_id=$3::uuid FOR SHARE', topicId, unitId, classroomId);
    if (!topic) return fail('FORBIDDEN');
  }
}

export async function replaceActivityTopics(tx: Transaction, id: string, classroomId: string, unitId: string | null, topicIds: string[]) {
  await tx.query('DELETE FROM activity_topics WHERE activity_id=$1::uuid RETURNING topic_id', id);
  for (const [position, topicId] of topicIds.entries()) await tx.query(`INSERT INTO activity_topics(activity_id,classroom_id,unit_id,topic_id,position)
    VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5) RETURNING topic_id`, id, classroomId, unitId, topicId, position);
}

export async function readActivityTopics(tx: Transaction, id: string, legacy: string | null) {
  const rows = await tx.query<{ topic_id: string }>('SELECT topic_id FROM activity_topics WHERE activity_id=$1::uuid ORDER BY position,topic_id', id);
  return rows.length ? rows.map(row => row.topic_id) : legacy ? [legacy] : [];
}
