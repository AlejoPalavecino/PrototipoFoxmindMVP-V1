import { useRef, useState } from 'react';
import type { Classroom } from './api.ts';
import { ClassroomCard } from './ClassroomCollectionCard.tsx';
import { ClassroomCollectionFilters, activeCollectionFilters } from './ClassroomCollectionFilters.tsx';
import { filterClassroomCards, type ClassroomFilterOptions } from './collection-filter.ts';

interface Props {
  accountRole: 'teacher' | 'student';
  teach: Classroom[];
  study: Classroom[];
  search: string;
  onEnter: (id: string) => void;
  onSearch?: (search: string) => void;
}

export function ClassroomCollection({ accountRole, teach, study, search, onEnter, onSearch }: Props) {
  const [options, setOptions] = useState<ClassroomFilterOptions>({ state: 'active' });
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const toggleRef = useRef<HTMLButtonElement>(null);
  const all = filterClassroomCards(teach, study, 'all', '');
  const visible = filterClassroomCards(teach, study, 'all', search, options);
  const narrowed = Boolean(search.trim()) || activeCollectionFilters(options) > 0;
  return <section className="fm3-classroom-collection collection-workspace" aria-label="Tus aulas">
    <ClassroomCollectionFilters all={all} search={search} onSearch={onSearch}
      options={options} onOptions={setOptions} expanded={expanded} onToggle={() => setExpanded(value => !value)}
      view={view} onView={setView} toggleRef={toggleRef}
      onClear={() => { toggleRef.current?.focus(); setOptions({ state: options.state }); }} />
    <div className={`fm3-classroom-grid${view === 'list' ? ' is-list' : ''}`}>
      {visible.map(room => <ClassroomCard key={room.id} room={room} onEnter={onEnter} />)}
    </div>
    {!visible.length ? <p className="p5-empty">{!all.length ? accountRole === 'teacher' ? 'Aún no tenés aulas. Creá una para empezar.' : 'Aún no tenés aulas. Ingresá con un código para empezar.'
      : narrowed ? 'No hay coincidencias entre tus aulas cargadas.' : options.state === 'archived' ? 'No tenés aulas archivadas.' : 'No tenés aulas activas.'}</p> : null}
    {all.length ? <p className="fm3-collection-count" role="status">Mostrando {visible.length} de {all.length} aulas</p> : null}
  </section>;
}
