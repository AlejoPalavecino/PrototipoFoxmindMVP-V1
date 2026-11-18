import { invalidInput, parseCurriculumUnits, strictObject } from './plan.ts';
import type { CurriculumUnit, ExtractedCurriculum } from './plan.ts';

export type ExtractionState = 'QUEUED' | 'RUNNING' | 'READY' | 'FAILED' | 'STALE' | 'APPLIED';
export type ExtractionError = 'FILE_NOT_READY' | 'AI_INPUT_LIMIT' | 'NO_STRUCTURE' | 'INVALID_AI_OUTPUT'
  | 'AI_UNAVAILABLE' | 'AI_RATE_LIMITED' | 'AI_BUDGET_EXCEEDED' | 'AI_GLOBAL_DAILY_BUDGET_EXCEEDED'
  | 'AI_MONTHLY_BUDGET_EXCEEDED' | 'AI_TIMEOUT' | 'PROVIDER_OUTCOME_UNKNOWN';
export interface StartExtraction { revision: string; planFileId: string }
export interface RetryExtraction { revision: string; requestId: string }
export interface ApplyExtraction extends RetryExtraction { units: CurriculumUnit[] }
export interface ExtractionView {
  id: string; draftId: string; planFileId: string; baseRevision: string;
  state: ExtractionState; proposal: ExtractedCurriculum | null; error: ExtractionError | null; retryable: boolean;
}
export type PlanDocument = { kind: 'pdf'; bytes: Uint8Array } | { kind: 'text'; text: string };
export interface StructuredExtractionPort {
  countStudyPlanTokens(input: { document: PlanDocument; schemaVersion: 'study-plan-v1'; signal: AbortSignal }): Promise<number>;
  extractStudyPlan(input: { document: PlanDocument; schemaVersion: 'study-plan-v1'; signal: AbortSignal }):
    Promise<{ json: unknown; inputTokens: number | null; outputTokens: number | null }>;
}
export interface ApprovedPlanReader {
  read(input: { ownerId: string; draftId: string; fileId: string; digest: string }, signal: AbortSignal): Promise<PlanDocument>;
}
function revision(value: unknown): string {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/u.test(value)
    || value.length > 19 || BigInt(value) > 9223372036854775807n) return invalidInput();
  return value;
}
function uuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(value)) return invalidInput();
  return value;
}
export function parseStartExtraction(value: unknown): StartExtraction {
  const source = strictObject(value, ['revision', 'planFileId']);
  return { revision: revision(source.revision), planFileId: uuid(source.planFileId) };
}
export function parseRetryExtraction(value: unknown): RetryExtraction {
  const source = strictObject(value, ['revision', 'requestId']);
  return { revision: revision(source.revision), requestId: uuid(source.requestId) };
}
export function parseApplyExtraction(value: unknown): ApplyExtraction {
  const source = strictObject(value, ['revision', 'requestId', 'units']);
  return { revision: revision(source.revision), requestId: uuid(source.requestId), units: parseCurriculumUnits(source.units) };
}
