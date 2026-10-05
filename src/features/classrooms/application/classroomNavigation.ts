import type { Classroom } from '../model/Classroom';
import type { Activity } from '../model/Activity';
import type { ClassroomNavigationParams } from '../model/ClassroomDetail';

export function resolveTeacherClassroom(classrooms: Classroom[], params?: ClassroomNavigationParams | null) {
  if (params?.openTask && params?.subject) {
    return classrooms.find(a => `${a.subject} ${a.course}` === params.subject);
  } else if (params?.openAulaId) {
    return classrooms.find(a => a.id === params.openAulaId);
  }
}

export function resolveTeacherActivity(activities: Activity[], taskTitle: string) {
  return activities.find(a => a.title === taskTitle) || activities[0];
}
