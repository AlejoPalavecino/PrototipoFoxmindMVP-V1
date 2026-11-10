import type { Transaction } from './contracts.ts';
export interface DraftsRepository {
readClassroomDrafts01<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
insertClassroomDrafts02<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readClassroomDrafts03<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateClassroomDrafts04<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateClassroomDrafts05<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
}
