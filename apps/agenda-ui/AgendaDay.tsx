import { useEffect, useRef } from 'react';
import type { AgendaTarget, PrivateEvent } from '../../src/core/domain/index.ts';
import { categoryLabels, deadlineLabel, onDay, type AgendaItem } from './calendar.ts';
import { DeadlineCard } from './Upcoming.tsx';
import { eventColorClass } from './event-colors.ts';
import { FoxmindIcon } from '../shared-ui/index.ts';
import { eventTimeLabel, selectedDayHeading } from './agenda-presentation.ts';

export function AgendaDay({ day, zone, items, busy, focusEventId, focusRequest, onEdit, onOpen, onCreate }: {
  day: string; zone: string; items: AgendaItem[]; busy: boolean;
  onEdit: (event: PrivateEvent) => void; onOpen: (target: AgendaTarget) => void; onCreate: () => void;
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
    <small className="agenda-eyebrow">Día seleccionado</small><h2>{heading.title}</h2><p className="agenda-selected-subtitle">{heading.subtitle}</p>
    {!entries.length ? <p className="agenda-empty">Un día libre en tu agenda. Agregá lo que quieras recordar.</p> : null}
    <div className="agenda-day-list">{entries.map(item => item.kind === 'ACADEMIC_DEADLINE'
      ? <DeadlineCard key={item.id} item={item} busy={busy} onOpen={onOpen} />
      : <article key={item.occurrenceId} id={`agenda-event-${item.occurrenceId}`} data-event-id={item.event.id} tabIndex={-1} className={`agenda-event ${eventColorClass(item.event)}`}>
        <p className="agenda-event-time">{eventTimeLabel(item)}</p><h3>{item.event.title}</h3>
        <p className="agenda-privacy"><FoxmindIcon name="lock" />Evento personal · Solo vos</p>
        <span className="p5-tag">{categoryLabels[item.event.category]} · Privado{({ NONE: '', DAILY: ' · Diario', WEEKLY: ' · Semanal', MONTHLY: ' · Mensual' })[item.event.repeat.kind]}</span>
        <p className="agenda-date">{item.startAt ? deadlineLabel(item.startAt, item.event.schedule.kind === 'TIMED' ? item.event.schedule.timeZone : zone) : 'Día completo'}</p>
        {item.event.description ? <p className="agenda-description">{item.event.description}</p> : null}
        <button disabled={busy} onClick={() => onEdit(item.event)}>Editar{item.event.repeat.kind !== 'NONE' ? ' serie' : ' evento'}</button>
      </article>)}</div>
    <button className="agenda-add-day" disabled={busy} onClick={onCreate}>+ Agregar evento este día</button>
  </section>;
}
