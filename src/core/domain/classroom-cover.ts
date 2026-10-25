export const CLASSROOM_COVER_KEYS = ['explore', 'create', 'discover', 'literature', 'math', 'biology', 'society', 'science', 'creative', 'general'] as const;
export type ClassroomCoverKey = typeof CLASSROOM_COVER_KEYS[number];
export type ClassroomCoverAsset = Exclude<ClassroomCoverKey, 'explore' | 'create' | 'discover'>;
export function isClassroomCoverKey(value: unknown): value is ClassroomCoverKey {
  return typeof value === 'string' && CLASSROOM_COVER_KEYS.some(key => key === value);
}
export function classroomCoverAsset(key: string): ClassroomCoverAsset {
  if (key === 'explore') return 'general';
  if (key === 'create') return 'creative';
  if (key === 'discover') return 'science';
  return isClassroomCoverKey(key) ? key as ClassroomCoverAsset : 'general';
}
