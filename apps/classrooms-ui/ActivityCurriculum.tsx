import type { ActivitySummary, Detail } from './api.ts';

export function ActivityCurriculum({ room, activity }: {
  room?: Pick<Detail, 'units'>; activity: Pick<ActivitySummary, 'unitId' | 'topicId' | 'topicIds'>;
}) {
  const unit = room?.units.find(candidate => candidate.id === activity.unitId);
  const ids = activity.topicIds ?? (activity.topicId ? [activity.topicId] : []);
  if (!unit) return null;
  const names = ids.map(id => unit.topics.find(topic => topic.id === id)?.name).filter(Boolean);
  return <p className="p7-curriculum"><strong>{unit.name}</strong>{names.length ? ` · ${names.join(' · ')}` : ''}</p>;
}
