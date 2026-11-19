export type TeacherSupportPriority = 'high' | 'medium' | 'low' | 'insufficient';

export interface TeacherSupportEntry {
  classroomId: string;
  classroomName: string;
  timeZone: string;
  studentId: string;
  firstName: string;
  lastName: string;
  priority: TeacherSupportPriority;
  pending: { activityId: string; title: string; deadlineAt: string }[];
}

export interface TeacherSupportList {
  classrooms: { id: string; name: string; division: string; coverKey: string }[];
  counts: { high: number; medium: number; low: number };
  items: TeacherSupportEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TeacherSupportObservation {
  activityId: string;
  attemptId: string;
  title: string;
  strengths: string[];
  improvements: string[];
  nextStep: string | null;
  feedback: string | null;
}

export interface TeacherSupportRecord extends TeacherSupportEntry {
  sharedStrategies: { id: string; text: string }[];
  completion: { expected: number; delivered: number };
  performance: { average: string | null; graded: number };
  grades: { activityId: string; title: string; grade: string }[];
  observations: TeacherSupportObservation[];
  evaluatedAt: string;
}

export interface TeacherSupportEvidence {
  activityId: string;
  attemptId: string;
  title: string;
  instructions: string | null;
  timeZone: string;
  submittedAt: string;
  grade: string | null;
  feedback: string | null;
  texts: { prompt: string | null; text: string }[];
}
