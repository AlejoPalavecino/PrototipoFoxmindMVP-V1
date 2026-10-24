import { useRef, useState } from 'react';
import type { PrivateEvent } from '../../src/core/domain/index.ts';
import type { AgendaClient } from './api.ts';
import { eventDraft, isDraftDirty } from './event-draft.ts';
import { eventFailure } from './event-validation.ts';
import { removeEditor, reviewEditor, saveEditor, type EditorActions } from './event-editor-actions.ts';
import type { DraftIssue, EventDraft, EventEditor, EventEditorOutcome } from './event-draft-types.ts';

export function useEventEditor(api: AgendaClient, original: PrivateEvent | undefined, day: string,
  zone: string, onSaved: (outcome: EventEditorOutcome) => void): EventEditor {
  const [baseline] = useState(() => eventDraft(original, day, zone));
  const [draft, setDraft] = useState(baseline), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [issues, setIssues] = useState<readonly DraftIssue[]>([]);
  const [conflict, setConflict] = useState(false), [stored, setStored] = useState<PrivateEvent>();
  const id = useRef(original?.id ?? crypto.randomUUID()), version = useRef(original);
  const locked = useRef(false), conflicted = useRef(false), completed = useRef(false);
  const dirty = isDraftDirty(draft, baseline);
  const run = async (operation: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { await operation(); }
    catch (failure) {
      const translated = eventFailure(failure, draft); setError(translated.message); setIssues(translated.issues);
      if (failure !== null && typeof failure === 'object' && 'code' in failure && failure.code === 'CONFLICT') {
        conflicted.current = true; setConflict(true);
      }
    } finally { locked.current = false; setBusy(false); }
  };
  const state: EditorActions = { api, original, draft, id, version, conflict: conflicted, completed,
    onSaved, setIssues, setError, setStored, run,
    clearConflict: () => { conflicted.current = false; setConflict(false); } };
  return { draft, setDraft: (value: EventDraft) => { if (!locked.current) setDraft(value); }, busy, dirty, error,
    issues, conflict, stored, save: () => saveEditor(state), remove: () => removeEditor(state), review: () => reviewEditor(state),
    requestClose: () => !locked.current && (!dirty || window.confirm('¿Descartar los cambios del evento?')) };
}
