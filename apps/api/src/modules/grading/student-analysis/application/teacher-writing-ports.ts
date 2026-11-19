import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { WritingEvidence, WritingReference, WritingSource } from '../../../../../../../src/core/domain/grading/teacher-writing.ts';

export interface WritingMember {
  owner_id: string;
  classroom_id: string;
  student_id: string;
  enrollment_id: string;
  membership_period_id: string;
  timeZone: string;
}

export interface WritingJob extends Omit<WritingMember, 'timeZone'> {
  id: string;
  evidence_hash: string;
  state: 'QUEUED' | 'RUNNING' | 'READY' | 'FAILED' | 'STALE';
  dispatch_count: number;
  lease_nonce: string | null;
  execution_profile: unknown;
  error_code: string | null;
  report: unknown;
  generatedEpoch: bigint;
}

export type SourceAbout = { submittedAt: Date; grade: string | null; feedback: string | null };
export interface WritingSnapshot {
  hash: string;
  evidence: WritingEvidence;
  references: WritingReference[];
  sources: (WritingSource & SourceAbout)[];
}

export interface TeacherWritingRepository {
  member(tx: SqlTransaction, ownerId: string, classroomId: string, studentId: string): Promise<WritingMember | null>;
  snapshot(tx: SqlTransaction, member: WritingMember): Promise<WritingSnapshot | null>;
  current(tx: SqlTransaction, member: WritingMember, hash: string | null): Promise<WritingJob | null>;
  enqueue(tx: SqlTransaction, member: WritingMember, snapshot: WritingSnapshot): Promise<WritingJob | null>;
}
