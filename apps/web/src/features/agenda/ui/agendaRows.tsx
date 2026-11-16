import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { categoryLabels, deadlineLabel, type AgendaItem } from '../model/calendar.ts';
import { eventColorClass } from '../model/event-colors.ts';
import { deadlineParts, eventTimeLabel } from '../model/agenda-presentation.ts';

export function agendaRows(items: AgendaItem[], busy: boolean, onItem: (item: AgendaItem) => void, idPrefix = 'agenda-event') {
  return items.map(item => {
    if (item.kind === 'ACADEMIC_DEADLINE') return <article key={item.id} className="agenda-widget-row agenda-widget-deadline">
      <button className="agenda-widget-open" aria-label={`Abrir actividad: ${item.title}`} disabled={busy} onClick={() => onItem(item)}>
        <span className="agenda-widget-time">{deadlineParts(item.deadlineAt, item.timeZone).time}</span>
        <span className="agenda-widget-copy"><span className="agenda-event-category"><FoxmindIcon name="file" />Entrega del aula</span>
          <strong>{item.title}</strong>
          <span>{item.classroomName} · {item.role === 'teacher' ? 'Enseño' : 'Estudio'}{item.resubmission ? ' · Reentrega' : ''}</span>
          <span>{deadlineLabel(item.deadlineAt, item.timeZone)}</span>{!item.pending ? <span>Sin entrega pendiente</span> : null}
          <FoxmindIcon name="chevron-right" className="agenda-event-arrow" />
        </span>
      </button>
    </article>;

    const allDay = item.event.schedule.kind === 'ALL_DAY';
    const minutes = Math.round((Date.parse(item.endAt ?? '') - Date.parse(item.startAt ?? '')) / 60_000);
    const duration = allDay || !Number.isFinite(minutes) ? null : [minutes >= 60 && `${Math.floor(minutes / 60)} h`, minutes % 60 > 0 && `${minutes % 60} min`].filter(Boolean).join(' ');
    return <article key={item.occurrenceId} id={`${idPrefix}-${item.occurrenceId}`} data-event-id={item.event.id} tabIndex={-1} className={`agenda-event agenda-widget-row ${eventColorClass(item.event)}`}>
      <button className="agenda-widget-open" aria-haspopup="dialog" aria-label={`Ver evento: ${item.event.title}`} disabled={busy} onClick={() => onItem(item)}>
        <span className={`agenda-widget-time${allDay ? ' agenda-widget-all-day' : ''}`}>{eventTimeLabel(item).split(' – ').map((label, index) => <span key={index}>{label}</span>)}</span>
        <span className="agenda-widget-copy"><span className="agenda-widget-meta">
          <span className="agenda-event-category"><FoxmindIcon name={item.event.reviewSession || item.event.category === 'CLASS' ? 'book' : 'calendar'} />
            {item.event.reviewSession ? 'Repaso' : `${categoryLabels[item.event.category]} personal`}</span>
          {duration ? <small>{duration}</small> : null}</span>
          <strong>{item.event.title}</strong>
          {item.event.description?.trim() ? <span className="agenda-widget-note">{item.event.description}</span> : null}
          <FoxmindIcon name="chevron-right" className="agenda-event-arrow" />
        </span>
      </button>
    </article>;
  });
}
