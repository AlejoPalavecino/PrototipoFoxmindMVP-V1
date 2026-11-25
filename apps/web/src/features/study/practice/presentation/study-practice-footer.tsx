
import type { StudyPractice } from '../../model/study-contracts.ts';

export function renderStudyPracticeFooter({ finished, state, busy, review, empty, index, practice, inline, closeLabel = 'Volver al chat', unchecked, requiresCheck, canCheck, confirmAnswer, onClose, onNewAttempt, setReview, setConfirmation, setIndex }: {
  finished: boolean;
  state: string;
  busy: boolean;
  review: boolean;
  empty: number;
  index: number;
  practice: StudyPractice;
  inline: boolean;
  closeLabel?: string;
  unchecked: boolean;
  requiresCheck: boolean;
  canCheck: boolean;
  confirmAnswer: () => Promise<void>;
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
        {!inline && <button onClick={onClose}>{closeLabel}</button>}
        <button className="primary" disabled={busy} onClick={() => void onNewAttempt()}>
          Reintentar
        </button>
      </>) : review ? (<>
        <button disabled={busy} onClick={() => setReview(false)}>
          Volver a preguntas
        </button>
        <button className="primary" disabled={busy || empty > 0 || unchecked} onClick={() => setConfirmation(true)}>
          Finalizar
        </button>
      </>) : (<>
        {(!inline || index > 0) && <button disabled={busy} onClick={() => (index > 0 ? setIndex(index - 1) : onClose?.())}>
          {index > 0 ? 'Atrás' : closeLabel}
        </button>}
        {requiresCheck ? <button className="primary" disabled={busy || !canCheck} onClick={() => void confirmAnswer()}>Confirmar respuesta</button>
          : <button className="primary" disabled={busy} onClick={() => index < practice.questions.length - 1 ? setIndex(index + 1) : setReview(true)}>
          {index < practice.questions.length - 1 ? inline ? 'Siguiente pregunta' : 'Siguiente' : 'Revisar'}
        </button>}
      </>)}
    </div>
  </footer>);

}
