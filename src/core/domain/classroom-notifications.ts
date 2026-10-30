import { contractObject } from './classroom-contract-values.ts';
export interface NotificationPageQuery { cursor?: string; limit?: number; unread?: boolean }
export interface NotificationBase { id: string; classroomId: string; classroomName: string; createdAt: string; readAt: string | null }
export type ClassroomNotification = NotificationBase & ({ eventType: 'WALL_NOTICE' | 'WALL_QUERY' | 'WALL_REPLY'; postId: string; replyId: string | null }
  | { eventType: 'ACTIVITY_PUBLISHED' | 'ACTIVITY_DEADLINE_CHANGED' | 'FIRST_SUBMISSION_ENABLED' | 'ATTEMPT_REOPENED' | 'SUBMISSION_RECEIVED'; activityId: string; activityTitle: string; attemptId: string | null }
  | { eventType: 'GRADE_PUBLISHED' | 'GRADE_CORRECTED'; activityId: string; activityTitle: string; attemptId: string; gradeId: string });
export interface NotificationPage { items: ClassroomNotification[]; nextCursor: string | null; unreadCount: number }
export function parseNotificationQuery(params: URLSearchParams): NotificationPageQuery {
  for (const key of params.keys()) if (!['cursor', 'limit', 'unread'].includes(key) || params.getAll(key).length !== 1) throw new Error('INVALID_INPUT');
  const cursor = params.get('cursor'), limit = params.get('limit'), unread = params.get('unread');
  if (cursor !== null && (!cursor || cursor.length > 2048)) throw new Error('INVALID_INPUT');
  if (limit !== null && (!/^[1-9][0-9]*$/.test(limit) || Number(limit) > 50)) throw new Error('INVALID_INPUT');
  if (unread !== null && unread !== 'true' && unread !== 'false') throw new Error('INVALID_INPUT');
  return { ...(cursor !== null ? { cursor } : {}), ...(limit !== null ? { limit: Number(limit) } : {}),
    ...(unread !== null ? { unread: unread === 'true' } : {}) };
}
export function parseNotificationPage(value: unknown): NotificationPage {
  const page = contractObject(value);
  if (!Array.isArray(page.items) || page.items.length > 50 || !(page.nextCursor === null || typeof page.nextCursor === 'string') ||
    !Number.isSafeInteger(page.unreadCount) || Number(page.unreadCount) < 0) throw new Error('INVALID_INPUT');
  for (const raw of page.items) {
    const item = contractObject(raw);
    if (['id', 'classroomId', 'classroomName', 'createdAt', 'eventType'].some(key => typeof item[key] !== 'string') ||
      !(item.readAt === null || typeof item.readAt === 'string')) throw new Error('INVALID_INPUT');
    if (['WALL_NOTICE','WALL_QUERY','WALL_REPLY'].includes(String(item.eventType))) {
      if (typeof item.postId !== 'string' || !(item.replyId === null || typeof item.replyId === 'string')) throw new Error('INVALID_INPUT');
    } else if (['ACTIVITY_PUBLISHED','ACTIVITY_DEADLINE_CHANGED','FIRST_SUBMISSION_ENABLED','ATTEMPT_REOPENED','SUBMISSION_RECEIVED','GRADE_PUBLISHED','GRADE_CORRECTED'].includes(String(item.eventType))) {
      if (typeof item.activityId !== 'string' || typeof item.activityTitle !== 'string' || !(item.attemptId === null || typeof item.attemptId === 'string') ||
        (String(item.eventType).startsWith('GRADE_') && (typeof item.gradeId !== 'string' || typeof item.attemptId !== 'string'))) throw new Error('INVALID_INPUT');
    } else throw new Error('INVALID_INPUT');
  }
  return page as unknown as NotificationPage;
}
