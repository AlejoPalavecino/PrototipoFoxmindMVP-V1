import { studyDraftOperations } from './study-folder-persistence.ts';
import { useState } from 'react';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { learningCover } from '../../../../../shared-ui/parity-assets';
import { Notice } from '../../../../../shared-ui/feedback';
import type { StudyCollection } from '../model/study-contracts.ts';
import { StudyConfirmation } from '../ui/study-confirmation';

const api = studyDraftOperations;
export function StudyCollectionView({
  catalog,
  onCreate,
  onEnter,
  status: controlledStatus,
  onStatusChange,
}: {
  catalog: StudyCollection;
  onCreate: () => void;
  onEnter: (id: string) => void;
  status?: string;
  onStatusChange?: (status: string) => void;
}) {
  const [localStatus, setLocalStatus] = useState('ACTIVE'),
    [removed, setRemoved] = useState<string[]>([]),
    [removal, setRemoval] = useState<StudyCollection['items'][number]>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [classroom, setClassroom] = useState('');
  const status = controlledStatus ?? localStatus;
  const setStatus = onStatusChange ?? setLocalStatus;
  const available = catalog.items.filter(item => !removed.includes(item.id));
  const years = [...new Set(available.map(item => item.academicYear))].sort((a, b) => b - a);
  const needle = query.trim().toLocaleLowerCase();
  const items = available.filter(item => item.status === status &&
    (!year || String(item.academicYear) === year) &&
    (!classroom || (item.linkedClassroomId ?? 'OWN') === classroom) &&
    (!needle || [item.name, item.subject].some(value => value?.toLocaleLowerCase().includes(needle))),
  );
  const filtering = Boolean(needle || year || classroom);
  return (
    <div className="parity-study-collection study-exact-collection">
      <header>
        <div>
          <h1>Mi estudio</h1>
          <p>Organizá tus temas, consultá tus materiales y practicá con Foxy.</p>
        </div>
        <button onClick={onCreate}>
          <FoxmindIcon name="plus" />
          Crear carpeta
        </button>
      </header>
      <section aria-label="Carpetas de estudio">
        <div className="study-exact-collection-toolbar">
          <div className="study-exact-segmented" role="group" aria-label="Estado de las carpetas">
            {[
              ['ACTIVE', 'Activas'],
              ['DRAFT', 'Borradores'],
              ['ARCHIVED', 'Archivadas'],
            ].map(([value, label]) => (
              <button key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>
                {label}
                <span>{available.filter((item) => item.status === value).length}</span>
              </button>
            ))}
          </div>
          <div className="study-exact-collection-filters">
            <label className="study-exact-search">
              <FoxmindIcon name="search" />
              <span className="sr-only">Buscar carpeta</span>
              <input type="search" placeholder="Buscar carpeta" value={query} onChange={event => setQuery(event.target.value)} />
            </label>
            <label>
              <span className="sr-only">Año</span>
              <select value={year} onChange={event => setYear(event.target.value)}>
                <option value="">Todos los años</option>
                {years.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Vínculo con aula</span>
              <select value={classroom} onChange={event => setClassroom(event.target.value)}>
                <option value="">Todos los vínculos</option>
                <option value="OWN">Sin aula vinculada</option>
                {catalog.classrooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
              </select>
            </label>
          </div>
        </div>
        {error && <Notice error>{error}</Notice>}
        {!items.length ? (
          <div className="study-exact-empty">
            <img src="/foxmind/classroom-world.webp" alt="" />
            <h2>
              {filtering ? 'No encontramos carpetas' : status === 'DRAFT' ? 'Todavía no tenés borradores'
                : status === 'ARCHIVED' ? 'Todavía no tenés carpetas archivadas' : 'Todavía no tenés carpetas'}
            </h2>
            <p>
              {filtering ? 'Probá otro nombre o cambiá los filtros.' : status === 'DRAFT'
                ? 'Usá Guardar y salir para retomar la creación de una carpeta más adelante.'
                : status === 'ARCHIVED' ? 'Cuando archives una carpeta, vas a poder consultarla desde acá.'
                  : 'Creá una carpeta para guardar tu programa y ordenar tus temas.'}
            </p>
          </div>
        ) : (
          <div className={status === 'DRAFT' ? 'study-exact-draft-grid' : 'study-exact-card-grid'}>
            {items.map((folder) =>
              status === 'DRAFT' ? (
                <article key={folder.id} className="study-exact-draft">
                  <img src={learningCover(folder.bannerKey)} alt="" />
                  <div>
                    <span className="study-exact-draft-label">
                      <FoxmindIcon name="edit" />
                      Borrador
                    </span>
                    <h2>{folder.name || 'Carpeta sin nombre'}</h2>
                    <p>{folder.subject || 'Materia pendiente'}</p>
                    <div
                      className="study-exact-draft-progress"
                      aria-label={`Paso ${(folder.wizardStep ?? 0) + 1} de 4`}
                    >
                      {[0, 1, 2, 3].map((index) => (
                        <i
                          key={index}
                          className={index <= (folder.wizardStep ?? 0) ? 'done' : ''}
                        />
                      ))}
                    </div>
                    <div className="study-exact-draft-actions">
                      <button className="primary" onClick={() => onEnter(folder.id)}>
                        <FoxmindIcon name="arrow-right" />
                        Retomar creación
                      </button>
                      <button
                        className="study-exact-icon"
                        onClick={() => setRemoval(folder)}
                        aria-label={`Eliminar borrador ${folder.name || 'sin nombre'}`}
                      >
                        <FoxmindIcon name="trash" />
                      </button>
                    </div>
                  </div>
                </article>
              ) : (
                <button
                  key={folder.id}
                  className="study-exact-card"
                  onClick={() => onEnter(folder.id)}
                >
                  <span className="study-exact-cover">
                    <img src={learningCover(folder.bannerKey)} alt="" />
                    <span>
                      <FoxmindIcon name="lock" />
                      {folder.status === 'ARCHIVED' ? 'Archivada' : 'Privada'}
                    </span>
                  </span>
                  <span className="study-exact-card-body">
                    <strong>{folder.name}</strong>
                    <span>{[folder.subject, folder.academicYear].filter(Boolean).join(' · ')}</span>
                    <span className="study-exact-linked">
                      <FoxmindIcon name="book" />
                      {folder.linkedClassroomId
                        ? catalog.classrooms.find(room => room.id === folder.linkedClassroomId)?.name ?? 'Aula vinculada'
                        : 'Materiales propios'}
                    </span>
                    <span className="study-exact-card-bottom">
                      <span>Abrir carpeta</span>
                      <FoxmindIcon name="arrow-right" />
                    </span>
                  </span>
                </button>
              ),
            )}
          </div>
        )}
      </section>
      {removal && (
        <StudyConfirmation
          title="¿Eliminar este borrador?"
          description="Vas a perder los datos y el plan guardados en el borrador."
          confirmLabel="Eliminar borrador"
          destructive
          busy={busy}
          onClose={() => setRemoval(undefined)}
          onConfirm={async () => {
            setBusy(true);
            setError('');
            try {
              await api.remove(removal.id, removal.revision);
              setRemoved((values) => [...values, removal.id]);
            } catch (error) {
              setError(error instanceof Error ? error.message : 'No pudimos eliminar el borrador.');
              throw error;
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}
