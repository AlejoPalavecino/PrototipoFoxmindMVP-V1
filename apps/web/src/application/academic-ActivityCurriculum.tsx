import type { ActivitySummary } from '../../../../src/core/contracts/activities.ts';
import type { Detail } from '../../../../src/core/contracts/classrooms.ts';

export function ActivityCurriculum({ room, activity, split = false }: {
  room?: Pick<Detail, 'units'>; activity: Pick<ActivitySummary, 'unitId' | 'topicId' | 'topicIds'>;
  split?: boolean;
}) {
  const unit = room?.units.find(candidate => candidate.id === activity.unitId);
  const ids = activity.topicIds ?? (activity.topicId ? [activity.topicId] : []);
  if (!unit) return null;
  const names = ids.map(id => unit.topics.find(topic => topic.id === id)?.name).filter(Boolean);
  if (split) return <><h4>Unidad</h4><p>{unit.name}</p><h4>Temas</h4><p>{names.join(' · ') || 'Sin temas vinculados'}</p></>;
  return <p className="p7-curriculum"><strong>{unit.name}</strong>{names.length ? ` · ${names.join(' · ')}` : ''}</p>;
}
