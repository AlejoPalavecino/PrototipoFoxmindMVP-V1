import type { Transaction } from './contracts.ts';
export interface InvitationsRepository {
declineInvitation<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateInvitations01<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readInvitations02<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readInvitations03<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readInvitations04<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readClassrooms05<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readInvitations06<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateInvitations07<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
}
