import type { Transaction } from '../../classrooms/public.ts';
export interface WallRepository {
readWallPosts01<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
insertWallPosts02<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
insertWallReplies03<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateWallPosts04<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateNotifications05<T = Record<string, unknown>>(tx: Transaction, fragment0: unknown, ...values: unknown[]): Promise<T[]>;
updateNotifications06<T = Record<string, unknown>>(tx: Transaction, fragment0: unknown, fragment1: unknown, ...values: unknown[]): Promise<T[]>;
readNotifications07<T = Record<string, unknown>>(tx: Transaction, fragment0: unknown, ...values: unknown[]): Promise<T[]>;
insertNotifications08<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readNotifications09<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateOF10<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateOF11<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateOF12<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateNotifications13<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
}
