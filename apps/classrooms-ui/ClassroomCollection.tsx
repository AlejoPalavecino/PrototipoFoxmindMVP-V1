import { useState } from 'react';
import type { Classroom } from './api.ts';
import { Cover } from './components.tsx';
import { EntryIcon } from '../shared-ui/EntryIcon';
import { FoxmindIcon } from '../shared-ui/index.ts';
import { filterClassroomCards, type ClassroomFilter } from './collection-filter.ts';

interface Props {
  teach: Classroom[];
  study: Classroom[];
  search: string;
  onEnter: (id: string) => void;
  onSearch?: (search: string) => void;
}

function ClassroomCard({ room, onEnter }: { room: Classroom; onEnter: Props['onEnter'] }) {
  const teacher = room.role === 'teacher';
  return <article className="fm3-classroom-card">
    <Cover kind={room.coverKey} />
    <div className="fm3-classroom-card-body">
      <h3>{room.name}</h3>
      <span className={`fm3-membership ${teacher ? 'is-teacher' : ''}`}>
        <EntryIcon name={teacher ? 'people-fill' : 'book'} />
        {teacher ? 'Enseñás en esta aula' : 'Estudiás en esta aula'}
      </span>
      {room.archived ? <span className="p5-tag">Archivada · Solo lectura</span> : null}
      <div className="fm3-classroom-facts">
        <p>{room.subject} · {room.division} · {room.academicYear}</p>
        <p>Docente: {teacher ? 'Vos' : room.teacher}</p>
      </div>
      <button className="primary" onClick={() => onEnter(room.id)}>
        Entrar al aula <span aria-hidden="true">→</span>
      </button>
    </div>
  </article>;
}

export function ClassroomCollection({ teach, study, search, onEnter, onSearch }: Props) {
  const [filter, setFilter] = useState<ClassroomFilter>('all');
  const all = filterClassroomCards(teach, study, 'all', '');
  const visible = filterClassroomCards(teach, study, filter, search);
  const filters: { key: ClassroomFilter; label: string }[] = [
    { key: 'all', label: 'Todas' }, { key: 'study', label: 'Donde estudio' }, { key: 'teach', label: 'Donde enseño' },
  ];
  return <div className="fm3-classroom-collection">
    <div className="fm3-collection-toolbar">
      <label className="fm3-collection-search"><span className="entry-sr-only">Buscar aula</span>
        <FoxmindIcon name="search" /><input type="search" placeholder="Buscar por nombre, materia o división…" value={search} onChange={event => onSearch?.(event.target.value)} />
      </label>
      <nav className="fm3-collection-filters" aria-label="Filtrar aulas">{filters.map(item => <button key={item.key}
        aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>
        {item.label} · {filterClassroomCards(teach, study, item.key, '').length}
      </button>)}</nav>
    </div>
    <div className="fm3-classroom-grid">{visible.map(room => <ClassroomCard key={room.id} room={room} onEnter={onEnter} />)}</div>
    {!visible.length ? <p className="p5-empty">{!all.length ? 'Aún no tenés aulas. Creá una o ingresá con un código para empezar.'
      : search.trim() ? 'No hay coincidencias entre tus aulas cargadas.' : 'No tenés aulas en esta participación.'}</p> : null}
    {all.length ? <p className="fm3-collection-count" role="status">Mostrando {visible.length} de {all.length} aulas</p> : null}
  </div>;
}
