import { useEffect, useRef, type RefObject } from 'react';
import type { PrivateEvent } from '../../src/core/domain/index.ts';
import { Dialog, Notice } from '../classrooms-ui/components.tsx';
import type { AgendaClient } from './api.ts';
import { EventFields } from './EventFields.tsx';
import { useEventEditor } from './useEventEditor.ts';
import type { DraftIssue, EventEditorOutcome } from './event-draft-types.ts';
import { eventDraft } from './event-draft.ts';
import { draftSummary } from './event-summary.ts';
import { eventColorLabel } from './event-colors.ts';

export function EventForm({ api, event, day, zone, onClose, onSaved }: {
  api: AgendaClient; event?: PrivateEvent; day: string; zone: string; onClose: () => void; onSaved: (outcome: EventEditorOutcome) => void;
}) {
  const editor = useEventEditor(api, event, day, zone, onSaved);
  const form = useRef<HTMLFormElement>(null);
  useIssueFocus(form, editor.issues, editor.busy);
  const close = () => { if (editor.requestClose()) onClose(); };
  return <Dialog title={event ? 'Editar evento' : 'Nuevo evento'} className="agenda-dialog" onClose={close}>
    {event && event.repeat.kind !== 'NONE' ? <Notice>Estás editando toda la serie, incluidas sus fechas pasadas.</Notice> : null}
    {editor.error ? <Notice error>{editor.error}</Notice> : null}
    {editor.conflict ? <button disabled={editor.busy} onClick={() => void editor.review()}>Revisar versión guardada y conservar mis cambios</button> : null}
    {editor.stored ? <StoredEvent event={editor.stored} zone={zone} /> : null}
    <form ref={form} noValidate onSubmit={submit => { submit.preventDefault(); void editor.save(); }}>
      <div className="agenda-form-body"><fieldset disabled={editor.busy} className="agenda-fields"><EventFields draft={editor.draft} onChange={editor.setDraft} issues={editor.issues} /></fieldset></div>
      <footer className="p5-form-footer">
        {event ? <button type="button" className="danger" disabled={editor.busy || editor.conflict} onClick={() => void editor.remove()}>Eliminar{event.repeat.kind !== 'NONE' ? ' serie' : ''}</button> : null}
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
