import { useEffect, useRef } from 'react';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import type { AgendaTarget, PrivateEvent } from '../../../../../../src/core/domain/agenda/index.ts';
import { dayLabel, onDay, type AgendaItem } from '../model/calendar.ts';
import { selectedDayHeading } from '../model/agenda-presentation.ts';
import { agendaRows } from './agendaRows.tsx';

export function AgendaDay({ day, zone, items, busy, focusEventId, focusRequest, onEdit, onOpen, onCreate, role = 'student', variant = 'panel' }: {
  day: string; zone: string; items: AgendaItem[]; busy: boolean;
  onEdit: (event: PrivateEvent, occurrenceDate?: string) => void; onOpen: (target: AgendaTarget) => void; onCreate: () => void;
  focusEventId?: string; focusRequest?: number; role?: 'teacher' | 'student'; variant?: 'panel' | 'focus';
}) {
  const entries = items.filter(item => onDay(item, day, zone));
  const heading = selectedDayHeading(day);
  const count = `${entries.length} ${entries.length === 1 ? 'evento' : 'eventos'}`;
  const focus = variant === 'focus';
  const container = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!focusEventId) return;
    const card = Array.from(container.current?.querySelectorAll<HTMLElement>('[data-event-id]') ?? [])
      .find(element => element.dataset.eventId === focusEventId);
    card?.focus();
  }, [focusEventId, focusRequest, day, items]);
  const add = (caption: string) => <button type="button" className="agenda-create-day agenda-widget-create" aria-label="Crear evento para este día" disabled={busy} onClick={onCreate}><FoxmindIcon name="plus" />{caption}</button>;
  return <section ref={container} className={`agenda-selected agenda-day-widget fm3d-agenda-card agenda-day-${variant}`} aria-label="Eventos del día seleccionado">
    <header className="agenda-day-preview-header">
      <div className="agenda-widget-date">
        <span className="agenda-paper" aria-hidden="true">
          <span>{new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'))}</span>
          <strong className="agenda-widget-date-number">{Number(day.slice(8))}</strong>
        </span>
        <div>
          {!focus ? <small className="agenda-widget-eyebrow">Tu día, a simple vista</small> : null}
          <h2 tabIndex={-1}>{focus ? dayLabel(day) : heading.title}</h2>
          <p className="agenda-widget-subtitle" aria-live="polite">{focus ? `${count} ${entries.length ? 'para organizarte a tu ritmo.' : 'en tu agenda.'}` : <>{heading.subtitle} · {count}</>}</p>
        </div>
      </div>
      {focus ? add('Agregar') : null}
    </header>
    <div className="agenda-day-body">
      {entries.length ? <div className="agenda-widget-list">{agendaRows(entries, busy, item => {
        if (item.kind === 'ACADEMIC_DEADLINE') onOpen(item.target);
        else onEdit(item.event, item.occurrenceDate ?? item.occurrenceId.slice(item.event.id.length + 1));
      })}</div> : <div className="agenda-empty agenda-open-space">
        <span aria-hidden="true"><FoxmindIcon name="calendar" /></span>
        <h3>Un espacio para vos</h3>
        <p>Un día libre en tu agenda. Podés reservar un rato para {role === 'teacher' ? 'preparar una clase' : 'repasar'}, organizarte o hacer una pausa.</p>
        {add('Agregar un evento')}
      </div>}
      {!focus && entries.length ? add('Agregar para este día') : null}
      {!focus ? <p className="agenda-day-private"><FoxmindIcon name="lock" />Tus eventos son personales.</p> : null}
    </div>
  </section>;
}
