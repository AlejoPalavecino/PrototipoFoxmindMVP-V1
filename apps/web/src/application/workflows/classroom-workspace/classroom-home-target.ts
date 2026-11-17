import type { HomeTarget } from '../../../../../../src/core/domain/home/home.ts';
import type { AcademicTarget, NotificationTarget } from '../../../../../../src/core/contracts/notifications.ts';

export function homeClassroomTab(target?: HomeTarget | null): string {
  if (!target) return 'plan';
  if (target.kind === 'classroom') return target.section;
  if (target.kind === 'material' || target.kind === 'upload-material') return 'library';
  if (target.kind === 'wall' || target.kind === 'publish-notice') return 'wall';
  if (['activity', 'grade', 'submissions', 'create-activity'].includes(target.kind)) return 'activities';
  return 'plan';
}
export function homeAcademicTarget(target?: HomeTarget | null): AcademicTarget | null {
  if (!target || !('activityId' in target)) return null;
  return { kind: target.kind === 'submissions' ? 'submission' : target.kind,
    classroomId: target.classroomId, activityId: target.activityId,
    attemptId: target.kind === 'grade' || target.kind === 'submissions' ? target.attemptId ?? null : null,
    ...(target.kind === 'grade' ? { gradeId: target.gradeId } : {}),...(target.kind==='activity'&&target.mode?{mode:target.mode}:{}) };
}
export function homeNotificationTarget(target?: HomeTarget | null): NotificationTarget | null {
  if (target?.kind === 'wall') return { classroomId: target.classroomId, postId: target.postId, replyId: null };
  return homeAcademicTarget(target);
}
