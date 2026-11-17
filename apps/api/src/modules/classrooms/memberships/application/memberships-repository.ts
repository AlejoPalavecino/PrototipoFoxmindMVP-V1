import type { Transaction } from '../../access/public.ts';

export interface MembershipsRepository {
  lockEnrollment(tx: Transaction, input: { classroomId: string; studentId: string }): Promise<{ id: string }[]>;
  createEnrollment(tx: Transaction, input: { enrollmentId: string; classroomId: string; studentId: string }): Promise<{ id: string }[]>;
  findActivePeriod(tx: Transaction, input: { enrollmentId: string }): Promise<{ id: string }[]>;
  createPeriod(tx: Transaction, input: { periodId: string; enrollmentId: string; classroomId: string; entryMethod: 'INVITATION'|'CODE'; invitationId: string|null }): Promise<{ id: string }[]>;
  enqueueMembershipEvent(tx: Transaction, input: { jobId: string; payload: string; deduplicationKey: string }): Promise<{ id: string }[]>;
  setArchive(tx: Transaction, input: { classroomId: string; archived: boolean }): Promise<{ id: string }[]>;
  findStudent(tx: Transaction, input: { classroomId: string; studentId: string }): Promise<{ id: string; firstName: string; lastName: string }[]>;
  listSubmittedAttempts(tx: Transaction, input: { enrollmentId: string; classroomId: string }): Promise<{ id: string; activityId: string; title: string | null; submittedAt: Date; number: number; grade: string | null; published: boolean | null }[]>;
}
