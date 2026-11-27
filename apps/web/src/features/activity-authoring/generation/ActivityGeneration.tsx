'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ActivityProposal } from '../../../../../../src/core/domain/activities/activity-generation.ts';
import type { ActivityGenerationOperations } from '../model/authoring-operations.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { defaultGenerationCounts, defaultGenerationForm, type GenerationFormValue } from './ActivityGenerationForm.tsx';
import { GenerationSetup } from './GenerationSetup.tsx';
import { AiProgress, FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { ActivityGenerationProposal } from './ActivityGenerationProposal.tsx';
import { generationErrors, generationStates, generationWarnings, generationSourceTitle, type GenerationView } from './generation-feedback.ts';
import styles from '../drafting/ActivityAuthoring.module.css';
import { parseEvaluationRubric } from '../../../../../../src/core/domain/grading/evaluation-rubric.ts';
import { useActivityGeneration } from './use-activity-generation.ts';

export function ActivityGeneration({ api, room, onApplied, onClose, creationContext, initialRequest }: {
  api: ActivityGenerationOperations; room: Detail; onApplied: (id: string, signal: AbortSignal) => Promise<void>; onClose: () => void; creationContext?: ClassroomCreationContext | null; initialRequest?: GenerationFormValue;
}) {
  const generation = useActivityGeneration(api, room, onApplied);
  const [form, setForm] = useState(() => initialRequest ?? ({ ...defaultGenerationForm(), topicIds: creationContext?.topicIds ?? [] })), [review, setReview] = useState<{ id: string; proposal: ActivityProposal } | null>(null);
  const [dirty, setDirty] = useState(false), [replacement, setReplacement] = useState<GenerationView | null>(null);
  const [charge, setCharge] = useState(false), [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [settingsEdited, setSettingsEdited] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(!initialRequest);
  const [panel, setPanel] = useState<'history' | 'sources' | 'missing' | null>(null);
  const settingsHeading = useRef<HTMLHeadingElement>(null);
  const focusSettings = useRef(false);
  const [configError, setConfigError] = useState('');
  const changed = dirty || settingsEdited;
  function prepare(value: typeof form, predecessor?: GenerationView) {
    const check = value.teacherBrief.trim() && (value.unitIds.length > 0 || value.topicIds.length > 0);
    if (!check) {
      setSettingsOpen(true); setConfigError('Elegí el alcance y escribí tu idea antes de generar.');
      return;
    }
    setConfigError('');
    setSettingsOpen(false);
    setSending(true);
    return generation.generate(value, predecessor, charge).then(accepted => {
      if (accepted) setSettingsEdited(false);
      else setSettingsOpen(true);
    }).finally(() => setSending(false));
  }
  const initialStarted = useRef(false);
  const prepareInitial = useEffectEvent((request: typeof form) => { void prepare(request); });
  useEffect(() => {
    let cancelled = false;
    if (initialRequest) queueMicrotask(() => {
      if (cancelled || initialStarted.current) return;
      initialStarted.current = true;
      prepareInitial(initialRequest);
    });
    return () => { cancelled = true; };
  }, [initialRequest]);
  const view = generation.view, active = view && ['QUEUED', 'RUNNING'].includes(view.state);
  useEffect(() => {
    if (settingsOpen && focusSettings.current) {
      focusSettings.current = false;
      settingsHeading.current?.focus();
    }
  }, [settingsOpen]);
  function openSettings() {
    if (settingsOpen) settingsHeading.current?.focus();
    else { focusSettings.current = true; setSettingsOpen(true); }
  }
  const uncertain = view?.error === 'PROVIDER_OUTCOME_UNKNOWN';
  useEffect(() => { setCharge(false); }, [view?.id]);
  useEffect(() => {
    if (!review && view?.state === 'READY' && view.proposal) setReview({ id: view.id, proposal: structuredClone(view.proposal) });
  }, [review, view]);
  function accept(next: GenerationView) {
    if (dirty) { setReplacement(next); return; }
    if (next.proposal) { setReview({ id: next.id, proposal: structuredClone(next.proposal) }); setDirty(false); }
  }
  const handedOff = useRef<string | null>(null);
  const applyProposal = useEffectEvent((...args: Parameters<typeof generation.apply>) => { void generation.apply(...args); });
  const busy = generation.busy;
  useEffect(() => {
    if (!initialRequest || busy || !initialStarted.current || view?.state !== 'READY' || !view.proposal || handedOff.current !== null) return;
    try { parseEvaluationRubric(view.proposal.evaluationRubric); } catch { return; }
    handedOff.current = view.id;
    // Applying creates a private draft only. Review and publication remain in the shared editor.
    applyProposal(view.id, view.proposal);
  }, [initialRequest, view, busy]);
  const editable = room.role === 'teacher' && !room.archived;
  let invalidRubric = false;
  try { parseEvaluationRubric(review?.proposal.evaluationRubric ?? []); }
  catch { invalidRubric = true; }
  return <section className={`p7-authoring p7-generation br-authoring ${styles.editor} ${styles.generation}`} aria-label="Generar actividad con IA">
    <header className="parity-compose-top"><button className="brujula-authoring-back" aria-label="Cerrar editor" type="button" disabled={generation.busy} onClick={() => changed ? setLeaving(true) : onClose()}><FoxmindIcon name="arrow-left"/></button><div><strong>Crear actividad</strong><small>{room.name}</small></div><span><FoxmindIcon name="lock"/>Tu espacio de trabajo</span><img src="/foxmind/logo.webp" alt="" width={40} height={40}/></header>
    <ol className={styles.stageList} aria-label="Etapas de edición">{['Alcance','Contenido','Revisión'].map((label,index)=><li key={label} className={index === 1 ? 'current' : index === 0 ? 'done' : undefined} aria-current={index === 1 ? 'step' : undefined}><span><b>{index + 1}</b>{label}</span></li>)}</ol>
    <header className="p5-section-head aw-title-row"><div><h2>{review ? 'Armá el contenido' : 'Foxy está preparando tu propuesta'}</h2><p>Revisá y editá la propuesta antes de compartirla con tu grupo.</p></div></header>
    {configError ? <Notice error>{configError}</Notice> : null}
    {generation.error ? <Notice error>{generation.error}</Notice> : null}
    {sending || active ? <AiProgress state={active ? view.state as 'QUEUED' | 'RUNNING' : 'SENDING'} task="activity" /> : null}
    {!settingsOpen && !active && !sending ? <div className={styles.secondaryActions}>
      <button type="button" onClick={openSettings}>{review ? 'Editar alcance e idea' : 'Abrir alcance e idea'}</button>
    </div> : null}
    <section className="education-generation-settings" hidden={!settingsOpen || !!active || sending} aria-labelledby="activity-generation-settings-heading">
      <h3 id="activity-generation-settings-heading" ref={settingsHeading} tabIndex={-1}>Alcance e idea</h3>
      <GenerationSetup room={room} value={form} update={value => { setForm(value); setSettingsEdited(true); }} sources={generation.sources}
        disabled={generation.busy || Boolean(active) || uncertain || !editable}
        generate={async value => { if (editable) await prepare(value); }} />
    </section>
    <div className="p5-actions"><button disabled={generation.busy} onClick={() => void generation.refresh()}>Actualizar fuentes y generaciones</button></div>
    {view && !active ? <section aria-label="Estado de generación"><h4>{generationStates[view.state] ?? view.state}</h4>
      {view.error ? <Notice error>{generationErrors[view.error] ?? 'No se pudo completar esta generación.'}</Notice> : null}
      {view.state === 'STALE' ? <Notice>El programa o alguna fuente cambió. Revisa las fuentes y solicita una propuesta nueva.</Notice> : null}
      {view.missingInformation?.length || view.sourceReport?.length ? <div className={styles.secondaryActions}>
        {view.missingInformation?.length ? <button type="button" aria-haspopup="dialog" onClick={() => setPanel('missing')}>Detalle de la información faltante</button> : null}
        {view.sourceReport?.length ? <button type="button" aria-haspopup="dialog" onClick={() => setPanel('sources')}>Lectura de las fuentes</button> : null}
      </div> : null}
      {view.state === 'APPLIED' && view.appliedActivityId ? <button disabled={generation.busy} onClick={() => void generation.openApplied(view.appliedActivityId!)}>Abrir borrador creado</button> : null}
      {view.state === 'READY' && view.proposal && review?.id !== view.id ? <button disabled={generation.busy} onClick={() => accept(view)}>Revisar esta propuesta</button> : null}
      {['READY', 'FAILED', 'STALE'].includes(view.state) && editable ? <button disabled={generation.busy} onClick={() => { openSettings(); setRegenerating(true); }}>Preparar regeneración completa</button> : null}
      {regenerating ? <div className="p5-notice"><p>Se creará otra propuesta con los parámetros y fuentes del formulario. La anterior y tus ediciones siguen disponibles hasta que elijas reemplazarlas.</p>
        {view.error === 'PROVIDER_OUTCOME_UNKNOWN' ? <label className="p7-check"><input type="checkbox" checked={charge} onChange={e => setCharge(e.target.checked)} />Entiendo que el intento anterior puede haber consumido cuota y esta generación puede generar otro cargo.</label> : null}
        <button disabled={generation.busy || (view.error === 'PROVIDER_OUTCOME_UNKNOWN' && !charge)} onClick={() => {
          const next = prepare(form, view); if (next) setRegenerating(false);
        }}>Confirmar nueva generación</button><button onClick={() => setRegenerating(false)}>Cancelar regeneración</button></div> : null}
    </section> : null}
    {replacement ? <div className="p5-notice" role="alert"><p>Hay ediciones locales. ¿Reemplazarlas por esta propuesta guardada? La versión del servidor anterior permanece en Generaciones recientes.</p>
      <button onClick={() => { if (replacement.proposal) setReview({ id: replacement.id, proposal: structuredClone(replacement.proposal) }); setDirty(false); setReplacement(null); }}>Reemplazar ediciones</button>
      <button onClick={() => setReplacement(null)}>Conservar ediciones</button></div> : null}
    {review ? <>{settingsEdited ? <Notice>El alcance, la idea o la configuración cambiaron. Generá otra propuesta para usarlos.</Notice> : null}<p role="status">{dirty ? 'Propuesta editada sin aplicar.' : `Propuesta lista · ${review.proposal.title}`}</p>
      <div className={styles.proposal}>
        <ActivityGenerationProposal key={review.id} proposal={review.proposal} sources={generation.sources} disabled={generation.busy || !editable} update={proposal => { setReview({ ...review, proposal }); setDirty(true); }} />
      </div>
      {invalidRubric ? <Notice error>Revisá los criterios y comprobá que sus pesos sumen 100 %.</Notice> : null}
      <footer className="p5-form-footer"><button className="primary" disabled={generation.busy || !editable || settingsEdited || invalidRubric || view?.id !== review.id || view.state !== 'READY'}
        onClick={() => void generation.apply(review.id, review.proposal)}>Usar propuesta revisada como borrador</button></footer>
      <p>El borrador se abre en el mismo editor que usás para crear una actividad manual.</p></> : null}
    <div className={styles.secondaryActions}><button type="button" aria-haspopup="dialog" onClick={() => setPanel('history')}>Generaciones recientes</button></div>
    {panel === 'history' ? <Dialog title="Generaciones recientes" onClose={() => setPanel(null)}>
      {!generation.jobs.length ? <p>No hay generaciones recientes.</p> : <ul>{generation.jobs.map(job => <li key={job.id}>
        {generationStates[job.state] ?? job.state}{job.createdAt ? ` · ${new Date(job.createdAt).toLocaleString('es')}` : ''}
        <button type="button" disabled={generation.busy} onClick={() => {
          setForm({ ...defaultGenerationForm(), type: job.type, topicIds: job.topicIds, teacherBrief: job.teacherBrief ?? '',
            counts: defaultGenerationCounts(job.type) });
          setSettingsEdited(false); setSettingsOpen(false); setPanel(null);
          void generation.open(job.id);
        }}>Recuperar generación</button></li>)}</ul>}
    </Dialog> : null}
    {panel === 'sources' && view?.sourceReport?.length ? <Dialog title="Lectura de las fuentes" onClose={() => setPanel(null)}>
      <ul>{view.sourceReport.map(source => <li key={source.sourceId}>
        {generationSourceTitle(source.sourceId, generation.sources)} · {source.status === 'READ' ? 'Lectura completada' : 'Revisar fuente'}
        {source.pageCount !== null ? ` · ${source.pageCount} ${source.pageCount === 1 ? 'página' : 'páginas'}` : ''}
        {source.warnings.map(warning => <p key={warning}>{generationWarnings[warning] ?? warning}</p>)}
      </li>)}</ul>
    </Dialog> : null}
    {panel === 'missing' && view?.missingInformation?.length ? <Dialog title="Detalle de la información faltante" onClose={() => setPanel(null)}>
      <ul>{view.missingInformation.map((item, index) => <li key={index}>{item}</li>)}</ul>
    </Dialog> : null}
    {leaving ? <Dialog title="Salir de la propuesta" onClose={() => setLeaving(false)}>
      <p>Podés recuperar la propuesta original en Generaciones recientes. Si salís, se descartan los cambios que todavía no aplicaste al borrador.</p>
      <footer className="p5-form-footer">
        <button type="button" className="primary" onClick={() => setLeaving(false)}>Seguir editando</button>
        <button type="button" onClick={onClose}>Descartar cambios</button>
      </footer>
    </Dialog> : null}
  </section>;
}
