import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
export function ClassroomCollectionHero({
  accountRole,
  busy,
  onJoin,
  onCreate,
  activeCount,
}: {
  accountRole: 'teacher' | 'student';
  busy: boolean;
  onJoin: () => void;
  onCreate: () => void;
  activeCount?: number;
}) {
  const teacher = accountRole === 'teacher';
  return (
    <header className={`classrooms-welcome ${accountRole}`}>
      <div className="classrooms-welcome-copy">
        <span className="collection-context">
          <FoxmindIcon name="layers" />
          {teacher ? 'Un espacio para cada grupo' : 'Tu comunidad para aprender'}
        </span>
        <h1>Mis aulas</h1>
        <p>
          {teacher
            ? 'Las ideas crecen cuando las compartimos. Prepará el próximo encuentro.'
            : 'Cada aula, una nueva forma de mirar el mundo. ¿Por dónde seguimos?'}
        </p>
        <div className="collection-welcome-actions">
          <button type="button" className="button primary" disabled={busy} onClick={teacher ? onCreate : onJoin}>
            <FoxmindIcon name="plus" />
            {teacher ? 'Crear aula' : 'Unirme con código'}
          </button>
          {activeCount !== undefined ? (
            <span>
              {activeCount} {activeCount === 1 ? 'aula activa' : 'aulas activas'}
            </span>
          ) : null}
        </div>
      </div>
      <div className="classrooms-art" aria-hidden="true">
        <img src="/foxmind/classroom-world.webp" alt="" />
      </div>
    </header>
  );
}
