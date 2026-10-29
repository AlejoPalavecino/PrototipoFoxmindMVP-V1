import type { Classroom } from './api.ts';

export type ClassroomFilter = 'all' | 'study' | 'teach';
export interface ClassroomFilterOptions {
  state?: 'all' | 'active' | 'archived';
  academicYear?: string;
  division?: string;
}

function normalized(value: string): string {
  return value.normalize('NFKC').toLowerCase().trim();
}

/** Map replacement preserves the first position while the teacher DTO wins duplicates. */
export function filterClassroomCards(teach: Classroom[], study: Classroom[], filter: ClassroomFilter,
  search: string, options: ClassroomFilterOptions = {}): Classroom[] {
  const rooms = new Map<string, Classroom>();
  for (const room of study) if (!rooms.has(room.id)) rooms.set(room.id, room);
  for (const room of teach) rooms.set(room.id, room);
  const query = normalized(search);
  return [...rooms.values()].filter(room =>
    (filter === 'all' || room.role === (filter === 'teach' ? 'teacher' : 'student')) &&
    normalized(`${room.name} ${room.subject} ${room.division} ${room.teacher}`).includes(query) &&
    (!options.state || options.state === 'all' || room.archived === (options.state === 'archived')) &&
    (!options.academicYear || String(room.academicYear) === options.academicYear) &&
    (!options.division || room.division === options.division));
}
