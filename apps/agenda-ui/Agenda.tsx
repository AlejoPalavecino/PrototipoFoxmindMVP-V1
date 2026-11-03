import surface from './agenda-surface.module.css';
import { useEffect, useRef, useState } from 'react';
import type { AgendaTarget, PrivateEvent } from '../../src/core/domain/index.ts';
import { Notice } from '../classrooms-ui/components.tsx';
import type { AgendaClient } from './api.ts';
import { AgendaMonth } from './AgendaMonth.tsx';
import { AgendaDay } from './AgendaDay.tsx';
import { Upcoming } from './Upcoming.tsx';
import { EventForm } from './EventForm.tsx';
import { calendarRange, type CalendarMode } from './calendar.ts';
import { AgendaPeriod } from './AgendaPeriod.tsx';
import { useAgenda } from './useAgenda.ts';
import { useAgendaView } from './useAgendaView.ts';
import { AgendaHeader } from './AgendaHeader.tsx';
import { useAgendaResult } from './useAgendaResult.ts';
import { useAgendaEventTarget, type AgendaEventRequest } from './useAgendaEventTarget.ts';

export function Agenda({ api, onOpen, requestedEvent }: { api: AgendaClient; onOpen: (target: AgendaTarget) => void; requestedEvent?: AgendaEventRequest | null }) {
  const [resolvedMode, setMode] = useState<CalendarMode>();
  useEffect(() => {
    const compact = window.matchMedia?.('(max-width: 600px)').matches;
    setMode(current => current ?? (compact ? 'DAY' : 'MONTH'));
  }, []);
  const mode = resolvedMode ?? 'MONTH';
  const view = useAgendaView(), data = useAgenda(api, calendarRange(mode, view.day, view.month, view.zone), resolvedMode !== undefined);
  const [editing, setEditing] = useState<{ event?: PrivateEvent } | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const result = useAgendaResult(view, data.calendar.reload, () => setEditing(null));
  const requested = useAgendaEventTarget(api, requestedEvent, view.select);
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
  return <main id="agenda-main" className={`p5-main agenda-main ${surface.scope}`}>
    <AgendaHeader onCreate={() => setEditing({})} zone={view.zone} onZone={view.changeZone} />
    <nav className="agenda-mode-controls" aria-label="Vista de agenda">{(['MONTH', 'WEEK', 'DAY'] as const).map(value =>
      <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{{ MONTH: 'Mes', WEEK: 'Semana', DAY: 'Día' }[value]}</button>)}</nav>
    {result.notice ? <Notice>{result.notice} {result.event ? <button onClick={result.showEvent}>{result.event.repeat.kind !== 'NONE' ? 'Ver inicio de la serie' : 'Ver evento'}</button> : null}</Notice> : null}
    {error ? <Notice error>{error}</Notice> : null}
    {requested.error ? <Notice error>{requested.error}</Notice> : null}
    {data.calendar.error ? <Notice error>{data.calendar.error} <button onClick={() => void data.calendar.reload()}>Volver a intentar</button></Notice> : null}
    {data.calendar.loading ? <Notice>Consultando tu agenda…</Notice> : null}
    <div className="agenda-layout"><div className="agenda-primary">
      {mode === 'MONTH' ? <AgendaMonth month={view.month} selected={view.day} zone={view.zone} items={data.calendar.items} onSelect={view.select} onMonth={view.move} onToday={view.today} loading={data.calendar.loading} />
        : <AgendaPeriod mode={mode} day={view.day} zone={view.zone} items={data.calendar.items} onSelect={view.select} onToday={view.today} loading={data.calendar.loading} />}
      {!data.calendar.loading && !data.calendar.error ? <AgendaDay day={view.day} zone={view.zone} items={data.calendar.items} busy={busy} focusEventId={result.focusEventId ?? (view.day === requestedEvent?.date ? requested.focusEventId : undefined)} focusRequest={result.focusRequest} onEdit={event => setEditing({ event })} onOpen={target => void open(target)} onCreate={() => setEditing({})} /> : null}
    </div><Upcoming items={data.upcoming.items} loading={data.upcoming.loading} error={data.upcoming.error} onRetry={() => void data.upcoming.reload()} busy={busy} onOpen={target => void open(target)} />
    </div>
    {editing ? <EventForm api={api} event={editing.event} day={view.day} zone={view.zone} onClose={() => setEditing(null)} onSaved={result.saved} /> : null}
  </main>;
}
