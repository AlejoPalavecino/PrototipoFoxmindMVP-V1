import type { FoxyContext, FoxySelection } from '../../../../../../../src/core/domain/foxy/foxy-ai.ts';
import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { FoxyGroundingSnapshot } from '../../../../../../../src/core/domain/foxy/grounding.ts';
import { loadSources } from './context-sources.ts';
import { snapshotError, snapshotSources } from './grounding-sources.ts';

type Unit = { id: string; name: string; position: number };
type Topic = { id: string; unit_id: string; name: string; position: number; status: 'PENDING' | 'NEXT' | 'TAUGHT' };
async function curriculum(tx: SqlTransaction, room: string, selectedTopicIds?: string[]) {
  const units = await tx.query<Unit>('SELECT id,name,position FROM units WHERE classroom_id=$1::uuid ORDER BY position,id LIMIT 101', room);
  const topics = await tx.query<Topic>('SELECT id,unit_id,name,position,status FROM topics WHERE classroom_id=$1::uuid ORDER BY position,id LIMIT 501', room);
  if (units.length > 100 || topics.length > 500) return snapshotError('AI_INPUT_LIMIT');
  const available = new Set(topics.map(topic => topic.id.toLowerCase()));
  if (selectedTopicIds?.some(id => !available.has(id.toLowerCase()))) return snapshotError('CONFLICT');
  return { units: units.map(unit => ({ ...unit, topics: topics.filter(topic => topic.unit_id === unit.id)
    .map(({ id, name, position, status }) => ({ id, name, position, status })) })), selectedTopicIds: selectedTopicIds ?? topics.map(topic => topic.id) };
}
export function assertFoxyFileQuota(snapshot: FoxyGroundingSnapshot): void {
  const files = [...new Map([...snapshot.sources.flatMap(source => source.files), ...(snapshot.attachments ?? [])]
    .map(file => [file.fileId.toLowerCase(), file])).values()];
  if (files.length > 6 || files.reduce((sum,file) => sum+file.sizeBytes,0) > 20_000_000) snapshotError('AI_INPUT_LIMIT');
}
export function snapshotSelection(snapshot: FoxyGroundingSnapshot): FoxySelection {
  if (snapshot.classroomScope) return { mode: 'ALL_CLASSROOM', topicIds: [], sourceIds: [] };
  return { topicIds: snapshot.curriculum?.selectedTopicIds ?? [], sourceIds: snapshot.sources.map(source => source.sourceId) };
}
async function fullClassroom(tx: SqlTransaction, context: Extract<FoxyContext, { kind: 'CLASSROOM' }>): Promise<FoxyGroundingSnapshot> {
  const room = context.classroomId;
  const [version] = await tx.query<{revision: bigint}>('SELECT revision FROM classrooms WHERE id=$1::uuid FOR SHARE',room);
  if (!version) return snapshotError('FORBIDDEN');
  const plan = await curriculum(tx, room);
  const sourceIds: string[] = [], excluded: NonNullable<FoxyGroundingSnapshot['classroomScope']>['excluded'] = [];
  for (const kind of ['PLAN', 'MATERIAL', 'ACTIVITY'] as const) {
    const page = await loadSources(tx, room, {kind, limit: 200, after: null}, true);
    if (page.next) return snapshotError('AI_INPUT_LIMIT');
    for (const item of page.items) {
      if (item.available) sourceIds.push(item.sourceId);
      else excluded.push({ sourceId: item.sourceId, title: item.title, reason: item.reason! });
    }
    if (sourceIds.length > 20 || excluded.length > 200) return snapshotError('AI_INPUT_LIMIT');
  }
  const sources = await snapshotSources(tx, room, sourceIds);
  return { context, curriculum: plan, sources, classroomScope: { revision: String(version.revision), excluded } };
}
export async function rebuildGrounding(tx: SqlTransaction, context: FoxyContext, selection: FoxySelection): Promise<FoxyGroundingSnapshot> {
  if (context.kind === 'GENERAL') return { context, curriculum: null, sources: [] };
  if (selection.mode === 'ALL_CLASSROOM') return fullClassroom(tx, context);
  return { context, curriculum: await curriculum(tx, context.classroomId, selection.topicIds),
    sources: await snapshotSources(tx, context.classroomId, selection.sourceIds) };
}
