export interface TeacherWritingSource {
  activityId: string;
  attemptId: string;
  title: string;
}

export interface TeacherWritingFinding {
  text: string;
  sources: TeacherWritingSource[];
}

export interface TeacherWritingReport {
  strengths: TeacherWritingFinding[];
  improvements: TeacherWritingFinding[];
  nextStep: TeacherWritingFinding | null;
}

export interface TeacherWritingAnalysis {
  state: 'DISABLED' | 'INSUFFICIENT' | 'AVAILABLE' | 'RUNNING' | 'READY' | 'STALE' | 'FAILED';
  report: TeacherWritingReport | null;
  error: string | null;
  generatedAt: string | null;
}
