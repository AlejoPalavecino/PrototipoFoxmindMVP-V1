import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
export type Transaction = SqlTransaction;
export interface Actor {
  id: string;
  email: string;
  email_normalized: string;
  account_role: 'teacher' | 'student';
  first_name: string;
  last_name: string;
  now: Date;
}
export interface ClassroomRow {
  id: string;
  teacher_id: string;
  ai_grading_enabled?: boolean;
  ai_grading_epoch?: bigint;
  name: string;
  subject: string;
  division: string;
  academic_year: number;
  timezone: string;
  cover_key: string;
  archived_at: Date | null;
  updated_at: Date;
  teacher_name?: string;
}
