import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { learningCover } from '../../../../../shared-ui/parity-assets.ts';

export function ClassroomHeader({ room, onNavigate, pendingCount, onInvite }: { room: Detail; onNavigate?: (section: string) => void; pendingCount?: number; onInvite?: () => void }) {
  const topics = room.units.flatMap(unit => unit.topics), taught = topics.filter(topic => topic.status === 'TAUGHT').length;
  return <header className="class-mast bb-class parity-room-header" data-classroom-role={room.role} data-long-name={room.name.length > 40}>
    <div className="parity-room-identification">
      <img className="parity-room-miniature" src={learningCover(room.coverKey)} alt="" width={76} height={76}/>
      <div className="parity-room-identity">
        <p><b>{room.subject}</b><span>{room.division} · {room.academicYear}</span>{room.archived ? <b>Archivada</b> : null}</p>
        <h1>{room.name}</h1>
        <small>{room.studentCount !== undefined ? <><FoxmindIcon name="users"/>{room.studentCount} {room.studentCount === 1 ? 'estudiante' : 'estudiantes'}<i aria-hidden="true"/></> : null}{room.teacher}</small>
      </div>
    </div>
    <div className="parity-room-quick-links">
      <button className="parity-room-pending" type="button" onClick={() => onNavigate?.(room.role === 'teacher' ? 'progress' : 'activities')}><span><FoxmindIcon name="pencil"/><b>{pendingCount ?? '—'}</b></span><small>{room.role === 'teacher' ? 'por revisar' : 'por hacer'}</small></button>
      <button type="button" onClick={() => onNavigate?.('plan')}><span><FoxmindIcon name="book"/><b>{taught} / {topics.length}</b></span><small>temas trabajados</small></button>
    </div>
    <button className="parity-room-primary-action" aria-label={room.role === 'teacher' ? 'Invitar estudiantes' : 'Mi progreso'} type="button" disabled={room.role === 'teacher' && room.archived} onClick={() => room.role === 'teacher' ? onInvite?.() : onNavigate?.('progress')}><FoxmindIcon name={room.role === 'teacher' ? 'plus' : 'progress'}/><span>{room.role === 'teacher' ? 'Invitar' : 'Mi progreso'}</span></button>
  </header>;
}
