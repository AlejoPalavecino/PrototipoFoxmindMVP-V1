import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { learningCover } from '../../../../../../shared-ui/parity-assets';
import type { StudyCollection, StudyUnit } from '../../model/study-contracts.ts';
export function renderStudyFolderReview({ banner, subject, name, year, linked, classrooms, units, goTo }: {
  banner: string;
  subject: string;
  name: string;
  year: string;
  linked: string;
  classrooms: StudyCollection['classrooms'];
  units: StudyUnit[];
  goTo: (step: number) => void;
}) {
  return (<div className="study-exact-wizard-review">
    <div className="study-exact-review-card">
      <img src={learningCover(banner)} alt="" />
      <div>
        <span>{subject}</span>
        <h4>{name}</h4>
        <p>Año {year}</p>
      </div>
      <button type="button" onClick={() => goTo(0)}>
        <FoxmindIcon name="edit" />
        Editar
      </button>
    </div>
    {linked && (<div className="study-exact-ready-note">
      <FoxmindIcon name="book" />
      <div>
        <b>
          {classrooms.find((item) => item.id === linked)?.name ??
            'Aula vinculada'}
        </b>
        <p>
          Vas a poder consultar los materiales actualizados del aula. Los tuyos
          quedan en tu carpeta privada.
        </p>
      </div>
      <button type="button" onClick={() => goTo(1)}>
        Editar vínculo
      </button>
    </div>)}
    <div className="study-exact-review-head">
      <div>
        <h4>Tu recorrido de estudio</h4>
        <p>
          {units.length} {units.length === 1 ? 'unidad' : 'unidades'} ·{' '}
          {units.reduce((sum, unit) => sum + unit.topics.length, 0)} temas
        </p>
      </div>
      <button type="button" onClick={() => goTo(2)}>
        <FoxmindIcon name="edit" />
        Editar plan
      </button>
    </div>
    <ol className="study-exact-plan-summary">
      {units.map((unit, index) => (<li key={unit.id}>
        <span>{index + 1}</span>
        <div>
          <b>{unit.title}</b>
          <p>{unit.topics.map((topic) => topic.title).join(' · ')}</p>
        </div>
      </li>))}
    </ol>
    <div className="study-exact-ready-note">
      <FoxmindIcon name="lock" />
      <p>
        Vas a encontrar tu carpeta en Mi estudio. Sólo vos podés ver sus
        materiales y conversaciones.
      </p>
    </div>
  </div>);

}
