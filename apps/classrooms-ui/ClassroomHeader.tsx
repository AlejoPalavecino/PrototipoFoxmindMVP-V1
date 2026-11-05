import type { Detail } from './api.ts';
import { Cover } from './components.tsx';
import { FoxmindIcon } from '../shared-ui/index.ts';

export function ClassroomHeader({ room }: { room: Detail }) {
  return <header className={`class-mast bb-class theme-${room.coverKey === 'math' ? 'mat' : room.coverKey === 'literature' ? 'lit' : 'bio'}`} data-classroom-role={room.role}>
    <div className="class-mast-art" aria-hidden="true"><Cover kind={room.coverKey} priority /></div>
    <div className="class-mast-text">
      <div className="bb-course-label"><FoxmindIcon name="book" /><span>Aula · {room.division} · {room.academicYear}</span>{room.archived ? <b>Archivada</b> : null}</div>
      <h1>{room.name}</h1>
      <p><span><FoxmindIcon name="profile" />{room.teacher}</span></p>
      <details className="classroom-context-details"><summary>Información del aula</summary>
        <p>Docente: {room.teacher}<br/>Zona horaria: {room.timezone}</p>
      </details>
    </div>
  </header>;
}
