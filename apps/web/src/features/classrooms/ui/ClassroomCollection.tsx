import { useEffect, useRef, useState } from 'react';
import type { Classroom, Draft } from '../../../../../../src/core/contracts/classrooms.ts';
import { PendingClassroomCard } from './PendingClassroomCard.tsx';
import { ClassroomCard } from './ClassroomCollectionCard.tsx';
import { ClassroomCollectionFilters, activeCollectionFilters } from './ClassroomCollectionFilters.tsx';
import { filterClassroomCards, type ClassroomFilterOptions } from '../model/collection-filter.ts';
import experience from './classroom-experience.module.css';

interface Props {
  accountRole: 'teacher' | 'student';
  teach: Classroom[];
  study: Classroom[];
  search: string;
  onEnter: (id: string) => void;
  onSearch?: (search: string) => void;
  drafts?: Draft[];
  busy?: boolean;
  onContinue?: (id: string) => void;
  onDelete?: (draft: Draft) => void;
}

export function ClassroomCollection({ accountRole, teach, study, search, onEnter, onSearch, drafts = [], busy = false, onContinue, onDelete }: Props) {
  const [options, setOptions] = useState<ClassroomFilterOptions>({ state: 'active' });
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const toggleRef = useRef<HTMLButtonElement>(null);
  const all = filterClassroomCards(teach, study, 'all', '');
  const visible = filterClassroomCards(teach, study, 'all', search, options);
  const narrowed = Boolean(search.trim()) || activeCollectionFilters(options) > 0;
  const pending = accountRole === 'teacher' ? drafts.filter(item => !item.publishedClassroomId) : [];
  const isPending = options.state === 'pending' && accountRole === 'teacher';
  const previousCount = useRef(pending.length);
  useEffect(() => {
    if (isPending && pending.length < previousCount.current) toggleRef.current?.focus();
    previousCount.current = pending.length;
  }, [pending.length, isPending]);
  const query = search.normalize('NFKC').toLowerCase().trim();
  const visibleDrafts = pending.filter(({ payload: p }) =>
    `${p.name || 'Aula sin nombre'} ${p.subject ?? ''} ${p.division ?? ''}`.normalize('NFKC').toLowerCase().includes(query) &&
    (!options.academicYear || String(p.academicYear) === options.academicYear) && (!options.division || p.division === options.division));
  const filterValues = isPending ? pending.map(item => item.payload) : all;
  return <section className={`fm3-classroom-collection collection-workspace cl-catalog ${experience.catalog}`} aria-label="Tus aulas">
    <ClassroomCollectionFilters all={all} filterValues={filterValues} search={search} onSearch={onSearch} pendingCount={accountRole === 'teacher' ? pending.length : undefined}
      options={options} onOptions={setOptions} expanded={expanded} onToggle={() => setExpanded(value => !value)}
      view={view} onView={setView} toggleRef={toggleRef}
      onClear={() => { toggleRef.current?.focus(); setOptions({ state: options.state }); }} />
    <div className={`cl-courses${view === 'list' ? ' as-list' : ''}`}>
      {isPending ? visibleDrafts.map(item => <PendingClassroomCard key={item.id} draft={item} busy={busy}
        onContinue={id => onContinue?.(id)} onDelete={item => onDelete?.(item)} />)
        : visible.map(room => <ClassroomCard key={room.id} room={room} onEnter={onEnter} />)}
    </div>
    {isPending && !visibleDrafts.length ? <p className="p5-empty">{narrowed && pending.length ? 'No hay coincidencias entre tus aulas pendientes.' : 'No tenés aulas pendientes de creación.'}</p> : null}
    {!isPending && !visible.length ? <p className="p5-empty">{!all.length ? accountRole === 'teacher' ? 'Aún no tenés aulas. Creá una para empezar.' : 'Aún no tenés aulas. Ingresá con un código para empezar.'
      : narrowed ? 'No hay coincidencias entre tus aulas cargadas.' : options.state === 'archived' ? 'No tenés aulas archivadas.' : 'No tenés aulas activas.'}</p> : null}
    <p className="fm3-collection-count sr-only" role="status">Mostrando {isPending ? visibleDrafts.length : visible.length} de {isPending ? pending.length : all.length} aulas{isPending ? ' pendientes' : ''}</p>
  </section>;
}
