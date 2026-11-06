import surface from './agenda-surface.module.css';
import { useEffect, useRef, useState } from 'react';
import {expandAgendaEvent,seriesSchedules,type AgendaTarget,type PrivateEvent} from '../../src/core/domain/index.ts';
import { Notice } from '../classrooms-ui/components.tsx';
import type { AgendaClient } from './api.ts';
import { AgendaMonth } from './AgendaMonth.tsx';
import { AgendaDay } from './AgendaDay.tsx';
import { AgendaAfterDay } from './AgendaAfterDay.tsx';
import { EventForm } from './EventForm.tsx';
import { calendarRange, type CalendarMode } from './calendar.ts';
import { AgendaPeriod } from './AgendaPeriod.tsx';
import { useAgenda } from './useAgenda.ts';
import { useAgendaView } from './useAgendaView.ts';
import { AgendaHeader } from './AgendaHeader.tsx';
import { useAgendaResult } from './useAgendaResult.ts';
import { useAgendaEventTarget, type AgendaEventRequest } from './useAgendaEventTarget.ts';
import {EventDetails} from './EventDetails.tsx';

export function Agenda({ api, onOpen, requestedEvent,onEventSelected }: { api: AgendaClient; onOpen: (target: AgendaTarget) => void; requestedEvent?: AgendaEventRequest | null;onEventSelected?:(target:AgendaEventRequest|null)=>void }) {
  const [resolvedMode, setMode] = useState<CalendarMode>();
  useEffect(() => {
    const compact = window.matchMedia?.('(max-width: 600px)').matches;
    setMode(current => current ?? (compact ? 'DAY' : 'MONTH'));
  }, []);
  const mode = resolvedMode ?? 'MONTH';
  const view = useAgendaView(), data = useAgenda(api, calendarRange(mode, view.day, view.month, view.zone), resolvedMode !== undefined, view.day);
  const [editing, setEditing] = useState<{ event?: PrivateEvent; occurrenceDate?: string;scope?:'single'|'series' } | null>(null);
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
  const modeControls = <nav className="agenda-mode-controls" aria-label="Vista de agenda">{(['MONTH', 'WEEK', 'DAY'] as const).map(value =>
    <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{{ MONTH: 'Mes', WEEK: 'Semana', DAY: 'Día' }[value]}</button>)}</nav>;
  const closeDetails=()=>{setDetails(null);onEventSelected?.(null);};
  const editor=editing?<EventForm api={api} event={editing.event} occurrenceDate={editing.occurrenceDate} initialScope={editing.scope} day={view.day} zone={view.zone} onClose={()=>setEditing(null)} onSaved={outcome=>{closeDetails();result.saved(outcome);}}/>:null;
  if(details)return <main id="agenda-main" className={`p5-main agenda-main ${surface.scope}`}><EventDetails api={api} event={details.event} occurrenceDate={details.occurrenceDate} onBack={closeDetails}
    onEdit={scope=>setEditing({...details,scope})} onRemoved={()=>{closeDetails();void data.reload();}}/>{editor}</main>;
  return <main id="agenda-main" className={`p5-main agenda-main ${surface.scope}`}>
    <AgendaHeader onCreate={() => setEditing({})} />
    {result.notice ? <Notice>{result.notice} {result.event ? <button onClick={result.showEvent}>{result.event.repeat.kind !== 'NONE' ? 'Ver inicio de la serie' : 'Ver evento'}</button> : null}</Notice> : null}
    {error ? <Notice error>{error}</Notice> : null}
    {requested.error ? <Notice error>{requested.error}</Notice> : null}
    {data.calendar.error ? <Notice error>{data.calendar.error} <button onClick={() => void data.calendar.reload()}>Volver a intentar</button></Notice> : null}
    {data.calendar.loading ? <Notice>Consultando tu agenda…</Notice> : null}
    <div className="agenda-layout"><div className="agenda-primary">
      {mode === 'MONTH' ? <AgendaMonth month={view.month} selected={view.day} zone={view.zone} items={data.calendar.items} onSelect={view.select} onMonth={view.move} onToday={view.today} loading={data.calendar.loading} >{modeControls}</AgendaMonth>
        : <AgendaPeriod mode={mode} day={view.day} zone={view.zone} items={data.calendar.items} onSelect={view.select} onToday={view.today} loading={data.calendar.loading} onItem={item => item.kind === 'PRIVATE_EVENT' ? void openEditor(item.event, item.occurrenceDate ?? item.occurrenceId.slice(item.event.id.length + 1)) : void open(item.target)} >{modeControls}</AgendaPeriod>}
      {mode === 'DAY' && !data.calendar.loading && !data.calendar.error ? <AgendaDay day={view.day} zone={view.zone} items={data.calendar.items} busy={busy} focusEventId={result.focusEventId ?? (view.day === requestedEvent?.date ? requested.focusEventId : undefined)} focusRequest={result.focusRequest} onEdit={(event, occurrenceDate) => void openEditor(event, occurrenceDate)} onOpen={target => void open(target)} onCreate={() => setEditing({})} /> : null}
    </div><div className="agenda-sidebar">
      {mode !== 'DAY' && !data.calendar.loading && !data.calendar.error ? <AgendaDay day={view.day} zone={view.zone} items={data.calendar.items} busy={busy} focusEventId={result.focusEventId ?? (view.day === requestedEvent?.date ? requested.focusEventId : undefined)} focusRequest={result.focusRequest} onEdit={(event, occurrenceDate) => void openEditor(event, occurrenceDate)} onOpen={target => void open(target)} onCreate={() => setEditing({})} /> : null}
      <AgendaAfterDay day={view.day} zone={view.zone} items={data.afterDay.items} loading={data.afterDay.loading} error={data.afterDay.error} onRetry={() => void data.afterDay.reload()} busy={busy} onEdit={(event, occurrenceDate) => void openEditor(event, occurrenceDate)} onOpen={target => void open(target)} />
    </div>
    </div>
    {editor}
  </main>;
}
