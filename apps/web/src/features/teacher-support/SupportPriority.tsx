import type { TeacherSupportEntry } from '../../../../../src/core/contracts/teacher-support.ts';
import styles from './teacher-support.module.css';

export const priorities = ['high', 'medium', 'low'] as const;
export const priorityLabels = {high:'Alta', medium:'Media', low:'Baja'};
type Priority = TeacherSupportEntry['priority'];

export function priorityTone(priority: Priority) { return styles[priority]; }

export function SupportPriority({ value }: { value: Priority }) {
  return <span className={`${styles.badge} ${priorityTone(value)}`}><i aria-hidden="true"/>
    {value === 'insufficient' ? 'Sin evidencia suficiente' : `Prioridad ${priorityLabels[value].toLowerCase()}`}
  </span>;
}

export function formatSupportDate(instant: string, timeZone = 'America/Argentina/Buenos_Aires') {
  return new Intl.DateTimeFormat('es-AR', {day:'numeric', month:'long', timeZone}).format(new Date(instant));
}

export function supportReason({ priority, pending, timeZone }: Pick<TeacherSupportEntry,'priority'|'pending'|'timeZone'>) {
  if (pending.length) {
    const count = pending.length;
    const first = pending[0];
    const date = formatSupportDate(first.deadlineAt,timeZone);
    return count > 1 ? `${count} entregas vencidas. «${first.title}» está pendiente desde el ${date}.`
      : `«${first.title}» está pendiente desde el ${date}${priority === 'high' ? ' (10 días o más)' : ''}.`;
  }
  return priority === 'low'
    ? 'Entregó las actividades obligatorias recientes con plazo cumplido.'
    : 'Todavía hay poca evidencia reciente en esta aula.';
}
