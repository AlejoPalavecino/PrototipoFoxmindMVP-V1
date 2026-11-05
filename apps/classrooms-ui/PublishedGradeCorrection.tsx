'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ClassroomClient, GradeCorrectionsData } from './api.ts';
import { Notice } from './components.tsx';

export function PublishedGradeCorrection({ api, roomId, attemptId, onChanged }: {
  api: ClassroomClient; roomId: string; attemptId: string; onChanged: () => Promise<void>;
}) {
  const path = `/${roomId}/attempts/${attemptId}/grade-corrections`;
  const [data, setData] = useState<GradeCorrectionsData | null>(null), [grade, setGrade] = useState(''), [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    const next = await api.call<GradeCorrectionsData>(path, 'GET', undefined, signal); setData(next); return next;
  }, [api, path]);
  useEffect(() => { const controller = new AbortController(); setData(null);
    void load(controller.signal).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort(); }, [load]);
  const valid = /^(?:[0-9](?:\.\d{1,2})?|10(?:\.0{1,2})?)$/.test(grade) && !!reason.trim() && reason.length <= 5000;
  const writable = !!data?.canCorrect && !busy;
  const change = () => { setSaved(false); setConfirming(false); };
  async function run(work: () => Promise<void>) {
    setBusy(true); setError(''); setSaved(false);
    try { await work(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="p8-published-correction" aria-label="Rectificación de calificación publicada">
    <h4>Rectificar calificación publicada</h4>
    {error ? <Notice error>{error} La rectificación no se ha confirmado. Recarga para consultar el estado actual.</Notice> : null}
    {!data ? <Notice>Cargando historial de rectificaciones…</Notice> : <>
      <p>Calificación publicada actual: <strong>{data.grade.finalGrade.replace('.', ',')}</strong></p>
      <p>Solo se rectifica la calificación final. Las respuestas, los puntos por pregunta, los criterios evaluados y las devoluciones se conservan.</p>
      {data.archived ? <Notice>Aula archivada · rectificaciones de solo consulta.</Notice> : null}
      <label>Nueva calificación · 0 a 10<input aria-label="Nueva calificación publicada" inputMode="decimal" disabled={!writable}
        value={grade.replace('.', ',')} onChange={e => { setGrade(e.target.value.replace(',', '.')); change(); }} /></label>
      <label>Motivo obligatorio<textarea aria-label="Motivo de la rectificación" maxLength={5000} disabled={!writable}
        value={reason} onChange={e => { setReason(e.target.value); change(); }} /></label>
      <p>El historial completo es privado del docente. El estudiante recibe la calificación corregida y una notificación, sin el motivo ni el historial.</p>
      <div className="p5-actions"><button disabled={busy} onClick={() => void run(async () => { await load(); setConfirming(false); })}>Recargar rectificaciones</button>
        {data.canCorrect ? <button disabled={!writable || !valid} onClick={() => setConfirming(true)}>Rectificar calificación</button> : null}</div>
      {confirming ? <section aria-label="Confirmar rectificación de calificación"><h5>Confirmar rectificación</h5>
        <p>Calificación anterior: {data.grade.finalGrade.replace('.', ',')} · Nueva calificación: {grade.replace('.', ',')}</p>
        <p className="p7-multiline">Motivo: {reason.trim()}</p>
        <div className="p5-actions"><button disabled={busy} onClick={() => setConfirming(false)}>Cancelar rectificación</button>
          <button className="primary" disabled={!writable || !valid} onClick={() => void run(async () => {
            const corrected = await api.call<GradeCorrectionsData>(path, 'POST', { revision: data.revision, newGrade: grade, reason, confirm: true });
            const fresh = await load();
            if (fresh.revision !== corrected.revision || fresh.grade.finalGrade !== corrected.grade.finalGrade) throw new Error('El estado cambió. Revisa la calificación actual.');
            await onChanged(); setGrade(''); setReason(''); setConfirming(false); setSaved(true);
          })}>Confirmar rectificación</button></div>
      </section> : null}
      {saved ? <Notice>Calificación rectificada y estado actualizado. El estudiante ha recibido una notificación.</Notice> : null}
      <h5>Historial de rectificaciones · solo docente</h5>
      {data.corrections.length ? <ol className="p8-correction-audit">{data.corrections.map(row => <li key={row.id}>
        <strong>{row.previousGrade.replace('.', ',')} → {row.newGrade.replace('.', ',')}</strong>
        <p className="p7-multiline">{row.reason}</p><p>{row.actor.firstName} {row.actor.lastName} · {new Date(row.correctedAt).toLocaleString('es')}</p>
      </li>)}</ol> : <p>No hay rectificaciones registradas.</p>}
    </>}
  </section>;
}
