
import type { StudyDetail, StudyExam } from '../../model/study-contracts.ts';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { Notice } from '../../../../../../shared-ui/feedback';
type Session = StudyExam['sessions'][number];
export function renderStudyExamSessions({ exam, sessions, activities, selection, scheduled, busy, saving, setSelection, setEditing, longDate, local, allTopics }: {
  exam: StudyExam;
  sessions: Session[];
  activities: ReadonlyMap<string, string>;
  selection: string[];
  scheduled: ReadonlyMap<string, string>;
  busy: boolean;
  saving: boolean;
  setSelection: (value: string[]) => void;
  setEditing: (session: Session) => void;
  longDate: (instant: string) => string;
  local: (instant: string) => string;
  allTopics: StudyDetail['folder']['units'][number]['topics'];
}) {
  return (<div className="study-exact-plan-review">
    <div className="study-exact-session-list">
      {sessions.map((session, index) => {
        const agendaEvent = scheduled.get(session.id);
        return <section className="study-exact-session" key={session.id}>
        <header>
          <span>{index + 1}</span>
          <div>
            <h4>{session.title}</h4>
            <p>
              {longDate(session.startAt)} · {local(session.startAt).slice(11)}–
              {local(session.endAt).slice(11)}
            </p>
          </div>
          {agendaEvent ? <strong className="study-exact-plan-scheduled"><FoxmindIcon name="check" />En agenda</strong> : <label>
            <input
              type="checkbox"
              checked={selection.includes(session.id)}
              disabled={busy || saving}
              onChange={(event) => setSelection(event.target.checked
                ? [...selection, session.id]
                : selection.filter((id) => id !== session.id))} />
            Agendar
          </label>}
        </header>
        <p>
          {allTopics
            .filter((topic) => session.topicIds.includes(topic.id))
            .map((topic) => topic.title)
            .join(' · ')}
        </p>
        <p className="study-exact-review-activity">{activities.get(session.id)}</p>
        {exam.conflicts
          ?.filter((conflict) => conflict.sessionId === session.id)
          .map((conflict) => (<Notice key={conflict.occurrenceId}>
            Coincide con «{conflict.title}» en tu Agenda.
          </Notice>))}
        <footer>
          <span>{session.minutes} minutos</span>
          {agendaEvent ? <a href={`/agenda?event=${encodeURIComponent(agendaEvent)}&date=${local(session.startAt).slice(0, 10)}`}>Ver en Agenda</a> : <button disabled={busy || saving} onClick={() => setEditing({
            ...session

          })}>
            <FoxmindIcon name="edit" />
            Editar
          </button>}
        </footer>
      </section>;
      })}
    </div>
  </div>);

}
