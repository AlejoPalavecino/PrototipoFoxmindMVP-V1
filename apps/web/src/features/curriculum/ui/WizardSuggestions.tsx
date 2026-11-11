import { PlanExtraction } from './PlanExtraction.tsx';
import type { PlanExtractionState } from '../model/use-plan-extraction.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';

export function WizardSuggestions({ extraction, hasUnits, review }: {
  extraction: PlanExtractionState; hasUnits: boolean; review: boolean;
}) {
  if (extraction.view?.state !== 'READY' || !extraction.view.proposal) {
    return <PlanExtraction extraction={extraction} hasUnits={hasUnits} review={review} />;
  }
  return <section className="wizard-suggestions" aria-label="Propuesta de Foxy">
    <div className="p5-section-head">
      <span className="wizard-section-icon"><FoxmindIcon name="spark" /></span>
      <span><strong>Del plan a tus unidades</strong><small>Revisá la propuesta y decidí qué unidades usar.</small></span>
      <span className="wizard-approved">{extraction.view.proposal.units.length} unidades sugeridas</span>
      <span className="wizard-suggestions-action">Revisá las sugerencias antes de aplicarlas.</span>
    </div>
    <PlanExtraction extraction={extraction} hasUnits={hasUnits} review={review} />
  </section>;
}
