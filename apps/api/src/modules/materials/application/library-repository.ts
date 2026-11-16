import type { Transaction } from '../../classrooms/public.ts';
export interface LibraryActivityLink { id: string; linked: boolean; status: string; first_started_at: Date | null }
export interface LibraryRepository {
activitiesForLinks(tx: Transaction, classroomId: string, materialId: string, activityIds: string[]): Promise<LibraryActivityLink[]>;
addActivityLinks(tx: Transaction, classroomId: string, materialId: string, activityIds: string[]): Promise<unknown>;
removeActivityLinks(tx: Transaction, classroomId: string, materialId: string, activityIds: string[]): Promise<unknown>;
updateDescription(tx: Transaction, id: string, description: string | null): Promise<unknown>;
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
