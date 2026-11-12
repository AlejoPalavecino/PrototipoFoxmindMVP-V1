import surface from './agenda-surface.module.css';
import { useEffect, useRef, useState } from 'react';
import {expandAgendaEvent,seriesSchedules,type AgendaTarget,type PrivateEvent} from '../../../../../../src/core/domain/agenda/index.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import type { AgendaClient } from '../api/api.ts';
import polish from './agenda-ux.module.css';
import { AgendaToolbar } from './AgendaToolbar.tsx';
import { AgendaMonth } from './AgendaMonth.tsx';
import { AgendaDay } from './AgendaDay.tsx';
import { AgendaAfterDay } from './AgendaAfterDay.tsx';
import { EventForm } from './EventForm.tsx';
import { calendarRange, type CalendarMode } from '../model/calendar.ts';
import { AgendaPeriod } from './AgendaPeriod.tsx';
import { useAgenda } from '../model/useAgenda.ts';
import { useAgendaView } from '../model/useAgendaView.ts';
import { AgendaHeader } from './AgendaHeader.tsx';
import { useAgendaResult } from '../model/useAgendaResult.ts';
import { useAgendaEventTarget, type AgendaEventRequest } from '../model/useAgendaEventTarget.ts';
import {EventDetails} from './EventDetails.tsx';

export function Agenda({ api, onOpen, requestedEvent,onEventSelected }: { api: AgendaClient; onOpen: (target: AgendaTarget) => void; requestedEvent?: AgendaEventRequest | null;onEventSelected?:(target:AgendaEventRequest|null)=>void }) {
  const [resolvedMode, setMode] = useState<CalendarMode>();
  useEffect(() => {
    const compact = window.matchMedia?.('(max-width: 600px)').matches;
    setMode(current => current ?? (compact ? 'DAY' : 'MONTH'));
  }, []);
  const mode = resolvedMode ?? 'MONTH';
  const [daySheet, setDaySheet] = useState(false);
  const calendarBody = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 920px)');
    const resized = () => { if (!media?.matches) setDaySheet(false); };
    media?.addEventListener?.('change', resized);
    return () => media?.removeEventListener?.('change', resized);
  }, []);
  const view = useAgendaView(), data = useAgenda(api, calendarRange(mode, view.day, view.month, view.zone), resolvedMode !== undefined, view.day);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const animation = calendarBody.current?.animate?.([{ opacity: 0.65, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 160, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [mode, view.month, mode === 'MONTH' ? '' : view.day]);
  const selectDay = (day: string) => {
    view.select(day);
    if (mode !== 'DAY' && window.matchMedia?.('(max-width: 920px)').matches) setDaySheet(true);
  };
  const [editing, setEditing] = useState<{ event?: PrivateEvent; occurrenceDate?: string;scope?:'single'|'series' } | null>(null);
  const [details,setDetails]=useState<{event:PrivateEvent;occurrenceDate:string}|null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const editorRequest=useRef(0);
  useEffect(()=>()=>{editorRequest.current++;},[]);
  async function openEditor(event: PrivateEvent, occurrenceDate?: string) {
    setDaySheet(false);
    if(onEventSelected){onEventSelected({eventId:event.id,date:occurrenceDate??(event.schedule.kind==='ALL_DAY'?event.schedule.startDate:event.schedule.startLocal.slice(0,10))});return;}
    const request=++editorRequest.current;setBusy(true);setError('');
    try{const original=await api.get(event.id);if(request===editorRequest.current)setDetails({event:original,occurrenceDate:occurrenceDate??(original.schedule.kind==='ALL_DAY'?original.schedule.startDate:original.schedule.startLocal.slice(0,10))});}
    catch(error){if(request===editorRequest.current)setError((error as Error).message);}
    finally{if(request===editorRequest.current)setBusy(false);}
  }
  const result = useAgendaResult(view, data.reload, () => setEditing(null));
  const requested = useAgendaEventTarget(api, requestedEvent, view.select);
  const hadRequested=useRef(false);
  useEffect(()=>{
    const previous=hadRequested.current;hadRequested.current=!!requestedEvent;
    if(!requestedEvent){if(previous){setDetails(null);setEditing(null);}return;}
    if(!requested.event||requested.event.id!==requestedEvent.eventId)return;
    if(seriesSchedules(requested.event).some(item=>(item.kind==='ALL_DAY'?item.startDate:item.startLocal.slice(0,10))===requestedEvent.date)){
      setDetails({event:requested.event,occurrenceDate:requestedEvent.date});return;
    }
    const end=new Date(Date.parse(requestedEvent.date+'T12:00:00Z')+86400000).toISOString().slice(0,10);
    const occurrence=expandAgendaEvent(requested.event,{startDate:requestedEvent.date,endDateExclusive:end,timeZone:view.zone})[0];
    if(occurrence)setDetails({event:requested.event,occurrenceDate:occurrence.occurrenceDate??occurrence.occurrenceId.slice(requested.event.id.length+1)});
  },[requested.event,requestedEvent?.eventId,requestedEvent?.date,view.zone]);
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
  const createForDay = () => { setDaySheet(false); setEditing({}); };
  const selectedDay = <AgendaDay day={view.day} zone={view.zone} items={data.calendar.items} busy={busy}
    focusEventId={result.focusEventId ?? (view.day === requestedEvent?.date ? requested.focusEventId : undefined)} focusRequest={result.focusRequest}
    onEdit={(event, date) => void openEditor(event, date)} onOpen={target => { setDaySheet(false); void open(target); }} onCreate={createForDay} />;
  if(details)return <main id="agenda-main" className={`p5-main agenda-main ${surface.scope} ${polish.scope}`}><EventDetails api={api} event={details.event} occurrenceDate={details.occurrenceDate} onBack={closeDetails}
    onEdit={scope=>setEditing({...details,scope})} onRemoved={()=>{closeDetails();void data.reload();}}/>{editor}</main>;
  return <main id="agenda-main" className={`p5-main agenda-main ${surface.scope} ${polish.scope}`}>
    <AgendaHeader onCreate={createForDay} />
    {result.notice ? <Notice>{result.notice} {result.event ? <button onClick={result.showEvent}>{result.event.repeat.kind !== 'NONE' ? 'Ver inicio de la serie' : 'Ver evento'}</button> : null}</Notice> : null}
    {error ? <Notice error>{error}</Notice> : null}
    {requested.error ? <Notice error>{requested.error}</Notice> : null}
    {data.calendar.error ? <Notice error>{data.calendar.error} <button onClick={() => void data.calendar.reload()}>Volver a intentar</button></Notice> : null}
    <div className="agenda-layout"><div className="agenda-primary">
      <AgendaToolbar mode={mode} day={view.day} month={view.month} zone={view.zone} onMode={value => { setDaySheet(false); setMode(value); }} onSelect={view.select} onMonth={view.move} onToday={view.today} />
      <div className="agenda-calendar-body" ref={calendarBody} aria-busy={data.calendar.loading}>
        <div className="agenda-loading-line" role="status">{data.calendar.loading ? 'Consultando tu agenda…' : ''}</div>
        {mode === 'MONTH' ? <AgendaMonth hideHeader month={view.month} selected={view.day} zone={view.zone} items={data.calendar.items} onSelect={selectDay} onMonth={view.move} onToday={view.today} loading={data.calendar.loading} />
          : <AgendaPeriod hideHeader mode={mode} day={view.day} zone={view.zone} items={data.calendar.items} onSelect={view.select} onDaySelect={selectDay} onToday={view.today} loading={data.calendar.loading} onItem={item => item.kind === 'PRIVATE_EVENT' ? void openEditor(item.event, item.occurrenceDate ?? item.occurrenceId.slice(item.event.id.length + 1)) : void open(item.target)} />}
        {mode === 'DAY' && !data.calendar.loading && !data.calendar.error ? selectedDay : null}
      </div>
    </div><div className="agenda-sidebar">
      {mode !== 'DAY' ? <div className="agenda-desktop-day">{!data.calendar.loading && !data.calendar.error ? selectedDay : <Notice>{data.calendar.loading ? 'Cargando el día seleccionado…' : 'No pudimos cargar los eventos de este día.'}</Notice>}</div> : null}
      <AgendaAfterDay day={view.day} zone={view.zone} items={data.afterDay.items} loading={data.afterDay.loading} error={data.afterDay.error} onRetry={() => void data.afterDay.reload()} busy={busy} onEdit={(event, occurrenceDate) => void openEditor(event, occurrenceDate)} onOpen={target => void open(target)} />
    </div>
    </div>
    {daySheet ? <Dialog title="Eventos del día" className="agenda-day-sheet" onClose={() => setDaySheet(false)}>
      {data.calendar.loading ? <Notice>Cargando el día seleccionado…</Notice> : data.calendar.error ? <Notice error>{data.calendar.error} <button onClick={() => void data.calendar.reload()}>Volver a intentar</button></Notice> : selectedDay}
    </Dialog> : null}
    {editor}
  </main>;
}
