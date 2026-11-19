import type { SqlDatabase, SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { FileCustodyPort, FilePromotionPort } from '../../../files/public.ts';
import type { DiagnosticSink } from '../../../../../../../src/core/contracts/diagnostics.ts';
import type { Transaction } from './contracts.ts';
export type { Transaction, Actor, ClassroomRow } from './contracts.ts';
export interface ClassroomPorts {
  diagnostics?: DiagnosticSink;
  validateMailbox(input: unknown): string;
  gradingAiAvailable?: boolean;
  studentAiEnabled?: boolean;
  teacherWritingEnabled?: boolean;
  validateActivityGeneration?(tx: Transaction, request: unknown, activityId: string): Promise<void>;
  database: SqlDatabase;
  // Actual P3 session validator; repeatable under user lock, Origin/CSRF on mutation.
  authenticate(
    tx: Transaction,
    request: unknown,
    write: boolean,
  ): Promise<string>;
  files: Pick<FileCustodyPort, 'load' | 'loadAuthorized'> & Pick<FilePromotionPort, 'promoteDraftPlanInTransaction'>;
  classroomQuotaBytes: bigint;
  signingKey: Buffer;
  deliveryKey: Buffer;
  webOrigin: string;
}
