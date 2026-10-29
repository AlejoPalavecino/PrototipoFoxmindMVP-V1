import type { Classroom } from './api.ts';
import { Cover } from './components.tsx';
import { FoxmindIcon } from '../shared-ui/index.ts';

export function ClassroomCard({ room, onEnter }: { room: Classroom; onEnter: (id: string) => void }) {
  const teacher = room.role === 'teacher';
  return <article className="fm3-classroom-card">
    <Cover kind={room.coverKey} />
    <div className="fm3-classroom-card-body">
      <h3>{room.name}</h3>
      <div className="collection-card-badges">
        <span className={`fm3-membership ${teacher ? 'is-teacher' : ''}`}>
          <FoxmindIcon name={teacher ? 'profile' : 'book'} />
          {teacher ? 'Donde enseño' : 'Donde estudio'}
        </span>
        {room.archived ? <span className="p5-tag">Archivada · Solo lectura</span> : null}
      </div>
      <div className="fm3-classroom-facts">
        <p><FoxmindIcon name="book" /><span>{room.subject} · {room.division}</span></p>
        <p><FoxmindIcon name="profile" /><span>Docente: {teacher ? 'Vos' : room.teacher}</span></p>
        <p><FoxmindIcon name="calendar" /><span>Ciclo lectivo: {room.academicYear}</span></p>
      </div>
      <button type="button" className="primary" onClick={() => onEnter(room.id)}>
        Entrar al aula <FoxmindIcon name="arrow-right" />
      </button>
    </div>
  </article>;
}
