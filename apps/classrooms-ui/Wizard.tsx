'use client';
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { ClassroomClient, Draft, Payload, FileState } from './api.ts';
import { Dialog, Notice } from './components.tsx';
import { WizardGeneral } from './WizardGeneral.tsx';
import { WizardPlan, WizardPlanSource } from './WizardPlan.tsx';
import { WizardSuggestions } from './WizardSuggestions.tsx';
import { usePlanExtraction } from './use-plan-extraction.ts';
import { classroomZones } from './classroom-zones.ts';
import { formatClassroomPlan, parseClassroomPlan, prepareClassroomPlan } from './WizardPlanText.ts';
import { WizardCover, WizardReview } from './WizardReview.tsx';
import { AiProgress } from '../shared-ui/index.ts';

const steps = ['Datos del aula', 'Cómo cargar el plan', 'Unidades y temas', 'Revisión'];
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
    coverKey: draft.payload.coverKey ?? 'general',
    academicYear: draft.payload.academicYear ?? new Date().getFullYear(),
    timezone:
      draft.payload.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  }));
  const [step, setStep] = useState(0),
    [status, setStatus] = useState('Borrador guardado'),
    [error, setError] = useState('');
  const zones = useMemo(() => classroomZones(payload.timezone ?? 'UTC'), [payload.timezone]);
  const [file, setFile] = useState<FileState | null>(null),
    [uploading, setUploading] = useState(false),
    [publishing, setPublishing] = useState(false);
  const [planText, setPlanText] = useState(() => formatClassroomPlan(draft.payload.units));
  const [method, setMethod] = useState<'ai' | 'manual' | null>(null);
  const [analyze, setAnalyze] = useState(false), [navigating, setNavigating] = useState(false);
  const actionLock = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  const [extractingText, setExtractingText] = useState(false), [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latest = useRef(payload),
    revision = useRef(draft.revision),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    saved = useRef(JSON.stringify(draft.payload));
  const mounted = useRef(true),
    failed = useRef(false);
  latest.current = payload;
  useEffect(() => {
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
    void api
      .fileStatus(payload.planFileId, controller.signal)
      .then(state => { if (!controller.signal.aborted) setFile(state); })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [api, payload.planFileId]);
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
    if (!chosen || blocked) return;
    if (!/\.(pdf|docx)$/i.test(chosen.name) || chosen.size > 20_000_000 || chosen.size === 0) {
      setError('Elegí un PDF o DOCX de hasta 20 MB con contenido.'); return;
    }
    setAnalyze(false);
    setUploading(true);
    setError('');
    try {
      const state = await api.upload(draft.id, chosen);
      setFile(state);
      if (state.ready) update('planFileId', state.id);
      else
        setError(
          'El archivo no está aprobado. Revisá su estado o elegí otro archivo.',
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  function validateGeneral() {
    if (!payload.name?.trim() || !payload.subject?.trim() || !payload.division?.trim()) {
      return 'Completá el nombre, la materia y la división del aula.';
    }
    if (!Number.isInteger(payload.academicYear) || payload.academicYear! < 1 || payload.academicYear! > 9999) return 'Completá un ciclo lectivo válido.';
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
    if (method === 'ai' && extraction.view?.state !== 'APPLIED') return 'Esperá el análisis y aplicá la propuesta revisada, o elegí continuar manualmente.';
    return '';
  }
  async function next() {
    if (blocked || actionLock.current) return;
    setError('');
    const message = step === 0 ? validateGeneral() : step === 1 && !method ? 'Elegí analizar con IA o cargar el plan de forma manual.' : step === 2 ? validatePlan() : '';
    if (message) { setError(message); return; }
    actionLock.current = true; setNavigating(true);
    try {
      if (step === 0 || step === 2) {
        const normalized = { ...latest.current, name: latest.current.name?.trim(), subject: latest.current.subject?.trim(), division: latest.current.division?.trim(),
          units: latest.current.units?.map(unit => ({ name: unit.name.trim(), topics: unit.topics.map(topic => ({ name: topic.name.trim() })) })) };
        latest.current = normalized; setPayload(normalized); setPlanText(formatClassroomPlan(normalized.units));
      }
      await save();
      if (step === 1) setAnalyze(method === 'ai');
      setStep(step + 1);
    } catch (e) { setError((e as Error).message); }
    finally { actionLock.current = false; setNavigating(false); }
  }
  async function publish() {
    if (blocked || actionLock.current || step !== 3) return;
    const message = validateGeneral() || validatePlan();
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
  const planOptions={file,uploading,disabled:blocked,inputRef:fileInputRef,planText,units:payload.units,
    onUnits:(units:NonNullable<Payload['units']>)=>{update('units',units);setPlanText(formatClassroomPlan(units));},
    onPlanText:(value:string)=>{setPlanText(value);update('units',parseClassroomPlan(value));},onExtractText:()=>setExtractingText(true),
    onRemoveFile:()=>{setAnalyze(false);setFile(null);update('planFileId',undefined);},fileUrl:(id:string)=>api.fileUrl(id),onFile:upload,onError:setError,
    onRefresh:()=>{if(blocked||!file)return;void api.fileStatus(file.id).then(state=>{setFile(state);if(state.ready)update('planFileId',state.id);}).catch(failure=>setError(failure.message));}};
  if (extractingText) return <Dialog title="Extraer unidades y temas" className="brujula-wizard-dialog" onClose={() => setExtractingText(false)}>
    <div className="brujula-wizard"><p>Pegá el contenido de un plan para preparar un esquema editable.</p>
      <form onSubmit={event => { event.preventDefault(); const prepared = prepareClassroomPlan(pastedText); setPlanText(prepared); update('units',parseClassroomPlan(prepared)); setExtractingText(false); }}>
        <label>Texto del plan<textarea autoFocus required rows={7} value={pastedText} onChange={event => setPastedText(event.target.value)} /></label>
        <footer className="brujula-wizard-foot"><button type="button" onClick={() => setExtractingText(false)}>Volver</button><button className="primary" type="submit">Preparar esquema</button></footer>
      </form>
    </div>
  </Dialog>;
  const goTo = (target: number) => { if (!blocked) { setError(''); setStep(target); } };
  const continueManually = () => { extraction.cancel(); setMethod('manual'); setAnalyze(false); setError(''); };
  return <Dialog title="Crear aula" className="brujula-wizard-dialog" onClose={saveAndExit}>
    <div className="brujula-wizard">
      <ol className="brujula-wizard-steps" aria-label="Pasos de creación del aula">{steps.map((label,index) => <li key={label} aria-current={index === step ? 'step' : undefined} className={index === step ? 'current' : ''}>{index+1} · {label}</li>)}</ol>
      {error ? <Notice error>{error}</Notice> : null}
      <h3 ref={heading} tabIndex={-1}>{steps[step]}</h3>
      <form data-wizard-step={step} aria-busy={blocked} onSubmit={event => { event.preventDefault(); if (!blocked) void (step === 3 ? publish() : next()); }}>
        <fieldset disabled={blocked}>
          {step === 0 ? <>
            <WizardGeneral payload={payload} zones={zones} onUpdate={update} />
            <WizardPlanSource {...planOptions} sourceOnly />
            <WizardCover payload={payload} onUpdate={update} />
          </> : step === 1 ? <fieldset className="wizard-method"><legend>Elegí cómo cargar las unidades y temas</legend>
            <label><input type="radio" name="plan-method" value="ai" checked={method === 'ai'} onChange={() => { setMethod('ai'); setAnalyze(false); }} />
              <span><strong>Analizar con IA</strong><small>Gemini extrae la estructura del documento. Podés corregirla antes de aplicarla.</small></span></label>
            <label><input type="radio" name="plan-method" value="manual" checked={method === 'manual'} onChange={() => { setMethod('manual'); setAnalyze(false); }} />
              <span><strong>Cargar manualmente</strong><small>Agregá tus unidades y temas sin analizar el archivo con IA.</small></span></label>
          </fieldset> : step === 2 ? <>
            {method === 'ai' && analyze && !extraction.view && !extraction.message ? <AiProgress state="SENDING" task="plan" /> : null}
            {method === 'ai' ? <><WizardSuggestions extraction={{ ...extraction, cancel: continueManually }} hasUnits={Boolean(payload.units?.length)} review />
              {!extraction.view ? <button type="button" disabled={blocked} onClick={continueManually}>Continuar manualmente</button> : null}</> : null}
            <WizardPlan {...planOptions}/>
          </> : <WizardReview payload={payload} file={file} edit={goTo} />}
        </fieldset>
      <p className="brujula-wizard-save" role="status" aria-live="polite">{publishing ? <><span className="wizard-spinner" aria-hidden="true" />Creando tu aula…</> : uploading ? <><span className="wizard-spinner" aria-hidden="true" />Subiendo y validando el plan…</> : status}</p>
        <footer className="brujula-wizard-foot"><button type="button" className="brujula-wizard-keep" disabled={blocked} onClick={saveAndExit}>Guardar borrador</button><div>
          {step > 0 ? <button type="button" disabled={blocked} onClick={() => goTo(step - 1)}>Atrás</button> : null}
          <button type="submit" className="primary" disabled={blocked}>{publishing ? 'Creando aula…' : navigating ? 'Guardando…' : step === 3 ? 'Confirmar y crear aula' : 'Continuar'}</button>
        </div></footer>
      </form>
    </div>
  </Dialog>;
}
