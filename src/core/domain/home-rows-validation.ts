import type { HomeModuleName, HomeRoom, HomeModules } from './home.ts';
import { parseHomeTarget } from './home-target.ts';
import { homeObject, homeId, homeString, homeZone, homeBool, homeEnum, homeInstant, homeCount, homeDate, homeInvalid, homeCursor } from './home-values.ts';
function room(input: unknown): HomeRoom {
  const value = homeObject(input, ['id', 'name', 'division', 'subject', 'role', 'coverKey', 'archived', 'timeZone']);
  homeId(value.id); homeString(value.name); homeString(value.division); homeString(value.subject);
  homeEnum(value.role, ['teacher', 'student']); homeString(value.coverKey, 100); homeBool(value.archived); homeZone(value.timeZone);
  return { ...value } as unknown as HomeRoom;
}
const extras: Record<HomeModuleName, string[]> = {
  pending: ['activityType', 'state', 'attemptId', 'deadlineAt', 'reception', 'late'],
  review: ['activityType', 'needsReview', 'readyToPublish', 'oldestSubmittedAt'],
  feedback: ['activityType', 'attemptNumber', 'finalGrade', 'publishedAt', 'changedAt', 'availability'],
  agenda: ['source', 'startAt', 'date', 'timeZone', 'allDay'], queries: ['updatedAt'],
  materials: ['publishedAt', 'extension'], classrooms: [],
};
function validateDetails(module: HomeModuleName, value: Record<string, unknown>): void {
  if (['pending', 'review', 'feedback'].includes(module)) homeEnum(value.activityType, ['ASSIGNMENT', 'QUESTIONNAIRE', 'EVALUATION']);
  if (module === 'pending') {
    homeEnum(value.state, ['first-submission', 'resubmission']);
    if (value.attemptId !== null) homeId(value.attemptId);
    if (value.deadlineAt !== null) homeInstant(value.deadlineAt);
    homeEnum(value.reception, ['open', 'closed']); homeBool(value.late);
  }
  if (module === 'review') { homeCount(value.needsReview); homeCount(value.readyToPublish); homeInstant(value.oldestSubmittedAt); }
  if (module === 'feedback') {
    if (homeCount(value.attemptNumber) < 1) homeInvalid();
    if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(homeString(value.finalGrade, 40))) homeInvalid();
    homeInstant(value.publishedAt); homeInstant(value.changedAt); homeEnum(value.availability, ['available']);
  }
  if (module === 'agenda') {
    homeEnum(value.source, ['PRIVATE_EVENT', 'ACADEMIC_DEADLINE']); homeDate(value.date);
    if (value.startAt !== null) homeInstant(value.startAt);
    homeZone(value.timeZone); homeBool(value.allDay);
  }
  if (module === 'queries') homeInstant(value.updatedAt);
  if (module === 'materials') { homeInstant(value.publishedAt); homeString(value.extension, 30); }
}
function row(module: HomeModuleName, input: unknown): unknown {
  const value = homeObject(input, ['id', 'title', 'target', 'classroom', ...extras[module]]);
  homeId(value.id); homeString(value.title); parseHomeTarget(value.target);
  if (module !== 'agenda' || value.classroom !== null) room(value.classroom);
  validateDetails(module, value);
  return { ...value };
}
export function parseHomePage<M extends HomeModuleName>(module: M, input: unknown): HomeModules[M] {
  if (!input || typeof input !== 'object' || !('status' in input)) return homeInvalid();
  if (input.status === 'not-applicable') return homeObject(input, ['status']) as unknown as HomeModules[M];
  if (input.status === 'error') {
    const value = homeObject(input, ['status', 'code', 'retryable']);
    if (value.code !== 'SERVICE_UNAVAILABLE' || value.retryable !== true) return homeInvalid();
    return { ...value } as unknown as HomeModules[M];
  }
  if (input.status !== 'ready') return homeInvalid();
  const hasTotals = module === 'review' && 'totals' in input;
  const value = homeObject(input, ['status', 'items', 'totalItems', 'nextCursor', ...(hasTotals ? ['totals'] : [])]);
  if (!Array.isArray(value.items) || value.items.length > (module === 'agenda' ? 3 : 5)) return homeInvalid();
  const items = value.items.map(item => row(module, item)); homeCursor(value.nextCursor);
  if (value.totalItems !== null && homeCount(value.totalItems) < items.length) return homeInvalid();
  if (hasTotals) {
    const totals = homeObject(value.totals, ['attempts', 'needsReview', 'readyToPublish']);
    if (homeCount(totals.attempts) !== homeCount(totals.needsReview) + homeCount(totals.readyToPublish)) return homeInvalid();
  }
  return { ...value, items } as unknown as HomeModules[M];
}
