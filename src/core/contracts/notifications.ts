import type { WallTarget } from './communication.ts';

export type { ClassroomNotification, InboxNotification, NotificationKind, NotificationPage } from '../domain/home/notifications.ts';

export type AcademicTarget = { kind: 'activity' | 'attempt' | 'submission' | 'grade'; classroomId: string; activityId: string; attemptId: string | null; gradeId?: string; mode?:'respond' };

export type NotificationTarget = WallTarget | AcademicTarget;
export type ProjectedNotificationTarget =
  | { kind: 'invitation'; invitationId: string }
  | { kind: 'members'; classroomId: string }
  | { kind: 'event'; eventId: string; date: string }
  | { kind: 'study'; folderId: string; examId: string };
export type InboxNotificationTarget = NotificationTarget | ProjectedNotificationTarget;
