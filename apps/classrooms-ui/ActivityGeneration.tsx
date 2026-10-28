'use client';
import { useEffect, useState } from 'react';
import type { ActivityProposal } from '../../src/core/domain/index.ts';
import type { ClassroomClient, Detail } from './api.ts';
import { Notice } from './components.tsx';
import { defaultGenerationForm } from './ActivityGenerationForm.tsx';
import { GenerationSetup } from './GenerationSetup.tsx';
import { AiProgress } from '../shared-ui/index.ts';
import { ActivityGenerationProposal } from './ActivityGenerationProposal.tsx';
import { generationErrors, generationStates, generationWarnings, generationSourceTitle, type GenerationView } from './activity-generation-api.ts';
import { useActivityGeneration } from './use-activity-generation.ts';

export function ActivityGeneration({ api, room, onApplied, onClose }: {
  api: ClassroomClient; room: Detail; onApplied: (id: string) => Promise<void>; onClose: () => void;
}) {
  const generation = useActivityGeneration(api, room, onApplied);
  const [form, setForm] = useState(defaultGenerationForm), [review, setReview] = useState<{ id: string; proposal: ActivityProposal } | null>(null);
  const [dirty, setDirty] = useState(false), [replacement, setReplacement] = useState<GenerationView | null>(null);
  const [charge, setCharge] = useState(false), [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const view = generation.view, active = view && ['QUEUED', 'RUNNING'].includes(view.state);
  const uncertain = view?.error === 'PROVIDER_OUTCOME_UNKNOWN';
  useEffect(() => { setCharge(false); }, [view?.id]);
  useEffect(() => {
    if (!review && view?.state === 'READY' && view.proposal) setReview({ id: view.id, proposal: structuredClone(view.proposal) });
  }, [review, view]);
  function accept(next: GenerationView) {
    if (dirty) { setReplacement(next); return; }
    if (next.proposal) { setReview({ id: next.id, proposal: structuredClone(next.proposal) }); setDirty(false); }
  }
  const editable = room.role === 'teacher' && !room.archived;
  return <section className="p7-authoring p7-generation" aria-label="Generar actividad con IA">
    <header className="p5-section-head"><div><h3>Generar con IA</h3><p>Una propuesta privada para revisar. Crear un borrador no publica la actividad.</p></div>
      <button type="button" disabled={generation.busy} onClick={onClose}>Cerrar generación</button></header>
    {generation.error ? <Notice error>{generation.error}</Notice> : null}
    {sending || active ? <AiProgress state={active ? view.state as 'QUEUED' | 'RUNNING' : 'SENDING'} task="activity" /> : null}
    <details className="education-generation-settings" open={!active && !review && !sending}><summary>Configurar propuesta</summary>
      <GenerationSetup room={room} value={form} update={setForm} sources={generation.sources} disabled={generation.busy || Boolean(active) || uncertain || !editable}
        generate={async value => { if (!editable) return; setSending(true); try { await generation.generate(value); } finally { setSending(false); } }} />
    </details>
    <div className="p5-actions"><button disabled={generation.busy} onClick={() => void generation.refresh()}>Actualizar fuentes y generaciones</button></div>
    {view && !active ? <section aria-label="Estado de generación"><h4>{generationStates[view.state] ?? view.state}</h4>
      {view.error ? <Notice error>{generationErrors[view.error] ?? 'No se pudo completar esta generación.'}</Notice> : null}
      {view.state === 'STALE' ? <Notice>El programa o alguna fuente cambió. Revisa las fuentes y solicita una propuesta nueva.</Notice> : null}
      {view.missingInformation?.length ? <details><summary>Detalle de la información faltante</summary><ul>{view.missingInformation.map((item, index) => <li key={index}>{item}</li>)}</ul></details> : null}
      {view.sourceReport?.length ? <details><summary>Lectura de las fuentes</summary><ul>{view.sourceReport.map(source => <li key={source.sourceId}>
        {generationSourceTitle(source.sourceId, generation.sources)} · {source.status === 'READ' ? 'Lectura completada' : 'Revisar fuente'}
        {source.pageCount !== null ? ` · ${source.pageCount} ${source.pageCount === 1 ? 'página' : 'páginas'}` : ''}{source.warnings.map(warning => <p key={warning}>{generationWarnings[warning] ?? warning}</p>)}</li>)}</ul></details> : null}
      {view.state === 'APPLIED' && view.appliedActivityId ? <button disabled={generation.busy} onClick={() => void onApplied(view.appliedActivityId!)}>Abrir borrador creado</button> : null}
      {view.state === 'READY' && view.proposal && review?.id !== view.id ? <button disabled={generation.busy} onClick={() => accept(view)}>Revisar esta propuesta</button> : null}
      {['READY', 'FAILED', 'STALE'].includes(view.state) && editable ? <button disabled={generation.busy} onClick={() => setRegenerating(true)}>Preparar regeneración completa</button> : null}
      {regenerating ? <div className="p5-notice"><p>Se creará otra propuesta con los parámetros y fuentes del formulario. La anterior y tus ediciones siguen disponibles hasta que elijas reemplazarlas.</p>
        {view.error === 'PROVIDER_OUTCOME_UNKNOWN' ? <label className="p7-check"><input type="checkbox" checked={charge} onChange={e => setCharge(e.target.checked)} />Entiendo que el intento anterior puede haber consumido cuota y esta generación puede generar otro cargo.</label> : null}
        <button disabled={generation.busy || (view.error === 'PROVIDER_OUTCOME_UNKNOWN' && !charge)} onClick={() => {
          void generation.generate(form, view, charge); setRegenerating(false);
        }}>Confirmar nueva generación</button><button onClick={() => setRegenerating(false)}>Cancelar regeneración</button></div> : null}
    </section> : null}
    {replacement ? <div className="p5-notice" role="alert"><p>Hay ediciones locales. ¿Reemplazarlas por esta propuesta guardada? La versión del servidor anterior permanece en Generaciones recientes.</p>
      <button onClick={() => { if (replacement.proposal) setReview({ id: replacement.id, proposal: structuredClone(replacement.proposal) }); setDirty(false); setReplacement(null); }}>Reemplazar ediciones</button>
      <button onClick={() => setReplacement(null)}>Conservar ediciones</button></div> : null}
    {review ? <><p role="status">{dirty ? 'Propuesta editada sin aplicar.' : 'Propuesta guardada cargada para revisión.'}</p>
      <ActivityGenerationProposal proposal={review.proposal} sources={generation.sources} disabled={generation.busy || !editable} update={proposal => { setReview({ ...review, proposal }); setDirty(true); }} />
      <footer className="p5-form-footer"><button className="primary" disabled={generation.busy || !editable || (view?.id === review.id && view.state !== 'READY')}
        onClick={() => void generation.apply(review.id, review.proposal)}>Usar propuesta revisada como borrador</button></footer>
      <p>Luego podrás ajustar entrega, fecha, materiales y publicación en el editor habitual.</p></> : null}
    <details className="education-generation-history"><summary>Generaciones recientes · {generation.jobs.length}</summary><section aria-label="Generaciones recientes"><h4>Generaciones recientes</h4>
      {!generation.jobs.length ? <p>No hay generaciones recientes.</p> : <ul>{generation.jobs.map(job => <li key={job.id}>
        {generationStates[job.state] ?? job.state}{job.createdAt ? ` · ${new Date(job.createdAt).toLocaleString('es')}` : ''}
        <button disabled={generation.busy} onClick={() => void generation.open(job.id)}>Recuperar generación</button></li>)}</ul>}
    </section></details>
  </section>;
}
