export interface Submission {
  studentId: number;
  name: string;
  email?: string;
  status: 'missing' | 'submitted' | 'graded';
  grade: number | null;
  date: string | null;
  dua: string[];
  content: string | null;
  attachedFile?: { name: string; size: string; type: string };
  studentNote?: string;
  feedback?: string;
  rubricBreakdown?: { criteria: string; max: number; earned: number; notes?: string }[];
}

export interface SubmissionDelivery {
  attachedFile?: Submission['attachedFile'];
  text?: string;
}

export interface SubmissionRepository {
  read(): Submission[];
  replace(submissions: Submission[]): void;
}
