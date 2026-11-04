import type { Classroom } from './api.ts';
import { Cover } from './components.tsx';
import { FoxmindIcon } from '../shared-ui/index.ts';
export function ClassroomCard({ room, onEnter }: { room: Classroom; onEnter: (id: string) => void }) {
  return <article className="fm3-classroom-card">
    <Cover kind={room.coverKey} />
    <div className="fm3-classroom-card-body">
      <div className="collection-card-badges"><span className={`p5-tag ${room.archived ? '' : 'collection-workspace-active'}`}>{room.archived ? 'Archivada · Solo lectura' : 'Activa'}</span></div>
      <h3>{room.name}</h3>
      <div className="fm3-classroom-facts">
        <p><FoxmindIcon name="book" /><span>{room.subject} · {room.division}</span></p>
        {room.role === 'student' ? <p><FoxmindIcon name="profile" /><span>Docente: {room.teacher}</span></p> : null}
        <p><FoxmindIcon name="calendar" /><span>Ciclo lectivo: {room.academicYear}</span></p>
      </div>
      <button type="button" className="primary" onClick={() => onEnter(room.id)}>Entrar al aula <FoxmindIcon name="arrow-right" /></button>
    </div>
  </article>;
}
