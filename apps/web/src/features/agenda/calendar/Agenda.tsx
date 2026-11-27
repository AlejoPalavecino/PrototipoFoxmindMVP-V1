import surface from './agenda-surface.module.css';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {expandAgendaEvent,seriesSchedules,type AgendaTarget,type PrivateEvent} from '../../../../../../src/core/domain/agenda/index.ts';
import { Notice } from '../../../../../shared-ui/feedback.tsx';
import type { AgendaClient } from '../api/api.ts';
import polish from './agenda-ux.module.css';
import { AgendaToolbar } from './AgendaToolbar.tsx';
import { AgendaMonth } from './AgendaMonth.tsx';
import { AgendaDay } from './AgendaDay.tsx';
import { EventForm } from '../event-editor/EventForm.tsx';
import { calendarRange, type CalendarMode } from '../model/calendar.ts';
import { AgendaPeriod } from './AgendaPeriod.tsx';
import { useAgenda } from './useAgenda.ts';
import { useAgendaView, type AgendaViewTarget } from './useAgendaView.ts';
import { AgendaHeader } from './AgendaHeader.tsx';
import { useAgendaResult } from './useAgendaResult.ts';
import { useAgendaEventTarget, type AgendaEventRequest } from './useAgendaEventTarget.ts';
import { EventDetails } from '../event-details/EventDetails.tsx';
import exact from './agenda-exact.module.css';

export function Agenda({ api, onOpen, requestedEvent, onEventSelected, requestedView, onCreateLinkConsumed, role = 'student' }: {
  api: AgendaClient;
  onOpen: (target: AgendaTarget) => void;
  requestedEvent?: AgendaEventRequest | null;
  onEventSelected?: (target: AgendaEventRequest | null) => void;
  requestedView?: AgendaViewTarget | null;
  onCreateLinkConsumed?: () => void;
  role?: 'student' | 'teacher';
}) {
  const [resolvedMode, setMode] = useState<CalendarMode | undefined>(requestedView?.view);
  useEffect(() => {
    setMode(current => current ?? 'MONTH');
  }, []);
  const mode = resolvedMode ?? 'MONTH';
  const calendarBody = useRef<HTMLDivElement>(null);
  const dayPanel = useRef<HTMLDivElement>(null);
  const revealDay = useRef<string | null>(null);
  const view = useAgendaView();
  // Day view has a seven-day strip; fetch the same window we actually show.
  const data = useAgenda(api, calendarRange(mode === 'DAY' ? 'WEEK' : mode, view.day, view.month, view.zone),
    resolvedMode !== undefined && view.ready, undefined, true);
  useEffect(() => {
    if (mode !== 'MONTH' || revealDay.current !== view.day || data.calendar.loading) return;
    revealDay.current = null;
    const anchor = dayPanel.current?.querySelector<HTMLElement>('h2') ?? dayPanel.current;
    anchor?.focus({ preventScroll: true });
    dayPanel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [mode, view.day, data.calendar.loading]);
  const animatedDay = mode === 'MONTH' ? '' : view.day;
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const animation = calendarBody.current?.animate?.([{ opacity: 0.65, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 160, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [mode, view.month, animatedDay]);
  const selectDay = (day: string) => {
    view.select(day);
    if (mode !== 'MONTH' || !window.matchMedia?.('(max-width: 1050px)').matches) return;
    if (day !== view.day || data.calendar.loading) {
      revealDay.current = day;
      return;
    }
    const anchor = dayPanel.current?.querySelector<HTMLElement>('h2') ?? dayPanel.current;
    anchor?.focus({ preventScroll: true });
    dayPanel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  const [editing, setEditing] = useState<{ event?: PrivateEvent; occurrenceDate?: string;scope?:'single'|'series' } | null>(null);
  const requestApplied = useRef('');
  const destinationKey = requestedView ? `${requestedView.date ?? ''}:${requestedView.create ? 'create' : requestedView.view}` : '';
  const applyRequestedView = useEffectEvent(() => {
    if (!view.ready) return;
    if (!destinationKey) { requestApplied.current = ''; return; }
    if (requestApplied.current === destinationKey) return;
    requestApplied.current = destinationKey;
    if (requestedView?.date) view.select(requestedView.date);
    else if (requestedView?.create) view.today();
    if (requestedView?.view) setMode(requestedView.view);
    if (requestedView?.create) {
      setEditing({});
      onCreateLinkConsumed?.();
    }
  });
  useEffect(() => { applyRequestedView(); }, [destinationKey, view.ready]);
  const [details,setDetails]=useState<{event:PrivateEvent;occurrenceDate:string}|null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const editorRequest=useRef(0);
  useEffect(()=>()=>{editorRequest.current++;},[]);
  async function openEditor(event: PrivateEvent, occurrenceDate?: string) {
    if(onEventSelected){onEventSelected({eventId:event.id,date:occurrenceDate??(event.schedule.kind==='ALL_DAY'?event.schedule.startDate:event.schedule.startLocal.slice(0,10))});return;}
    const request=++editorRequest.current;setBusy(true);setError('');
    try{const original=await api.get(event.id);if(request===editorRequest.current)setDetails({event:original,occurrenceDate:occurrenceDate??(original.schedule.kind==='ALL_DAY'?original.schedule.startDate:original.schedule.startLocal.slice(0,10))});}
    catch(error){if(request===editorRequest.current)setError((error as Error).message);}
    finally{if(request===editorRequest.current)setBusy(false);}
  }
  const result = useAgendaResult(view, data.reload, () => setEditing(null));
  const requested = useAgendaEventTarget(api, requestedEvent, view.select);
  const hadRequested=useRef(false);
  const showRequestedEvent = useEffectEvent(() => {
    const previous=hadRequested.current;hadRequested.current=!!requestedEvent;
    if(!requestedEvent){if(previous){setDetails(null);setEditing(null);}return;}
    if (!requested.event || requested.event.id !== requestedEvent.eventId) return;
    const date = requestedEvent.date;
    const hasDate = seriesSchedules(requested.event).some(item =>
      (item.kind === 'ALL_DAY' ? item.startDate : item.startLocal.slice(0, 10)) === date);
    const cancelled = requested.event.exceptions?.some(item => item.date === date && item.replacement === null);
    if (hasDate && !cancelled) {
      setError('');
      setDetails({ event: requested.event, occurrenceDate: date });
      return;
    }
    const end = new Date(Date.parse(date + 'T12:00:00Z') + 86_400_000).toISOString().slice(0, 10);
    const occurrence = cancelled ? undefined : expandAgendaEvent(requested.event, { startDate: date, endDateExclusive: end, timeZone: view.zone })[0];
    if (occurrence) {
      setError('');
      setDetails({ event: requested.event, occurrenceDate: occurrence.occurrenceDate ?? occurrence.occurrenceId.slice(requested.event.id.length + 1) });
    } else {
      setDetails(null);
      setError('Este evento ya no está disponible. Podés consultar tu agenda.');
    }
  });
  useEffect(() => { showRequestedEvent(); }, [requested.event, requestedEvent?.eventId, requestedEvent?.date, view.zone]);
  const locked = useRef(false);
  const currentReload = useRef(data.reload);
  useEffect(() => { currentReload.current = data.reload; }, [data.reload]);
  const open = async (target: AgendaTarget) => {
    if (locked.current) return; locked.current = true; setBusy(true); setError('');
    try { onOpen(await api.open(target)); }
    catch (failure) {
      setError((failure as Error).message);
      if ((failure as { code?: string })?.code === 'FORBIDDEN') await currentReload.current();
    }
    finally { locked.current = false; setBusy(false); }
  };
  const closeDetails=()=>{setDetails(null);onEventSelected?.(null);};
  const editor=editing?<EventForm api={api} event={editing.event} occurrenceDate={editing.occurrenceDate} initialScope={editing.scope} day={view.day} zone={view.zone} onClose={()=>setEditing(null)} onSaved={outcome=>{closeDetails();result.saved(outcome);}}/>:null;
  const createForDay = () => { setError(''); setEditing({}); };
  const selectedDay = <AgendaDay day={view.day} zone={view.zone} items={data.calendar.items} busy={busy} role={role} variant={mode === 'DAY' ? 'focus' : 'panel'}
    focusEventId={result.focusEventId ?? (view.day === requestedEvent?.date ? requested.focusEventId : undefined)} focusRequest={result.focusRequest}
    onEdit={(event, date) => void openEditor(event, date)} onOpen={target => void open(target)} onCreate={createForDay} />;
  return <main id="agenda-main" className={`p5-main agenda-main ${surface.scope} ${polish.scope} ${exact.scope}`}>
    <AgendaHeader onCreate={createForDay} role={role} />
    {result.notice ? <div className="agenda-success" role="status">{result.notice} {result.event ? <button onClick={() => { if (mode === 'WEEK') setMode('DAY'); result.showEvent(); }}>{result.event.repeat.kind !== 'NONE' ? 'Ver inicio de la serie' : 'Ver evento'}</button> : null}</div> : null}
    {(requestedEvent && !requested.error && !requested.event) || busy ? <div className="agenda-request-loading" role="status">Abriendo en tu agenda…</div> : null}
    {error ? <Notice error>{error}</Notice> : null}
    {requested.error ? <Notice error>{requested.error}</Notice> : null}
    {data.calendar.error ? <Notice error>{data.calendar.error} <button onClick={() => void data.calendar.reload()}>Volver a intentar</button></Notice> : null}
    <div className={`agenda-layout agenda-layout-${mode.toLowerCase()}`}><div className="agenda-primary">
      <AgendaToolbar mode={mode} day={view.day} month={view.month} zone={view.zone} onMode={value => { revealDay.current = null; setMode(value); }} onSelect={view.select} onMonth={view.move} onToday={view.today} />
      <div className="agenda-calendar-body" ref={calendarBody} aria-busy={data.calendar.loading}>
        <div className="agenda-loading-line" role="status">{data.calendar.loading ? 'Consultando tu agenda…' : ''}</div>
        {mode === 'MONTH' ? <AgendaMonth hideHeader month={view.month} selected={view.day} zone={view.zone} items={data.calendar.items} onSelect={selectDay} onMonth={view.move} onToday={view.today} loading={data.calendar.loading} />
          : <AgendaPeriod hideHeader mode={mode} onCreateDay={day => { view.select(day); createForDay(); }} day={view.day} zone={view.zone} items={data.calendar.items} onSelect={view.select} onDaySelect={selectDay} onToday={view.today} loading={data.calendar.loading} failed={!!data.calendar.error} busy={busy} onItem={item => {
            if (item.kind === 'PRIVATE_EVENT') void openEditor(item.event, item.occurrenceDate ?? item.occurrenceId.slice(item.event.id.length + 1));
            else void open(item.target);
          }} />}
        {mode === 'DAY' && !data.calendar.loading && !data.calendar.error ? selectedDay : null}
      </div>
    </div>
    {mode === 'MONTH' ? <div className="agenda-month-day-panel" ref={dayPanel} tabIndex={-1}>
      {data.calendar.loading ? <div className="agenda-day-pending" role="status">Cargando el día seleccionado…</div>
        : data.calendar.error ? null : selectedDay}
    </div> : null}</div>
    {details && !editing ? <EventDetails api={api} event={details.event} occurrenceDate={details.occurrenceDate} onBack={closeDetails}
      onEdit={scope => setEditing({ ...details, scope })}
      onRemoved={() => { closeDetails(); result.saved({ kind: 'removed', id: details.event.id }); }} /> : null}
    {editor}
  </main>;
}
