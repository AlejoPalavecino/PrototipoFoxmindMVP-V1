import type { FilePurpose } from './policy.ts';
export type FileScope = { kind: 'classroom' | 'draft'; id: string };
export type FileAction = 'upload' | 'read' | 'status' | 'usage';
export interface FileTarget { scope: FileScope; purpose: FilePurpose; targetId: string | null; fileId?: string }
export interface FileTransaction {
  query<T = Record<string, unknown>>(sql: string, ...values: unknown[]): Promise<T[]>;
}
/** Required trusted adapters, supplied by the integrating application. There is no allow-by-default adapter. */
export interface FileAccess {
  // Must enforce the actual session and Origin/CSRF for writes. Repeatable, with no admission-counter side effects.
  // The integrating application's admission middleware accounts once per HTTP request before this handler.
  // Called again after the user lock; revocation must serialize with that same user lock.
  authenticate(tx: FileTransaction, request: unknown, action: FileAction): Promise<string>;
  // Must resolve target/record permission and current attempt eligibility/editor/deadline where applicable.
  // Called under user -> scope locks, including at finalization after external I/O.
  authorize(tx: FileTransaction, userId: string, target: FileTarget, action: FileAction, request: unknown): Promise<void>;
}
export interface FileDatabase {
  $transaction<T>(operation: (tx: { $queryRawUnsafe<T>(sql: string, ...values: any[]): Promise<T> }) => Promise<T>,
    options: { maxWait: number; timeout: number }): Promise<T>;
}
