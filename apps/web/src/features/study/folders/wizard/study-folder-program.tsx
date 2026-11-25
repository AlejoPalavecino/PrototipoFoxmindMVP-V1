import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { learningCover } from '../../../../../../shared-ui/parity-assets';
import { WizardPlanSource, type PlanSourceProps } from '../../../../../../shared-ui/academic-plan';
import type { StudyCollection } from '../../model/study-contracts.ts';
export function renderStudyFolderProgram({ programSource, linked, method, classrooms, planSource, onSource, onClassroom, onMethod }: {
  programSource: string;
  linked: string;
  method: 'manual' | 'ai' | 'classroom' | null;
  classrooms: StudyCollection['classrooms'];
  planSource: PlanSourceProps;
  onSource: (source: 'own' | 'classroom') => void;
  onClassroom: (id: string) => void;
  onMethod: (method: 'manual' | 'ai') => void;
}) {
  return (<>
    <fieldset className="study-exact-source-picker">
      <legend>¿De dónde parte tu recorrido?</legend>
      <div>
        <label>
          <input
            type="radio"
            name="study-source"
            aria-label="Sin aula"
            checked={programSource === 'own'}
            onChange={() => onSource('own')} />
          Sin aula
        </label>
        <label>
          <input
            type="radio"
            name="study-source"
            aria-label="Vincular a mi aula"
            checked={programSource === 'classroom'}
            onChange={() => onSource('classroom')} />
          Vincular a mi aula
        </label>
      </div>
    </fieldset>
    {programSource === 'classroom' ? (<fieldset className="study-exact-methods study-exact-class-picker">
      <legend>Elegí un aula</legend>
      <p>Copiá el recorrido y consultá sus materiales.</p>
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
        Todavía no tenés aulas disponibles. Podés seguir con la opción Sin
        aula.
      </p>)}
    </fieldset>) : (<>
      <WizardPlanSource {...planSource} />
      <fieldset className="study-exact-methods" disabled={!planSource.file?.ready}>
        <legend>¿Cómo querés preparar el recorrido?</legend>
        <p>Elegí el punto de partida. Vas a poder editar todo después.</p>
        <label>
          <input
            type="radio"
            name="plan-method"
            value="ai"
            aria-label="Prepararlo con Foxy"
            checked={method === 'ai'}
            onChange={() => onMethod('ai')} />
          <span className="study-exact-tool-icon peach">
            <FoxmindIcon name="spark" />
          </span>
          <span>
            <b>Prepararlo con Foxy</b>
            <small>
              Una propuesta de unidades y temas a partir de tu programa.
            </small>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="plan-method"
            value="manual"
            aria-label="Armarlo a mano"
            checked={method === 'manual'}
            onChange={() => onMethod('manual')} />
          <span className="study-exact-tool-icon sky">
            <FoxmindIcon name="edit" />
          </span>
          <span>
            <b>Armarlo a mano</b>
            <small>Organizá las unidades y los temas a tu manera.</small>
          </span>
        </label>
      </fieldset>
      {!planSource.file?.ready && (<p className="study-exact-field-hint">
        Primero cargá el programa para elegir cómo seguir.
      </p>)}
    </>)}
  </>);

}
