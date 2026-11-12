import { WizardCurriculum, type PlanSourceProps } from '../../../../../shared-ui/academic-plan';
export { WizardCurriculum, WizardPlanSource } from '../../../../../shared-ui/academic-plan';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import type { CurriculumUnit } from '../../../../../../src/core/domain/index.ts';

interface Props extends PlanSourceProps {
  units?: CurriculumUnit[];
  onUnits?: (units: CurriculumUnit[]) => void;
  onRemoveUnits?: (units: CurriculumUnit[]) => void;
  onUndoRemove?: () => void;
  planText: string;
  onPlanText: (value: string) => void;
  onExtractText: () => void;
}

export function WizardPlan(props: Props) {
  const { disabled } = props;
  return <div className="brujula-wizard-plan">
    {props.onUnits ? <WizardCurriculum units={props.units ?? []} onUnits={props.onUnits} onRemove={props.onRemoveUnits} onUndo={props.onUndoRemove} /> : null}
    <details><summary>Editar el plan como texto</summary>
    <label>Unidades y temas<textarea aria-label="Unidades y temas" rows={7} value={props.planText} disabled={disabled} placeholder={'Unidad 1 · Ecosistemas\nFlujo de energía\nRedes tróficas'} onChange={event => props.onPlanText(event.target.value)} /></label>
    <small>Escribí “Unidad: nombre” y agregá cada tema con “- tema”, uno por línea. El aula necesita al menos una unidad con un tema.</small>
    <button className="brujula-wizard-extract" type="button" disabled={disabled} onClick={props.onExtractText}><FoxmindIcon name="spark" />Extraer unidades de un texto</button>
    </details>
  </div>;
}
