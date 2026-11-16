'use client';
import type { PlanExtractionState } from '../model/use-plan-extraction.ts';
import { ExtractionEditor } from './ExtractionEditor.tsx';
import { extractionMessage } from '../model/extraction-messages.ts';
import { AiProgress } from '../../../../../shared-ui/index.ts';

export function PlanExtraction({ extraction, hasUnits, review, hideIntro = false }: {
  extraction: PlanExtractionState; hasUnits: boolean; review: boolean; hideIntro?: boolean;
}) {
  const { view, message, busy, apply, retry, refresh, cancel } = extraction;
  const pending = view && ['QUEUED', 'RUNNING'].includes(view.state);
  const failed = extraction.messageError || view?.state === 'FAILED';
  return <section className="p5-extraction" aria-label="Unidades sugeridas a partir del plan" aria-busy={busy}>
    {!hideIntro ? <><h3>Del plan a tus unidades</h3>
    <p>Foxy analiza tu plan para sugerir unidades y temas. Vos los revisás y decidís cuáles usar antes de crear el aula.</p></> : null}
    {pending ? <AiProgress state={view.state as 'QUEUED' | 'RUNNING'} task="plan" /> : null}
    <div role={failed ? 'alert' : 'status'} aria-live={failed ? 'assertive' : 'polite'} className={failed ? 'p5-notice error' : view?.state === 'APPLIED' ? 'p5-notice success' : undefined}>
      {message ? <p>{message}</p> : pending ? null
        : !view ? <p>El análisis comienza cuando el plan está aprobado y guardado.</p> : null}
      {view?.state === 'FAILED' && <p>{extractionMessage(view.error)}</p>}
      {view?.state === 'STALE' && <p>Esta propuesta ya no corresponde al plan actual. Continuá manualmente o volvé a abrir el borrador.</p>}
      {view?.state === 'APPLIED' && <p>Las unidades revisadas están guardadas. Podés seguir editándolas antes de crear el aula.</p>}
      {view?.state === 'READY' && !review && <p>Tu propuesta está lista. Revisala en el paso Unidades y temas.</p>}
    </div>
    {view?.state === 'READY' && view.proposal && <div hidden={!review}><ExtractionEditor key={view.id}
      proposal={view.proposal} hasUnits={hasUnits} busy={busy} apply={apply} /></div>}
    <div className="p5-extraction-actions">
      {view?.state === 'FAILED' && view.retryable && <button type="button" disabled={busy} onClick={() => void retry()}>Volver a analizar el plan</button>}
      {pending && message && <button type="button" disabled={busy} onClick={() => void refresh()}>Consultar análisis</button>}
      {view && view.state !== 'APPLIED' && <button type="button" disabled={busy} onClick={cancel}>Continuar manualmente</button>}
    </div>
  </section>;
}
