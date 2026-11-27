import type {
  HomeResponse,
  HomeTarget,
  HomeModuleName,
  ReviewItem,
} from '../../../../../../src/core/domain/home/home.ts';
import { HomeReferenceIcon as FoxmindIcon } from '../../../../../shared-ui/HomeReferenceIcon.tsx';
import { learningCover } from '../../../../../shared-ui/parity-assets.ts';
import { homeTime } from '../model/home-labels.ts';
import { reviewProgress } from '../model/home-expedition.ts';
/** Decorative fill plus an accessible progressbar; values come straight from the Home contract. */
const progressBar = (label: string, value: number, max: number, text: string) => (
  <div className="home-progress">
    <span
      className="home-progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <i style={{ width: `${Math.round((value / max) * 100)}%` }} />
    </span>
    <span className="home-progress-text">{text}</span>
  </div>
);
export function HomePriorities({
  data,
  teacher,
  tab,
  onTab,
  loading,
  onAction,
  onRetry,
  onList,
  busy,
}: {
  data: HomeResponse;
  teacher: boolean;
  tab: 'review' | 'queries';
  onTab: (v: 'review' | 'queries') => void;
  order: 'asc' | 'desc';
  onOrder: (v: 'asc' | 'desc') => void;
  loading: boolean;
  onAction: (v: HomeTarget) => void;
  onRetry: (v: HomeModuleName) => void;
  onList: () => void;
  busy?: boolean;
}) {
  const name = teacher ? tab : 'pending',
    page = data.modules[name],
    count = (key: 'review' | 'queries') => (data.modules[key].status === 'ready' ? data.modules[key].totalItems : null);
  const groups = new Map<string, ReviewItem[]>();
  if (page.status === 'not-applicable') return null;
  if (teacher && tab === 'review' && data.modules.review.status === 'ready')
    for (const row of data.modules.review.items) {
      const key = row.classroom.id + ':' + (row.target.kind === 'submissions' ? row.target.activityId : row.title);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
  return (
    <section
      className={`panel home-priorities ${teacher ? 'home-teacher-queue' : 'home-student-queue'}`}
      data-empty={(page.status === 'ready' && !page.items.length) || undefined}
      aria-busy={loading}
      data-sparse={(teacher && page.status === 'ready' && page.items.length === 1) || undefined}
    >
      <header className="panel-header">
        <div>
          <h2>{teacher ? 'Por acompañar' : 'Tu próximo paso'}</h2>
          <p>{teacher ? 'Tu mirada hace la diferencia.' : 'Un paso a la vez. Empezá por acá.'}</p>
        </div>
        <span className="home-widget-icon">
          <FoxmindIcon name={teacher ? 'chat' : 'book'} />
        </span>
      </header>
      {teacher ? (
        <div className="home-queue-tabs" role="group" aria-label="Pendientes docentes">
          {(['review', 'queries'] as const).map(key => (
            <button key={key} aria-pressed={tab === key} onClick={() => onTab(key)}>
              <FoxmindIcon name={key === 'review' ? 'file' : 'chat'} />
              {key === 'review' ? 'Entregas' : 'Consultas'}
              <span>{count(key) ?? '—'}</span>
            </button>
          ))}
        </div>
      ) : null}
      {page.status === 'error' ? (
        <div className="empty compact parity-home-empty" role="alert">
          <p>No pudimos cargar esta sección.</p>
          <button onClick={() => onRetry(name)}>Reintentar</button>
        </div>
      ) : page.status === 'ready' && !page.items.length ? (
        <div className="parity-home-empty">
          <FoxmindIcon name="check" />
          <h3>{teacher ? 'Estás al día' : 'Un buen momento para explorar'}</h3>
          <p>
            {teacher
              ? 'Cuando haya algo nuevo, lo vas a encontrar acá.'
              : 'Ya completaste tus actividades. Seguí aprendiendo a tu ritmo.'}
          </p>
        </div>
      ) : null}
      {teacher && tab === 'review' ? (
        <div className="home-review-list">
          {[...groups.values()].map(rows => {
            const progress = reviewProgress(rows);
            return (
              <section
                className={`review-group tone-${rows[0].classroom.coverKey === 'biology' || rows[0].classroom.coverKey === 'science' ? 'mint' : rows[0].classroom.coverKey === 'math' ? 'sky' : 'peach'}`}
                key={rows[0].id}
              >
                <header className="review-group-heading">
                  <img className="review-subject-image" src={learningCover(rows[0].classroom.coverKey)} alt="" />
                  <div>
                    <p>{rows[0].classroom.name}</p>
                    <h3>{rows[0].title}</h3>
                  </div>
                  <span className="review-group-count">
                    {rows.reduce((sum, r) => sum + (r.studentName ? 1 : r.needsReview + r.readyToPublish), 0)}{' '}
                    {rows.reduce((sum, r) => sum + (r.studentName ? 1 : r.needsReview + r.readyToPublish), 0) === 1
                      ? 'entrega'
                      : 'entregas'}
                  </span>
                </header>
                {progress.total
                  ? progressBar(
                      `Entregas corregidas de ${rows[0].title}`,
                      progress.corrected,
                      progress.total,
                      `${progress.corrected} de ${progress.total} corregidas`,
                    )
                  : null}
                <div className="review-group-people">
                  {rows.map((row, index) => (
                    <button
                      key={row.id}
                      className="submission-row"
                      disabled={busy}
                      onClick={() => onAction(row.target)}
                      aria-label={`Revisar ${row.studentName ?? row.title}`}
                    >
                      <span className={`avatar ${['mint', 'sky', 'rose'][index % 3]}`}>
                        {(row.studentName ?? 'Aula')
                          .split(/\s+/)
                          .slice(0, 2)
                          .map(n => n[0])
                          .join('')}
                      </span>
                      <span className="submission-copy">
                        <strong>{row.studentName ?? 'Entregas de esta actividad'}</strong>
                        <span>{homeTime(row.oldestSubmittedAt, data.timeZone)}</span>
                        {row.readyToPublish > 0 ? (
                          <small className="submission-saved">Devolución guardada · privada</small>
                        ) : null}
                      </span>
                      <span className="submission-action">
                        Revisar
                        <FoxmindIcon name="chevron-right" />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
      {teacher && tab === 'queries' && data.modules.queries.status === 'ready' ? (
        <div className="home-review-list">
          {data.modules.queries.items.map(row => (
            <button key={row.id} className="home-review-row home-question" onClick={() => onAction(row.target)}>
              <span className="avatar sky">
                {'authorName' in row && typeof row.authorName === 'string' ? (
                  row.authorName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map(name => name[0])
                    .join('')
                ) : (
                  <FoxmindIcon name="users" />
                )}
              </span>
              <span className="home-review-copy">
                {'authorName' in row && typeof row.authorName === 'string' ? (
                  <span className="home-person">
                    {row.authorName} <span>te consulta</span>
                  </span>
                ) : null}
                <b>{row.title}</b>
                <span className="home-row-meta">
                  {row.classroom.name} · {homeTime(row.updatedAt, data.timeZone)}
                </span>
              </span>
              <span className="home-row-action">
                Responder
                <FoxmindIcon name="chat" />
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {!teacher && data.modules.pending.status === 'ready' ? (
        <div className="learning-deck">
          {data.modules.pending.items.slice(0, 3).map((row, index) => (
            <article
              key={row.id}
              className={`learning-tile tone-${row.classroom.coverKey === 'biology' || row.classroom.coverKey === 'science' ? 'mint' : row.classroom.coverKey === 'math' ? 'sky' : 'peach'} ${index === 0 ? 'featured' : ''}`}
            >
              <div className="learning-cover">
                <img src={learningCover(row.classroom.coverKey)} alt="" />
                <span className="learning-kind">
                  <FoxmindIcon name={row.activityType === 'QUESTIONNAIRE' ? 'file' : 'edit'} />
                  {
                    { ASSIGNMENT: 'Trabajo práctico', QUESTIONNAIRE: 'Cuestionario', EVALUATION: 'Evaluación' }[
                      row.activityType
                    ]
                  }
                </span>
              </div>
              <div className="learning-body">
                <p className="learning-course">{row.classroom.name}</p>
                <h3>{row.title}</h3>
                <div className="learning-deadline">
                  <FoxmindIcon name="calendar" />
                  <span>
                    <small>Fecha de entrega</small>
                    <b>{row.deadlineAt ? homeTime(row.deadlineAt, data.timeZone) : 'Sin fecha límite'}</b>
                  </span>
                </div>
                {row.questionProgress && row.questionProgress.total > 0
                  ? progressBar(
                      `Preguntas respondidas de ${row.title}`,
                      row.questionProgress.answered,
                      row.questionProgress.total,
                      `${row.questionProgress.answered} de ${row.questionProgress.total} preguntas respondidas`,
                    )
                  : null}
              </div>
              <footer className="learning-footer">
                <span className="learning-state">
                  <FoxmindIcon name={row.attemptId ? 'check' : 'book'} />
                  {row.reception === 'closed' ? 'Plazo cerrado' : row.attemptId ? 'Borrador guardado' : 'Por empezar'}
                </span>
                <button
                  className={`button ${index ? 'learning-secondary' : 'primary'}`}
                  disabled={busy}
                  onClick={() =>
                    onAction(
                      row.reception === 'open' && row.target.kind === 'activity'
                        ? { ...row.target, mode: 'respond' }
                        : row.target,
                    )
                  }
                >
                  <FoxmindIcon name="play" />
                  {row.reception === 'closed' ? 'Consultar' : row.attemptId ? 'Continuar' : 'Empezar'}
                </button>
              </footer>
            </article>
          ))}
        </div>
      ) : null}
      {!teacher ? (
        <footer className="home-priorities-footer">
          <button className="text-button" onClick={onList}>
            Ver actividades del aula
            <FoxmindIcon name="arrow-right" />
          </button>
        </footer>
      ) : null}
    </section>
  );
}
