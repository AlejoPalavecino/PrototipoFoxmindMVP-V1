import type { InboxNotification, NotificationKind } from '../../../../../../src/core/contracts/notifications.ts';
import type { FoxmindIconProps } from '../../../../../shared-ui/FoxmindIcon';

type Icon = FoxmindIconProps['name'];
export const notificationKinds: Record<NotificationKind, { label: string; icon: Icon }> = {
  all: { label: 'Todos los tipos', icon: 'bell' },
  activity: { label: 'Actividades', icon: 'file-text' },
  classroom: { label: 'Aulas', icon: 'users' },
  agenda: { label: 'Agenda', icon: 'calendar' },
};
const description: Record<InboxNotification['eventType'], { title: string; action: string; icon: Icon; tone: string }> = {
  WALL_NOTICE: { title: 'Nuevo aviso del docente', action: 'Ir al muro', icon: 'chat', tone: 'peach' },
  WALL_QUERY: { title: 'Nueva consulta de estudiante', action: 'Abrir conversación', icon: 'chat', tone: 'peach' },
  WALL_REPLY: { title: 'Respuesta a tu publicación', action: 'Abrir conversación', icon: 'chat', tone: 'peach' },
  ACTIVITY_PUBLISHED: { title: 'Nueva actividad publicada', action: 'Ver actividad', icon: 'pencil', tone: 'sky' },
  ACTIVITY_DEADLINE_CHANGED: { title: 'Cambio de plazo o recepción', action: 'Ver actividad', icon: 'clock', tone: 'sky' },
  FIRST_SUBMISSION_ENABLED: { title: 'Primera entrega habilitada', action: 'Ver actividad', icon: 'clipboard', tone: 'sky' },
  ATTEMPT_REOPENED: { title: 'Nuevo intento habilitado', action: 'Ver actividad', icon: 'clipboard', tone: 'sky' },
  SUBMISSION_RECEIVED: { title: 'Nueva entrega recibida', action: 'Revisar entrega', icon: 'file-text', tone: 'sky' },
  GRADE_PUBLISHED: { title: 'Calificación publicada', action: 'Ver devolución', icon: 'chat-square', tone: 'mint' },
  GRADE_CORRECTED: { title: 'Calificación corregida', action: 'Ver devolución', icon: 'chat-square', tone: 'mint' },
  CLASSROOM_INVITATION: { title: 'Tenés una invitación a un aula', action: 'Revisar invitación', icon: 'mail', tone: 'peach' },
  CLASSROOM_JOINED: { title: 'Nuevo ingreso al aula', action: 'Ver estudiantes', icon: 'users', tone: 'mint' },
  AGENDA_REMINDER: { title: 'Un evento en tu agenda', action: 'Ver evento', icon: 'calendar', tone: 'rose' },
  STUDY_REVIEW_REMINDER: { title: 'Tu próximo repaso', action: 'Abrir plan de repaso', icon: 'calendar', tone: 'rose' },
};
export function describeNotice(item: InboxNotification, preview = false) {
  const result = description[item.eventType];
  const actor = item.actorName;
  let title = result.title;
  if (actor) {
    if (item.eventType === 'SUBMISSION_RECEIVED') title = preview ? `Entrega de ${actor}` : `${actor} entregó su actividad`;
    if (item.eventType === 'WALL_QUERY') title = `Consulta de ${actor}`;
    if (item.eventType === 'WALL_REPLY') title = `Respuesta de ${actor}`;
    if (item.eventType === 'CLASSROOM_INVITATION') title = `${actor} te invita a un aula`;
    if (item.eventType === 'CLASSROOM_JOINED') title = `${actor} se sumó a tu aula`;
  }
  const body = 'title' in item ? item.title : 'activityTitle' in item ? item.activityTitle : item.message;
  const source = item.classroomName ? [item.classroomName === body ? '' : item.classroomName, item.classroomDivision].filter(Boolean).join(' · ')
    : 'startsAt' in item && item.startsAt ? shortDate.format(new Date(item.startsAt)) : '';
  return { ...result, title, body, source,
    action: preview && item.eventType === 'SUBMISSION_RECEIVED' ? 'Ver actividad' : result.action };
}
const dayDate = new Intl.DateTimeFormat('en-CA', { dateStyle: 'short' });
const shortDate = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' });
const clock = new Intl.DateTimeFormat('es-AR', { timeStyle: 'short', hourCycle: 'h23' });
export function noticeTime(value: string, recent: boolean) {
  return (recent ? clock : shortDate).format(new Date(value));
}
export function groupNotices(items: InboxNotification[], now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const week = new Date(now);
  week.setDate(now.getDate() - (now.getDay() + 6) % 7);
  week.setHours(0, 0, 0, 0);
  const todayLabel = dayDate.format(now), yesterdayLabel = dayDate.format(yesterday);
  const groups = [
    { label: 'Hoy', recent: true, items: [] as InboxNotification[] },
    { label: 'Ayer', recent: true, items: [] as InboxNotification[] },
    { label: 'Esta semana', recent: false, items: [] as InboxNotification[] },
    { label: 'Anteriores', recent: false, items: [] as InboxNotification[] },
  ];
  for (const item of items) {
    const instant = new Date(item.createdAt), key = dayDate.format(instant);
    const index = key === todayLabel ? 0 : key === yesterdayLabel ? 1 : instant >= week ? 2 : 3;
    groups[index].items.push(item);
  }
  return groups.filter(group => group.items.length);
}
