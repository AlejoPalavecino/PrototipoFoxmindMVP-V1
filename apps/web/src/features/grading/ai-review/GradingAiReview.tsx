'use client';
import type { GradingAiReviewOperations } from '../model/grading-operations.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import styles from '../ui/grading.module.css';
import { useGradingAiReview } from './use-grading-ai-review.ts';


export function GradingAiReview({ operations, roomId, attemptId, revision, dirty, onApplied, onBusyChange, disabled = false }: {
  operations: GradingAiReviewOperations; roomId: string; attemptId: string; revision: string; dirty: boolean;
  onApplied: (result: unknown) => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const { job, proposal, loading, busy, error, setError, reviewing, setReviewing, expanded, setExpanded,
    confirm, setConfirm, load, setLoading, edit, run } = useGradingAiReview({ operations, revision, onApplied, onBusyChange, disabled });
  return <section aria-label="Sugerencia de corrección con IA" className={`p8-ai-review parity-grading-ai ${styles.assistant}`} aria-busy={loading || busy}>
    <button className="parity-grading-ai-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>Sugerencia de Foxy{proposal && job?.state === 'READY' ? ' · Disponible' : ''}</button><div hidden={!expanded}>
    <p>La sugerencia es privada. Revisala antes de usarla; aplicar no publica la calificación.</p>
    {error && !reviewing ? <Notice error>{error} La corrección manual sigue disponible.</Notice> : null}
    {loading ? <p role="status">Consultando sugerencia…</p> : null}
    {!loading && !error && !job ? <p>No hay una sugerencia para esta entrega.</p> : null}
    {job && job.state !== 'READY' ? <p role="status">Estado: {job.state === 'QUEUED' ? 'Pendiente' : job.state === 'RUNNING' ? 'En preparación' : job.state === 'FAILED' ? 'No disponible. Podés seguir corrigiendo manualmente.' : job.state === 'STALE' ? 'Desactualizada' : job.state === 'APPLIED' ? 'Aplicada de forma privada' : 'Descartada'}</p> : null}
    {proposal && job?.state === 'READY' ? <>
      <button type="button" disabled={busy || disabled} aria-haspopup="dialog" onClick={() => setReviewing(true)}>Revisar sugerencia</button>
      {reviewing ? <Dialog title="Revisar sugerencia" className={styles.aiProposal} onClose={() => {
        if (!busy) { setConfirm(null); setReviewing(false); }
      }}>
      {error ? <Notice error>{error}</Notice> : null}
      {proposal.overallGrade !== null ? <label>Nota sugerida · 0 a 10<input inputMode="decimal" value={proposal.overallGrade}
        disabled={busy} onChange={e => { const value = e.target.value.replace(',', '.'); edit(previous => ({ ...previous, overallGrade: value })); }} /></label> : null}
      <label>Devolución general sugerida<textarea maxLength={5000} value={proposal.overallFeedback} disabled={busy}
        onChange={e => { const value = e.target.value; edit(previous => ({ ...previous, overallFeedback: value })); }} /></label>
      {proposal.questions.map(question => <fieldset key={question.ref} disabled={busy}><legend>{/^Q[1-9]\d*$/.test(question.ref) ? `Pregunta ${question.ref.slice(1)}` : `Referencia ${question.ref}`}</legend>
        {question.points !== null ? <label>Puntos sugeridos<input inputMode="decimal" value={question.points} onChange={e => { const value = e.target.value.replace(',', '.'); edit(previous => ({ ...previous,
          questions: previous.questions.map(q => q.ref === question.ref ? { ...q, points: value } : q) })); }} /></label> : null}
        <label>Devolución sugerida<textarea maxLength={5000} value={question.feedback} onChange={e => { const value = e.target.value; edit(previous => ({ ...previous,
          questions: previous.questions.map(q => q.ref === question.ref ? { ...q, feedback: value } : q) })); }} /></label>
      </fieldset>)}
      {proposal.warnings.length ? <ul>{proposal.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul> : null}
        <div className="p5-actions"><button disabled={busy || disabled} onClick={() => setConfirm('apply')}>Usar sugerencia</button>
        <button disabled={busy || disabled} onClick={() => setConfirm('discard')}>Descartar sugerencia</button></div>
      {confirm ? <section aria-label={confirm === 'apply' ? 'Confirmar aplicación' : 'Confirmar descarte'}>
        <p>{confirm === 'apply' ? dirty ? 'Los cambios sin guardar se reemplazarán por la sugerencia. La corrección seguirá privada.' : 'La corrección se guardará de forma privada; no se publicará.' : 'La sugerencia se descartará sin cambiar la corrección.'}</p>
        <button disabled={busy} onClick={() => setConfirm(null)}>Cancelar</button>
        <button disabled={busy || disabled} onClick={() => void run(confirm)}>{confirm === 'apply' ? 'Confirmar aplicación' : 'Confirmar descarte'}</button>
      </section> : null}
      </Dialog> : null}
    </> : null}
    {!loading ? <button disabled={busy} onClick={() => { setLoading(true); void load().catch(e => { setError(e.message); setLoading(false); }); }}>Actualizar sugerencia</button> : null}
    </div>
  </section>;
}
