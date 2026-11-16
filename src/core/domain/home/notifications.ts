import { contractObject } from '../classrooms/contract-values.ts';
export const NOTIFICATION_KINDS = ['all', 'activity', 'classroom', 'agenda'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
export interface NotificationPageQuery { cursor?: string; limit?: number; unread?: boolean; kind?: NotificationKind }
export const NOTIFICATION_ID_PATTERN = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
export const PROJECTED_NOTIFICATION_ID_PATTERN = `(?:invite-${NOTIFICATION_ID_PATTERN}-[1-9][0-9]{0,18}|(?:member|review)-${NOTIFICATION_ID_PATTERN}|event-${NOTIFICATION_ID_PATTERN}-[0-9]{4}-[0-9]{2}-[0-9]{2})`;
const projectionId = new RegExp(`^${PROJECTED_NOTIFICATION_ID_PATTERN}$`, 'i');
export function isProjectedNotificationId(id: string) { return projectionId.test(id); }
export interface NotificationBase { id: string; classroomId: string; classroomName: string; classroomDivision?:string;actorName?:string|null;message?:string|null;createdAt: string; readAt: string | null }
export type ClassroomNotification = NotificationBase & ({ eventType: 'WALL_NOTICE' | 'WALL_QUERY' | 'WALL_REPLY'; postId: string; replyId: string | null }
  | { eventType: 'ACTIVITY_PUBLISHED' | 'ACTIVITY_DEADLINE_CHANGED' | 'FIRST_SUBMISSION_ENABLED' | 'ATTEMPT_REOPENED' | 'SUBMISSION_RECEIVED'; activityId: string; activityTitle: string; attemptId: string | null }
  | { eventType: 'GRADE_PUBLISHED' | 'GRADE_CORRECTED'; activityId: string; activityTitle: string; attemptId: string; gradeId: string });
export type ProjectedNotification = Omit<NotificationBase, 'classroomId' | 'classroomName'> & {
  eventType: 'CLASSROOM_INVITATION' | 'CLASSROOM_JOINED' | 'AGENDA_REMINDER' | 'STUDY_REVIEW_REMINDER';
  classroomId?: string | null;
  classroomName?: string | null;
  title: string;
  startsAt?: string;
};
export type InboxNotification = ClassroomNotification | ProjectedNotification;
export interface NotificationPage { items: InboxNotification[]; nextCursor: string | null; unreadCount: number; totalCount?: number }
export function parseNotificationQuery(params: URLSearchParams): NotificationPageQuery {
  for (const key of params.keys()) if (!['cursor', 'limit', 'unread', 'kind'].includes(key) || params.getAll(key).length !== 1) throw new Error('INVALID_INPUT');
  const cursor = params.get('cursor'), limit = params.get('limit'), unread = params.get('unread'), kind = params.get('kind');
  if (cursor !== null && (!cursor || cursor.length > 2048)) throw new Error('INVALID_INPUT');
  if (limit !== null && (!/^[1-9][0-9]*$/.test(limit) || Number(limit) > 50)) throw new Error('INVALID_INPUT');
  if (unread !== null && unread !== 'true' && unread !== 'false') throw new Error('INVALID_INPUT');
  if (kind !== null && !NOTIFICATION_KINDS.some(value => value === kind)) throw new Error('INVALID_INPUT');
  return { ...(kind !== null ? { kind: kind as NotificationKind } : {}), ...(cursor !== null ? { cursor } : {}), ...(limit !== null ? { limit: Number(limit) } : {}),
    ...(unread !== null ? { unread: unread === 'true' } : {}) };
}
export function parseNotificationPage(value: unknown): NotificationPage {
  const page = contractObject(value);
  if (!Array.isArray(page.items) || page.items.length > 50 || !(page.nextCursor === null || typeof page.nextCursor === 'string') ||
    !Number.isSafeInteger(page.unreadCount) || Number(page.unreadCount) < 0 ||
    (page.totalCount !== undefined && (!Number.isSafeInteger(page.totalCount) || Number(page.totalCount) < Number(page.unreadCount)))) throw new Error('INVALID_INPUT');
  for (const raw of page.items) {
    const item = contractObject(raw);
    for(const [key,max,nullable] of [['actorName',321,true],['classroomDivision',80,false],['message',280,true]] as const){const text=item[key];if(text!==undefined&&!(nullable&&text===null)&&(typeof text!=='string'||[...text].length>max))throw new Error('INVALID_INPUT');}
    if (['id', 'createdAt', 'eventType'].some(key => typeof item[key] !== 'string') ||
      !Number.isFinite(Date.parse(String(item.createdAt))) ||
      !(item.readAt === null || typeof item.readAt === 'string' && Number.isFinite(Date.parse(item.readAt)))) throw new Error('INVALID_INPUT');
    if (['CLASSROOM_INVITATION', 'CLASSROOM_JOINED', 'AGENDA_REMINDER', 'STUDY_REVIEW_REMINDER'].includes(String(item.eventType))) {
      if (!isProjectedNotificationId(String(item.id)) || typeof item.title !== 'string' ||
        (item.startsAt !== undefined && (typeof item.startsAt !== 'string' || !Number.isFinite(Date.parse(item.startsAt)))) ||
        (item.classroomId != null && typeof item.classroomId !== 'string') ||
        (item.classroomName != null && typeof item.classroomName !== 'string')) throw new Error('INVALID_INPUT');
      continue;
    }
    if (typeof item.classroomId !== 'string' || typeof item.classroomName !== 'string') throw new Error('INVALID_INPUT');
    if (['WALL_NOTICE','WALL_QUERY','WALL_REPLY'].includes(String(item.eventType))) {
      if (typeof item.postId !== 'string' || !(item.replyId === null || typeof item.replyId === 'string')) throw new Error('INVALID_INPUT');
    } else if (['ACTIVITY_PUBLISHED','ACTIVITY_DEADLINE_CHANGED','FIRST_SUBMISSION_ENABLED','ATTEMPT_REOPENED','SUBMISSION_RECEIVED','GRADE_PUBLISHED','GRADE_CORRECTED'].includes(String(item.eventType))) {
      if (typeof item.activityId !== 'string' || typeof item.activityTitle !== 'string' || !(item.attemptId === null || typeof item.attemptId === 'string') ||
        (String(item.eventType).startsWith('GRADE_') && (typeof item.gradeId !== 'string' || typeof item.attemptId !== 'string'))) throw new Error('INVALID_INPUT');
    } else throw new Error('INVALID_INPUT');
  }
  return page as unknown as NotificationPage;
}
