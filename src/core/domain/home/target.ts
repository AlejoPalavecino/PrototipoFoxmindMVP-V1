import type { HomeTarget } from './home.ts';
import { homeObject, homeId, homeDate, homeEnum, homeInvalid } from './values.ts';
const fields: Record<HomeTarget['kind'], string[]> = {
  classroom: ['classroomId', 'section'], activity: ['classroomId', 'activityId'],
  submissions: ['classroomId', 'activityId', 'filter'], grade: ['classroomId', 'activityId', 'attemptId', 'gradeId'],
  wall: ['classroomId', 'postId'], material: ['classroomId', 'materialId'],
  'create-activity': ['classroomId'], 'upload-material': ['classroomId'], 'publish-notice': ['classroomId'],
  'private-event': ['eventId', 'occurrenceId', 'date'],
};
export function parseHomeTarget(input: unknown): HomeTarget {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !('kind' in input)) return homeInvalid();
  const kind = homeEnum(input.kind, Object.keys(fields) as HomeTarget['kind'][]);
  const keys = [...fields[kind], ...(kind === 'activity' && 'mode' in input ? ['mode']:[]), ...(kind === 'classroom' && 'topicId' in input ? ['topicId'] : []), ...(kind === 'submissions' && 'attemptId' in input ? ['attemptId'] : [])];
  const value = homeObject(input, ['kind', ...keys]);
  for (const key of keys) {
    if (key.endsWith('Id')) homeId(value[key]);
    else if (key === 'date') homeDate(value[key]);
    else if (key === 'section') homeEnum(value[key], ['plan', 'library', 'progress', 'wall']);
    else if (key === 'filter') homeEnum(value[key], ['unpublished']);
    else if (key === 'mode') homeEnum(value[key], ['respond']);
  }
  return { ...value } as HomeTarget;
}
