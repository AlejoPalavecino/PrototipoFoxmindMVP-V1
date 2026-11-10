import { strictObject } from '../../../../../../src/core/domain/index.ts';
export const catalogUuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu;
export function invalidCatalog(): never { throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' }); }
export function catalogFilters(input: { q?: unknown; context?: unknown }) {
  const q = input.q ?? '', context = input.context ?? 'ALL';
  if (typeof q !== 'string' || [...q].length > 120 || /[\u0000-\u001f\u007f]/u.test(q)
    || typeof context !== 'string' || (context !== 'ALL' && context !== 'GENERAL' && !catalogUuid.test(context))) return invalidCatalog();
  return { q, context: context === 'ALL' || context === 'GENERAL' ? context : context.toLowerCase() };
}
export function catalogCursor(value: unknown): { createdAt: string; id: string } | null {
  if (value === null || value === undefined) return null;
  const v = strictObject(value, ['createdAt', 'id']);
  if (typeof v.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(v.createdAt)
    || !Number.isFinite(Date.parse(v.createdAt)) || new Date(v.createdAt).toISOString() !== v.createdAt
    || typeof v.id !== 'string' || !catalogUuid.test(v.id)) return invalidCatalog();
  return { createdAt: v.createdAt, id: v.id };
}
export type CreationKind = 'NOTE' | 'PLAN' | 'ACTIVITY' | 'RUBRIC' | 'DIAGRAM' | 'IMAGE';
export type CreationStatus = 'PRIVATE' | 'PREPARING' | 'DRAFT' | 'PUBLISHED';
export type CreationPageOptions = { limit: number; after: { createdAt: string; id: string } | null; q?: string; context?: string; type?: string; status?: string };
export function creationOptions(value: unknown): CreationPageOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalidCatalog();
  const allowed = ['limit','after','q','context','type','status'];
  if (Object.keys(value).some(key => !allowed.includes(key))) return invalidCatalog();
  const v = value as Record<string, unknown>, filters = catalogFilters(v);
  if (!Number.isSafeInteger(v.limit) || (v.limit as number) < 1 || (v.limit as number) > 50) return invalidCatalog();
  const type = v.type ?? 'ALL', status = v.status ?? 'ALL';
  if (typeof type !== 'string' || !['ALL','NOTE','PLAN','ACTIVITY','RUBRIC','DIAGRAM','IMAGE'].includes(type)
    || typeof status !== 'string' || !['ALL','PRIVATE','PREPARING','DRAFT','PUBLISHED'].includes(status)) return invalidCatalog();
  return { limit: v.limit as number, after: catalogCursor(v.after), ...filters, type, status };
}
