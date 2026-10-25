import { useEffect, useRef, useState } from 'react';
import type { AgendaClient } from './api.ts';

export interface AgendaEventRequest { eventId: string; date: string }

/** Authorize the event before selecting its day; late responses cannot move a new target. */
export function useAgendaEventTarget(api: AgendaClient, target: AgendaEventRequest | null | undefined, select: (day: string) => void) {
  const [focusEventId, setFocusEventId] = useState<string>();
  const [error, setError] = useState('');
  const selection = useRef(select);
  selection.current = select;
  const eventId = target?.eventId, date = target?.date;
  useEffect(() => {
    let active = true;
    setFocusEventId(undefined); setError('');
    if (!eventId || !date) return;
    void api.get(eventId).then(event => {
      if (!active) return;
      if (event.id !== eventId) { setError('El evento ya no está disponible.'); return; }
      selection.current(date); setFocusEventId(eventId);
    }).catch(() => { if (active) setError('No pudimos abrir ese evento. El acceso puede haber cambiado; vuelve a consultar tu agenda.'); });
    return () => { active = false; };
  }, [api, eventId, date]);
  return { focusEventId, error };
}
