import type { Detail } from './api.ts';
import { Cover } from './components.tsx';

export function ClassroomHeader({ room }: { room: Detail }) {
  return <header className="p5-room-head fm3-room-header" data-classroom-role={room.role}>
    <div className="p5-room-cover classroom-identity-cover"><Cover kind={room.coverKey} priority /></div>
    <div className="fm3-room-heading">
      <p className="fm3-room-context">{room.subject} · {room.division} · Ciclo lectivo {room.academicYear}</p>
      <h1>{room.name}</h1>
      <p className="fm3-room-teacher">{room.role === 'teacher' ? 'Tu aula como docente' : `Docente: ${room.teacher}`}</p>
      <details className="classroom-context-details"><summary>Información del aula</summary>
        <p>Docente: {room.teacher}<br/>Zona horaria: {room.timezone}</p>
      </details>
    </div>
  </header>;
}
