import { invalidInput } from '../curriculum/plan.ts';
import type { ActivityGenerationCounts, ActivityGenerationType, ActivityGenerationWarning } from './activity-generation.ts';

export function activityText(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || [...value].length > max || (required && !value.trim())
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)) return invalidInput();
  return value;
}
export function activityUuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(value)) return invalidInput();
  return value;
}
export function activityRevision(value: unknown): string {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/u.test(value) || value.length > 19
    || BigInt(value) > 9223372036854775807n) return invalidInput();
  return value;
}
export function activityInteger(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) return invalidInput();
  return value;
}
export function activityType(value: unknown): ActivityGenerationType {
  if (value !== 'ASSIGNMENT' && value !== 'QUESTIONNAIRE' && value !== 'EVALUATION') return invalidInput();
  return value;
}
export function activityList<T>(value: unknown, min: number, max: number, parse: (v: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) return invalidInput();
  const result = value.map(parse);
  if (new Set(result).size !== result.length) return invalidInput();
  return result;
}
export function activityWarnings(value: unknown): ActivityGenerationWarning[] {
  return activityList(value, 0, 3, v => {
    if (!['DOCX_IMAGES_OMITTED', 'GROUNDING_REQUIRES_REVIEW', 'PARTIAL_CONTENT'].includes(String(v))) return invalidInput();
    return v as ActivityGenerationWarning;
  });
}
export function checkActivityCounts(counts: ActivityGenerationCounts, type: ActivityGenerationType): void {
  const total = counts.development + counts.singleChoice + counts.multipleChoice;
  if (type === 'ASSIGNMENT' ? counts.assignment < 1 || counts.assignment > 20 || total !== 0
    : counts.assignment !== 0 || total < 1 || total > 30) return invalidInput();
}
