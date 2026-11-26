import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { learningCover } from '../../../../../../shared-ui/parity-assets';
import { WizardPlanSource, type PlanSourceProps } from '../../../../../../shared-ui/academic-plan';
import type { StudyCollection } from '../../model/study-contracts.ts';

export type StudyFolderOrigin = 'classroom' | 'program' | 'manual';

const origins: { value: StudyFolderOrigin; title: string; hint: string; icon: 'book' | 'spark' | 'edit'; tone: string }[] = [
  { value: 'classroom', title: 'Del aula', hint: 'Copiá el recorrido de tu aula y consultá sus materiales.', icon: 'book', tone: 'sky' },
  { value: 'program', title: 'De mi programa', hint: 'Subí el programa y Foxy te propone unidades y temas.', icon: 'spark', tone: 'peach' },
  { value: 'manual', title: 'A mano', hint: 'Armá las unidades y los temas a tu manera, sin archivos.', icon: 'edit', tone: 'mint' },
];

/** Step 2 of the folder wizard: one question, where the path comes from; only the chosen option asks for more. */
export function renderStudyFolderProgram({ origin, linked, classrooms, planSource, onOrigin, onClassroom }: {
  origin: StudyFolderOrigin | null;
  linked: string;
  classrooms: StudyCollection['classrooms'];
  planSource: PlanSourceProps;
  onOrigin: (origin: StudyFolderOrigin) => void;
  onClassroom: (id: string) => void;
}) {
  return (<>
    <fieldset className="study-exact-methods study-folder-origin">
      <legend>¿De dónde sale tu recorrido?</legend>
      <p>Elegí el punto de partida. Vas a poder editar todo después.</p>
      {origins.map((item) => (<label key={item.value}>
        <input
          type="radio"
          name="study-origin"
          value={item.value}
          aria-label={item.title}
          checked={origin === item.value}
          onChange={() => onOrigin(item.value)} />
        <span className={`study-exact-tool-icon ${item.tone}`}>
          <FoxmindIcon name={item.icon} />
        </span>
        <span>
          <b>{item.title}</b>
          <small>{item.value === 'classroom' && !classrooms.length ? 'Todavía no tenés aulas para vincular.' : item.hint}</small>
        </span>
      </label>))}
    </fieldset>
    {origin === 'classroom' && (<fieldset className="study-exact-methods study-exact-class-picker">
      <legend>{classrooms.length === 1 ? 'Tu aula' : 'Elegí un aula'}</legend>
      {classrooms.map((item) => (<label key={item.id}>
        <input
          type="radio"
          name="study-classroom"
          aria-label={item.name}
          checked={linked === item.id}
          onChange={() => onClassroom(item.id)} />
        <img src={learningCover()} alt="" />
        <span>
          <b>{item.name}</b>
          <small>
            {item.academicYear}
            {item.archived ? ' · Archivada · consulta' : ''}
          </small>
        </span>
      </label>))}
      {!classrooms.length && (<p>
        Cuando te sumes a un aula, vas a poder copiar su recorrido. Mientras tanto, elegí otra opción.
      </p>)}
    </fieldset>)}
    {origin === 'program' && <WizardPlanSource {...planSource} />}
    {origin === 'manual' && (<p className="study-folder-origin-note" role="note">
      <FoxmindIcon name="check" />
      Empezás con una unidad vacía. Podés subir tu programa más tarde desde Materiales.
    </p>)}
  </>);

}
