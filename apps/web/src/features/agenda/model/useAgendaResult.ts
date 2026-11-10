import { useEffect, useRef, useState } from 'react';
import type { PrivateEvent } from '../../../../../../src/core/domain/agenda/index.ts';
import type { EventEditorOutcome } from './event-draft-types.ts';
import { eventFocusDay } from './event-result.ts';

export function useAgendaResult(view: { month: string; zone: string; select(day: string): void },
  reload: () => Promise<boolean>, close: () => void) {
  const [notice, setNotice] = useState(''), [event, setEvent] = useState<PrivateEvent>();
  const [focusEventId, setFocusEventId] = useState<string>();
  const [focusRequest, setFocusRequest] = useState(0);
  const currentReload = useRef(reload), latest = useRef(0);
  useEffect(() => { currentReload.current = reload; }, [reload]);
  const saved = (outcome: EventEditorOutcome) => {
    close(); const generation = ++latest.current;
    const message = outcome.kind === 'removed' ? 'Evento eliminado.' : outcome.mode === 'created' ? 'Evento creado.' : 'Cambios guardados.';
    setNotice(message); setEvent(outcome.kind === 'saved' ? outcome.event : undefined); setFocusEventId(undefined);
    if (outcome.kind === 'saved' && outcome.mode === 'created') {
      const day = eventFocusDay(outcome.event, view.zone);
      view.select(day); setFocusEventId(outcome.event.id);
      if (day.slice(0, 7) !== view.month) return;
    }
    void currentReload.current().then(ok => {
      if (!ok && generation === latest.current) setNotice(`${message} No pudimos actualizar la vista. Reintentá la consulta; no hace falta volver a guardar.`);
    });
  };
  const showEvent = () => {
    if (!event) return;
    view.select(eventFocusDay(event, view.zone)); setFocusEventId(event.id); setFocusRequest(value => value + 1);
  };
  return { notice, event, focusEventId, focusRequest, saved, showEvent };
}
