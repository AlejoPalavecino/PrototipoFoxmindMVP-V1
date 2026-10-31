import { invalidInput, strictObject } from './study-plan.ts';
import { activityInteger, activityUuid } from './activity-generation-values.ts';

export type FoxySourceKind = 'PLAN' | 'MATERIAL' | 'ACTIVITY';
export interface FoxySourceCursor { createdAt: string; id: string }
export interface FoxySourceQuery { kind: FoxySourceKind; limit: number; after: FoxySourceCursor | null }

function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return invalidInput();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) return invalidInput();
  return value;
}
function cursor(value: unknown): FoxySourceCursor | null {
  if (value === null) return null;
  const v = strictObject(value, ['createdAt', 'id']);
  return { createdAt: timestamp(v.createdAt), id: activityUuid(v.id) };
}
export function parseFoxySourceQuery(value: unknown): FoxySourceQuery {
  const v = strictObject(value, ['kind', 'limit', 'after']);
  if (v.kind !== 'PLAN' && v.kind !== 'MATERIAL' && v.kind !== 'ACTIVITY') return invalidInput();
  return { kind: v.kind, limit: activityInteger(v.limit, 1, 50), after: cursor(v.after) };
}
