import type { Transaction } from '../../access/public.ts';

export interface MembershipLifecycleRepository {
  lockActivePeriod(tx: Transaction, input: { classroomId: string; studentId: string }): Promise<{ id: string; enrollment_id: string }[]>;
  endPeriod(tx: Transaction, input: { periodId: string; reason: 'REMOVED'|'LEFT'; actorId: string }): Promise<{ id: string }[]>;
  listMembers(tx: Transaction, input: { classroomId: string }): Promise<{
        enrollment_id: string;
        student_id: string;
        first_name: string;
        last_name: string;
        email: string;
        active: boolean;
      }[]>;
  revokePendingInvitations(tx: Transaction, input: { classroomId: string; studentId: string }): Promise<{ id: string }[]>;
  listPeriods(tx: Transaction, input: { classroomId: string }): Promise<{
        enrollment_id: string;
        joinedAt: Date;
        endedAt: Date | null;
        endReason: string | null;
      }[]>;
}
