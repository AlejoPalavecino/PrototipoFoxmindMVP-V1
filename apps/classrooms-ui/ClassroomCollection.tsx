import { useRef, useState } from 'react';
import type { Classroom } from './api.ts';
import { ClassroomCard } from './ClassroomCollectionCard.tsx';
import { ClassroomCollectionFilters, activeCollectionFilters } from './ClassroomCollectionFilters.tsx';
import { filterClassroomCards, type ClassroomFilter, type ClassroomFilterOptions } from './collection-filter.ts';

interface Props {
  teach: Classroom[];
  study: Classroom[];
  search: string;
  onEnter: (id: string) => void;
  onSearch?: (search: string) => void;
}

export function ClassroomCollection({ teach, study, search, onEnter, onSearch }: Props) {
  const [role, setRole] = useState<ClassroomFilter>('all');
  const [options, setOptions] = useState<ClassroomFilterOptions>({});
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const toggleRef = useRef<HTMLButtonElement>(null);
  const all = filterClassroomCards(teach, study, 'all', '');
  const visible = filterClassroomCards(teach, study, role, search, options);
  const narrowed = Boolean(search.trim()) || activeCollectionFilters(options) > 0;
  return <div className="fm3-classroom-collection">
    <ClassroomCollectionFilters all={all} search={search} onSearch={onSearch} role={role} onRole={setRole}
      options={options} onOptions={setOptions} expanded={expanded} onToggle={() => setExpanded(value => !value)}
      view={view} onView={setView} toggleRef={toggleRef}
      onClear={() => { toggleRef.current?.focus(); setOptions({}); }} />
    <div className={`fm3-classroom-grid${view === 'list' ? ' is-list' : ''}`}>
      {visible.map(room => <ClassroomCard key={room.id} room={room} onEnter={onEnter} />)}
    </div>
    {!visible.length ? <p className="p5-empty">{!all.length ? 'Aún no tenés aulas. Creá una o ingresá con un código para empezar.'
      : narrowed ? 'No hay coincidencias entre tus aulas cargadas.' : 'No tenés aulas en esta participación.'}</p> : null}
    {all.length ? <p className="fm3-collection-count" role="status">Mostrando {visible.length} de {all.length} aulas</p> : null}
  </div>;
}
