import { useState } from 'react';
import type { AcademicDeadline, AgendaTarget } from '../../../../../../src/core/domain/agenda/index.ts';
import { deadlineLabel } from '../model/calendar.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { deadlineParts } from '../model/agenda-presentation.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';

function DeadlineDateTile({ item }: { item: AcademicDeadline }) {
  const date = deadlineParts(item.deadlineAt, item.timeZone);
  return <div className="agenda-deadline-tile" aria-hidden="true"><strong>{date.day}</strong><span>{date.month}</span></div>;
}

export function DeadlineCard({ item, onOpen, busy }: { item: AcademicDeadline; onOpen: (target: AgendaTarget) => void; busy: boolean }) {
  return <article className="agenda-deadline">
    <DeadlineDateTile item={item} /><div className="agenda-deadline-content">
    <p className="agenda-deadline-time">{deadlineParts(item.deadlineAt, item.timeZone).time}</p>
    <span className="p5-tag">{item.role === 'teacher' ? 'Enseño' : 'Estudio'}{item.resubmission ? ' · Reentrega' : ''}</span>
    <h3>{item.title}</h3><p>{item.classroomName}</p>
    <p className="agenda-date">{deadlineLabel(item.deadlineAt, item.timeZone)}</p>
    {!item.pending ? <small>Sin entrega pendiente</small> : null}
    <button disabled={busy} onClick={() => onOpen(item.target)}>Abrir actividad <FoxmindIcon name="arrow-right" /></button>
    </div>
  </article>;
}
export function Upcoming({ items, loading, error, busy, onOpen, onRetry }: {
  onRetry: () => void; items: AcademicDeadline[]; loading: boolean; error: string; busy: boolean; onOpen: (target: AgendaTarget) => void;
}) {
  const [showMore, setShowMore] = useState(false);
  function openDeadline(target: AgendaTarget) {
    setShowMore(false);
    onOpen(target);
  }
  return <aside className="agenda-upcoming fm3d-agenda-card" aria-label="Próximas entregas">
    <h2>Próximas entregas</h2>
    <p>Los próximos plazos de tus aulas.</p>
    {loading ? <p role="status">Consultando entregas…</p> : error ? <Notice error><p>No pudimos consultar tus próximas entregas.</p><button type="button" onClick={onRetry} disabled={busy}>Volver a intentar</button></Notice>
      : items.length ? <><DeadlineCard item={items[0]} onOpen={onOpen} busy={busy} />
        {items.length > 1 ? <button type="button" className="p5-secondary education-upcoming-more" aria-haspopup="dialog" onClick={() => setShowMore(true)}>Ver {items.length - 1 === 1 ? 'otra entrega' : `otras ${items.length - 1} entregas`} <FoxmindIcon name="arrow-right" /></button> : null}</>
        : <div className="agenda-empty"><p>No tenés entregas próximas pendientes.</p></div>}
    {showMore ? <Dialog title="Tus próximas entregas" onClose={() => setShowMore(false)} labeledClose>
      <p>Elegí una actividad para consultar la consigna o continuar tu entrega.</p>
      {items.slice(1).map(item => <DeadlineCard key={item.id} item={item} onOpen={openDeadline} busy={busy} />)}
    </Dialog> : null}
  </aside>;
}
