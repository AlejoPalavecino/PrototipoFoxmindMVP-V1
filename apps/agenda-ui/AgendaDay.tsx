import { useEffect, useRef } from 'react';
import type { AgendaTarget, PrivateEvent } from '../../src/core/domain/index.ts';
import { categoryLabels,dateAt, onDay, type AgendaItem } from './calendar.ts';
import { DeadlineCard } from './Upcoming.tsx';
import { eventColorClass } from './event-colors.ts';
import { FoxmindIcon } from '../shared-ui/index.ts';
import { eventTimeLabel, selectedDayHeading } from './agenda-presentation.ts';

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
    <small className="agenda-eyebrow">{day===dateAt(Date.now(),zone)?'Hoy':'Día seleccionado'}</small><h2>{heading.title}</h2><p className="agenda-selected-subtitle">{heading.subtitle}</p>
    {!entries.length ? <p className="agenda-empty">Un día libre en tu agenda. Agregá lo que quieras recordar.</p> : null}
    <div className="agenda-day-list">{entries.map(item => item.kind === 'ACADEMIC_DEADLINE'
      ? <DeadlineCard key={item.id} item={item} busy={busy} onOpen={onOpen} />
      : <article key={item.occurrenceId} id={`agenda-event-${item.occurrenceId}`} data-event-id={item.event.id} tabIndex={-1} className={`agenda-event ${eventColorClass(item.event)}`}>
        <button className="agenda-event-open" aria-label={`Ver evento: ${item.event.title}`} disabled={busy} onClick={() => onEdit(item.event, item.occurrenceDate ?? item.occurrenceId.slice(item.event.id.length + 1))}><span><small>{eventTimeLabel(item).split(' – ')[0]}</small><strong>{item.event.title}</strong><small>{categoryLabels[item.event.category]} personal</small></span><FoxmindIcon name="chevron-right"/></button>
      </article>)}</div>
  </section>;
}
