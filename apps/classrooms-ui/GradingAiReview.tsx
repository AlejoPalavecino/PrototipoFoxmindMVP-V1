'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClassroomClient } from './api.ts';
import type { GradingAiProposal } from '../../src/core/domain/index.ts';
import { Notice } from './components.tsx';

interface Job { id: string; state: string; snapshotHash: string | null; proposal: GradingAiProposal | null }
export function GradingAiReview({ api, roomId, attemptId, revision, dirty, onApplied, onBusyChange, disabled = false }: {
  api: ClassroomClient; roomId: string; attemptId: string; revision: string; dirty: boolean;
  onApplied: (result: unknown) => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const path = `/${roomId}/attempts/${attemptId}/grading-ai`;
  const [job, setJob] = useState<Job | null>(null), [proposal, setProposal] = useState<GradingAiProposal | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [confirm, setConfirm] = useState<'apply' | 'discard' | null>(null);
  const requestId = useRef<string | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    const next = await api.call<Job | null>(path, 'GET', undefined, signal);
    if (signal?.aborted) return;
    setJob(next); setProposal(next?.state === 'READY' && next.proposal ? structuredClone(next.proposal) : null);
    setError(''); setLoading(false); setConfirm(null); requestId.current = null;
  }, [api, path]);
  useEffect(() => { const controller = new AbortController(); setLoading(true);
    void load(controller.signal).catch(e => { if (!controller.signal.aborted) { setError(e.message); setLoading(false); } });
    return () => controller.abort(); }, [load]);
  const edit = (change: (value: GradingAiProposal) => GradingAiProposal) => {
    setProposal(previous => previous ? change(previous) : previous); requestId.current = null; setConfirm(null);
  };
  async function run(action: 'apply' | 'discard') {
    if (disabled || !job || !proposal || !job.snapshotHash) return;
    setBusy(true); onBusyChange?.(true); setError('');
    try {
      requestId.current ??= crypto.randomUUID();
      const result = await api.call(`${path}/${job.id}/${action}`, 'POST', action === 'apply'
        ? { requestId: requestId.current, revision, snapshotHash: job.snapshotHash, proposal }
        : { requestId: requestId.current, revision });
      setConfirm(null); setProposal(null); setJob({ ...job, state: action === 'apply' ? 'APPLIED' : 'DISCARDED', proposal: null });
      if (action === 'apply') await onApplied(result);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <section aria-label="Sugerencia de corrección con IA" className="p8-ai-review" aria-busy={loading || busy}>
    <h4>Sugerencia de corrección con IA</h4>
    <p>La sugerencia es privada. Revisala antes de usarla; aplicar no publica la calificación.</p>
    {error ? <Notice error>{error} La corrección manual sigue disponible.</Notice> : null}
    {loading ? <p role="status">Consultando sugerencia…</p> : null}
    {!loading && !error && !job ? <p>No hay una sugerencia para esta entrega.</p> : null}
    {job && job.state !== 'READY' ? <p role="status">Estado: {job.state === 'QUEUED' ? 'Pendiente' : job.state === 'RUNNING' ? 'En preparación' : job.state === 'FAILED' ? 'No disponible' : job.state === 'STALE' ? 'Desactualizada' : job.state === 'APPLIED' ? 'Aplicada de forma privada' : 'Descartada'}</p> : null}
    {proposal && job?.state === 'READY' ? <>
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
    </> : null}
    {!loading ? <button disabled={busy} onClick={() => { setLoading(true); void load().catch(e => { setError(e.message); setLoading(false); }); }}>Actualizar sugerencia</button> : null}
  </section>;
}
