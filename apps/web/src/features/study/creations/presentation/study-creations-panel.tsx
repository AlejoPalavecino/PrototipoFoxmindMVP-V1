import { creationExcerpt, creationPresentation } from '../../../../../../shared-ui/creation-presentation';
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
  onRepeat,
  repeatDisabled,
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
  onRepeat?: (id: string, kind: string, title: string) => void;
  repeatDisabled?: boolean;
}) {
  const rows = [
    ...matchingCreations.map(item => ({
      ...item, card: creationPresentation(item.kind), color: item.kind === 'OUTLINE' ? 'mint' : 'sky',
      meta: creationPresentation(item.kind).label + ' · Privada',
      description: item.sourceUnavailable ? '' : creationExcerpt(item.markdown ?? item.body),
      open: () => onCreation(item),
    })),
    ...matchingPractices.map(item => {
      const kind = item.kind ?? 'QUIZ', card = creationPresentation(kind);
      return {
        id: item.id, kind, title: item.title ?? 'Práctica personal', color: 'rose', card,
        meta: `${card.label} · Intento ${item.attemptNumber ?? 1}`,
        description: `${item.questions?.length ?? 0} preguntas · ${item.status === 'FINALIZED' ? 'Finalizada' : Object.keys(item.answers ?? {}).length ? 'En curso' : 'Sin empezar'}`,
        open: () => onPractice(item.id),
      };
    }),
    ...matchingPlans.map(item => ({
      id: item.id, kind: 'REVIEW_PLAN', title: item.title ?? 'Mi repaso', card: creationPresentation('REVIEW_PLAN'),
      color: 'peach', meta: 'Plan de repaso · Privado', description: `${item.sessions?.length ?? 0} sesiones de repaso`,
      open: () => onExam(item.id),
    })),
  ];
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
          ['EXPLANATION', 'Explicaciones'],
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
        {rows.map(row => (
          <div className="creation-shelf-row" key={row.id}>
            <button type="button" className="study-exact-creation-item" onClick={row.open}>
              <span className={`study-exact-tool-icon ${row.color}`}><FoxmindIcon name={row.card.icon}/></span>
              <span>
                <small>{row.meta}</small>
                <b>{row.title}</b>
                {row.description && <span className="creation-shelf-description">{row.description}</span>}
              </span>
              <FoxmindIcon name="chevron-right"/>
            </button>
            {onRepeat && <button className="creation-repeat" type="button" title="Volver a preparar"
              aria-label={`Volver a preparar: ${row.title}`} disabled={repeatDisabled}
              onClick={() => onRepeat(row.id, row.kind, row.title)}><FoxmindIcon name="refresh"/></button>}
          </div>
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
