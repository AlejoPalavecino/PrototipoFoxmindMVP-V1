// Reuse the existing application contract; no parallel classroom shape.
import type { Classroom } from '../../../types';
export type { Classroom } from '../../../types';

export type ClassroomEnrollment = Partial<Classroom> & Pick<Classroom, 'id' | 'subject' | 'course'>;

export interface ClassroomRepository {
  readCatalogue(): Classroom[];
  readMembership(): Classroom[];
  add(classroom: ClassroomEnrollment): Classroom;
  replaceMembership(classrooms: Classroom[]): void;
}
