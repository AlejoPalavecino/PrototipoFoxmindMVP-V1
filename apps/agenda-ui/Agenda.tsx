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

export function Agenda({ api, onOpen }: { api: AgendaClient; onOpen: (target: AgendaTarget) => void }) {
  const view = useAgendaView(), data = useAgenda(api, monthRange(view.month, view.zone));
  const [editing, setEditing] = useState<{ event?: PrivateEvent } | null>(null);
  const [notice, setNotice] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
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
  const saved = (message: string) => {
    setEditing(null); setNotice(`${message} Actualizando agenda…`);
    void data.reload().then(ok => setNotice(ok ? message : `${message} No pudimos actualizar la vista. Reintentá la consulta; no hace falta volver a guardar.`));
  };
  return <main id="agenda-main" className="p5-main agenda-main">
    <AgendaHeader onCreate={() => setEditing({})} onToday={view.today} zone={view.zone} onZone={view.changeZone} />
    {notice ? <Notice>{notice}</Notice> : null}
    {error ? <Notice error>{error}</Notice> : null}
    {data.error ? <Notice error>{data.error} <button onClick={() => void data.reload()}>Volver a intentar</button></Notice> : null}
    {data.loading ? <Notice>Consultando tu agenda…</Notice> : null}
    <div className="agenda-layout"><div className="agenda-primary">
      <AgendaMonth month={view.month} selected={view.day} zone={view.zone} items={data.items} onSelect={view.select} onMonth={view.move} loading={data.loading} />
      {!data.loading && !data.error ? <AgendaDay day={view.day} zone={view.zone} items={data.items} busy={busy} onEdit={event => setEditing({ event })} onOpen={target => void open(target)} onCreate={() => setEditing({})} /> : null}
    </div><Upcoming items={data.upcoming} loading={data.loading} error={data.error} busy={busy} onOpen={target => void open(target)} /></div>
    {editing ? <EventForm api={api} event={editing.event} day={view.day} zone={view.zone} onClose={() => setEditing(null)} onSaved={saved} /> : null}
  </main>;
}
function AgendaHeader({ zone, onZone, onToday, onCreate }: { zone: string; onZone: (value: string) => void; onToday: () => void; onCreate: () => void }) {
  const zones = Array.from(new Set([zone, Intl.DateTimeFormat().resolvedOptions().timeZone, 'America/Argentina/Buenos_Aires', 'America/Montevideo', 'America/Santiago', 'America/Bogota', 'America/Mexico_City', 'America/New_York', 'Europe/Madrid', 'UTC']));
  return <header className="p5-page-head agenda-header"><div><p className="agenda-eyebrow">TU TIEMPO, EN ORDEN</p><h1>Mi <span>Agenda</span></h1>
    <p className="p5-lead">Tus clases, tus planes y lo próximo por entregar.</p></div>
    <div className="agenda-tools"><div className="p5-actions"><button onClick={onToday}>Hoy</button><button className="primary" onClick={onCreate}>+ Nuevo evento</button></div>
      <label>Zona del calendario<select value={zone} onChange={event => onZone(event.target.value)}>{zones.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </div></header>;
}
