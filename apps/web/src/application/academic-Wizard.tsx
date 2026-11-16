'use client';
import { preload } from 'react-dom';
import { extractionMessage } from '../features/curriculum/index.ts';
import { ClassroomProcessing, type ClassroomProcessStage } from '../features/classrooms/index.ts';
import { learningCover } from '../../../shared-ui/parity-assets.ts';
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { ClassroomClient } from '../../../../src/core/contracts/academic-client.ts';
import type { Draft, Payload } from '../../../../src/core/contracts/classrooms.ts';
import type { FileState } from '../../../../src/core/contracts/materials.ts';
import { Dialog, Notice } from '../../../shared-ui/feedback.tsx';
import { WizardGeneral } from '../features/classrooms/index.ts';
import { WizardPlan, WizardPlanSource } from '../features/curriculum/index.ts';
import { WizardSuggestions } from '../features/curriculum/index.ts';
import { usePlanExtraction } from '../features/curriculum/index.ts';
import { classroomZones } from '../features/curriculum/index.ts';
import { formatClassroomPlan, parseClassroomPlan, prepareClassroomPlan } from '../features/curriculum/index.ts';
import { ClassroomWizardCover } from '../features/classrooms/index.ts';
import { WizardReview } from '../features/classrooms/index.ts';
import { AiProgress, FoxmindIcon } from '../../../shared-ui/index.ts';

const steps = [
  { label: 'Tu aula', detail: 'Nombre, grupo y portada', heading: 'Dale identidad a tu aula', description: 'Un nombre, un grupo y una portada que los represente.' },
  { label: 'El programa', detail: 'Tu material como punto de partida', heading: 'Todo empieza con una buena base', description: 'Sumá tu programa y elegí cómo organizarlo.' },
  { label: 'El recorrido', detail: 'Unidades y temas a tu manera', heading: 'Un recorrido que invita a aprender', description: 'Ajustá la propuesta para que tenga tu forma de enseñar.' },
  { label: 'Todo listo', detail: 'Una última mirada antes de crear', heading: 'Tu aula está a un paso', description: 'Revisá los detalles. Todavía podés cambiar lo que necesites.' },
];
export function Wizard({
  api,
  draft,
  onExit,
  onPublished,
}: {
  api: ClassroomClient;
  draft: Draft;
  onExit: () => void;
  onPublished: (id: string, code: string | null) => void;
}) {
  const [payload, setPayload] = useState<Payload>(() => ({
    ...draft.payload,
    coverKey: draft.payload.coverKey ?? 'literature',
    academicYear: draft.payload.academicYear ?? new Date().getFullYear(),
    timezone:
      draft.payload.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  }));
  const [changingZone,setChangingZone]=useState(false),[coversExpanded,setCoversExpanded]=useState(false);
  const [step, setStep] = useState<number>(draft.payload.wizardStep ?? 0),
    [status, setStatus] = useState('Borrador guardado'),
    [error, setError] = useState('');
  const zones = useMemo(() => classroomZones(payload.timezone ?? 'UTC'), [payload.timezone]);
  const [file, setFile] = useState<FileState | null>(null),
    [uploading, setUploading] = useState(false),
    [publishing, setPublishing] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [removedUnits, setRemovedUnits] = useState<Payload['units']>();
  const [planText, setPlanText] = useState(() => formatClassroomPlan(draft.payload.units));
  const [method, setMethod] = useState<'ai' | 'manual' | null>(draft.payload.wizardMethod ?? null);
  const [analyze, setAnalyze] = useState(false), [navigating, setNavigating] = useState(false);
  const [processDismissed, setProcessDismissed] = useState(false), [uploadFailure, setUploadFailure] = useState('');
  const actionLock = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  const [extractingText, setExtractingText] = useState(false), [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileSelection = useRef(0);
  const latest = useRef(payload),
    revision = useRef(draft.revision),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    saved = useRef(JSON.stringify(draft.payload));
  const mounted = useRef(true),
    failed = useRef(false);
  latest.current = payload;
  useEffect(() => {
    preload('/foxmind/classroom-world.webp', { as: 'image' });
    preload('/foxmind/foxy.webp', { as: 'image' });
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const save = useCallback(async () => {
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        const snapshot = JSON.stringify(latest.current);
        if (snapshot === saved.current) return;
        if (failed.current)
          throw new Error(
            'El borrador cambió en otra sesión o se perdió la confirmación. Volvé a Mis Aulas y abrí la versión guardada antes de seguir.',
          );
        if (mounted.current) setStatus('Guardando borrador…');
        try {
          const next = await api.call<Draft>(`/drafts/${draft.id}`, 'PATCH', {
            revision: revision.current,
            payload: JSON.parse(snapshot),
          });
          revision.current = next.revision;
          saved.current = snapshot;
          if (mounted.current) setStatus('Borrador guardado');
        } catch (e) {
          failed.current = true;
          if (mounted.current) {
            setStatus('No se pudo guardar');
            setError((e as Error).message);
          }
          throw e;
        }
      });
    await queue.current;
  }, [api, draft.id]);
  const extraction = usePlanExtraction({
    api, draftId: draft.id,
    readyFileId: analyze && method === 'ai' && !uploading && file?.ready && file.id === payload.planFileId ? file.id : undefined,
    save, getDraft: () => ({ ...draft, payload: latest.current, revision: revision.current }),
    serialize: async operation => {
      const next = queue.current.catch(() => {}).then(operation);
      queue.current = next;
      await next;
    },
    onApplied: result => {
      latest.current = result.draft.payload;
      revision.current = result.draft.revision;
      saved.current = JSON.stringify(result.draft.payload);
      setPayload(result.draft.payload);
      setPlanText(formatClassroomPlan(result.draft.payload.units));
      setRemovedUnits(undefined);
      setStatus('Borrador guardado');
      setExtractingText(false);
    },
  });
  const blocked = uploading || publishing || navigating || extraction.busy;
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (JSON.stringify(payload) === saved.current) return;
    setStatus('Cambios sin guardar');
    const timer = setTimeout(() => {
      void save().catch(() => {});
    }, 650);
    return () => clearTimeout(timer);
  }, [payload, save]);
  useEffect(() => {
    if (!payload.planFileId) {
      setFile(null);
      return;
    }
    const controller = new AbortController();
    const selection = fileSelection.current;
    const isCurrent = () => !controller.signal.aborted && selection === fileSelection.current;
    void api
      .fileStatus(payload.planFileId, controller.signal)
      .then(state => { if (isCurrent()) setFile(state); })
      .catch((e) => {
        if (isCurrent()) setError(e.message);
      });
    return () => controller.abort();
  }, [api, payload.planFileId]);
  useEffect(() => {
    if (typeof document === 'undefined' || uploading || !file || file.ready || file.rejectionCode
      || file.validation === 'REJECTED' || ['REJECTED', 'ERROR'].includes(file.scan)) return;
    const controller = new AbortController();
    const selection = fileSelection.current;
    let timer: ReturnType<typeof setTimeout>;
    let delay = 1500;
    const check = async () => {
      if (document.hidden) { timer = setTimeout(check, delay); return; }
      try {
        const next = await api.fileStatus(file.id, controller.signal);
        if (controller.signal.aborted || selection !== fileSelection.current || actionLock.current || next.id !== file.id) return;
        setUploadFailure('');
        if (next.ready) {
          setPayload(previous => ({ ...previous, planFileId: next.id }));
          setError('');
        }
        if (next.ready || next.rejectionCode || next.validation === 'REJECTED' || ['REJECTED', 'ERROR'].includes(next.scan)) {
          setFile(next); return;
        }
        delay = Math.min(delay * 2, 10_000);
        timer = setTimeout(check, delay);
      } catch {
        if (!controller.signal.aborted && selection === fileSelection.current) { setError('No pudimos consultar el archivo. Probá consultar su estado nuevamente.'); setUploadFailure('No pudimos consultar el archivo. Podés volver a consultar su estado sin subirlo otra vez.'); }
      }
    };
    timer = setTimeout(check, delay);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [api, file, uploading]);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => {
      if (uploading || status !== 'Borrador guardado') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [status, uploading]);
  const update = (key: keyof Payload, value: unknown) =>
    setPayload((previous) => ({ ...previous, [key]: value }));
  async function upload(chosen: File | undefined) {
    if (!chosen || blocked || actionLock.current) return;
    if (!/\.(pdf|doc|docx|ppt|pptx)$/i.test(chosen.name) || chosen.size > 20_000_000 || chosen.size === 0) {
      setError('Elegí un PDF, Word o PowerPoint de hasta 20 MB con contenido.'); return;
    }
    actionLock.current = true;
    const selection = ++fileSelection.current;
    setProcessDismissed(false); setUploadFailure('');
    setAnalyze(false);
    setUploading(true);
    setUploadName(chosen.name);
    setError('');
    try {
      const state = await api.upload(draft.id, chosen);
      if (!mounted.current || selection !== fileSelection.current) return;
      setFile(state);
      if (state.ready) update('planFileId', state.id);
      else if (state.rejectionCode || state.validation === 'REJECTED' || ['REJECTED', 'ERROR'].includes(state.scan)) {
        setError('El archivo no está aprobado. Revisá su estado o elegí otro archivo.');
        setUploadFailure('El archivo no está aprobado. Elegí otro archivo para continuar.');
      }
    } catch (e) {
      if (mounted.current && selection === fileSelection.current) { setError((e as Error).message); setUploadFailure((e as Error).message); }
    } finally {
      if (mounted.current && selection === fileSelection.current) { actionLock.current = false; setUploading(false); setUploadName(''); }
    }
  }
  function validateGeneral() {
    if (!payload.name?.trim() || !payload.subject?.trim() || !payload.division?.trim()) {
      return 'Completá el nombre, la materia y la división del aula.';
    }
    if (!Number.isInteger(payload.academicYear) || payload.academicYear! < 1 || payload.academicYear! > 9999) return 'Completá un ciclo lectivo válido.';
    return '';
  }
  function validateFile() {
    if (!payload.planFileId && !file) return 'Subí el archivo del plan de estudio para continuar.';
    if (!file?.ready || file.id !== payload.planFileId) return 'El archivo del plan debe estar aprobado y superar la revisión antes de continuar.';
    return '';
  }
  function validatePlan() {
    if (!payload.units?.length || payload.units.some(unit => !unit.name.trim() || !unit.topics.length || unit.topics.some(topic => !topic.name.trim()))) {
      return 'Agregá al menos una unidad con un tema y completá sus nombres. El aula necesita un plan escrito.';
    }
    if (payload.units.length > 100 || payload.units.some(unit => unit.name.length > 120 || unit.topics.length > 100 || unit.topics.some(topic => topic.name.length > 120)) || payload.units.reduce((count, unit) => count + unit.topics.length, 0) > 500) {
      return 'Revisá los límites del plan: nombres de hasta 120 caracteres, 100 unidades, 100 temas por unidad y 500 temas en total.';
    }
    if (method === 'ai' && analyze && extraction.view?.state !== 'APPLIED') return 'Esperá el análisis y aplicá la propuesta revisada, o elegí continuar manualmente.';
    return '';
  }
  async function next() {
    if (blocked || actionLock.current) return;
    setError('');
    const message = step === 0 ? validateGeneral() : step === 1 ? validateFile() || (!method ? 'Elegí analizar con IA o cargar el plan de forma manual.' : '') : step === 2 ? validateFile() || validatePlan() : '';
    if (message) { setError(message); return; }
    actionLock.current = true; setNavigating(true);
    try {
      if (step === 0 || step === 2) {
        const normalized = { ...latest.current, name: latest.current.name?.trim(), subject: latest.current.subject?.trim(), division: latest.current.division?.trim(),
          units: latest.current.units?.map(unit => ({ name: unit.name.trim(), topics: unit.topics.map(topic => ({ name: topic.name.trim() })) })) };
        latest.current = normalized; setPayload(normalized); setPlanText(formatClassroomPlan(normalized.units));
      }
      const progressing = { ...latest.current, wizardStep: (step + 1) as 0 | 1 | 2 | 3, wizardMethod: method };
      if (step === 1 && method === 'manual' && !progressing.units?.length) progressing.units = [{ name: '', topics: [{ name: '' }] }];
      latest.current = progressing; setPayload(progressing);
      await save();
      if (step === 1) { setProcessDismissed(false); setAnalyze(method === 'ai'); }
      setStep(step + 1);
      if (step === 2) setRemovedUnits(undefined);
    } catch (e) { setError((e as Error).message); }
    finally { actionLock.current = false; setNavigating(false); }
  }
  async function publish() {
    if (blocked || actionLock.current || step !== 3) return;
    const message = validateGeneral() || validateFile() || validatePlan();
    if (message) { setError(message); return; }
    actionLock.current = true;
    setPublishing(true);
    setError('');
    try {
      await save();
      const result = await api.call<{ id: string; code: string | null }>(
        `/drafts/${draft.id}/publish`,
        'POST',
        { revision: revision.current },
      );
      onPublished(result.id, result.code);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      actionLock.current = false;
      setPublishing(false);
    }
  }
  const saveAndExit = () => {
    if (blocked || actionLock.current) return;
    actionLock.current = true; setNavigating(true);
    void save().then(onExit).catch(e => setError(e.message)).finally(() => { actionLock.current = false; setNavigating(false); });
  };
  const updateUnits = (units: NonNullable<Payload['units']>) => {
    setRemovedUnits(undefined); update('units', units); setPlanText(formatClassroomPlan(units));
  };
  const planOptions={classroomLayout:true,file,uploading,disabled:blocked,inputRef:fileInputRef,units:payload.units,
    onUnits: updateUnits,
    onRemoveUnits: (units: NonNullable<Payload['units']>) => { updateUnits(units); setRemovedUnits(payload.units); },
    onUndoRemove: removedUnits ? () => updateUnits(removedUnits) : undefined,
    onExtractText:()=>{setPastedText(planText);setExtractingText(true);},
    onRemoveFile:()=>{fileSelection.current += 1;setAnalyze(false);setFile(null);update('planFileId',undefined);},fileUrl:(id:string)=>api.fileUrl(id),onFile:upload,onError:setError,
    onRefresh: async () => {
      if (blocked || actionLock.current || !file) return;
      actionLock.current = true; setUploading(true); setError(''); setUploadFailure('');
      const selection = fileSelection.current;
      try {
        const state = await api.fileStatus(file.id);
        if (!mounted.current || selection !== fileSelection.current) return;
        setFile(state); if (state.ready) update('planFileId', state.id);
      } catch (failure) { if (mounted.current && selection === fileSelection.current) { setError((failure as Error).message); setUploadFailure((failure as Error).message); } }
      finally { if (mounted.current && selection === fileSelection.current) { actionLock.current = false; setUploading(false); } }
    },
  };
  const fileRejected = Boolean(file && (file.rejectionCode || file.validation === 'REJECTED' || ['REJECTED', 'ERROR'].includes(file.scan)));
  const filePending = Boolean(file && !file.ready && !fileRejected);
  const analysisPending = analyze && method === 'ai' && (!extraction.view && !extraction.message || ['QUEUED', 'RUNNING'].includes(extraction.view?.state ?? ''));
  const analysisFailed = analyze && method === 'ai' && (extraction.messageError || extraction.view?.state === 'FAILED');
  const processStage: ClassroomProcessStage | null = uploading ? uploadName ? 'upload' : 'validation' : uploadFailure || fileRejected ? 'upload-error' : filePending ? 'validation'
    : analysisFailed ? 'analysis-error' : analysisPending ? extraction.view?.state === 'RUNNING' ? 'running' : extraction.view?.state === 'QUEUED' ? 'queued' : 'sending' : null;
  const backToProgram = () => {
    setProcessDismissed(true); setStep(1);
    const moved = { ...latest.current, wizardStep: 1 as const, wizardMethod: method }; latest.current = moved; setPayload(moved);
  };
  if (processStage && !processDismissed) return <ClassroomProcessing key="processing" stage={processStage} consultationFailed={Boolean(analysisPending && extraction.messageError)}
    message={analysisPending && extraction.messageError ? 'No pudimos consultar el estado del análisis. Podés volver a consultarlo sin iniciar otra generación.' : processStage === 'analysis-error' ? extraction.message || extractionMessage(extraction.view?.error) : uploadFailure || error || 'El archivo no está aprobado. Elegí otro archivo para continuar.'}
    retrying={extraction.busy} onBack={backToProgram}
    retryLabel={processStage === 'upload-error' ? 'Consultar estado' : analysisPending ? 'Consultar análisis' : 'Volver a intentar'}
    onRetry={processStage === 'upload-error' && filePending ? () => { void planOptions.onRefresh(); } : processStage === 'analysis-error' ? analysisPending ? () => { void extraction.refresh(); } : extraction.view?.retryable ? () => { void extraction.retry(); } : undefined : undefined}
    onManual={processStage === 'analysis-error' ? () => { extraction.cancel(); setAnalyze(false); setMethod('manual'); setProcessDismissed(true); setStep(2); setError('');
      const manual = { ...latest.current, wizardMethod: 'manual' as const, wizardStep: 2 as const }; latest.current = manual; setPayload(manual);
    } : undefined} />;
  if (extractingText) return <Dialog title="Editar el plan como texto" className="brujula-wizard-dialog" onClose={() => setExtractingText(false)}>
    <div className="brujula-wizard"><p>Editá el texto o pegá otro plan. Usá «Unidad: nombre» y un «- tema» por línea. Podés revisar el resultado antes de crear el aula.</p>
      <form onSubmit={event => {
        event.preventDefault();
        const prepared = prepareClassroomPlan(pastedText), parsed = parseClassroomPlan(prepared);
        const outline = (units: typeof parsed) => units.map(unit => ({ name: unit.name, topics: unit.topics.map(topic => topic.name) }));
        const current = latest.current.units ?? [];
        setRemovedUnits(undefined); setPlanText(prepared);
        if (JSON.stringify(outline(current)) !== JSON.stringify(outline(parsed))) update('units', parsed);
        setExtractingText(false);
      }}>
        <label>Texto del plan<textarea autoFocus required rows={7} value={pastedText} onChange={event => setPastedText(event.target.value)} /></label>
        <footer className="brujula-wizard-foot"><button type="button" onClick={() => setExtractingText(false)}>Volver</button><button className="primary" type="submit">Preparar esquema</button></footer>
      </form>
    </div>
  </Dialog>;
  const goTo = (target: number) => { if (!blocked) { setError(''); setStep(target); const moved = { ...latest.current, wizardStep: target as 0 | 1 | 2 | 3, wizardMethod: method }; latest.current = moved; setPayload(moved); } };
  const action = step === 3 ? 'Crear mi aula' : step === 1 ? method === 'ai' ? 'Preparar con Foxy' : method === 'manual' ? 'Armar mi recorrido' : 'Continuar' : 'Continuar';
  const continueManually = () => { extraction.cancel(); setMethod('manual'); update('wizardMethod', 'manual'); setAnalyze(false); setError(''); };
  return <Dialog key="wizard" title="Crear un aula" className="parity-classroom-wizard" onClose={saveAndExit}>
    <form className="class-wizard-form" data-wizard-step={step} aria-busy={blocked} onSubmit={event=>{event.preventDefault();if(!blocked)void(step===3?publish():next());}}>
      <div className="class-builder">
        <aside className="class-builder-rail"><ol aria-label="Pasos para crear el aula">{steps.map((item,index)=><li key={item.label} className={index===step?'current':index<step?'complete':''}><button type="button" disabled={blocked||index>step} aria-current={index===step?'step':undefined} onClick={()=>goTo(index)}><span>{index<step?<FoxmindIcon name="check"/>:index+1}</span><div><b>{item.label}</b><small>{item.detail}</small></div></button></li>)}</ol><div className="class-builder-preview"><img src={learningCover(payload.coverKey)} alt=""/><div><span>Así se va a ver tu aula</span><b>{payload.name||'Tu próxima aula'}</b><small>{payload.division||'Un lugar para tu grupo'}</small></div></div><p className="class-private"><FoxmindIcon name="lock"/>Tu borrador es sólo tuyo.</p></aside>
        <section className="class-builder-stage"><div className="class-step-heading"><span>Paso {step+1} de 4</span><h3 ref={heading} tabIndex={-1}>{steps[step].heading}</h3><p>{steps[step].description}</p></div>
          {error?<Notice error>{error}</Notice>:null}
        <div key={step} className="class-step-content"><fieldset disabled={blocked}>
          {step === 0 ? <>
            <WizardGeneral payload={payload} zones={zones} onUpdate={update} changingZone={changingZone} onToggleZone={()=>setChangingZone(value=>!value)} />
            <ClassroomWizardCover payload={payload} onUpdate={update} expanded={coversExpanded} onToggle={()=>setCoversExpanded(value=>!value)} />
          </> : step === 1 ? <>
            <WizardPlanSource {...planOptions} />
            {processDismissed && processStage ? <div className="class-process-background" role="status"><p>{analysisPending ? 'El análisis puede continuar en el servidor. No hace falta volver a enviarlo.' : filePending || uploading ? 'Tu programa se está procesando. No hace falta volver a subirlo.' : 'Podés consultar el resultado del procesamiento.'}</p><button type="button" onClick={() => setProcessDismissed(false)}>Ver estado</button></div> : null}
            <fieldset className="class-methods" disabled={!file?.ready || file.id !== payload.planFileId}><legend>¿Cómo querés preparar el recorrido?</legend><p>Elegí el punto de partida. Vas a poder editar todo después.</p>
            <label className="class-method"><input type="radio" name="plan-method" value="ai" checked={method === 'ai'} onChange={() => { setMethod('ai'); update('wizardMethod', 'ai'); setAnalyze(false); }} />
              <span className="method-icon"><FoxmindIcon name="spark" /></span><span><b>Prepararlo con Foxy</b><small>Una propuesta de unidades y temas a partir de tu programa.</small></span></label>
            <label className="class-method"><input type="radio" name="plan-method" value="manual" checked={method === 'manual'} onChange={() => { setMethod('manual'); update('wizardMethod', 'manual'); setAnalyze(false); }} />
              <span className="method-icon"><FoxmindIcon name="edit" /></span><span><b>Armarlo a mano</b><small>Organizá las unidades y los temas con tu propia mirada.</small></span></label>
            </fieldset>{!file?.ready ? <p className="class-file-hint">Primero cargá el programa para elegir cómo seguir.</p> : null}
          </> : step === 2 ? <>
            {!file?.ready ? <Notice>Estamos verificando el programa. Si necesitás reemplazarlo, volvé a El programa.</Notice> : null}
            {method === 'ai' && !analyze && !payload.units?.length ? <button type="button" disabled={blocked || !file?.ready || file.id !== payload.planFileId} onClick={() => setAnalyze(true)}>Preparar con Foxy</button> : null}
            {method === 'ai' && analyze && !extraction.view && !extraction.message ? <AiProgress state="SENDING" task="plan" /> : null}
            {method === 'ai' && analyze ? <><WizardSuggestions extraction={{ ...extraction, cancel: continueManually }} hasUnits={Boolean(payload.units?.length)} review />
              {!extraction.view ? <button type="button" disabled={blocked} onClick={continueManually}>Continuar manualmente</button> : null}</> : null}
            {method!=='ai'||!analyze&&Boolean(payload.units?.length)||extraction.view?.state==='APPLIED'?<><div className="class-plan-note"><FoxmindIcon name={method==='ai'?'spark':'edit'}/><p><b>{method==='ai'?'Foxy acercó una primera idea.':'El recorrido lleva tu mirada.'}</b> Revisá cada unidad y sus temas antes de continuar.</p></div><WizardPlan {...planOptions}/></>:null}
          </> : <WizardReview payload={payload} file={file} edit={goTo} />}
        </fieldset></div>

      <p className="brujula-wizard-save" data-error={status === 'No se pudo guardar'} data-save-state={status === 'No se pudo guardar' ? 'error' : status === 'Borrador guardado' && !uploading && !publishing ? 'saved' : 'pending'} role="status" aria-live="polite">{publishing ? <><span className="wizard-spinner" aria-hidden="true" />Creando tu aula…</> : uploading ? <><span className="wizard-spinner" aria-hidden="true" />{uploadName ? `Subiendo y validando «${uploadName}»…` : 'Consultando el estado del plan…'}</> : status}</p>
        </section>
      </div>

        <footer className="dialog-footer brujula-wizard-foot"><button type="button" className="brujula-wizard-keep class-save" disabled={blocked} onClick={saveAndExit}><svg className="fm3d-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="/brujula/icons.svg#save"/></svg>Guardar y salir</button><div className="class-step-actions">
          {step > 0 ? <button type="button" disabled={blocked} onClick={() => goTo(step - 1)}><FoxmindIcon name="arrow-left"/>Atrás</button> : null}
          <button type="submit" className="primary" disabled={blocked || step > 1 && (!file?.ready || file.id !== payload.planFileId) || step === 1 && (!file?.ready || file.id !== payload.planFileId || !method)}>{publishing ? 'Creando aula…' : navigating ? 'Guardando…' : action}<FoxmindIcon name={step===3?'check':step===1&&method==='ai'?'spark':'arrow-right'}/></button>
        </div></footer>
    </form>
  </Dialog>;
}
