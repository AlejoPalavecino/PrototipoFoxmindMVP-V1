import type { Transaction } from './contracts.ts';
export interface MembershipsRepository {
readEnrollments01<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
insertEnrollments02<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readMembershipPeriods03<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
insertMembershipPeriods04<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
insertBackgroundJobs05<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateClassrooms06<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readEnrollments07<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readAttempts08<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
}
