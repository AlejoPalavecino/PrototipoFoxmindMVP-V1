'use client';
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ChangeEvent,
} from 'react';
import type { ClassroomClient, Draft, Payload, FileState } from './api.ts';
import { Cover, coverCatalog, Notice } from './components.tsx';

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
  const [file, setFile] = useState<FileState | null>(null),
    [uploading, setUploading] = useState(false),
    [publishing, setPublishing] = useState(false);
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
    const snapshot = JSON.stringify(latest.current);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
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
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
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
      event.target.value = '';
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
  const changeUnit = (index: number, name: string) =>
    update(
      'units',
      (payload.units ?? []).map((u, i) => (i === index ? { ...u, name } : u)),
    );
  return (
    <div className="p5-wizard folder-wizard">
      <button
        className="p5-link"
        onClick={() => {
          void save()
            .then(onExit)
            .catch((e) => setError(e.message));
        }}
      >
        Mis Aulas / Guardar y salir
      </button>
      <h1>Crear <span>aula</span></h1>
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
        className="p5-surface folder-panel tone-yellow"
        onSubmit={(event) => {
          event.preventDefault();
          void (step === 3 ? publish() : next());
        }}
      >
        <h2 className="folder-tab">{step === 3 ? 'Revisá tu aula' : steps[step]}</h2>
        <header className="p5-section-head">
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
            </p>
          </div>
          <span className="p5-save" role="status">
            {status}
          </span>
        </header>
        <fieldset disabled={uploading || publishing}>
          {step === 0 ? (
            <>
              <div className="p5-fields">
                {(['name', 'subject', 'division'] as const).map((key) => (
                  <label key={key}>
                    {key === 'name'
                      ? 'Nombre del aula'
                      : key === 'subject'
                        ? 'Materia'
                        : 'División'}
                    <input
                      required
                      maxLength={key === 'division' ? 60 : 120}
                      value={payload[key] ?? ''}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </label>
                ))}
                <label>
                  Ciclo lectivo
                  <input
                    type="number"
                    required
                    min="1"
                    max="9999"
                    value={payload.academicYear ?? ''}
                    onChange={(e) =>
                      update(
                        'academicYear',
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </label>
                <label className="p5-wide">
                  Zona horaria
                  <input
                    list="p5-timezones"
                    required
                    value={payload.timezone ?? ''}
                    onChange={(e) => update('timezone', e.target.value)}
                  />
                  <datalist id="p5-timezones">
                    {Intl.supportedValuesOf('timeZone').map((zone) => (
                      <option key={zone} value={zone} />
                    ))}
                  </datalist>
                  <small>Se conserva fija después de crear el aula.</small>
                </label>
              </div>
              <h3>Elegí una portada</h3>
              <div className="p5-covers">
                {coverCatalog.map((cover) => (
                  <label
                    key={cover.key}
                    className={payload.coverKey === cover.key ? 'selected' : ''}
                  >
                    <Cover kind={cover.key} />
                    <span>
                      <input
                        type="radio"
                        required
                        name="cover"
                        checked={payload.coverKey === cover.key}
                        onChange={() => update('coverKey', cover.key)}
                      />
                      {cover.label}
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : null}
          {step === 1 ? (
            <>
              <label className="p5-drop">
                {uploading
                  ? 'Subiendo y revisando el archivo…'
                  : 'Elegir plan de estudio'}
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(event) => void upload(event)}
                />
                <small>PDF o DOCX · Hasta 20 MB</small>
              </label>
              {file ? (
                <div className="p5-file">
                  <strong>{file.name}</strong>
                  <span>
                    {file.ready
                      ? 'Aprobado para usar'
                      : `Carga: ${file.upload} · Validación: ${file.validation} · Análisis: ${file.scan}`}
                  </span>
                  {file.ready ? (
                    <a
                      href={api.fileUrl(file.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Descargar plan
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        void api
                          .fileStatus(file.id)
                          .then((state) => {
                            setFile(state);
                            if (state.ready) update('planFileId', state.id);
                          })
                          .catch((e) => setError(e.message))
                      }
                    >
                      Consultar estado
                    </button>
                  )}
                </div>
              ) : (
                <p>
                  El plan estará disponible cuando supere la validación y el
                  análisis de seguridad.
                </p>
              )}
            </>
          ) : null}
          {step === 2 ? (
            <>
              <div className="p5-units">
                {(payload.units ?? []).map((unit, index) => (
                  <section className="p5-unit" key={index}>
                    <div className="p5-section-head">
                      <h3>Unidad {index + 1}</h3>
                      <button
                        type="button"
                        className="p5-link"
                        onClick={() =>
                          update(
                            'units',
                            payload.units!.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Quitar unidad {index + 1}
                      </button>
                    </div>
                    <label>
                      Nombre de la unidad
                      <input
                        required
                        maxLength={120}
                        value={unit.name}
                        onChange={(e) => changeUnit(index, e.target.value)}
                      />
                    </label>
                    {unit.topics.map((topic, topicIndex) => (
                      <div className="p5-topic" key={topicIndex}>
                        <label>
                          Tema {topicIndex + 1}
                          <input
                            required
                            maxLength={120}
                            value={topic.name}
                            onChange={(e) =>
                              update(
                                'units',
                                payload.units!.map((u, i) =>
                                  i === index
                                    ? {
                                        ...u,
                                        topics: u.topics.map((t, j) =>
                                          j === topicIndex
                                            ? { name: e.target.value }
                                            : t,
                                        ),
                                      }
                                    : u,
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          aria-label={`Quitar tema ${topicIndex + 1} de unidad ${index + 1}`}
                          onClick={() =>
                            update(
                              'units',
                              payload.units!.map((u, i) =>
                                i === index
                                  ? {
                                      ...u,
                                      topics: u.topics.filter(
                                        (_, j) => j !== topicIndex,
                                      ),
                                    }
                                  : u,
                              ),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          'units',
                          payload.units!.map((u, i) =>
                            i === index
                              ? { ...u, topics: [...u.topics, { name: '' }] }
                              : u,
                          ),
                        )
                      }
                    >
                      Agregar tema
                    </button>
                  </section>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  update('units', [
                    ...(payload.units ?? []),
                    { name: '', topics: [{ name: '' }] },
                  ])
                }
              >
                Agregar unidad
              </button>
            </>
          ) : null}
          {step === 3 ? (
            <>
              <div className="p5-review">
                <Cover kind={payload.coverKey} />
                <div>
                  <h3>{payload.name || 'Aula sin nombre'}</h3>
                  <p>
                    {payload.subject} · {payload.division} ·{' '}
                    {payload.academicYear}
                  </p>
                  <p>{payload.timezone}</p>
                </div>
              </div>
              <section className="p5-unit">
                <h3>Plan de estudio</h3>
                <p>
                  {file?.ready
                    ? `${file.name} · Aprobado`
                    : 'Falta un plan aprobado'}
                </p>
                <button type="button" onClick={() => setStep(1)}>
                  Editar plan
                </button>
              </section>
              <section className="p5-unit">
                <h3>Unidades y temas</h3>
                {(payload.units ?? []).map((unit, index) => (
                  <div key={index}>
                    <strong>{unit.name}</strong>
                    <ul>
                      {unit.topics.map((topic, i) => (
                        <li key={i}>{topic.name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
              <Notice>
                Después de crear el aula, podrás invitar estudiantes por correo
                o compartir un código.
              </Notice>
            </>
          ) : null}
        </fieldset>
        <footer className="p5-form-footer">
          <button
            type="button"
            disabled={publishing || uploading || step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            Volver
          </button>
          <button
            type="submit"
            className="primary"
            disabled={uploading || publishing}
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
