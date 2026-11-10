type ActivityEvent = 'ACTIVITY_PUBLISHED' | 'ACTIVITY_DEADLINE_CHANGED' | 'FIRST_SUBMISSION_ENABLED' | 'ATTEMPT_REOPENED' | 'SUBMISSION_RECEIVED';
export interface AcademicNotification {
  id: string; classroomId: string; classroomName: string; eventType: ActivityEvent;
  activityId: string; activityTitle: string; attemptId: string | null; createdAt: Date; readAt: Date | null;
}


export function academicTarget(row: AcademicNotification) {
  return { kind: row.eventType === 'SUBMISSION_RECEIVED' ? 'submission' as const : row.attemptId ? 'attempt' as const : 'activity' as const,
    classroomId: row.classroomId, activityId: row.activityId, attemptId: row.attemptId };
}

export interface GradeNotification {
  id: string; classroomId: string; classroomName: string; eventType: 'GRADE_PUBLISHED' | 'GRADE_CORRECTED';
  activityId: string; activityTitle: string; attemptId: string; gradeId: string; createdAt: Date; readAt: Date | null;
}


export function gradeTarget(row: GradeNotification) {
  return { kind: 'grade' as const, classroomId: row.classroomId, activityId: row.activityId, attemptId: row.attemptId, gradeId: row.gradeId };
}
