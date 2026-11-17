import type { Transaction } from '../../access/public.ts';

export interface SettingsRepository {
  updateSettings(tx: Transaction, input: { classroomId: string; name: string|undefined; subject: string|undefined; division: string|undefined; academicYear: number|undefined; aiGradingEnabled: boolean|null; coverKey: string|null }): Promise<{ id: string }[]>;
}
