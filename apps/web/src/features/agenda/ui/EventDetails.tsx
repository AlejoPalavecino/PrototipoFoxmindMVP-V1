import { useEffect, useId, useRef, useState } from 'react';
import { scheduleInstants, seriesSchedules, type EventSchedule, type PrivateEvent } from '../../../../../../src/core/domain/agenda/index.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import type { AgendaClient } from '../api/api.ts';
import { categoryLabels, dayLabel, shiftDay } from '../model/calendar.ts';
import { eventColorClass } from '../model/event-colors.ts';
import { reminderLabels } from '../model/event-reminders.ts';
import { studyReviewHref } from '../../../shared/study-review-link.ts';
import styles from './EventDetails.module.css';

type Scope = 'single' | 'series';
type Action = 'edit' | 'remove';
const eventIcons = { CLASS: 'book', ACTIVITY: 'calendar', EVALUATION: 'clipboard' } as const;
const repeatLabels = { DAILY: 'Diariamente', WEEKLY: 'Semanalmente', MONTHLY: 'Mensualmente' } as const;
const startDate = (schedule: EventSchedule) => schedule.kind === 'ALL_DAY' ? schedule.startDate : schedule.startLocal.slice(0, 10);

export function eventOccurrence(event: PrivateEvent, occurrenceDate: string) {
  const seriesSchedule = seriesSchedules(event).find(schedule => startDate(schedule) === occurrenceDate);
  const replacement = event.exceptions?.find(item => item.date === occurrenceDate)?.replacement;
  return seriesSchedule && replacement !== null ? replacement ?? { ...event, schedule: seriesSchedule } : null;
}

export function EventDetails({ api, event, occurrenceDate, onBack, onEdit, onRemoved, focusEdit }: {
  api: AgendaClient; event: PrivateEvent; occurrenceDate: string;
  onBack: () => void; onEdit: (scope: Scope) => void; onRemoved: () => void; focusEdit?: boolean;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const [scope, setScope] = useState<Scope>('single');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const lastAction = useRef<Action | null>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const deleteLabel = useId();
  const recurring = event.repeat.kind !== 'NONE';
  const value = eventOccurrence(event, occurrenceDate);

  useEffect(() => {
    // Let the native dialog open before returning focus to the edit action.
    if (focusEdit) queueMicrotask(() => editButton.current?.focus({ preventScroll: true }));
  }, [focusEdit]);

  useEffect(() => {
    if (action) keep.current?.focus();
    else if (lastAction.current) {
      const trigger = lastAction.current === 'edit' ? editButton : removeButton;
      trigger.current?.focus({ preventScroll: true });
    }
  }, [action]);

  function begin(next: Action) {
    lastAction.current = next;
    setError('');
    setScope('single');
    setAction(next);
  }

  function close() {
    if (locked.current) return;
    if (action) setAction(null);
    else onBack();
  }

  function edit(selected: Scope) {
    setAction(null);
    onEdit(selected);
  }

  async function remove() {
    if (locked.current || action !== 'remove') return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      if (scope === 'single' && recurring) {
        if (!api.changeOccurrence) throw Error('No pudimos eliminar este evento. Volvé a consultar tu agenda.');
        await api.changeOccurrence(event.id, event.revision, occurrenceDate, null);
      } else await api.remove(event.id, event.revision);
      onRemoved();
    } catch (failure) {
      const stale = (failure as { code?: string } | null)?.code === 'CONFLICT';
      setError(stale ? 'El evento cambió. Cerrá el detalle y volvé a abrirlo antes de eliminarlo.'
        : failure instanceof Error ? failure.message : 'No pudimos eliminar el evento. Podés volver a intentar.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  const title = action === 'remove' ? (scope === 'series' ? '¿Eliminar toda la serie?' : '¿Eliminar este evento?')
    : action === 'edit' ? 'Editar evento recurrente' : 'Tu evento';
  if (!value) return <Dialog captureEscape title={title} className={styles.dialog} onClose={onBack}>
    <div className={styles.content}><Notice>Este evento ya no está disponible.</Notice></div>
    <footer className={styles.footer}><button type="button" onClick={onBack}>Volver a la agenda</button></footer>
  </Dialog>;

  const timing = eventTiming(value.schedule);
  const reminder = reminderLabels.find(option => option.value === value.reminder?.minutes)?.label;
  const repeat = event.repeat.kind === 'NONE' ? null : repeatLabels[event.repeat.kind];
  const confirmLabel = scope === 'series' ? 'Eliminar serie' : 'Eliminar evento';
  return <Dialog captureEscape title={title} className={styles.dialog} onClose={close}>
    {action ? <>
      <div className={styles.content}>
        <p className={styles.intro}>{action === 'remove'
          ? (scope === 'series' ? 'Se quitarán todas las fechas de la serie, incluidas las pasadas.' : 'Se quitará de tu agenda personal.')
          : 'Elegí si querés editar este evento o toda la serie, incluidas las fechas pasadas.'}</p>
        <div className={styles.summary}><FoxmindIcon name="calendar"/><div>
          <strong>{value.title}</strong><small>{dayLabel(timing.date)} · {timing.hours}</small>
        </div></div>
        {action === 'remove' && recurring ? <fieldset className={styles.scope} disabled={busy}>
          <legend>¿Qué querés eliminar?</legend>
          <label><input type="radio" name={deleteLabel} value="single" checked={scope === 'single'} onChange={() => setScope('single')}/>Solo este evento</label>
          <label><input type="radio" name={deleteLabel} value="series" checked={scope === 'series'} onChange={() => setScope('series')}/>Toda la serie</label>
        </fieldset> : null}
        {error && action === 'remove' ? <Notice error>{error}</Notice> : null}
      </div>
      <footer className={styles.footer}>
        <button type="button" ref={keep} disabled={busy} onClick={close}>{action === 'remove' ? 'Conservar evento' : 'Cancelar'}</button>
        {action === 'remove' ? <button type="button" className="danger" disabled={busy} onClick={() => void remove()}>
          <FoxmindIcon name="trash"/>{busy ? 'Eliminando…' : confirmLabel}
        </button> : <>
          <button type="button" onClick={() => edit('single')}>Solo este evento</button>
          <button type="button" className="primary" onClick={() => edit('series')}>Toda la serie</button>
        </>}
      </footer>
    </> : <>
      <div className={styles.content}>
        <div className={`${styles.card} ${eventColorClass(value)}`}>
          <div className={styles.type}><FoxmindIcon name={event.reviewSession ? 'book' : eventIcons[value.category]}/>
            {event.reviewSession ? 'Repaso' : categoryLabels[value.category]}
            {timing.duration ? <span>{timing.duration}</span> : null}
          </div>
          <h3>{value.title}</h3>
          <div className={styles.when}>
            <span className={styles.paper} aria-hidden="true"><span>{timing.month}</span><strong>{Number(timing.date.slice(8))}</strong></span>
            <div><b>{dayLabel(timing.date)}</b><p>{timing.hours}</p></div>
          </div>
        </div>
        <div className={styles.note}><h4><FoxmindIcon name="edit"/>Para recordar</h4>
          <p>{value.description.trim() || 'No agregaste un recordatorio para este evento.'}</p>
        </div>
        {value.reminder || repeat ? <dl className={styles.meta}>
          {value.reminder ? <><dt>Aviso</dt><dd>{reminder}</dd></> : null}
          {repeat ? <><dt>Repetición</dt><dd>{repeat}</dd></> : null}
        </dl> : null}
        <p className={styles.privacy}><FoxmindIcon name="lock"/>Personal{timing.zone ? ` · ${timing.zone}` : ''}</p>
      </div>
      <footer className={styles.footer}>
        {event.reviewSession ? <a href={studyReviewHref(event.reviewSession)}><FoxmindIcon name="book"/>Abrir plan de repaso</a> : null}
        <button ref={removeButton} type="button" className="danger" onClick={() => begin('remove')}><FoxmindIcon name="trash"/>Eliminar</button>
        <button ref={editButton} type="button" className="primary" onClick={() => recurring ? begin('edit') : edit('series')}><FoxmindIcon name="edit"/>Editar evento</button>
      </footer>
    </>}
  </Dialog>;
}

function eventTiming(schedule: EventSchedule) {
  const date = startDate(schedule);
  const month = new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z')).replace(/\./g, '');
  if (schedule.kind === 'ALL_DAY') {
    const last = shiftDay(schedule.endDateExclusive, -1);
    const days = (Date.parse(schedule.endDateExclusive) - Date.parse(date)) / 86_400_000;
    return { date, month, hours: last === date ? 'Todo el día' : `Todo el día hasta el ${dayLabel(last)}`, duration: days > 1 ? `${days} días` : '', zone: '' };
  }
  const { startAt, endAt } = scheduleInstants(schedule);
  const minutes = (Date.parse(endAt) - Date.parse(startAt)) / 60_000;
  const duration = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
  const [endDate, endTime] = schedule.endLocal.split('T');
  const hours = `${schedule.startLocal.slice(11)} a ${endDate === date ? endTime : `${endTime} del ${dayLabel(endDate)}`}`;
  const zone = schedule.timeZone === 'America/Argentina/Buenos_Aires' ? 'Horario de Buenos Aires (UTC−3)' : schedule.timeZone;
  return { date, month, hours, duration, zone };
}
