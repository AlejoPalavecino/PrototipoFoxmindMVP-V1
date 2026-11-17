
import type { StudyDetail, StudyExam } from '../../model/study-contracts.ts';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { Notice } from '../../../../../../shared-ui/feedback';
type Session = StudyExam['sessions'][number];
export function renderStudyExamSessions({ exam, sessions, selection, busy, saving, setSelection, setEditing, longDate, local, allTopics }: {
  exam: StudyExam;
  sessions: Session[];
  selection: string[];
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
      {sessions.map((session, index) => (<section className="study-exact-session" key={session.id}>
        <header>
          <span>{index + 1}</span>
          <div>
            <h4>{session.title}</h4>
            <p>
              {longDate(session.startAt)} · {local(session.startAt).slice(11)}–
              {local(session.endAt).slice(11)}
            </p>
          </div>
          <label>
            <input
              type="checkbox"
              checked={selection.includes(session.id)}
              disabled={busy || saving}
              onChange={(event) => setSelection(event.target.checked
                ? [...selection, session.id]
                : selection.filter((id) => id !== session.id))} />
            Agendar
          </label>
        </header>
        <p>
          {allTopics
            .filter((topic) => session.topicIds.includes(topic.id))
            .map((topic) => topic.title)
            .join(' · ')}
        </p>
        {exam.conflicts
          ?.filter((conflict) => conflict.sessionId === session.id)
          .map((conflict) => (<Notice key={conflict.occurrenceId}>
            Coincide con «{conflict.title}» en tu Agenda.
          </Notice>))}
        <footer>
          <span>{session.minutes} minutos</span>
          <button disabled={busy || saving} onClick={() => setEditing({
            ...session

          })}>
            <FoxmindIcon name="edit" />
            Editar
          </button>
        </footer>
      </section>))}
    </div>
    <aside>
      <span className="study-exact-tool-icon mint">
        <FoxmindIcon name="spark" />
      </span>
      <h3>Un poco, con intención</h3>
      <p>
        Alterná lectura y práctica. Al terminar, explicá una idea sin mirar el material.
      </p>
      <p>
        Si algo cuesta, reservá ese tema para la próxima sesión. No hace falta resolver todo
        de una vez.
      </p>
    </aside>
  </div>);

}
