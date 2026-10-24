import { useEffect, useRef, useState } from 'react';
import type { AgendaTarget, PrivateEvent } from '../../src/core/domain/index.ts';
import { Notice } from '../classrooms-ui/components.tsx';
import type { AgendaClient } from './api.ts';
import { AgendaMonth } from './AgendaMonth.tsx';
import { AgendaDay } from './AgendaDay.tsx';
import { Upcoming } from './Upcoming.tsx';
import { EventForm } from './EventForm.tsx';
import { monthRange } from './calendar.ts';
import { useAgenda } from './useAgenda.ts';
import { useAgendaView } from './useAgendaView.ts';
import { AgendaHeader } from './AgendaHeader.tsx';
import { useAgendaResult } from './useAgendaResult.ts';

export function Agenda({ api, onOpen }: { api: AgendaClient; onOpen: (target: AgendaTarget) => void }) {
  const view = useAgendaView(), data = useAgenda(api, monthRange(view.month, view.zone));
  const [editing, setEditing] = useState<{ event?: PrivateEvent } | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const result = useAgendaResult(view, data.reload, () => setEditing(null));
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
  return <main id="agenda-main" className="p5-main agenda-main">
    <AgendaHeader onCreate={() => setEditing({})} onToday={view.today} zone={view.zone} onZone={view.changeZone} />
    {result.notice ? <Notice>{result.notice} {result.event ? <button onClick={result.showEvent}>{result.event.repeat.kind === 'WEEKLY' ? 'Ver inicio de la serie' : 'Ver evento'}</button> : null}</Notice> : null}
    {error ? <Notice error>{error}</Notice> : null}
    {data.error ? <Notice error>{data.error} <button onClick={() => void data.reload()}>Volver a intentar</button></Notice> : null}
    {data.loading ? <Notice>Consultando tu agenda…</Notice> : null}
    <div className="agenda-layout"><div className="agenda-primary">
      <AgendaMonth month={view.month} selected={view.day} zone={view.zone} items={data.items} onSelect={view.select} onMonth={view.move} loading={data.loading} />
      {!data.loading && !data.error ? <AgendaDay day={view.day} zone={view.zone} items={data.items} busy={busy} focusEventId={result.focusEventId} focusRequest={result.focusRequest} onEdit={event => setEditing({ event })} onOpen={target => void open(target)} onCreate={() => setEditing({})} /> : null}
    </div><Upcoming items={data.upcoming} loading={data.loading} error={data.error} busy={busy} onOpen={target => void open(target)} /></div>
    {editing ? <EventForm api={api} event={editing.event} day={view.day} zone={view.zone} onClose={() => setEditing(null)} onSaved={result.saved} /> : null}
  </main>;
}
