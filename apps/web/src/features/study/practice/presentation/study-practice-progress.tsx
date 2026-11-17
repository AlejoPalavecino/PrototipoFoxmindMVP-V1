
import type { StudyPractice } from '../../model/study-contracts.ts';

export function renderStudyPracticeProgress({ practice, empty, index, answered, setIndex }: {
  practice: StudyPractice;
  empty: number;
  index: number;
  answered: (id: string) => boolean;
  setIndex: (index: number) => void;
}) {
  return (<div className="study-exact-practice-progress">
    <span aria-live="polite">
      {practice.questions.length - empty} de {practice.questions.length} respondidas
    </span>
    <nav aria-label="Ir a una pregunta">
      {practice.questions.map((q, i) => (<button
        key={q.id}
        aria-label={`Pregunta ${i + 1}${answered(q.id) ? ', respondida' : ''}`}
        aria-current={index === i ? 'step' : undefined}
        className={answered(q.id) ? 'answered' : ''}
        onClick={() => setIndex(i)}>
        {i + 1}
      </button>))}
    </nav>
  </div>);

}
