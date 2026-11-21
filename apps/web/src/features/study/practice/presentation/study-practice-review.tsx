import type { RefObject } from 'react';
import type { StudyPractice } from '../../model/study-contracts.ts';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
export function renderStudyPracticeReview({ practice, heading, empty, unchecked, locked, answerText, busy, setIndex, setReview }: {
  practice: StudyPractice;
  heading: RefObject<HTMLElement | null>;
  empty: number;
  unchecked: boolean;
  locked: Set<string>;
  answerText: (id: string) => string;
  busy: boolean;
  setIndex: (index: number) => void;
  setReview: (review: boolean) => void;
}) {
  return (<section className="study-exact-practice-review">
    <h2 ref={heading as RefObject<HTMLHeadingElement>} tabIndex={-1}>
      Revisá tus respuestas
    </h2>
    <p>
      {unchecked
        ? 'Confirmá las respuestas del quiz para finalizar.'
        : empty
        ? 'Respondé todas las preguntas para finalizar.'
        : locked.size ? 'Podés volver a leer tus respuestas antes de finalizar.' : 'Podés cambiar tus respuestas antes de finalizar.'}
    </p>
    <ol>
      {practice.questions.map((q, i) => (<li key={q.id}>
        <div>
          <h3>{q.prompt}</h3>
          <p>{answerText(q.id)}</p>
        </div>
        <button disabled={busy} aria-label={`${locked.has(q.id) ? 'Ver' : 'Editar'} respuesta ${i + 1}`} onClick={() => {
          setIndex(i);
          setReview(false);

        }}>
          <FoxmindIcon name={locked.has(q.id) ? 'book' : 'edit'} />
          {locked.has(q.id) ? 'Ver respuesta' : 'Editar'}
        </button>
      </li>))}
    </ol>
  </section>);

}
