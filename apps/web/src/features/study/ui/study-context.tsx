import { studyFolderSettings } from '../folders/study-folder-persistence.ts';
import { useEffect, useState } from 'react';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { learningCover } from '../../../../../shared-ui/parity-assets';
import { Notice } from '../../../../../shared-ui/feedback';
import type { StudyCollection, StudyDetail } from '../model/study-contracts.ts';

export function StudyContext({
  detail,
  catalog,
  busy,
  onReload,
  onClose,
  onLibrary,
  onSaveAvailability,
  onWorkingChange,
}: {
  detail: StudyDetail;
  catalog: StudyCollection;
  busy: boolean;
  onReload: () => Promise<void>;
  onClose: () => void;
  onLibrary: () => void;
  onSaveAvailability?: (ready: boolean) => void;
  onWorkingChange?: (working: boolean) => void;
}) {
  const { folder } = detail;
  const [mode, setMode] = useState(folder.linkedClassroomId ? 'classroom' : 'general'),
    [link, setLink] = useState(folder.linkedClassroomId ?? '');
  const [section, setSection] = useState('plan'),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const room = catalog.classrooms.find(item => item.id === link),
    unchanged = (mode === 'classroom' ? link : null) === folder.linkedClassroomId;
  const sources = detail.sources.filter(source => source.available && (unchanged || source.origin === 'OWN'));
  const creations = [...detail.creations, ...detail.practices];
  const groups = [
    {
      key: 'plan',
      icon: 'book',
      title: 'Plan de estudio',
      count: folder.units.flatMap(unit => unit.topics).length,
      label: 'temas',
    },
    { key: 'materials', icon: 'folder', title: 'Materiales', count: sources.length, label: 'disponibles' },
    { key: 'creations', icon: 'spark', title: 'Creaciones', count: creations.length, label: 'propias' },
  ] as const;
  const roomId = room?.id;
  useEffect(
    () => onSaveAvailability?.(!busy && !saving && folder.status === 'ACTIVE' && (mode !== 'classroom' || !!roomId)),
    [busy, saving, folder.status, mode, roomId, onSaveAvailability],
  );
  useEffect(() => onWorkingChange?.(saving), [saving, onWorkingChange]);
  async function save() {
    if (saving || busy) return;
    if (mode === 'classroom' && !room) {
      setError('Elegí un aula disponible para continuar.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await studyFolderSettings.save(folder.id, {
        revision: folder.revision,
        linkedClassroomId: mode === 'classroom' ? link : null,
      });
      await onReload();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No pudimos guardar el vínculo. Tus materiales se conservan.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      id="study-context-form"
      className="study-exact-context"
      onSubmit={event => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="study-exact-context-modes" aria-label="Tipo de contexto">
        {(
          [
            {
              value: 'general',
              title: 'Sin aula vinculada',
              note: 'Tu biblioteca privada como referencia.',
              icon: 'folder',
            },
            { value: 'classroom', title: 'Vincular a un aula', note: 'Plan y materiales actualizados.', icon: 'book' },
          ] as const
        ).map(item => (
          <button
            type="button"
            key={item.value}
            disabled={busy || saving}
            aria-pressed={mode === item.value}
            onClick={() => {
              setMode(item.value);
              if (item.value === 'general') setLink('');
            }}
          >
            <span>
              <FoxmindIcon name={item.icon} />
            </span>
            <div>
              <b>{item.title}</b>
              <small>{item.note}</small>
            </div>
            <FoxmindIcon name={mode === item.value ? 'check' : 'chevron-right'} />
          </button>
        ))}
      </div>
      {mode === 'classroom' && (
        <div className="study-exact-class-picks" aria-label="Elegir aula">
          {catalog.classrooms.map(item => (
            <button
              type="button"
              key={item.id}
              disabled={busy || saving}
              aria-pressed={link === item.id}
              onClick={() => setLink(item.id)}
            >
              <img src={learningCover()} alt="" />
              <span>
                <b>{item.name}</b>
                <small>
                  {item.academicYear}
                  {item.archived ? ' · Archivada' : ''}
                </small>
              </span>
              <FoxmindIcon name={link === item.id ? 'check' : 'chevron-right'} />
            </button>
          ))}
          {!catalog.classrooms.length && <p>No tenés aulas disponibles. Podés seguir con tus materiales propios.</p>}
        </div>
      )}
      {mode === 'classroom' && !room ? (
        <p className="study-exact-context-prompt">Elegí un aula para consultar lo que se incluye.</p>
      ) : (
        <section className="study-exact-context-preview">
          <div className="study-exact-context-summary">
            <img src={learningCover(folder.bannerKey)} alt="" />
            <div>
              <h3>{folder.name}</h3>
              <p>
                {room
                  ? `Incluye el contexto vigente de ${room.name}.`
                  : 'Tus temas, materiales y creaciones personales.'}
              </p>
            </div>
          </div>
          {!unchanged && room && (
            <p className="study-exact-context-switch-note">
              Al guardar se consultarán los materiales disponibles del aula elegida.
            </p>
          )}
          <div className="study-exact-context-counts" aria-label="Información incluida">
            {groups.map(group => (
              <button
                type="button"
                key={group.key}
                aria-pressed={section === group.key}
                onClick={() => setSection(group.key)}
              >
                <FoxmindIcon name={group.icon} />
                <b>{group.title}</b>
                <span>
                  {group.count} {group.label}
                </span>
              </button>
            ))}
          </div>
          <ul className="study-exact-context-items">
            {section === 'plan'
              ? folder.units.map(unit => (
                  <li key={unit.id}>
                    <b>{unit.title}</b>
                    <span>{unit.topics.map(topic => topic.title).join(' · ')}</span>
                  </li>
                ))
              : section === 'materials'
                ? sources.map(source => (
                    <li key={source.id}>
                      <FoxmindIcon name="file" />
                      <div>
                        <b>{source.title}</b>
                        <span>
                          {source.origin === 'OWN'
                            ? 'Propio'
                            : (catalog.classrooms.find(item => item.id === folder.linkedClassroomId)?.name ??
                              'Aula vinculada')}
                        </span>
                      </div>
                    </li>
                  ))
                : creations.map(item => (
                    <li key={item.id}>
                      <FoxmindIcon name="book" />
                      <div>
                        <b>{item.title}</b>
                        <span>Creación propia</span>
                      </div>
                    </li>
                  ))}
          </ul>
          <p className="study-exact-context-footnote">
            <FoxmindIcon name="check" />
            {room
              ? 'El contenido del aula se consulta actualizado, sin volver a subirlo.'
              : 'Los materiales propios se incluyen en tus próximas consultas.'}
          </p>
        </section>
      )}
      <p className="study-exact-context-switch-note">
        El vínculo se aplica a esta carpeta. Cambiarlo o quitarlo conserva tus archivos y conversaciones.
      </p>
      {error && <Notice error>{error}</Notice>}
    </form>
  );
}
