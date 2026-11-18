import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import type { StudyCreation, StudyPractice, StudyExam } from '../../model/study-contracts.ts';
export function StudyCreationsPanel({
  search,
  creationType,
  matchingCreations,
  matchingPractices,
  matchingPlans,
  onSearch,
  onKind,
  onCreation,
  onPractice,
  onExam,
  onTools,
}: {
  search: string;
  creationType: string;
  matchingCreations: StudyCreation[];
  matchingPractices: StudyPractice[];
  matchingPlans: StudyExam[];
  onSearch: (value: string) => void;
  onKind: (kind: string) => void;
  onCreation: (creation: StudyCreation) => void;
  onPractice: (id: string) => void;
  onExam: (id: string) => void;
  onTools: () => void;
}) {
  return (
    <div className="study-exact-creations">
      <header className="parity-foxy-sectionHead">
        <h2>Mis creaciones</h2>
      </header>
      <label className="parity-foxy-search">
        <FoxmindIcon name="search" />
        <input
          aria-label="Buscar creaciones"
          type="search"
          placeholder="Buscar creación"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </label>
      <div className="parity-foxy-filterRow" aria-label="Filtrar creaciones">
        {[
          ['ALL', 'Todas'],
          ['NOTE', 'Apuntes'],
          ['OUTLINE', 'Esquemas'],
          ['IMAGE', 'Imágenes'],
          ['QUIZ', 'Quizzes'],
          ['EXERCISE', 'Ejercicios'],
          ['MOCK_EXAM', 'Simulacros'],
          ['PLAN', 'Planes'],
        ].map(([value, label]) => (
          <button key={value} aria-pressed={creationType === value} onClick={() => onKind(value)}>
            {label}
          </button>
        ))}
      </div>
      <div className="study-exact-creation-list">
        {matchingCreations.map((item) => (
          <button
            className="study-exact-creation-item"
            key={item.id}
            onClick={() => onCreation(item)}
          >
            <span className="study-exact-tool-icon sky">
              <FoxmindIcon name={item.kind === 'IMAGE' ? 'spark' : item.kind === 'OUTLINE' ? 'layers' : 'file'} />
            </span>
            <span>
              <b>{item.title}</b>
              <small>
                {item.kind === 'IMAGE' ? 'Imagen' : item.kind === 'NOTE' ? 'Preparar un apunte' : 'Conectar ideas'} · Privada
              </small>
            </span>
            <FoxmindIcon name="chevron-right" />
          </button>
        ))}
        {matchingPractices.map((item) => (
          <button
            className="study-exact-creation-item"
            key={item.id}
            onClick={() => onPractice(item.id)}
          >
            <span className="study-exact-tool-icon rose">
              <FoxmindIcon name="edit" />
            </span>
            <span>
              <b>{item.title ?? 'Práctica personal'}</b>
              <small>
                {item.kind === 'MOCK_EXAM' ? 'Simulacro' : item.kind === 'EXERCISE' ? 'Ejercicios' : 'Quiz'}
                {' · Intento '}{item.attemptNumber ?? 1}{' · '}
                {item.status === 'FINALIZED' ? 'Finalizada' : Object.keys(item.answers ?? {}).length ? 'En curso' : 'Sin empezar'}
              </small>
            </span>
            <FoxmindIcon name="chevron-right" />
          </button>
        ))}
        {matchingPlans.map((item) => (
          <button
            className="study-exact-creation-item"
            key={item.id}
            onClick={() => onExam(item.id)}
          >
            <span className="study-exact-tool-icon peach">
              <FoxmindIcon name="calendar" />
            </span>
            <span>
              <b>{item.title ?? 'Mi repaso'}</b>
              <small>Organizar mi repaso · Privada</small>
            </span>
            <FoxmindIcon name="chevron-right" />
          </button>
        ))}
      </div>
      {!matchingCreations.length && !matchingPractices.length && !matchingPlans.length && (
        <div className="parity-foxy-libraryEmpty">
          <FoxmindIcon name="folder" />
          <h3>
            {search || creationType !== 'ALL' ? 'No hay coincidencias' : 'Tus ideas tienen lugar'}
          </h3>
          <p>
            {search || creationType !== 'ALL'
              ? 'Probá otro nombre o volvé a Todas.'
              : 'Elegí una herramienta. La propuesta va a quedar acá para retomarla.'}
          </p>
          <button type="button" onClick={onTools}>
            <FoxmindIcon name="spark" />
            Ver herramientas
          </button>
        </div>
      )}
    </div>
  );
}
