import type { PrivateEvent } from '../../src/core/domain/index.ts';
import type { AgendaClient } from './api.ts';
import { validateDraft } from './event-validation.ts';
import type { DraftIssue, EventDraft, EventEditorOutcome } from './event-draft-types.ts';

export interface EditorActions {
  api: AgendaClient; original?: PrivateEvent; draft: EventDraft;
  occurrenceDate?: string;
  id: { current: string }; version: { current: PrivateEvent | undefined };
  conflict: { current: boolean }; completed: { current: boolean };
  onSaved(outcome: EventEditorOutcome): void;
  setIssues(issues: readonly DraftIssue[]): void; setError(message: string): void;
  setStored(event: PrivateEvent): void; clearConflict(): void;
  run(operation: () => Promise<void>): Promise<void>;
}
export function saveEditor(state: EditorActions): Promise<void> {
  if (state.conflict.current || state.completed.current) return Promise.resolve();
  return state.run(async () => {
    const validation = validateDraft(state.draft);
    state.setIssues(validation.issues);
    if (!validation.ok) { state.setError(validation.issues[0]?.message ?? 'Revisá el evento.'); return; }
    const payload = validation.payload, version = state.version.current;
    if (!state.occurrenceDate && version && (version.repeat.kind !== 'NONE' || payload.repeat.kind !== 'NONE')
      && !window.confirm('Guardar estos cambios afecta toda la serie, incluidas las fechas pasadas. ¿Continuar?')) return;
    const event = state.occurrenceDate && version
      ? await requireOccurrenceWriter(state)(state.id.current, version.revision, state.occurrenceDate, {...payload,repeat:{kind:'NONE'}})
      : version ? await state.api.replace(state.id.current, version.revision, payload)
      : await state.api.put(state.id.current, payload);
    state.completed.current = true;
    state.onSaved({ kind: 'saved', mode: state.original ? 'updated' : 'created', event: state.occurrenceDate ? {...event,...payload,repeat:{kind:'NONE'}} : event });
  });
}
export function removeEditor(state: EditorActions): Promise<void> {
  if (state.conflict.current || state.completed.current) return Promise.resolve();
  return state.run(async () => {
    const version = state.version.current;
    if (!version) return;
    const current = await state.api.get(state.id.current);
    if (current.revision !== version.revision) throw Object.assign(new Error('El evento cambió. Revisá la versión guardada antes de eliminar.'), { code: 'CONFLICT' });
    if (!window.confirm(!state.occurrenceDate && version.repeat.kind !== 'NONE'
      ? 'Se eliminará toda la serie, incluidas las fechas pasadas. ¿Eliminar serie?' : '¿Eliminar este evento privado?')) return;
    if (state.occurrenceDate) await requireOccurrenceWriter(state)(state.id.current, version.revision, state.occurrenceDate, null);
    else await state.api.remove(state.id.current, version.revision);
    state.completed.current = true;
    state.onSaved({ kind: 'removed', id: state.id.current });
  });
}
function requireOccurrenceWriter(state: EditorActions) {
  if (!state.api.changeOccurrence) throw Object.assign(new Error('No se pudo actualizar este evento.'),{code:'SERVICE_UNAVAILABLE'});
  return state.api.changeOccurrence.bind(state.api);
}
export function reviewEditor(state: EditorActions): Promise<void> {
  return state.run(async () => {
    const current = await state.api.get(state.id.current);
    state.version.current = current; state.setStored(current); state.clearConflict();
  });
}
