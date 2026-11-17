'use client';
import { preload } from 'react-dom';
import { extractionMessage } from '../../../features/curriculum/index.ts';
import {
  ClassroomProcessing, type ClassroomProcessStage, WizardGeneral, ClassroomWizardCover, WizardReview,
  createClassroomCreationOperations, createClassroomDraftPersistence, useClassroomPlanFile,
  classroomGeneralProblem, classroomPlanFileProblem, classroomPlanProblem,
} from '../../../features/classrooms/index.ts';
import { learningCover } from '../../../../../shared-ui/parity-assets.ts';
import {
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Draft, Payload } from '../../../../../../src/core/contracts/classrooms.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { WizardPlan, WizardPlanSource } from '../../../features/curriculum/index.ts';
import { WizardSuggestions } from '../../../features/curriculum/index.ts';
import { usePlanExtraction } from '../../../features/curriculum/index.ts';
import { classroomZones } from '../../../features/curriculum/index.ts';
import { formatClassroomPlan, parseClassroomPlan, prepareClassroomPlan } from '../../../features/curriculum/index.ts';
import { AiProgress, FoxmindIcon } from '../../../../../shared-ui/index.ts';


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
  const [publishing, setPublishing] = useState(false);
  const [removedUnits, setRemovedUnits] = useState<Payload['units']>();
  const [planText, setPlanText] = useState(() => formatClassroomPlan(draft.payload.units));
  const [method, setMethod] = useState<'ai' | 'manual' | null>(draft.payload.wizardMethod ?? null);
  const [analyze, setAnalyze] = useState(false), [navigating, setNavigating] = useState(false);
  const [processDismissed, setProcessDismissed] = useState(false);
  const actionLock = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  const [extractingText, setExtractingText] = useState(false), [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latest = useRef(payload);
  const mounted = useRef(true);
  const operations = useMemo(() => createClassroomCreationOperations(api), [api]);
  const persistence = useRef(createClassroomDraftPersistence(operations, draft, () => latest.current, {
    status: value => { if (mounted.current) setStatus(value); },
    error: failure => { if (mounted.current) setError(failure.message); },
  }));
  persistence.current.useOperations(operations);
  const save = persistence.current.save;
  const fileOperations = useMemo(() => ({
    upload: (file: File) => api.upload(draft.id, file),
    status: (id: string, signal?: AbortSignal) => api.fileStatus(id, signal),
  }), [api, draft.id]);
  const planFile = useClassroomPlanFile(fileOperations, payload.planFileId, actionLock, mounted, {
    selected: id => setPayload(previous => ({ ...previous, planFileId: id })),
    start: () => { setProcessDismissed(false); setAnalyze(false); },
    error: setError,
  });
  const { file, uploading, uploadName, uploadFailure } = planFile;
  const upload = async (chosen: File | undefined) => { if (!blocked) await planFile.upload(chosen); };

  latest.current = payload;
  useEffect(() => {
    preload('/foxmind/classroom-world.webp', { as: 'image' });
    preload('/foxmind/foxy.webp', { as: 'image' });
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const extraction = usePlanExtraction({
    api, draftId: draft.id,
    readyFileId: analyze && method === 'ai' && !uploading && file?.ready && file.id === payload.planFileId ? file.id : undefined,
    save, getDraft: () => ({ ...draft, payload: latest.current, revision: persistence.current.revision() }),
    serialize: persistence.current.serialize,
    onApplied: result => {
      latest.current = result.draft.payload;
      persistence.current.accept(result.draft);
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
    if (persistence.current.isSaved(payload)) return;
    setStatus('Cambios sin guardar');
    const timer = setTimeout(() => {
      void save().catch(() => {});
    }, 650);
    return () => clearTimeout(timer);
  }, [payload, save]);
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
  const validateGeneral = () => classroomGeneralProblem(payload);
  const validateFile = () => classroomPlanFileProblem(payload, file);
  const validatePlan = () => classroomPlanProblem(payload, method === 'ai' && analyze && extraction.view?.state !== 'APPLIED');
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
      const result = await persistence.current.publish();
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
    onRemoveFile:()=>{planFile.remove();setAnalyze(false);update('planFileId',undefined);},fileUrl:(id:string)=>api.fileUrl(id),onFile:upload,onError:setError,
    onRefresh: async () => { if (!blocked) await planFile.refresh(); },
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
