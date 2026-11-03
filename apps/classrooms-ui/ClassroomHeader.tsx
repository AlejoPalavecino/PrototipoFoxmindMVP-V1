import type { Detail } from './api.ts';
import { Cover } from './components.tsx';

export function ClassroomHeader({ room }: { room: Detail }) {
  return <header className="p5-room-head fm3-room-header" data-classroom-role={room.role}>
    <div className="p5-room-cover">{room.coverKey === 'literature'
      ? <img className="classroom-literature-hero" src="/foxmind-3d/classroom-interior/library-hero-1600.webp" alt="" />
      : <Cover kind={room.coverKey} priority />}</div>
    <div className="fm3-room-heading">
      <p className="fm3-room-context">{room.subject} · {room.division} · Ciclo lectivo {room.academicYear}</p>
      <h1>{room.name}</h1>
      <p><span className={`fm3-membership ${room.role === 'teacher' ? 'is-teacher' : ''}`}>
        {room.role === 'teacher' ? 'Enseñás en esta aula' : 'Estudiás en esta aula'}
      </span></p>
      <p className="fm3-room-teacher">Docente: {room.teacher} <span>· {room.timezone}</span></p>
    </div>
  </header>;
}
