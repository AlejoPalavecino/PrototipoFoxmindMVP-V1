
import type { StudyExam } from '../../model/study-contracts.ts';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { Dialog, Notice } from '../../../../../../shared-ui/feedback';
type Session = StudyExam['sessions'][number];
export function renderStudyExamAgendaConfirmation({ sessions, activities, selection, saving, busy, error, longDate, local, setConfirmation, onConfirm }: {
  sessions: Session[];
  activities: ReadonlyMap<string, string>;
  selection: string[];
  saving: boolean;
  busy: boolean;
  error: string;
  longDate: (instant: string) => string;
  local: (instant: string) => string;
  setConfirmation: (value: boolean) => void;
  onConfirm: () => void;
}) {
  return (<Dialog title="Estos momentos van a tu agenda" className="study-exact-schedule-confirm" onClose={() => {
    if (!saving)
      setConfirmation(false);

  }}>
    <p>
      {selection.length} {selection.length === 1 ? 'sesión personal' : 'sesiones personales'}{' '}
      de repaso
    </p>
    <div className="study-exact-agenda-confirm">
      {sessions
        .filter((session) => selection.includes(session.id))
        .map((session) => (<div key={session.id}>
          <span>
            <FoxmindIcon name="calendar" />
          </span>
          <div>
            <b>{session.title}</b>
            <small>
              {longDate(session.startAt)} · {local(session.startAt).slice(11)}–
              {local(session.endAt).slice(11)}
            </small>
            <p className="study-exact-review-activity">{activities.get(session.id)}</p>
          </div>
        </div>))}
    </div>
    <p className="study-exact-context-switch-note">
      Se guardará el plan y se agregarán sólo las sesiones elegidas. No cambia las fechas de
      tus actividades del aula.
    </p>
    {error && <Notice error>{error}</Notice>}
    <footer className="study-exact-dialog-footer">
      <button disabled={busy || saving} onClick={() => setConfirmation(false)}>
        Volver al plan
      </button>
      <button className="primary" disabled={busy || saving} onClick={onConfirm}>
        <FoxmindIcon name="check" />
        Agregar a mi Agenda
      </button>
    </footer>
  </Dialog>);

}
