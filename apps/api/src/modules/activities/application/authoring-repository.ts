import type { Transaction } from '../../classrooms/public.ts';
/** SQL operations execute in the transaction held by the authoring use case. */
export interface AuthoringRepository {
readActivities01<T = Record<string, unknown>>(tx: Transaction, fragment0: unknown, ...values: unknown[]): Promise<T[]>;
readActivities02<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readAttempts03<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readStudentActivities04<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
insertActivities05<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateActivities06<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateActivities07<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateActivities08<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateActivities09<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
updateActivities10<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readMaterials11<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readQuestions12<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readQuestionOptions13<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readActivityInstructionFiles14<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
readActivityMaterials15<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]>;
}
