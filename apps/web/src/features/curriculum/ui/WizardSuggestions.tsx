import { PlanExtraction } from './PlanExtraction.tsx';
import type { PlanExtractionState } from '../model/use-plan-extraction.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';

export function WizardSuggestions({ extraction, hasUnits, review }: {
  extraction: PlanExtractionState; hasUnits: boolean; review: boolean;
}) {
  if (extraction.view?.state !== 'READY' || !extraction.view.proposal) {
    return <PlanExtraction extraction={extraction} hasUnits={hasUnits} review={review} />;
  }
  return <details className="wizard-suggestions" open={review ? undefined : true}>
    <summary hidden={!review} aria-disabled={extraction.busy} onClick={event => { if (extraction.busy) event.preventDefault(); }}>
      <span className="wizard-section-icon"><FoxmindIcon name="spark" /></span>
      <span><strong>Del plan a tus unidades</strong><small>Revisá la propuesta y decidí qué unidades usar.</small></span>
      <span className="wizard-approved">{extraction.view.proposal.units.length} unidades sugeridas</span>
      <span className="wizard-suggestions-action">Revisar sugerencias <FoxmindIcon name="chevron-down" /></span>
    </summary>
    <PlanExtraction extraction={extraction} hasUnits={hasUnits} review={review} />
  </details>;
}
