'use client';
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { ClassroomClient, Draft, Payload, FileState } from './api.ts';
import { Notice } from './components.tsx';
import { FoxmindIcon, type IconKey } from '../shared-ui/index.ts';
import { WizardCoverPreview, WizardGeneral } from './WizardGeneral.tsx';
import { WizardPlan } from './WizardPlan.tsx';
import { WizardUnits } from './WizardUnits.tsx';
import { WizardReview } from './WizardReview.tsx';
import { WizardSuggestions } from './WizardSuggestions.tsx';
import { usePlanExtraction } from './use-plan-extraction.ts';
import { classroomZones } from './classroom-zones.ts';

const steps = [
  'Datos generales',
  'Plan de estudio',
  'Unidades y temas',
  'Revisión',
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
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  const unitsRef = useRef<HTMLDivElement>(null), fileInputRef = useRef<HTMLInputElement>(null);
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
      setCollapsed(new Set());
      setStatus('Borrador guardado');
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
      .then(setFile)
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
    if (step === 1 && !file?.ready) {
      setError('Subí un plan y esperá su aprobación antes de continuar.');
      return;
    }
    if (
      step === 2 &&
      (!payload.units?.length ||
        payload.units.some(
          (unit) =>
            !unit.name.trim() ||
            !unit.topics.length ||
            unit.topics.some((topic) => !topic.name.trim()),
        ))
    ) {
      setCollapsed(new Set());
      if (unitsRef.current) requestAnimationFrame(() => {
        const inputs = Array.from(unitsRef.current?.querySelectorAll<HTMLInputElement>('input') ?? []);
        inputs.find(input => !input.value.trim() || !input.validity.valid)?.focus();
      });
      setError(
        'Agregá al menos una unidad con un tema y completá sus nombres.',
      );
      return;
    }
    try {
      await save();
      setStep((previous) => Math.min(previous + 1, 3));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function publish() {
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
  const changeUnits = (units: NonNullable<Payload['units']>) => {
    if (blocked) return;
    if (units.length !== (payload.units?.length ?? 0)) setCollapsed(new Set());
    update('units', units);
  };
  const toggleUnit = (index: number) => {
    if (blocked) return;
    setCollapsed(previous => { const next = new Set(previous); if (next.has(index)) next.delete(index); else next.add(index); return next; });
  };
  return (
    <div className="p5-wizard folder-wizard">
      <button
        className="p5-link"
        disabled={blocked}
        onClick={() => {
          if (blocked) return;
          void save()
            .then(onExit)
            .catch((e) => setError(e.message));
        }}
      >
        Mis Aulas / Guardar y salir
      </button>
      <h1>Crear aula</h1>
      <p className="p5-lead">Un espacio para compartir lo que sabés.</p>
      <ol className="p5-steps">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? 'step' : undefined}
            className={index < step ? 'complete' : index === step ? 'active' : ''}
          >
            <span>{index < step ? '\u2713' : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {error ? <Notice error>{error}</Notice> : null}
      <form
        data-wizard-step={step}
        className="p5-surface folder-panel tone-yellow"
        onSubmit={(event) => {
          event.preventDefault();
          void (step === 3 ? publish() : next());
        }}
      >
        <header className="p5-section-head">
          <div className="wizard-section-title">
            <span className="wizard-section-icon"><FoxmindIcon name={(['book', 'file', 'book', 'clipboard'] as IconKey[])[step]} /></span>
            <div>
            <h2>{step === 3 ? 'Revisá tu aula' : steps[step]}</h2>
            <p>
              {step === 0
                ? 'Completá los datos para que tus estudiantes la reconozcan.'
                : step === 1
                  ? 'Compartí el punto de partida de tu curso.'
                  : step === 2
                    ? 'Organizá las unidades y sus temas.'
                    : 'Verificá la información antes de publicarla.'}
            </p></div>
          </div>
          <span className="p5-save" role="status" data-state={status === 'Borrador guardado' ? 'saved' : status === 'No se pudo guardar' ? 'error' : 'pending'}>
            <FoxmindIcon name={status === 'Borrador guardado' ? 'check' : status === 'No se pudo guardar' ? 'warning' : 'clock'} />
            {status}
          </span>
        </header>
        {step > 0 ? <WizardCoverPreview payload={payload} compact /> : null}
        <fieldset disabled={uploading || publishing || extraction.busy}>
          <div hidden={step !== 2 && !(step === 1 && payload.planFileId && file?.ready)}>
            <WizardSuggestions extraction={extraction} hasUnits={Boolean(payload.units?.length)} review={step === 2} />
          </div>
          {step === 0 ? <WizardGeneral payload={payload} zones={zones} onUpdate={update} /> : null}
          {step === 1 ? <WizardPlan file={file} uploading={uploading} disabled={blocked} inputRef={fileInputRef}
            fileUrl={id => api.fileUrl(id)} onFile={upload} onError={setError}
            onRefresh={() => {
              if (blocked || !file) return;
              void api.fileStatus(file.id).then(state => { setFile(state); if (state.ready) update('planFileId', state.id); })
                .catch(failure => setError(failure.message));
            }} /> : null}
          {step === 2 ? <WizardUnits units={payload.units ?? []} collapsed={collapsed} containerRef={unitsRef}
            onChange={changeUnits} onToggle={toggleUnit} /> : null}
          {step === 3 ? <WizardReview payload={payload} file={file} zones={zones}
            onEdit={nextStep => { if (!blocked) setStep(nextStep); }} /> : null}
        </fieldset>
        <footer className="p5-form-footer">
          <button
            type="button"
            disabled={publishing || uploading || extraction.busy || step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            Volver
          </button>
          <button
            type="submit"
            className="primary"
            disabled={uploading || publishing || extraction.busy}
          >
            {publishing
              ? 'Creando aula…'
              : step === 3
                ? 'Crear aula'
                : 'Continuar'}
          </button>
        </footer>
      </form>
    </div>
  );
}
