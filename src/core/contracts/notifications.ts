import type { WallTarget } from './communication.ts';

export type { ClassroomNotification, NotificationPage } from '../domain/index.ts';

export type AcademicTarget = { kind: 'activity' | 'attempt' | 'submission' | 'grade'; classroomId: string; activityId: string; attemptId: string | null; gradeId?: string; mode?:'respond' };

export type NotificationTarget = WallTarget | AcademicTarget;
