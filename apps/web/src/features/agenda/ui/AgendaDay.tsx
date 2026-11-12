import { useEffect, useRef } from 'react';
import type { AgendaTarget, PrivateEvent } from '../../../../../../src/core/domain/agenda/index.ts';
import { categoryLabels,dateAt, onDay, type AgendaItem } from '../model/calendar.ts';
import { DeadlineCard } from './Upcoming.tsx';
import { eventColorClass } from '../model/event-colors.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { eventTimeLabel, selectedDayHeading } from '../model/agenda-presentation.ts';

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
  return <section ref={container} className="agenda-selected fm3d-agenda-card" aria-label="Eventos del día seleccionado">
    <header className="agenda-day-heading"><div><small className="agenda-eyebrow">{day===dateAt(Date.now(),zone)?'Hoy':'Día seleccionado'}</small><h2>{heading.title}</h2><p className="agenda-selected-subtitle">{heading.subtitle}</p></div><span className="agenda-day-total" aria-live="polite">{entries.length} {entries.length === 1 ? 'evento' : 'eventos'}</span></header>
    {!entries.length ? <p className="agenda-empty">Un día libre en tu agenda. Agregá lo que quieras recordar.</p> : null}
    <div className="agenda-day-list">{entries.map(item => item.kind === 'ACADEMIC_DEADLINE'
      ? <DeadlineCard key={item.id} item={item} busy={busy} onOpen={onOpen} />
      : <article key={item.occurrenceId} id={`agenda-event-${item.occurrenceId}`} data-event-id={item.event.id} tabIndex={-1} className={`agenda-event ${eventColorClass(item.event)}`}>
        <button className="agenda-event-open" aria-label={`Ver evento: ${item.event.title}`} disabled={busy} onClick={() => onEdit(item.event, item.occurrenceDate ?? item.occurrenceId.slice(item.event.id.length + 1))}><span className="agenda-event-copy"><strong>{item.event.title}</strong><small className="agenda-event-time">{eventTimeLabel(item)}</small><span className="agenda-event-kind">{categoryLabels[item.event.category]} personal</span></span><FoxmindIcon name="chevron-right"/></button>
      </article>)}</div>
    <button className="agenda-create-day" aria-label="Crear evento para este día" disabled={busy} onClick={onCreate}><span aria-hidden="true">+</span> Agregar evento</button>
  </section>;
}
