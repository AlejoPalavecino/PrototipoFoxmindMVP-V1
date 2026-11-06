import { useEffect, useRef, useState } from 'react';
import { seriesSchedules, type PrivateEvent } from '../../src/core/domain/index.ts';
import type { AgendaClient } from './api.ts';
import { eventDraft, isDraftDirty } from './event-draft.ts';
import { eventFailure } from './event-validation.ts';
import { removeEditor, reviewEditor, saveEditor, type EditorActions } from './event-editor-actions.ts';
import type { DraftIssue, EventDraft, EventEditor, EventEditorOutcome } from './event-draft-types.ts';

export function useEventEditor(api: AgendaClient, original: PrivateEvent | undefined, day: string,
  zone: string, onSaved: (outcome: EventEditorOutcome) => void, occurrenceDate?: string): EventEditor {
  const makeBaseline=(source=original)=>{
    if (!source || !occurrenceDate) return eventDraft(source, day, zone);
    const replacement = source.exceptions?.find(item => item.date === occurrenceDate)?.replacement;
    const schedule = replacement?.schedule ?? seriesSchedules(source).find(schedule => (schedule.kind === 'ALL_DAY' ? schedule.startDate : schedule.startLocal.slice(0,10)) === occurrenceDate) ?? source.schedule;
    return eventDraft({...source,...replacement,schedule,repeat:{kind:'NONE'}},occurrenceDate,zone);
  };
  const [baseline,setBaseline] = useState(()=>makeBaseline());
  const [draft, setDraft] = useState(baseline), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [issues, setIssues] = useState<readonly DraftIssue[]>([]);
  const [conflict, setConflict] = useState(false), [stored, setStored] = useState<PrivateEvent>();
  const id = useRef(original?.id ?? crypto.randomUUID()), version = useRef(original);
  const locked = useRef(false), conflicted = useRef(false), completed = useRef(false);
  const previousOccurrence=useRef(occurrenceDate);
  useEffect(()=>{
    if(previousOccurrence.current===occurrenceDate)return;
    previousOccurrence.current=occurrenceDate;
    const next=makeBaseline(version.current);setBaseline(next);setDraft(next);setError('');setIssues([]);setStored(undefined);conflicted.current=false;setConflict(false);
  },[occurrenceDate]);
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
  const state: EditorActions = { api, original, draft, occurrenceDate, id, version, conflict: conflicted, completed,
    onSaved, setIssues, setError, setStored, run,
    clearConflict: () => { conflicted.current = false; setConflict(false); } };
  return { draft, setDraft: (value: EventDraft) => { if (!locked.current) setDraft(value); }, busy, dirty, error,
    issues, conflict, stored, save: () => saveEditor(state), remove: () => removeEditor(state), review: () => reviewEditor(state),
    requestClose: () => !locked.current && (!dirty || window.confirm('¿Descartar los cambios del evento?')) };
}
