import type { Transaction } from '../contracts.ts';
import { reserve as sharedReserve, settle as sharedSettle } from '../ai/budget.ts';
import type { ActivityAiOptions, JobRow } from './contracts.ts';
type Configuration = ActivityAiOptions['configuration'];
export function reserve(tx: Transaction, row: JobRow, count: number, config: Configuration) {
  return sharedReserve(tx, row, count, config, 'activity_ai_generations');
}
export function settle(tx: Transaction, row: JobRow, config: Configuration,
  usage?: { inputTokens: number | null; outputTokens: number | null }) {
  return sharedSettle(tx, row, config, usage, 'activity_ai_generations');
}
