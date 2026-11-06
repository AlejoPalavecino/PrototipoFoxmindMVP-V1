import { useEffect, useRef, useState } from 'react';
import type { AgendaClient } from './api.ts';
import type {PrivateEvent} from '../../src/core/domain/index.ts';

export interface AgendaEventRequest { eventId: string; date: string }

/** Authorize the event before selecting its day; late responses cannot move a new target. */
export function useAgendaEventTarget(api: AgendaClient, target: AgendaEventRequest | null | undefined, select: (day: string) => void) {
  const [focusEventId, setFocusEventId] = useState<string>();
  const [error, setError] = useState('');
  const [event,setEvent]=useState<PrivateEvent|null>(null);
  const selection = useRef(select);
  selection.current = select;
  const eventId = target?.eventId, date = target?.date;
  useEffect(() => {
    let active = true;
    setFocusEventId(undefined); setError('');setEvent(null);
    if (!eventId || !date) return;
    void api.get(eventId).then(event => {
      if (!active) return;
      if (event.id !== eventId) { setError('El evento ya no está disponible.'); return; }
      const replacement=event.exceptions?.find(item=>item.date===date)?.replacement;
      const selectedDate=replacement?(replacement.schedule.kind==='ALL_DAY'?replacement.schedule.startDate:replacement.schedule.startLocal.slice(0,10)):date;
      selection.current(selectedDate); setFocusEventId(eventId);setEvent(event);
    }).catch(() => { if (active) setError('No pudimos abrir ese evento. El acceso puede haber cambiado; vuelve a consultar tu agenda.'); });
    return () => { active = false; };
  }, [api, eventId, date]);
  return { focusEventId, error,event };
}
