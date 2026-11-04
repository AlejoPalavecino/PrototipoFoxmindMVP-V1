'use client';
import { useState } from 'react';
import type { HomeResponse, HomeTarget } from '../../src/core/domain/index.ts';
import { FoxmindIcon } from '../shared-ui/index.ts';

interface HomeShortcutProps {
  accountRole: 'teacher' | 'student'; data: HomeResponse; onAction: (target: HomeTarget) => void; onCreate: () => void;
  onJoin: () => void; onClassrooms: () => void; onAgenda: () => void; busy?: boolean;
}

export function HomeShortcuts() {
  const links = [
    ['/mis-aulas', 'Mis aulas', 'book'],
    ['/agenda', 'Agenda', 'calendar'],
    ['/settings', 'Configuración', 'settings'],
    ['/profile', 'Mi perfil', 'profile'],
  ] as const;
  return <nav className="fm-home-quick-links" aria-label="Accesos rápidos">
    {links.map(([href, label, icon]) => <a key={href} href={href}>
      <FoxmindIcon name={icon} /><span>{label}</span>
    </a>)}
  </nav>;
}

export function HomeTeacherTools({ data, onAction, onClassrooms, busy }: Pick<HomeShortcutProps, 'data' | 'onAction' | 'onClassrooms' | 'busy'>) {
  const rooms = data.modules.classrooms.status === 'ready' ? data.modules.classrooms.items
    .map(item => item.classroom).filter(room => room.role === 'teacher' && !room.archived) : [];
  const [selected, setSelected] = useState('');
  const room = rooms.find(item => item.id === selected) ?? rooms[0];
  if (data.memberships.teach <= 0) return null;
  return <details className="fm-home-teacher-tools">
    <summary>Herramientas del aula</summary>
    {room ? <div><label>Aula destino<select value={room.id} onChange={event => setSelected(event.target.value)}>
      {rooms.map(item => <option key={item.id} value={item.id}>{item.name} · {item.division}</option>)}
    </select></label>
      <div className="fm-home-shortcut-grid">{([
        ['create-activity', 'Crear actividad', 'file'], ['upload-material', 'Subir material', 'upload'],
        ['publish-notice', 'Publicar aviso', 'chat'],
      ] as const).map(([kind, label, icon]) => <button key={kind} disabled={busy} onClick={() => onAction({ kind, classroomId: room.id })}>
        <FoxmindIcon name={icon} /><span>{label}<small>{room.name} · {room.division}</small></span>
      </button>)}</div></div> : <p>Elige un aula docente desde <button onClick={onClassrooms}>Mis aulas</button> para usar sus herramientas.</p>}
    {data.modules.classrooms.status === 'ready' && data.modules.classrooms.nextCursor ?
      <button onClick={onClassrooms}>Buscar otras aulas docentes en Mis aulas</button> : null}
  </details>;
}
