import type { AcademicDeadline, AgendaTarget } from '../../src/core/domain/index.ts';
import { deadlineLabel } from './calendar.ts';
import { FoxmindIllustration, FoxmindIcon } from '../shared-ui/index.ts';
import { deadlineParts } from './agenda-presentation.ts';

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
export function Upcoming({ items, loading, error, busy, onOpen }: {
  items: AcademicDeadline[]; loading: boolean; error: string; busy: boolean; onOpen: (target: AgendaTarget) => void;
}) {
  return <aside className="agenda-upcoming fm3d-agenda-card" aria-label="Próximas entregas">
    <h2>Próximas entregas</h2>
    <p>Los próximos plazos de tus aulas.</p>
    {loading ? <p role="status">Consultando entregas…</p> : error ? <p>Las entregas no están disponibles. Reintentá la consulta.</p>
      : items.length ? <><DeadlineCard item={items[0]} onOpen={onOpen} busy={busy} />
        {items.length > 1 ? <details className="education-upcoming-more"><summary>Ver {items.length - 1} entregas más</summary>
          {items.slice(1).map(item => <DeadlineCard key={item.id} item={item} onOpen={onOpen} busy={busy} />)}</details> : null}</>
        : <div className="agenda-empty"><p>No tenés entregas próximas pendientes.</p></div>}
    {!loading && !error && !items.length ? <FoxmindIllustration className="agenda-side-scene" name="scenes/agenda" sizes="(max-width: 900px) 100vw, 34vw" /> : null}
  </aside>;
}
