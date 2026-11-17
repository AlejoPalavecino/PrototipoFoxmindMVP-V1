import type { Dispatch, SetStateAction } from 'react';
import type { StudyExam } from '../../model/study-contracts.ts';

import { Dialog } from '../../../../../../shared-ui/feedback';
type Session = StudyExam['sessions'][number];
import { studyInstant } from '../../model/study-time';
export function renderStudyExamSessionEditor({ editing, timeZone, local, setEditing, setSessions, setDirty, setError }: {
  editing: Session;
  timeZone: string;
  local: (instant: string) => string;
  setEditing: (session: Session | undefined) => void;
  setSessions: Dispatch<SetStateAction<Session[]>>;
  setDirty: (value: boolean) => void;
  setError: (value: string) => void;
}) {
  return (<Dialog title="Acomodá esta sesión" className="study-exact-session-dialog" onClose={() => setEditing(undefined)}>
    <p className="study-exact-subtitle">Busquemos un momento que te sirva.</p>
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!editing.title.trim())
        return;
      setSessions((items) => items.map((item) => (item.id === editing.id ? editing : item)));
      setDirty(true);
      setEditing(undefined);

    }}>
      <label>
        Actividad
        <input
          required
          maxLength={120}
          value={editing.title}
          onChange={(event) => setEditing({
            ...editing,
            title: event.target.value

          })} />
      </label>
      <div className="study-exact-form-pair">
        <label>
          Fecha
          <input
            type="date"
            required
            value={local(editing.startAt).slice(0, 10)}
            onChange={(event) => {
              try {
                const startAt = studyInstant(event.target.value + 'T' + local(editing.startAt).slice(11), timeZone);
                setEditing({
                  ...editing,
                  startAt,
                  endAt: new Date(Date.parse(startAt) + editing.minutes * 60000).toISOString(),

                });

              }
              catch (error) {
                setError(error instanceof Error ? error.message : 'Revisá el horario.');

              }

            }} />
        </label>
        <label>
          Empieza a las
          <input
            type="time"
            required
            value={local(editing.startAt).slice(11)}
            onChange={(event) => {
              try {
                const startAt = studyInstant(local(editing.startAt).slice(0, 10) + 'T' + event.target.value, timeZone);
                setEditing({
                  ...editing,
                  startAt,
                  endAt: new Date(Date.parse(startAt) + editing.minutes * 60000).toISOString(),

                });

              }
              catch (error) {
                setError(error instanceof Error ? error.message : 'Revisá el horario.');

              }

            }} />
        </label>
      </div>
      <label>
        Aviso dentro de FoxMind
        <select value={editing.reminderMinutes ?? ''} onChange={(event) => setEditing({
          ...editing,
          reminderMinutes: event.target.value === '' ? null : Number(event.target.value),
        })}>
          <option value="">Sin aviso</option>
          <option value="0">Al comenzar</option>
          <option value="15">15 minutos antes</option>
          <option value="60">1 hora antes</option>
          <option value="1440">1 día antes</option>
        </select>
      </label>
      <p className="study-exact-context-switch-note">
        Duración: {editing.minutes} minutos. Los cambios todavía no se guardan en el plan.
      </p>
      <footer className="study-exact-dialog-footer">
        <button type="button" onClick={() => setEditing(undefined)}>
          Volver al plan
        </button>
        <button className="primary">Aplicar al plan</button>
      </footer>
    </form>
  </Dialog>);

}
