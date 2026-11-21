import { useState } from 'react';
import type { FoxyQuiz } from '../../../../../../src/core/domain/foxy/foxy-quiz.ts';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import styles from './foxy-quiz-review.module.css';

export function FoxyQuizReview({ quiz, disabled, onEditPrompt }: {
  quiz: FoxyQuiz;
  disabled: boolean;
  onEditPrompt: (index: number, prompt: string) => Promise<boolean>;
}) {
  const [index, setIndex] = useState(0);
  const [preview, setPreview] = useState(false);
  const [feedback, setFeedback] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState('');
  const question = quiz.questions[index] ?? quiz.questions[0]!;
  function showQuestion(next: number) {
    setIndex(next);
    setFeedback(null);
    setSelected(null);
    setDraft(null);
    setError('');
  }
  async function savePrompt() {
    if (!draft?.trim() || disabled) return;
    try {
      if (await onEditPrompt(index, draft.trim())) {
        setDraft(null);
        setError('');
        return;
      }
    } catch {
      // The editable consigna remains available to retry.
    }
    setError('No pudimos guardar la consigna. Podés volver a intentarlo.');
  }
  return <section className={styles.reader} aria-label="Revisión del quiz">
    <div className={styles.modes} role="group" aria-label="Modo de lectura">
      <button type="button" aria-pressed={!preview} disabled={disabled || draft !== null} onClick={() => { setPreview(false); setFeedback(null); }}>Revisión docente</button>
      <button type="button" aria-pressed={preview} disabled={disabled || draft !== null} onClick={() => { setPreview(true); setFeedback(null); }}>Vista estudiante</button>
    </div>
    <p>{preview ? quiz.instructions : quiz.objective}</p>
    <div className={styles.paper}>
      <nav className={styles.modes} aria-label="Preguntas del borrador">
        {quiz.questions.map((_, position) => <button key={position} type="button" aria-pressed={position === index}
          disabled={disabled || draft !== null} onClick={() => showQuestion(position)}>Pregunta {position + 1}</button>)}
      </nav>
      {draft !== null ? <form className={styles.editor} onSubmit={(event) => { event.preventDefault(); void savePrompt(); }}>
        <label>Consigna<textarea value={draft} maxLength={2000} required disabled={disabled}
          onChange={(event) => setDraft(event.currentTarget.value)} /></label>
        {error && <p role="alert">{error}</p>}
        <div className={styles.modes}>
          <button type="button" disabled={disabled} onClick={() => {setDraft(null);setError('');}}>Cancelar</button>
          <button type="submit" disabled={disabled || !draft.trim()}>Guardar consigna</button>
        </div>
      </form> : preview ? <fieldset className={styles.options}>
        <legend>{question.prompt}</legend>
        {question.options.map((option, position) => <label key={position} className={styles.option}>
          <input type="radio" name="foxy-quiz-preview" checked={selected === position} onChange={() => { setSelected(position); setFeedback(null); }} />
          <span>{option.text}</span>
        </label>)}
        <button type="button" className="p5-primary" disabled={selected === null || feedback === selected} onClick={() => setFeedback(selected)}>Confirmar respuesta</button>
        {feedback !== null && <p className={styles.feedback} role="status">{question.options[feedback]?.feedback}</p>}
      </fieldset> : <>
        <h4>{question.prompt}</h4>
        <button type="button" className="p5-action" disabled={disabled} onClick={() => setDraft(question.prompt)}><FoxmindIcon name="edit" />Editar consigna</button>
        <ul className={styles.reviewOptions}>
          {question.options.map((option, position) => <li key={position} className={styles.option}>
            <div><strong>{option.text}</strong>{option.correct && <span className={styles.correct}>Correcta</span>}
              {feedback === position && <p className={styles.feedback} role="status">{option.feedback}</p>}
            </div>
            <button type="button" className="p5-action" aria-expanded={feedback === position}
              onClick={() => setFeedback(feedback === position ? null : position)}>
              {feedback === position ? 'Ocultar devolución' : 'Ver devolución'}
            </button>
          </li>)}
        </ul>
      </>}
    </div>
  </section>;
}
