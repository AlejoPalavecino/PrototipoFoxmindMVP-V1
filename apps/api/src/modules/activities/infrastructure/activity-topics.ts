import { fail } from '../../classrooms/public.ts';
import type { Transaction } from '../../classrooms/public.ts';

import type { ActivityTopicSelection, ResolvedActivityScope } from '../domain/topic-selection.ts';

export { activityTopics } from '../domain/topic-selection.ts';

export async function resolveActivityTopics(tx: Transaction, classroomId: string,
  selection: ActivityTopicSelection, required: boolean): Promise<ResolvedActivityScope> {
  const { unitId, unitIds, topicIds } = selection;
  if (unitIds === undefined) {
    await validateActivityTopics(tx, classroomId, unitId, topicIds);
    return { unitId, topics: topicIds.map(id => ({ id, name: '', unit_id: unitId! })) };
  }

  const wholeUnits = unitIds.map(id => id.toLowerCase());
  const explicitIds = topicIds.map(id => id.toLowerCase());
  if (new Set(wholeUnits).size !== wholeUnits.length || new Set(explicitIds).size !== explicitIds.length)
    return fail('INVALID_INPUT');
  const units = await tx.query<{ id: string }>(
    'SELECT id FROM units WHERE classroom_id=$1::uuid AND id=ANY($2::uuid[]) FOR SHARE', classroomId, wholeUnits);
  if (units.length !== wholeUnits.length) return fail('FORBIDDEN');

  const selected = await tx.query<{ id: string; name: string; unit_id: string }>(`SELECT id,name,unit_id FROM topics
    WHERE classroom_id=$1::uuid AND (id=ANY($2::uuid[]) OR unit_id=ANY($3::uuid[]))
    ORDER BY position,id LIMIT 101 FOR SHARE`, classroomId, explicitIds, wholeUnits);
  if (selected.length > 100) return fail('INVALID_INPUT');
  const byId = new Map(selected.map(topic => [topic.id, topic]));
  if (!explicitIds.every(id => byId.has(id))) return fail('FORBIDDEN');
  const byUnit = new Map(wholeUnits.map(id => [id, selected.filter(topic => topic.unit_id === id)]));
  if (!wholeUnits.every(id => byUnit.get(id)?.length) || (required && !selected.length)) return fail('INVALID_INPUT');

  const ordered = new Map(explicitIds.map(id => [id, byId.get(id)!]));
  for (const id of wholeUnits) for (const topic of byUnit.get(id)!) ordered.set(topic.id, topic);
  const topics = [...ordered.values()];
  return { unitId: topics[0]?.unit_id ?? null, topics };
}

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

export async function replaceActivityTopics(tx: Transaction, id: string, classroomId: string, topics: { id: string; unit_id: string }[]) {
  await tx.query('DELETE FROM activity_topics WHERE activity_id=$1::uuid RETURNING topic_id', id);
  if (!topics.length) return;
  await tx.query(`INSERT INTO activity_topics(activity_id,classroom_id,unit_id,topic_id,position)
    SELECT $1::uuid,$2::uuid,t.unit_id,t.topic_id,(t.position-1)::int
    FROM unnest($3::uuid[],$4::uuid[]) WITH ORDINALITY AS t(topic_id,unit_id,position) RETURNING topic_id`,
    id, classroomId, topics.map(topic => topic.id), topics.map(topic => topic.unit_id));
}

export async function readActivityTopicScope(tx: Transaction, id: string, unitId: string | null, topicId: string | null) {
  const rows = await tx.query<{ topic_id: string; unit_id: string }>(
    'SELECT topic_id,unit_id FROM activity_topics WHERE activity_id=$1::uuid ORDER BY position,topic_id', id);
  return rows.length ? { topicIds: rows.map(row => row.topic_id), unitIds: [...new Set(rows.map(row => row.unit_id))] }
    : { topicIds: topicId ? [topicId] : [], unitIds: unitId ? [unitId] : [] };
}

export async function readActivityTopics(tx: Transaction, id: string, legacy: string | null) {
  const rows = await tx.query<{ topic_id: string }>('SELECT topic_id FROM activity_topics WHERE activity_id=$1::uuid ORDER BY position,topic_id', id);
  return rows.length ? rows.map(row => row.topic_id) : legacy ? [legacy] : [];
}
