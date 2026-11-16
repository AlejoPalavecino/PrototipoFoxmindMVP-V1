import type { ActivitySummary } from '../../../../src/core/contracts/activities.ts';
import type { Detail } from '../../../../src/core/contracts/classrooms.ts';
import { selectedActivityTopics } from '../features/activity-authoring/index.ts';

export function ActivityCurriculum({ room, activity, split = false }: {
  room?: Pick<Detail, 'units'>; activity: Pick<ActivitySummary, 'unitId' | 'topicId' | 'topicIds'>;
  split?: boolean;
}) {
  const units = room?.units ?? [];
  const topicIds = activity.topicIds ?? (activity.topicId ? [activity.topicId] : []);
  const topicOrder = new Map(topicIds.map((id, index) => [id, index]));
  const position = (id?: string) => topicOrder.get(id ?? '') ?? Number.MAX_SAFE_INTEGER;
  const selected = selectedActivityTopics(units, { unitIds: [], topicIds });
  for (const unit of selected) unit.topics.sort((left, right) => position(left.id) - position(right.id));
  selected.sort((left, right) => position(left.topics[0]?.id) - position(right.topics[0]?.id));
  if (!selected.length) {
    const unit = units.find(unit => unit.id === activity.unitId);
    if (!unit) return null;
    return split ? <><h4>Unidad</h4><p>{unit.name}</p></> : <p className="p7-curriculum"><strong>{unit.name}</strong></p>;
  }
  return <div className="p7-curriculum">
    {split ? <h4>Alcance en el plan</h4> : null}
    {selected.map(unit => <p key={unit.id}><strong>{unit.name}</strong>{` · ${unit.topics.map(topic => topic.name).join(' · ')}`}</p>)}
  </div>;
}
