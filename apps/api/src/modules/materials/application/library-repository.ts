import type { Transaction } from '../../classrooms/public.ts';
export interface LibraryRepository {
readActivityMaterials01<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readMaterialRevisions02<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readMaterialRevisions03<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateMaterials04<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
insertMaterialRevisions05<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateMaterials06<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readMaterialRevisions07<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateMaterials08<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateMaterials09<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readMaterialRevisions10<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readActivityMaterials11<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateMaterials12<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readMaterials13<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readUnits14<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readTopics15<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
}
