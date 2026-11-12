import { useEffect, useRef } from 'react';
import type { AgendaTarget, PrivateEvent } from '../../../../../../src/core/domain/agenda/index.ts';
import { categoryLabels, dateAt, deadlineLabel, onDay, type AgendaItem } from '../model/calendar.ts';
import { eventColorClass } from '../model/event-colors.ts';
import { deadlineParts, eventTimeLabel, selectedDayHeading } from '../model/agenda-presentation.ts';

export function AgendaDay({ day, zone, items, busy, focusEventId, focusRequest, onEdit, onOpen, onCreate }: {
  day: string; zone: string; items: AgendaItem[]; busy: boolean;
  onEdit: (event: PrivateEvent, occurrenceDate?: string) => void; onOpen: (target: AgendaTarget) => void; onCreate: () => void;
  focusEventId?: string;
  focusRequest?: number;
}) {
  const entries = items.filter(item => onDay(item, day, zone));
  const heading = selectedDayHeading(day);
  const container = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!focusEventId) return;
    const card = Array.from(container.current?.querySelectorAll<HTMLElement>('[data-event-id]') ?? [])
      .find(element => element.dataset.eventId === focusEventId);
    card?.focus();
  }, [focusEventId, focusRequest, day, items]);
  return <section ref={container} className="agenda-selected agenda-day-widget fm3d-agenda-card" aria-label="Eventos del día seleccionado">
    <header>
      <small className="agenda-widget-eyebrow">{day === dateAt(Date.now(), zone) ? 'Hoy' : 'Día seleccionado'}</small>
      <div className="agenda-widget-date">
        <strong className="agenda-widget-date-number" aria-hidden="true">{Number(day.slice(8))}</strong>
        <div><h2>{heading.title}</h2><p className="agenda-widget-subtitle">{heading.subtitle}</p></div>
      </div>
      <p className="agenda-widget-count" aria-live="polite">{entries.length} {entries.length === 1 ? 'evento' : 'eventos'}</p>
    </header>
    {!entries.length ? <p className="agenda-empty">Un día libre en tu agenda. Agregá lo que quieras recordar.</p> : null}
    <div className="agenda-widget-list">{entries.map(item => {
      if (item.kind === 'ACADEMIC_DEADLINE') return <article key={item.id} className="agenda-widget-row agenda-widget-deadline">
        <button className="agenda-widget-open" aria-label={`Abrir actividad: ${item.title}`} disabled={busy} onClick={() => onOpen(item.target)}>
          <span className="agenda-widget-time">{deadlineParts(item.deadlineAt, item.timeZone).time}</span>
          <span className="agenda-widget-copy"><strong>{item.title}</strong>
            <span>{item.classroomName} · {item.role === 'teacher' ? 'Enseño' : 'Estudio'}{item.resubmission ? ' · Reentrega' : ''}</span>
            <span>Entrega · {deadlineLabel(item.deadlineAt, item.timeZone)}</span>{!item.pending ? <span>Sin entrega pendiente</span> : null}
          </span>
        </button>
      </article>;
      return <article key={item.occurrenceId} id={`agenda-event-${item.occurrenceId}`} data-event-id={item.event.id} tabIndex={-1} className={`agenda-event agenda-widget-row ${eventColorClass(item.event)}`}>
        <button className="agenda-widget-open" aria-label={`Ver evento: ${item.event.title}`} disabled={busy} onClick={() => onEdit(item.event, item.occurrenceDate ?? item.occurrenceId.slice(item.event.id.length + 1))}>
          <span className="agenda-widget-time">{eventTimeLabel(item).split(' – ').map((label, index) => <span key={index}>{label}</span>)}</span>
          <span className="agenda-widget-copy"><strong>{item.event.title}</strong><span>{categoryLabels[item.event.category]} personal</span></span>
        </button>
      </article>;
    })}</div>
    <button className="agenda-create-day agenda-widget-create" aria-label="Crear evento para este día" disabled={busy} onClick={onCreate}><span aria-hidden="true">+</span> Agregar para este día</button>
  </section>;
}
