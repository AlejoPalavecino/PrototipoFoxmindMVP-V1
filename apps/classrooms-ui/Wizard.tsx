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

const steps = ['Datos del aula', 'Plan de estudio'];
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
    readyFileId: !uploading && file?.ready && file.id === payload.planFileId ? file.id : undefined,
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
  const blocked = uploading || publishing || extraction.busy;
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
  async function next() {
    setError('');
    if (!payload.name?.trim() || !payload.subject?.trim() || !payload.division?.trim()) {
      setError('Completá el nombre, la materia y la división del aula.');
      return;
    }
    try {
      if (payload.coverKey === 'general') {
        const subject = payload.subject.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
        const coverKey = /biolog|naturaleza/.test(subject) ? 'biology' : /matemat|geometr/.test(subject) ? 'math' : /lengua|literatura/.test(subject) ? 'literature' : /geograf/.test(subject) ? 'society' : 'general';
        latest.current = { ...latest.current, coverKey }; setPayload(latest.current);
      }
      await save(); setStep(1);
    } catch (e) { setError((e as Error).message); }
  }
  async function publish() {
    if (!payload.units?.length || payload.units.some(unit => !unit.name.trim() || !unit.topics.length || unit.topics.some(topic => !topic.name.trim()))) {
      setError('Agregá al menos una unidad con un tema y completá sus nombres. El aula necesita un plan escrito.');
      return;
    }
    if (payload.units.length > 100 || payload.units.some(unit => unit.name.length > 120 || unit.topics.length > 100 || unit.topics.some(topic => topic.name.length > 120)) || payload.units.reduce((count, unit) => count + unit.topics.length, 0) > 500) {
      setError('Revisá los límites del plan: nombres de hasta 120 caracteres, 100 unidades, 100 temas por unidad y 500 temas en total.');
      return;
    }
    if ((file && !file.ready) || (payload.planFileId && (!file?.ready || file.id !== payload.planFileId))) {
      setError('El archivo seleccionado debe superar la revisión antes de crear el aula. Podés retirarlo y conservar el plan escrito.');
      return;
    }
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
      setPublishing(false);
    }
  }
  const saveAndExit = () => {
    if (blocked) return;
    void save().then(onExit).catch(e => setError(e.message));
  };
  const planOptions={file,uploading,disabled:blocked,inputRef:fileInputRef,planText,
    onPlanText:(value:string)=>{setPlanText(value);update('units',parseClassroomPlan(value));},onExtractText:()=>setExtractingText(true),
    onRemoveFile:()=>{setFile(null);update('planFileId',undefined);},fileUrl:(id:string)=>api.fileUrl(id),onFile:upload,onError:setError,
    onRefresh:()=>{if(blocked||!file)return;void api.fileStatus(file.id).then(state=>{setFile(state);if(state.ready)update('planFileId',state.id);}).catch(failure=>setError(failure.message));}};
  if (extractingText) return <Dialog title="Extraer unidades y temas" className="brujula-wizard-dialog" onClose={() => setExtractingText(false)}>
    <div className="brujula-wizard"><p>Pegá el contenido de un plan para preparar un esquema editable.</p>
      {payload.planFileId && file?.ready ? <WizardSuggestions extraction={extraction} hasUnits={Boolean(payload.units?.length)} review /> : null}
      <form onSubmit={event => { event.preventDefault(); const prepared = prepareClassroomPlan(pastedText); setPlanText(prepared); update('units',parseClassroomPlan(prepared)); setExtractingText(false); }}>
        <label>Texto del plan<textarea autoFocus required rows={7} value={pastedText} onChange={event => setPastedText(event.target.value)} /></label>
        <footer className="brujula-wizard-foot"><button type="button" onClick={() => setExtractingText(false)}>Volver</button><button className="primary" type="submit">Preparar esquema</button></footer>
      </form>
      <WizardPlanSource {...planOptions}/>
    </div>
  </Dialog>;
  return <Dialog title={step === 0 ? 'Crear aula' : 'Preparar el plan de estudio'} className="brujula-wizard-dialog" onClose={saveAndExit}>
    <div className="brujula-wizard">
      <ol className="brujula-wizard-steps" aria-label="Pasos de creación del aula">{steps.map((label,index) => <li key={label} aria-current={index === step ? 'step' : undefined} className={index === step ? 'current' : ''}>{index+1} · {label}</li>)}</ol>
      {error ? <Notice error>{error}</Notice> : null}
      <form data-wizard-step={step} onSubmit={event => { event.preventDefault(); if (!blocked) void (step === 1 ? publish() : next()); }}>
        <fieldset disabled={blocked}>
          {step === 0 ? <WizardGeneral payload={payload} zones={zones} onUpdate={update} /> : <>
            <WizardPlan {...planOptions}/>
          </>}
        </fieldset>
        <p className={`brujula-wizard-save${status === 'No se pudo guardar' ? '' : ' sr-only'}`} role="status">{status}</p>
        <footer className="brujula-wizard-foot"><button type="button" className="brujula-wizard-keep" disabled={blocked} onClick={saveAndExit}>Guardar borrador</button><div>
          {step === 1 ? <button type="button" disabled={blocked} onClick={() => setStep(0)}>Atrás</button> : null}
          <button type="submit" className="primary" disabled={blocked}>{publishing ? 'Creando aula…' : step === 1 ? 'Crear aula' : 'Continuar'}</button>
        </div></footer>
      </form>
    </div>
  </Dialog>;
}
