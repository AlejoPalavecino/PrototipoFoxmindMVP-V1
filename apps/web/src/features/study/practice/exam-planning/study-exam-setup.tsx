
import type { StudyDetail } from '../../model/study-contracts.ts';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';

const steps = ['Fecha', 'Temas', 'Horarios'];

/**
 * The review setup in three short steps: what and when, which topics, and how much time.
 * Every stage stays in the form (hidden when not current) so going back keeps what was chosen.
 */
export function renderStudyExamSetup({ step, setStep, onNext, title, start, date, time, count, minutes, topics, allTopics, folderName, busy, saving, setTitle, setStart, setDate, setTime, setCount, setMinutes, setTopics, onClose, onDirty, onGenerate }: {
  step: number;
  setStep: (step: number) => void;
  onNext: () => void;
  title: string;
  start: string;
  date: string;
  time: string;
  count: number;
  minutes: number;
  topics: string[];
  allTopics: StudyDetail['folder']['units'][number]['topics'];
  folderName: string;
  busy: boolean;
  saving: boolean;
  setTitle: (value: string) => void;
  setStart: (value: string) => void;
  setDate: (value: string) => void;
  setTime: (value: string) => void;
  setCount: (value: number) => void;
  setMinutes: (value: number) => void;
  setTopics: (value: string[]) => void;
  onClose?: () => void;
  onDirty: () => void;
  onGenerate: () => void;
}) {
  const allChosen = allTopics.length > 0 && allTopics.every((topic) => topics.includes(topic.id));
  return (<form className="study-plan-setup" onSubmit={(event) => {
    event.preventDefault();
    // Enter on an early step moves forward; only the last step prepares the plan.
    if (step < 3) onNext();
    else onGenerate();
  }} onChange={onDirty}>
    <ol className="study-plan-steps" aria-label="Pasos para organizar tu repaso">
      {steps.map((label, index) => {
        const number = index + 1;
        return <li key={label} aria-current={number === step ? 'step' : undefined} className={number < step ? 'is-done' : ''}>
          {number < step
            ? <button type="button" disabled={busy || saving} onClick={() => setStep(number)} aria-label={`Volver al paso ${number}: ${label}`}><span>{number}</span>{label}</button>
            : <span className="study-plan-step"><span>{number}</span>{label}</span>}
        </li>;
      })}
    </ol>
    <fieldset disabled={busy || saving}>
      <div className="study-plan-stage" hidden={step !== 1}>
        <p className="study-exact-subtitle">Contanos para qué te preparás y cuándo. Foxy reparte el repaso hasta ese día.</p>
        <label>
          ¿Para qué te estás preparando?
          <input
            autoFocus
            required
            maxLength={120}
            value={title}
            placeholder="Por ejemplo: evaluación sobre los temas de tu carpeta"
            onChange={(event) => setTitle(event.target.value)} />
        </label>
        <div className="study-exact-form-pair">
          <label>
            Empezar el
            <input
              type="date"
              required
              value={start}
              onChange={(event) => setStart(event.target.value)} />
          </label>
          <label>
            Fecha de la evaluación
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
      </div>
      <div className="study-plan-stage" hidden={step !== 2}>
        <fieldset className="study-exact-choice-group study-plan-topics">
          <legend>¿Qué temas querés incluir?</legend>
          <button type="button" className="study-plan-all" onClick={() => setTopics(allChosen ? [] : allTopics.map((topic) => topic.id))}>
            {allChosen ? 'Quitar todos' : 'Elegir todos'}
          </button>
          <div>
            {allTopics.map((topic) => (<label key={topic.id}>
              <input type="checkbox" aria-label={topic.title} checked={topics.includes(topic.id)} onChange={(event) => setTopics(event.target.checked
                ? [...topics, topic.id]
                : topics.filter((id) => id !== topic.id))} />
              {topic.title}
            </label>))}
          </div>
        </fieldset>
      </div>
      <div className="study-plan-stage" hidden={step !== 3}>
        <fieldset className="study-exact-choice-group">
          <legend>Tiempo por sesión</legend>
          <div>
            {[15, 25, 40].map((value) => (<label key={value}>
              <input
                type="radio"
                name="review-minutes"
                checked={minutes === value}
                onChange={() => setMinutes(value)} />
              {value} minutos
            </label>))}
          </div>
        </fieldset>
        <div className="study-exact-form-pair">
          <label>
            Cantidad de sesiones
            <input
              required
              type="number"
              min={2}
              max={5}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))} />
          </label>
          <label>
            Horario preferido
            <input
              type="time"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)} />
          </label>
        </div>
        <p className="study-exact-context-switch-note">
          {folderName} · Vas a ver la propuesta y elegir qué sesiones van a tu Agenda.
        </p>
      </div>
    </fieldset>
    <footer className="study-exact-dialog-footer">
      <button type="button" disabled={busy || saving} onClick={() => (step > 1 ? setStep(step - 1) : onClose?.())}>
        {step > 1 ? 'Atrás' : 'Cancelar'}
      </button>
      {/* Distinct keys: reusing one element would turn it into the submit button mid-click and send the form. */}
      {step < 3
        ? <button key="next" type="button" className="primary" disabled={busy || saving} onClick={onNext}>
          Siguiente <FoxmindIcon name="arrow-right" />
        </button>
        : <button key="submit" type="submit" className="primary" disabled={busy || saving}>
          <FoxmindIcon name="spark" />
          Preparar mi plan
        </button>}
    </footer>
  </form>);

}
