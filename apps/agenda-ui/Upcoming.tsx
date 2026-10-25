import type { AcademicDeadline, AgendaTarget } from '../../src/core/domain/index.ts';
import { deadlineLabel } from './calendar.ts';
import { FoxmindIllustration } from '../shared-ui/index.ts';

export function DeadlineCard({ item, onOpen, busy }: { item: AcademicDeadline; onOpen: (target: AgendaTarget) => void; busy: boolean }) {
  return <article className="agenda-deadline">
    <span className="p5-tag">{item.role === 'teacher' ? 'Enseño' : 'Estudio'}{item.resubmission ? ' · Reentrega' : ''}</span>
    <h3>{item.title}</h3><p>{item.classroomName}</p>
    <p className="agenda-date">{deadlineLabel(item.deadlineAt, item.timeZone)}</p>
    {!item.pending ? <small>Sin entrega pendiente</small> : null}
    <button disabled={busy} onClick={() => onOpen(item.target)}>Abrir actividad <span aria-hidden="true">↗</span></button>
  </article>;
}
export function Upcoming({ items, loading, error, busy, onOpen }: {
  items: AcademicDeadline[]; loading: boolean; error: string; busy: boolean; onOpen: (target: AgendaTarget) => void;
}) {
  return <aside className="agenda-upcoming fm3d-agenda-card" aria-label="Próximas entregas">
    <h2>Próximas entregas</h2>
    <p>Los próximos plazos de tus aulas.</p>
    {loading ? <p role="status">Consultando entregas…</p> : error ? <p>Las entregas no están disponibles. Reintentá la consulta.</p>
      : items.length ? items.map(item => <DeadlineCard key={item.id} item={item} onOpen={onOpen} busy={busy} />)
        : <div className="agenda-empty"><p>No tenés entregas próximas pendientes.</p></div>}
    {!loading && !error ? <FoxmindIllustration className="agenda-side-scene" name="scenes/agenda" sizes="220px" /> : null}
  </aside>;
}
