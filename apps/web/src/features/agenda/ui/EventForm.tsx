import { useEffect, useRef, useState, type RefObject } from 'react';
import type { PrivateEvent } from '../../../../../../src/core/domain/agenda/index.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import type { AgendaClient } from '../api/api.ts';
import { EventFields } from './EventFields.tsx';
import { useEventEditor } from '../model/useEventEditor.ts';
import type { DraftIssue, EventEditorOutcome } from '../model/event-draft-types.ts';
import { eventDraft } from '../model/event-draft.ts';
import { draftSummary } from '../model/event-summary.ts';
import { eventColorLabel } from '../model/event-colors.ts';

type EventFormProps = {
  api: AgendaClient; event?: PrivateEvent; day: string; zone: string; onClose: () => void; onSaved: (outcome: EventEditorOutcome) => void;
  occurrenceDate?: string;
  initialScope?:'single'|'series';
};
export function EventForm({ api, event, day, zone, onClose, onSaved, occurrenceDate,initialScope }: EventFormProps) {
  const [scope,onScope] = useState<'single'|'series'>(initialScope ?? (occurrenceDate ? 'single' : 'series'));
  const single = !!event && event.repeat.kind !== 'NONE' && scope === 'single' ? occurrenceDate : undefined;
  const editor = useEventEditor(api, event, day, zone, onSaved, single);
  const form = useRef<HTMLFormElement>(null);
  useIssueFocus(form, editor.issues, editor.busy);
  const close = () => { if (editor.requestClose()) onClose(); };
  return <Dialog title={event ? 'Editar evento' : 'Crear evento personal'} label={event?'Editar evento':'Crear evento'} className="agenda-dialog" onClose={close}>
    <p className="brujula-event-private">Visible solo para vos. Las fechas de entrega se administran en el aula.</p>
    {!initialScope && event && event.repeat.kind !== 'NONE' && occurrenceDate ? <label className="agenda-occurrence-scope">Aplicar a<select aria-label="Aplicar cambios del evento" value={scope} disabled={editor.busy} onChange={e=>{if(editor.requestClose())onScope(e.target.value as 'single'|'series');}}><option value="single">Solo este evento</option><option value="series">Toda la serie</option></select></label> : !initialScope && event && event.repeat.kind !== 'NONE' ? <Notice>Estás editando toda la serie, incluidas sus fechas pasadas.</Notice> : null}
    {editor.error ? <Notice error>{editor.error}</Notice> : null}
    {editor.conflict ? <button disabled={editor.busy} onClick={() => void editor.review()}>Revisar versión guardada y conservar mis cambios</button> : null}
    {editor.stored ? <StoredEvent event={editor.stored} zone={zone} /> : null}
    <form ref={form} noValidate onSubmit={submit => { submit.preventDefault(); void editor.save(); }}>
      <div className="agenda-form-body"><fieldset disabled={editor.busy} className="agenda-fields"><EventFields draft={editor.draft} onChange={editor.setDraft} issues={editor.issues} singleOccurrence={!!single}/></fieldset></div>
      <footer className="p5-form-footer">
        {event ? <button type="button" className="danger" disabled={editor.busy || editor.conflict} onClick={() => void editor.remove()}>Eliminar{event.repeat.kind !== 'NONE' && !single ? ' serie' : ''}</button> : null}
        <button type="button" disabled={editor.busy} onClick={close}>Cancelar</button>
        <button className="primary" disabled={editor.busy || editor.conflict}>{editor.busy ? 'Guardando…' : event ? 'Guardar cambios' : 'Crear evento'}</button>
      </footer>
    </form>
  </Dialog>;
}
function useIssueFocus(ref: RefObject<HTMLFormElement | null>, issues: readonly DraftIssue[], busy: boolean) {
  useEffect(() => {
    const form = ref.current;
    const first = issues[0];
    if (!form || !first || busy) return;
    const control = form.querySelector<HTMLElement>(`[name="${first.field}"]`);
    for (let parent = control?.parentElement; parent && parent !== form; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    }
    control?.focus();
  }, [ref, issues, busy]);
}
function StoredEvent({ event, zone }: { event: PrivateEvent; zone: string }) {
  return <Notice><strong>Versión guardada: {event.title}</strong><p>{event.description || 'Sin notas.'}</p>
    <p>{draftSummary(eventDraft(event, '', zone))}</p>
    <p>Color: {eventColorLabel(event.color)}</p>
    Tus campos se conservaron. Revisalos antes de guardar sobre esta versión.</Notice>;
}
