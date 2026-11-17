
import type { StudyPractice } from '../../model/study-contracts.ts';

export function renderStudyPracticeFooter({ finished, state, busy, review, empty, index, practice, onClose, onNewAttempt, setReview, setConfirmation, setIndex }: {
  finished: boolean;
  state: string;
  busy: boolean;
  review: boolean;
  empty: number;
  index: number;
  practice: StudyPractice;
  onClose?: () => void;
  onNewAttempt: () => Promise<void>;
  setReview: (review: boolean) => void;
  setConfirmation: (confirmation: boolean) => void;
  setIndex: (index: number) => void;
}) {
  return (<footer className="study-exact-focus-footer">
    <span role="status">{finished ? 'Práctica guardada' : state}</span>
    <div>
      {finished ? (<>
        <button onClick={onClose}>Volver al chat</button>
        <button className="primary" disabled={busy} onClick={() => void onNewAttempt()}>
          Reintentar
        </button>
      </>) : review ? (<>
        <button disabled={busy} onClick={() => setReview(false)}>
          Volver a preguntas
        </button>
        <button className="primary" disabled={busy || empty > 0} onClick={() => setConfirmation(true)}>
          Finalizar
        </button>
      </>) : (<>
        <button disabled={busy} onClick={() => (index > 0 ? setIndex(index - 1) : onClose?.())}>
          {index > 0 ? 'Atrás' : 'Volver al chat'}
        </button>
        <button className="primary" disabled={busy} onClick={() => index < practice.questions.length - 1 ? setIndex(index + 1) : setReview(true)}>
          {index < practice.questions.length - 1 ? 'Siguiente' : 'Revisar'}
        </button>
      </>)}
    </div>
  </footer>);

}
