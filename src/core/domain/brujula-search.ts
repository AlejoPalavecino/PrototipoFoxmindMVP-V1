import type { HomeTarget } from './home.ts';
import { parseHomeTarget } from './home-target.ts';
import { homeObject, homeId, homeString, homeEnum, homeInvalid } from './home-values.ts';

export interface BrujulaSearchQuery { q: string; cursor: string | null }
export type BrujulaSearchTarget = Extract<HomeTarget, { kind: 'classroom' | 'material' | 'activity' }>;
export interface BrujulaSearchItem {
  id: string; kind: 'classroom' | 'topic' | 'material' | 'activity'; title: string;
  classroomId: string; classroomName: string; division: string; target: BrujulaSearchTarget;
}
export interface BrujulaSearchPage { items: BrujulaSearchItem[]; nextCursor: string | null }
export type BrujulaSearchClient = (query: string, cursor: string | null, signal: AbortSignal) => Promise<BrujulaSearchPage>;

export function parseBrujulaSearchQuery(input: unknown): BrujulaSearchQuery {
  let value: Record<string, unknown>;
  if (input instanceof URLSearchParams) {
    const entries = [...input.entries()];
    if (new Set(entries.map(([key]) => key)).size !== entries.length) return homeInvalid();
    value = Object.fromEntries(entries);
  } else if (input && typeof input === 'object' && !Array.isArray(input)) value = input as Record<string, unknown>;
  else return homeInvalid();
  if (Object.keys(value).some(key => !['q', 'cursor'].includes(key))) return homeInvalid();
  const raw = value.q ?? '';
  if (typeof raw !== 'string' || raw.length > 120 || /[\u0000-\u001f\u007f]/u.test(raw)) return homeInvalid();
  const cursor = value.cursor ?? null;
  if (cursor !== null && (typeof cursor !== 'string' || cursor.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cursor))) return homeInvalid();
  return { q: raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(), cursor };
}

export function parseBrujulaSearchPage(input: unknown): BrujulaSearchPage {
  const value = homeObject(input, ['items', 'nextCursor']);
  if (!Array.isArray(value.items) || value.items.length > 12) return homeInvalid();
  const items = value.items.map(raw => {
    const row = homeObject(raw, ['id', 'kind', 'title', 'classroomId', 'classroomName', 'division', 'target']);
    const id = homeId(row.id), classroomId = homeId(row.classroomId);
    const kind = homeEnum(row.kind, ['classroom', 'topic', 'material', 'activity'] as const);
    const target = parseHomeTarget(row.target);
    if (!('classroomId' in target) || target.classroomId !== classroomId) return homeInvalid();
    if (kind === 'classroom' || kind === 'topic') {
      if (target.kind !== 'classroom' || target.section !== 'plan' || (kind === 'topic' ? target.topicId !== id : id !== classroomId || target.topicId !== undefined)) return homeInvalid();
    } else if (kind === 'material' ? target.kind !== 'material' || target.materialId !== id : target.kind !== 'activity' || target.activityId !== id) return homeInvalid();
    return { id, kind, classroomId, title: homeString(row.title, 200), classroomName: homeString(row.classroomName, 120), division: homeString(row.division, 60), target: target as BrujulaSearchTarget };
  });
  const query = parseBrujulaSearchQuery({ cursor: value.nextCursor });
  return { items, nextCursor: query.cursor };
}

/** Construct only admitted product destinations; callers never accept arbitrary result URLs. */
export function brujulaSearchHref(target: BrujulaSearchTarget): string {
  const { classroomId, kind, ...fields } = target;
  return `/mis-aulas?${new URLSearchParams({ aula: classroomId, destino: kind, ...fields })}`;
}

export function brujulaSearchDestination(href: string): BrujulaSearchTarget | null {
  if (!href.startsWith('/mis-aulas?aula=') || href.length > 350) return null;
  const entries = [...new URLSearchParams(href.slice('/mis-aulas?'.length)).entries()];
  if (new Set(entries.map(([key]) => key)).size !== entries.length) return null;
  const { aula, destino, ...fields } = Object.fromEntries(entries);
  try {
    const target = parseHomeTarget({ kind: destino, classroomId: aula, ...fields });
    if (!['classroom', 'material', 'activity'].includes(target.kind)) return null;
    const typed = target as BrujulaSearchTarget;
    return brujulaSearchHref(typed) === href ? typed : null;
  } catch { return null; }
}
