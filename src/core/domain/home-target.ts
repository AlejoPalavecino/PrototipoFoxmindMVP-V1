import type { HomeTarget } from './home.ts';
import { homeObject, homeId, homeDate, homeEnum, homeInvalid } from './home-values.ts';
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
  const value = homeObject(input, ['kind', ...fields[kind]]);
  for (const key of fields[kind]) {
    if (key.endsWith('Id')) homeId(value[key]);
    else if (key === 'date') homeDate(value[key]);
    else if (key === 'section') homeEnum(value[key], ['plan']);
    else if (key === 'filter') homeEnum(value[key], ['unpublished']);
  }
  return { ...value } as HomeTarget;
}
