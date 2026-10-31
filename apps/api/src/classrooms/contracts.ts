import type { SqlDatabase, SqlTransaction } from '../../../../src/core/domain/sql.ts';
import type { FileStore } from '../files/public/index.ts';
import type { DiagnosticSink } from '../../../../src/core/domain/diagnostics.ts';
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
export interface ClassroomPorts {
  diagnostics?: DiagnosticSink;
  gradingAiAvailable?: boolean;
  studentAiEnabled?: boolean;
  validateActivityGeneration?(tx: Transaction, request: unknown, activityId: string): Promise<void>;
  database: SqlDatabase;
  // Actual P3 session validator; repeatable under user lock, Origin/CSRF on mutation.
  authenticate(
    tx: Transaction,
    request: unknown,
    write: boolean,
  ): Promise<string>;
  files: FileStore;
  classroomQuotaBytes: bigint;
  signingKey: Buffer;
  deliveryKey: Buffer;
  webOrigin: string;
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
