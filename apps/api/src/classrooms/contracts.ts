import type { FileDatabase, FileTransaction } from '../files/contracts.ts';
import type { FileStore } from '../files/store.ts';
export type Transaction = FileTransaction;
export interface Actor {
  id: string;
  email: string;
  email_normalized: string;
  first_name: string;
  last_name: string;
  now: Date;
}
export interface ClassroomPorts {
  database: FileDatabase;
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
