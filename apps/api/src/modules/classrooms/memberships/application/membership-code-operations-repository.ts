import type { Transaction } from '../../access/public.ts';

export interface MembershipCodeRepository {
  findLiveCode(tx: Transaction, input: { digest: string }): Promise<{
        id: string;
        classroom_id: string;
        code_digest: string;
      }[]>;
  readPreviewTime(tx: Transaction, input: {  }): Promise<{ now: Date }[]>;
  lockPreviewClassroom(tx: Transaction, input: { classroomId: string }): Promise<{
        name: string;
        subject: string;
        division: string;
        academic_year: number;
        cover_key?: string;
        teacher: string;
        teacher_id: string;
        archived_at: Date | null;
      }[]>;
  findPreviewEnrollment(tx: Transaction, input: { classroomId: string; actorId: string }): Promise<{ id: string }[]>;
  findUnrevokedCode(tx: Transaction, input: { codeId: string }): Promise<{ id: string }[]>;
  lockConfirmationClassroom(tx: Transaction, input: { classroomId: string }): Promise<{
        teacher_id: string;
        archived_at: Date | null;
      }[]>;
  findConfirmationCode(tx: Transaction, input: { codeId: string; classroomId: string; digest: string }): Promise<{ id: string }[]>;
  findConfirmationEnrollment(tx: Transaction, input: { classroomId: string; actorId: string }): Promise<{ id: string }[]>;
  readConfirmationTime(tx: Transaction, input: {  }): Promise<{ now: Date }[]>;
}
