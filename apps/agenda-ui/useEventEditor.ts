import { useRef, useState } from 'react';
import type { PrivateEvent } from '../../src/core/domain/index.ts';
import type { AgendaClient } from './api.ts';
import { draftPayload, eventDraft, eventFailure, type EventDraft } from './event-draft.ts';

export function useEventEditor(api: AgendaClient, original: PrivateEvent | undefined, day: string, zone: string, onSaved: (message: string) => void) {
  const [draft, setDraft] = useState(() => eventDraft(original, day, zone));
  const [version, setVersion] = useState(original), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [conflict, setConflict] = useState(false), [stored, setStored] = useState<PrivateEvent>();
  const id = useRef(original?.id ?? crypto.randomUUID()), locked = useRef(false);
  const run = async (operation: () => Promise<void>) => {
    if (locked.current) return; locked.current = true; setBusy(true); setError('');
    try { await operation(); } catch (failure) { setError(eventFailure(failure)); setConflict((failure as { code?: string }).code === 'CONFLICT'); }
    finally { locked.current = false; setBusy(false); }
  };
  const save = () => run(async () => {
    const payload = draftPayload(draft);
    if ((original?.repeat.kind === 'WEEKLY' || payload.repeat.kind === 'WEEKLY') && !window.confirm('Guardar estos cambios afecta toda la serie, incluidas las fechas pasadas. ¿Continuar?')) return;
    if (version) await api.replace(id.current, version.revision, payload);
    else await api.put(id.current, payload);
    onSaved('Evento guardado.');
  });
  const remove = () => run(async () => {
    if (!version || !window.confirm(version.repeat.kind === 'WEEKLY' ? 'Se eliminará toda la serie, incluidas las fechas pasadas. ¿Eliminar serie?' : '¿Eliminar este evento privado?')) return;
    const current = await api.get(id.current);
    if (current.revision !== version.revision) throw Object.assign(new Error('El evento cambió. Revisá la versión guardada antes de eliminar.'), { code: 'CONFLICT' });
    await api.remove(id.current, version.revision); onSaved('Evento eliminado.');
  });
  const review = () => run(async () => {
    const current = await api.get(id.current); setStored(current); setVersion(current); setConflict(false);
  });
  return { draft, setDraft: (value: EventDraft) => setDraft(value), busy, error, conflict, stored, save, remove, review };
}
