import type { Classroom } from './api.ts';
import { Cover } from './components.tsx';
import { FoxmindIcon } from '../shared-ui/index.ts';
export function ClassroomCard({ room, onEnter }: { room: Classroom; onEnter: (id: string) => void }) {
  const progress = room.planProgress;
  const percentage = progress && progress.total > 0 ? Math.round(100 * progress.taught / progress.total) : null;
  return <article className={`cl-course theme-${room.coverKey === 'math' ? 'mat' : room.coverKey === 'literature' ? 'lit' : 'bio'}`}>
    <div className="cl-cover"><Cover kind={room.coverKey} /></div>
    <div className="cl-course-content">
      <div className="cl-eyebrow">{room.division}<i />{room.academicYear}{room.archived ? ' · Archivada' : ''}</div>
      <h3>{room.name}</h3>
      <p>{room.role === 'student' ? room.teacher : room.studentCount === undefined ? room.subject : `${room.studentCount} ${room.studentCount === 1 ? 'estudiante' : 'estudiantes'}`}</p>
      <div className="cl-course-bottom"><div><span>Avance del plan</span><b>{percentage === null ? progress ? 'Sin temas' : 'No disponible' : `${percentage}%`}</b></div>
        {percentage !== null && <div className="cl-meter" role="progressbar" aria-label="Avance del plan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-valuetext={`${progress!.taught} de ${progress!.total} temas dados`}><i style={{ width: `${percentage}%` }} /></div>}
      </div>
      <button type="button" className="brujula-course-open" aria-label={`Entrar al aula ${room.name}`} onClick={() => onEnter(room.id)}><span className="entry-sr-only">Entrar al aula</span><FoxmindIcon name="arrow-right" /></button>
    </div>
  </article>;
}
