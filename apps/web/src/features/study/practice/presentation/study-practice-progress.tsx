import type { StudyPractice } from '../../model/study-contracts.ts';
import type { PracticeStep } from './study-practice-results.ts';

const stepLabels: Record<PracticeStep, string> = { correct: ', correcta', review: ', para repasar', answered: ', respondida', pending: '' };

/** Progress plus a trail of stops: each one shows how that question went and lets the student jump to it. */
export function renderStudyPracticeProgress({ practice, empty, index, step, guided, setIndex }: {
  practice: StudyPractice;
  empty: number;
  index: number;
  step: (question: StudyPractice['questions'][number]) => PracticeStep;
  guided: boolean;
  setIndex: (index: number) => void;
}) {
  return (<div className="study-exact-practice-progress">
    <div className="study-practice-meter">
      <span aria-live="polite">{practice.questions.length - empty} de {practice.questions.length} {guided ? 'confirmadas' : 'respondidas'}</span>
      <progress aria-label={guided ? 'Preguntas confirmadas' : 'Preguntas respondidas'} value={practice.questions.length - empty} max={practice.questions.length} />
    </div>
    <nav aria-label="Ir a una pregunta" className="study-practice-trail">
      {practice.questions.map((q, i) => {
        const state = step(q);
        return (<button
          key={q.id}
          type="button"
          aria-label={`Pregunta ${i + 1}${stepLabels[state]}`}
          aria-current={index === i ? 'step' : undefined}
          className={state === 'pending' ? '' : `${state === 'answered' ? '' : 'is-' + state + ' '}answered`}
          onClick={() => setIndex(i)}>
          {i + 1}
        </button>);
      })}
    </nav>
  </div>);

}
