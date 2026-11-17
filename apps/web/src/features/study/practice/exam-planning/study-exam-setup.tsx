
import type { StudyDetail, StudyExam } from '../../model/study-contracts.ts';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';

type Session = StudyExam['sessions'][number];
export function renderStudyExamSetup({ title, start, date, time, count, minutes, topics, allTopics, folderName, busy, saving, setTitle, setStart, setDate, setTime, setCount, setMinutes, setTopics, onClose, onDirty, onGenerate }: {
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
  return (<form onSubmit={(event) => {
    event.preventDefault();
    onGenerate();
  }} onChange={onDirty}>
    <p className="study-exact-subtitle">
      Elegí qué querés repasar. Foxy te propone cómo repartirlo.
    </p>
    <fieldset disabled={busy || saving}>
      <label>
        ¿Para qué te estás preparando?
        <input
          autoFocus
          required
          maxLength={120}
          value={title}
          placeholder="Por ejemplo: evaluación de exposición y contraste"
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
      <fieldset className="study-exact-choice-group">
        <legend>¿Qué temas querés incluir?</legend>
        <div>
          {allTopics.map((topic) => (<label key={topic.id}>
            <input type="checkbox" checked={topics.includes(topic.id)} onChange={(event) => setTopics(event.target.checked
              ? [...topics, topic.id]
              : topics.filter((id) => id !== topic.id))} />
            {topic.title}
          </label>))}
        </div>
      </fieldset>
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
        {folderName} · Después podés ajustar cada sesión.
      </p>
    </fieldset>
    <footer className="study-exact-dialog-footer">
      <button type="button" disabled={busy || saving} onClick={onClose}>
        Cancelar
      </button>
      <button className="primary" disabled={busy || saving}>
        <FoxmindIcon name="spark" />
        {saving ? 'Preparando el plan…' : 'Preparar mi plan'}
      </button>
    </footer>
  </form>);

}
