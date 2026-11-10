import type { HomeModuleName, HomeRoom, HomeModules } from './home.ts';
import { parseHomeTarget } from './target.ts';
import { homeObject, homeId, homeString, homeZone, homeBool, homeEnum, homeInstant, homeCount, homeDate, homeInvalid, homeCursor } from './values.ts';
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
  materials: ['publishedAt', 'extension'], classrooms: [], drafts: ['activityType', 'updatedAt'], submitted: ['activityType', 'attemptNumber', 'submittedAt'],
};
function validateDetails(module: HomeModuleName, value: Record<string, unknown>): void {
  if (['pending', 'review', 'feedback', 'drafts', 'submitted'].includes(module)) homeEnum(value.activityType, ['ASSIGNMENT', 'QUESTIONNAIRE', 'EVALUATION']);
  if (module === 'pending') {
    homeEnum(value.state, ['first-submission', 'resubmission']);
    if (value.attemptId !== null) homeId(value.attemptId);
    if (value.deadlineAt !== null) homeInstant(value.deadlineAt);
    homeEnum(value.reception, ['open', 'closed']); homeBool(value.late);
    if(Object.hasOwn(value,'questionProgress')&&value.questionProgress!==null){const progress=homeObject(value.questionProgress,['answered','total']);if(homeCount(progress.answered)>homeCount(progress.total))homeInvalid();}
  }
  if (module === 'review') { homeCount(value.needsReview); homeCount(value.readyToPublish); homeInstant(value.oldestSubmittedAt); }
  if (module === 'feedback') {
    if (homeCount(value.attemptNumber) < 1) homeInvalid();
    if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(homeString(value.finalGrade, 40))) homeInvalid();
    homeInstant(value.publishedAt); homeInstant(value.changedAt); homeEnum(value.availability, ['available']);
    if(Object.hasOwn(value,'overallFeedback')&&value.overallFeedback!==null&&(typeof value.overallFeedback!=='string'||[...value.overallFeedback].length>5000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value.overallFeedback)))homeInvalid();
  }
  if (module === 'agenda') {
    homeEnum(value.source, ['PRIVATE_EVENT', 'ACADEMIC_DEADLINE']); homeDate(value.date);
    if (value.startAt !== null) homeInstant(value.startAt);
    homeZone(value.timeZone); homeBool(value.allDay);
  }
  if (module === 'drafts') { homeInstant(value.updatedAt); }
  if (module === 'submitted') { if (homeCount(value.attemptNumber) < 1) homeInvalid(); homeInstant(value.submittedAt); }
  if (module === 'queries') homeInstant(value.updatedAt);
  if (module === 'materials') { homeInstant(value.publishedAt); homeString(value.extension, 30); }
}
function row(module: HomeModuleName, input: unknown): unknown {
  const hasNext = module === 'classrooms' && !!input && typeof input === 'object' && 'nextTopic' in input;
  const hasProgress = module === 'classrooms' && !!input && typeof input === 'object' && 'planProgress' in input;
  const hasAttempt = module === 'review' && !!input && typeof input === 'object' && 'studentName' in input;
  const optionalFields=module==='pending'?['questionProgress']:module==='feedback'?['overallFeedback']:[];
  const optional=optionalFields.filter(key=>!!input&&typeof input==='object'&&Object.hasOwn(input,key));
  const value = homeObject(input, ['id', 'title', 'target', 'classroom', ...extras[module],...optional, ...(hasNext ? ['nextTopic'] : []), ...(hasProgress ? ['planProgress'] : []), ...(hasAttempt ? ['studentName', 'attemptNumber'] : [])]);
  homeId(value.id); homeString(value.title); parseHomeTarget(value.target);
  const classroom = module === 'agenda' && value.classroom === null ? null : room(value.classroom);
  validateDetails(module, value);
  if (hasAttempt) { homeString(value.studentName); if (homeCount(value.attemptNumber) < 1) return homeInvalid(); }
  if (hasProgress) {
    const progress = homeObject(value.planProgress, ['taught', 'total']);
    if (!classroom || classroom.archived || homeCount(progress.taught) > homeCount(progress.total)) return homeInvalid();
  }
  if (hasNext && value.nextTopic !== null) {
    const next = homeObject(value.nextTopic, ['unitId', 'unitName', 'topicId', 'topicName']);
    homeId(next.unitId); homeId(next.topicId); homeString(next.unitName); homeString(next.topicName);
    if (classroom?.archived) return homeInvalid();
  }
  if (module === 'drafts' && (classroom?.role !== 'teacher' || classroom.archived)) return homeInvalid();
  if (module === 'submitted' && (classroom?.role !== 'student' || classroom.archived)) return homeInvalid();
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
  const hasPreview=module==='agenda' && 'preview' in input;
  const value = homeObject(input, ['status', 'items', 'totalItems', 'nextCursor', ...(hasTotals ? ['totals'] : []),...(hasPreview?['preview']:[])]);
  if (!Array.isArray(value.items) || value.items.length > (module === 'agenda' ? 3 : 5)) return homeInvalid();
  const items = value.items.map(item => row(module, item)); homeCursor(value.nextCursor);
  if (value.totalItems !== null && homeCount(value.totalItems) < items.length) return homeInvalid();
  if (hasTotals) {
    const totals = homeObject(value.totals, ['attempts', 'needsReview', 'readyToPublish']);
    if (homeCount(totals.attempts) !== homeCount(totals.needsReview) + homeCount(totals.readyToPublish)) return homeInvalid();
  }
  if(hasPreview){
    const preview=homeObject(value.preview,['personal','deadline']);
    if(!Array.isArray(preview.personal)||preview.personal.length>2)return homeInvalid();
    for(const item of preview.personal){row('agenda',item);if(item.source!=='PRIVATE_EVENT')return homeInvalid();}
    if(preview.deadline!==null){row('agenda',preview.deadline);if((preview.deadline as {source:string}).source!=='ACADEMIC_DEADLINE')return homeInvalid();}
  }
  return { ...value, items } as unknown as HomeModules[M];
}
