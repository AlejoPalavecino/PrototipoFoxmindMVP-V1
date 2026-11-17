import type { InboxNotificationTarget } from '../../../../../../src/core/contracts/notifications.ts';
import { studyReviewHref } from '../../../shared/study-review-link.ts';

export function notificationDestination(target: InboxNotificationTarget, id: string) {
  if ('kind' in target) {
    if (target.kind === 'members') return `/mis-aulas?${new URLSearchParams({ aula: target.classroomId, destino: 'classroom', section: 'members' })}`;
    if (target.kind === 'study') return studyReviewHref(target);
    if (target.kind === 'event') return `/agenda?${new URLSearchParams({ event: target.eventId, date: target.date })}`;
    if (target.kind === 'invitation') return `/mis-aulas?invitacion=${encodeURIComponent(target.invitationId)}`;
  }
  return `/mis-aulas?notificacion=${encodeURIComponent(id)}`;
}
