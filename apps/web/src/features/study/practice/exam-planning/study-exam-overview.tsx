
import type { StudyExam } from '../../model/study-contracts.ts';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';

type Session = StudyExam['sessions'][number];
export function renderStudyExamOverview({ exam, sessions, longDate }: {
  exam: StudyExam;
  sessions: Session[];
  longDate: (instant: string) => string;
}) {
  return (<div className="study-exact-plan-overview">
    <div>
      <FoxmindIcon name="calendar" />
      <div>
        <h3>{exam.title ?? 'Mi repaso'}</h3>
        {exam.examAt && <p>Evaluación: {longDate(exam.examAt)}</p>}
      </div>
    </div>
    <div className="study-exact-plan-facts">
      <span>
        <FoxmindIcon name="calendar" />
        <b>{sessions.length}</b> sesiones
      </span>
      <span>
        <FoxmindIcon name="clock" />
        <b>{sessions.reduce((total, session) => total + session.minutes, 0)}</b> min en
        total
      </span>
    </div>
  </div>);

}
