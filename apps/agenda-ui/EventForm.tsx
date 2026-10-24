import type { PrivateEvent } from '../../src/core/domain/index.ts';
import { Dialog, Notice } from '../classrooms-ui/components.tsx';
import type { AgendaClient } from './api.ts';
import { EventFields } from './EventFields.tsx';
import { useEventEditor } from './useEventEditor.ts';

export function EventForm({ api, event, day, zone, onClose, onSaved }: {
  api: AgendaClient; event?: PrivateEvent; day: string; zone: string; onClose: () => void; onSaved: (message: string) => void;
}) {
  const editor = useEventEditor(api, event, day, zone, onSaved);
  return <Dialog title={event ? 'Editar evento' : 'Nuevo evento'} className="agenda-dialog" onClose={() => { if (!editor.busy) onClose(); }}>
    <p>Solo vos podés ver este evento. No crea una actividad del aula.</p>
    {event?.repeat.kind === 'WEEKLY' ? <Notice>Estás editando toda la serie semanal, incluidas sus fechas pasadas.</Notice> : null}
    {editor.error ? <Notice error>{editor.error}</Notice> : null}
    {editor.conflict ? <button disabled={editor.busy} onClick={() => void editor.review()}>Revisar versión guardada y conservar mis cambios</button> : null}
    {editor.stored ? <StoredEvent event={editor.stored} /> : null}
    <form onSubmit={submit => { submit.preventDefault(); void editor.save(); }}>
      <fieldset disabled={editor.busy} className="agenda-fields"><EventFields draft={editor.draft} onChange={editor.setDraft} /></fieldset>
      <footer className="p5-form-footer">
        {event ? <button type="button" className="danger" disabled={editor.busy || editor.conflict} onClick={() => void editor.remove()}>Eliminar{event.repeat.kind === 'WEEKLY' ? ' serie' : ''}</button> : null}
        <button type="button" disabled={editor.busy} onClick={onClose}>Cancelar</button>
        <button className="primary" disabled={editor.busy || editor.conflict}>{editor.busy ? 'Guardando…' : 'Guardar evento'}</button>
      </footer>
    </form>
  </Dialog>;
}
function StoredEvent({ event }: { event: PrivateEvent }) {
  const schedule = event.schedule;
  return <Notice><strong>Versión guardada: {event.title}</strong><p>{event.description || 'Sin descripción.'}</p>
    <p>{schedule.kind === 'ALL_DAY' ? `Día completo: ${schedule.startDate} hasta ${schedule.endDateExclusive} (fin exclusivo)`
      : `${schedule.startLocal} a ${schedule.endLocal} · ${schedule.timeZone}`}</p>
    <p>{event.repeat.kind === 'WEEKLY' ? `Semanal hasta ${event.repeat.untilDate}` : 'Una sola vez'}</p>
    Tus campos se conservaron. Revisalos antes de guardar sobre esta versión.</Notice>;
}
