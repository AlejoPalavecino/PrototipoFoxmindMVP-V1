import type { FoxyContext, FoxySelection } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
import type { FoxyGroundingSnapshot } from '../../../../../../src/core/domain/foxy/grounding.ts';
import { snapshotError, snapshotSources } from './grounding-sources.ts';

type Unit = { id: string; name: string; position: number };
type Topic = { id: string; unit_id: string; name: string; position: number; status: 'PENDING' | 'NEXT' | 'TAUGHT' };
async function curriculum(tx: SqlTransaction, room: string, selectedTopicIds: string[]) {
  const units = await tx.query<Unit>('SELECT id,name,position FROM units WHERE classroom_id=$1::uuid ORDER BY position,id LIMIT 101', room);
  const topics = await tx.query<Topic>('SELECT id,unit_id,name,position,status FROM topics WHERE classroom_id=$1::uuid ORDER BY position,id LIMIT 501', room);
  if (units.length > 100 || topics.length > 500) return snapshotError('AI_INPUT_LIMIT');
  const available = new Set(topics.map(topic => topic.id.toLowerCase()));
  if (selectedTopicIds.some(id => !available.has(id.toLowerCase()))) return snapshotError('CONFLICT');
  return { units: units.map(unit => ({ ...unit, topics: topics.filter(topic => topic.unit_id === unit.id)
    .map(({ id, name, position, status }) => ({ id, name, position, status })) })), selectedTopicIds };
}
export async function rebuildGrounding(tx: SqlTransaction, context: FoxyContext, selection: FoxySelection): Promise<FoxyGroundingSnapshot> {
  if (context.kind === 'GENERAL') return { context, curriculum: null, sources: [] };
  return { context, curriculum: await curriculum(tx, context.classroomId, selection.topicIds),
    sources: await snapshotSources(tx, context.classroomId, selection.sourceIds) };
}
