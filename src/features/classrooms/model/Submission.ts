export interface SubmissionFileMetadata {
  name: string;
  size: string;
  type: string;
}

// Actual contents are held only for this in-memory prototype session.
export interface SubmissionAttachment extends SubmissionFileMetadata {
  file: File;
}

export interface Submission {
  studentId: number;
  name: string;
  email?: string;
  status: 'missing' | 'submitted' | 'graded';
  grade: number | null;
  date: string | null;
  dua: string[];
  content: string | null;
  // First-file projection for existing single-file consumers; not a durable upload.
  attachedFile?: SubmissionFileMetadata;
  attachments?: SubmissionAttachment[];
  studentNote?: string;
  feedback?: string;
  rubricBreakdown?: { criteria: string; max: number; earned: number; notes?: string }[];
}

export interface SubmissionDelivery {
  attachments?: SubmissionAttachment[];
  // Legacy display-only input; new deliveries use attachments with File contents.
  attachedFile?: Submission['attachedFile'];
  text?: string;
}

export interface SubmissionRepository {
  read(): Submission[];
  replace(submissions: Submission[]): void;
}
