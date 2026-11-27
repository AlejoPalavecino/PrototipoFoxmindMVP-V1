import { useEffect, useState } from 'react';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { FoxyDialog } from '../../../../../shared-ui/FoxyChatLayout';
import { learningCover } from '../../../../../shared-ui/parity-assets';

export type FoxyContextPreview = {
  units: { id?: string; name: string; topics: { id?: string; name: string }[] }[];
  materials: { id: string; title: string; kind?: string }[];
  activities: { id: string; title: string; kind?: string }[];
};
export type FoxyContextClassroom = {
  id: string;
  name: string;
  archived?: boolean;
  coverKey?: string;
  division?: string;
};
export function FoxyContextPicker({
  classrooms,
  current,
  attachmentCount,
  previewContext,
  onApply,
  onClose,
  onLibrary,
  busy,
  applyError,
}: {
  classrooms: FoxyContextClassroom[];
  current: string;
  attachmentCount: number;
  previewContext?: (id: string, signal: AbortSignal) => Promise<FoxyContextPreview>;
  onApply: (value: string) => void;
  onClose: () => void;
  onLibrary: () => void;
  busy?: boolean;
  applyError?: string;
}) {
  const [selected, setSelected] = useState(current),
    [mode, setMode] = useState(current === 'GENERAL' ? 'general' : 'classroom');
  const [section, setSection] = useState<'plan' | 'materials' | 'activities'>('plan');
  const [preview, setPreview] = useState<FoxyContextPreview>(),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const room = classrooms.find(item => item.id === selected && !item.archived);
  useEffect(() => {
    setPreview(undefined);
    setError('');
    setLoading(false);
    if (mode !== 'classroom' || selected === 'GENERAL' || !previewContext) return;
    const abort = new AbortController();
    setLoading(true);
    void previewContext(selected, abort.signal)
      .then(value => {
        if (!abort.signal.aborted) setPreview(value);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError('No pudimos consultar el aula. Volvé a intentar.');
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [mode, selected, previewContext, retry]);
  return (
    <FoxyDialog
      title="¿Con qué contexto trabajamos?"
      description="Combiná un aula con tus propios materiales."
      onClose={onClose}
      className="parity-context-dialog"
      footer={
        <>
          <button type="button" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" disabled={busy} onClick={onLibrary}>
            <FoxmindIcon name="book" />
            Abrir biblioteca
          </button>
          <button
            type="button"
            className="p5-primary"
            data-apply-context
            disabled={busy || (mode === 'classroom' && (!room || loading || !!error))}
            onClick={() => onApply(mode === 'general' ? 'GENERAL' : selected)}
          >
            <FoxmindIcon name="check" />
            {busy ? 'Conservando tus archivos…' : 'Usar este contexto'}
          </button>
        </>
      }
    >
      {applyError && <p role="alert">{applyError}</p>}
      <div className="parity-foxy-contextModes" aria-label="Tipo de contexto">
        {(
          [
            {
              value: 'general',
              icon: 'folder',
              title: 'Contexto general',
              note: 'Tu biblioteca privada como referencia.',
            },
            {
              value: 'classroom',
              icon: 'layers',
              title: 'Vincular a un aula',
              note: 'Plan, materiales y actividades actualizados.',
            },
          ] as const
        ).map(item => (
          <button
            type="button"
            disabled={busy}
            key={item.value}
            data-context-mode={item.value}
            aria-pressed={mode === item.value}
            onClick={() => {
              setMode(item.value);
              if (item.value === 'general') setSelected('GENERAL');
            }}
          >
            <span>
              <FoxmindIcon name={item.icon} />
            </span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.note}</small>
            </div>
            <FoxmindIcon name={mode === item.value ? 'check' : 'chevron-right'} />
          </button>
        ))}
      </div>
      {mode === 'classroom' && (
        <div className="parity-foxy-classPicks" aria-label="Elegir aula">
          {classrooms
            .filter(item => !item.archived)
            .map(item => (
              <button
                type="button"
                disabled={busy}
                key={item.id}
                data-classroom-id={item.id}
                aria-pressed={selected === item.id}
                onClick={() => setSelected(item.id)}
              >
                <img src={learningCover(item.coverKey)} alt="" />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.division}</small>
                </span>
                <FoxmindIcon name={selected === item.id ? 'check' : 'chevron-right'} />
              </button>
            ))}
          {!classrooms.some(item => !item.archived) && (
            <p>No tenés aulas disponibles. Podés seguir con tus materiales propios.</p>
          )}
        </div>
      )}
      {mode === 'general' ? (
        <section className="parity-foxy-contextPreview general">
          <FoxmindIcon name="chat-square" />
          <h3>Tu idea y tus materiales</h3>
          <p>
            Esta conversación no usa información de tus aulas. Podés sumar archivos a su biblioteca privada para darle
            más contexto a Foxy.
          </p>
          <span>
            <FoxmindIcon name="folder" />
            {attachmentCount} materiales propios listos para usar
          </span>
        </section>
      ) : !room ? (
        <p className="parity-foxy-contextPrompt">Elegí un aula para consultar lo que se incluye.</p>
      ) : (
        <section className="parity-foxy-contextPreview">
          <div className="parity-foxy-contextSummary">
            <img src={learningCover(room.coverKey)} alt="" />
            <div>
              <h3>{room.name}</h3>
              <p>Incluye el contexto vigente de {room.name}.</p>
            </div>
          </div>
          {loading && <p role="status">Consultando el contexto del aula…</p>}
          {error && (
            <p role="alert">
              {error}{' '}
              <button type="button" onClick={() => setRetry(value => value + 1)}>
                Reintentar
              </button>
            </p>
          )}
          {preview && (
            <>
              <div className="parity-foxy-contextCounts" aria-label="Información incluida">
                {(
                  [
                    {
                      key: 'plan',
                      icon: 'book',
                      label: 'Plan de estudio',
                      count: preview.units.flatMap(unit => unit.topics).length,
                      suffix: 'temas',
                    },
                    {
                      key: 'materials',
                      icon: 'folder',
                      label: 'Materiales',
                      count: preview.materials.length + attachmentCount,
                      suffix: 'disponibles',
                    },
                    {
                      key: 'activities',
                      icon: 'edit',
                      label: 'Actividades',
                      count: preview.activities.length,
                      suffix: 'compartidas',
                    },
                  ] as const
                ).map(item => (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={section === item.key}
                    onClick={() => setSection(item.key)}
                  >
                    <FoxmindIcon name={item.icon} />
                    <strong>{item.label}</strong>
                    <span>
                      {item.count} {item.suffix}
                    </span>
                  </button>
                ))}
              </div>
              <ul className="parity-foxy-contextItems">
                {section === 'plan'
                  ? preview.units.map((unit, i) => (
                      <li key={unit.id ?? i}>
                        <strong>{unit.name}</strong>
                        <span>{unit.topics.map(topic => topic.name).join(' · ')}</span>
                      </li>
                    ))
                  : preview[section].map(item => (
                      <li key={item.id}>
                        <strong>{item.title}</strong>
                        <span>{item.kind ?? 'Recurso'}</span>
                      </li>
                    ))}
                {(section === 'plan' ? preview.units : preview[section]).length === 0 && (
                  <li>Todavía no hay contenido en esta sección.</li>
                )}
              </ul>
            </>
          )}
          <p className="parity-foxy-contextFootnote">
            <FoxmindIcon name="check" />
            El contenido del aula se consulta actualizado, sin volver a subirlo.
          </p>
        </section>
      )}
      <p className="parity-foxy-contextSwitch">
        Si ya conversaste, cambiar de contexto abre otro chat. El anterior queda en el historial.
      </p>
    </FoxyDialog>
  );
}
