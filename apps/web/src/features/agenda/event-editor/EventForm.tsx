import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { scheduleInstants, type PrivateEvent } from '../../../../../../src/core/domain/agenda/index.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import type { AgendaClient } from '../api/api.ts';
import { EventFields, eventCategoryIcons } from './EventFields.tsx';
import { useEventEditor } from './useEventEditor.ts';
import type { DraftIssue, EventDraft, EventEditorOutcome } from './event-draft-types.ts';
import { eventDraft } from './event-draft.ts';
import { categoryLabels, dayLabel } from '../model/calendar.ts';
import { validDraftDate } from './event-draft-time.ts';
import { draftSummary } from './event-summary.ts';
import { eventColorClass, eventColorLabel } from '../model/event-colors.ts';
import styles from './agenda-event-editor.module.css';

type Scope = 'single' | 'series';
type DiscardAction = 'close' | Scope;
type EventFormProps = {
  api: AgendaClient; event?: PrivateEvent; day: string; zone: string; onClose: () => void; onSaved: (outcome: EventEditorOutcome) => void;
  occurrenceDate?: string;
  initialScope?: Scope;
};

export function EventForm({ api, event, day, zone, onClose, onSaved, occurrenceDate, initialScope }: EventFormProps) {
  const [scope, setScope] = useState<Scope>(initialScope ?? (occurrenceDate ? 'single' : 'series'));
  const single = !!event && event.repeat.kind !== 'NONE' && scope === 'single' ? occurrenceDate : undefined;
  const editor = useEventEditor(api, event, day, zone, onSaved, single);
  const [discard, setDiscard] = useState<DiscardAction | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const keepEditing = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useIssueFocus(form, editor.issues, editor.busy);
  useEffect(() => {
    if (discard) {
      keepEditing.current?.focus({ preventScroll: true });
      return;
    }
    const target = returnFocus.current;
    returnFocus.current = null;
    if (target?.isConnected) target.focus({ preventScroll: true });
  }, [discard]);

  function apply(action: DiscardAction) {
    if (action === 'close') onClose();
    else {
      setScope(action);
      setDiscard(null);
    }
  }

  function request(action: DiscardAction) {
    if (editor.busy) return;
    if (!editor.dirty) return apply(action);
    const active = form.current?.ownerDocument?.activeElement;
    returnFocus.current = active && 'focus' in active ? active as HTMLElement : null;
    setDiscard(action);
  }

  const resume = () => setDiscard(null);
  const close = () => discard ? resume() : request('close');
  const title = event ? 'Editar evento' : 'Un momento en tu agenda';
  return <Dialog captureEscape title={discard ? '¿Descartás los cambios?' : title}
    label={discard ? undefined : event ? 'Editar evento' : 'Crear evento'}
    className={`agenda-dialog ${styles.editor}${discard ? ` ${styles.discard}` : ''}`} onClose={close}>
    <div className={styles.content} hidden={!!discard}>
      <p className="brujula-event-private">Elegí cuándo y cómo querés reconocerlo.</p>
      <form ref={form} noValidate onSubmit={submit => { submit.preventDefault(); if (!discard) void editor.save(); }}>
        <div className="agenda-form-body">
          {!initialScope && event && event.repeat.kind !== 'NONE' && occurrenceDate ? <label className="agenda-occurrence-scope">Aplicar a<select aria-label="Aplicar cambios del evento" value={scope} disabled={editor.busy} onChange={e=>request(e.target.value as Scope)}><option value="single">Solo este evento</option><option value="series">Toda la serie</option></select></label> : !initialScope && event && event.repeat.kind !== 'NONE' ? <Notice>Estás editando toda la serie, incluidas sus fechas pasadas.</Notice> : null}
          <div className="agenda-editor-grid">
            <fieldset disabled={editor.busy} className="agenda-fields">
              {editor.error ? <Notice error>{editor.error}</Notice> : null}
              {editor.conflict ? <button type="button" onClick={() => void editor.review()}>Revisar versión guardada y conservar mis cambios</button> : null}
              {editor.stored ? <StoredEvent event={editor.stored} zone={zone} /> : null}
              <EventFields draft={editor.draft} onChange={editor.setDraft} issues={editor.issues} singleOccurrence={!!single}/>
            </fieldset>
            <EventPreview draft={editor.draft}/>
          </div>
        </div>
        <footer className="p5-form-footer">
          <button type="button" disabled={editor.busy} onClick={close}>Cancelar</button>
          <button className="primary" disabled={editor.busy || editor.conflict}>
            <FoxmindIcon name="check"/>{editor.busy ? 'Guardando…' : event ? 'Guardar cambios' : 'Crear evento'}
          </button>
        </footer>
      </form>
    </div>
    {discard ? <div className={styles.discardContent}>
      <p className="brujula-event-private">{event
        ? 'El evento conserva su versión anterior hasta que guardes.'
        : 'Tu evento todavía no se guardó en la agenda.'}</p>
      <div className={styles.summary}><FoxmindIcon name="edit"/>
        <p><b>{editor.draft.title.trim() || 'Tu nuevo evento'}</b><small>Tenés cambios sin guardar.</small></p>
      </div>
      <footer className="p5-form-footer">
        <button type="button" ref={keepEditing} onClick={resume}>Seguir editando</button>
        <button type="button" className="danger" onClick={() => apply(discard)}>Descartar cambios</button>
      </footer>
    </div> : null}
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

function EventPreview({ draft }: { draft: EventDraft }) {
  const color = draft.color === 'AUTO' ? undefined : draft.color;
  const { allDay, startDate, endDate, startTime, endTime, zone, startOffset, endOffset } = draft;
  const duration = useMemo(() => {
    if (allDay || !startTime || !endTime) return null;
    try {
      const { startAt, endAt } = scheduleInstants({ kind: 'TIMED', timeZone: zone,
        startLocal: `${startDate}T${startTime}`, endLocal: `${endDate}T${endTime}`,
        startOffsetMinutes: startOffset, endOffsetMinutes: endOffset });
      const minutes = (Date.parse(endAt) - Date.parse(startAt)) / 60_000;
      const hours = Math.floor(minutes / 60), remainder = minutes % 60;
      return hours ? `${hours} h${remainder ? ` ${remainder} min` : ''}` : `${minutes} min`;
    } catch { return null; }
  }, [allDay, startDate, endDate, startTime, endTime, zone, startOffset, endOffset]);

  return <aside className="agenda-form-preview" aria-label="Vista previa del evento">
    <p>Así se verá en tu agenda</p>
    <div className={`agenda-live-card ${eventColorClass({ category: draft.category, color })}`}>
      <span className="agenda-live-type"><FoxmindIcon name={eventCategoryIcons[draft.category]}/>{categoryLabels[draft.category]}</span>
      <h3>{draft.title.trim() || 'Tu próximo evento'}</h3>
      <p><FoxmindIcon name="calendar"/><span>{validDraftDate(startDate) ? dayLabel(startDate) : 'Elegí una fecha'}
        {endDate > startDate && validDraftDate(endDate) ? ` a ${dayLabel(endDate)}` : ''}</span></p>
      <div className="agenda-live-time"><FoxmindIcon name="clock"/><b>{allDay ? 'Todo el día' : <>{startTime || '—'} <span>a</span> {endTime || '—'}</>}</b>
        {duration ? <small>{duration}</small> : null}</div>
      <div className="agenda-live-color"><i/>{eventColorLabel(color)}</div>
    </div>
    <p className="agenda-preview-private"><FoxmindIcon name="lock"/>Este evento es para vos. No cambia las actividades ni sus fechas de entrega.</p>
  </aside>;
}
