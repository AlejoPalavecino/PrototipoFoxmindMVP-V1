import type { Classroom } from './api.ts';
import type { RefObject } from 'react';
import { EntryIcon, FoxmindIcon } from '../shared-ui/index.ts';
import type { ClassroomFilter, ClassroomFilterOptions } from './collection-filter.ts';

export interface CollectionFiltersProps {
  all: Classroom[];
  search: string;
  onSearch?: (value: string) => void;
  role: ClassroomFilter;
  onRole: (value: ClassroomFilter) => void;
  options: ClassroomFilterOptions;
  onOptions: (value: ClassroomFilterOptions) => void;
  expanded: boolean;
  onToggle: () => void;
  view: 'grid' | 'list';
  onView: (value: 'grid' | 'list') => void;
  toggleRef: RefObject<HTMLButtonElement | null>;
  onClear: () => void;
}

const roles: { key: ClassroomFilter; label: string }[] = [
  { key: 'all', label: 'Todas' }, { key: 'teach', label: 'Donde enseño' }, { key: 'study', label: 'Donde estudio' },
];

export function activeCollectionFilters(options: ClassroomFilterOptions): number {
  return Number(Boolean(options.state && options.state !== 'all')) + Number(Boolean(options.academicYear)) + Number(Boolean(options.division));
}

export function AdvancedFilters({ all, options, onOptions }: Pick<CollectionFiltersProps, 'all' | 'options' | 'onOptions'>) {
  const years = [...new Set(all.map(room => room.academicYear))].sort((a, b) => b - a);
  const divisions = [...new Set(all.map(room => room.division))].sort((a, b) => a.localeCompare(b, 'es'));
  return <div id="collection-advanced-filters" className="collection-advanced-filters">
    <label>Estado<select value={options.state ?? 'all'}
      onChange={event => onOptions({ ...options, state: event.target.value as ClassroomFilterOptions['state'] })}>
      <option value="all">Todas</option><option value="active">Activas</option><option value="archived">Archivadas</option>
    </select></label>
    <label>Ciclo lectivo<select value={options.academicYear ?? ''}
      onChange={event => onOptions({ ...options, academicYear: event.target.value })}>
      <option value="">Todos</option>{years.map(year => <option value={String(year)} key={year}>{year}</option>)}
    </select></label>
    <label>División<select value={options.division ?? ''}
      onChange={event => onOptions({ ...options, division: event.target.value })}>
      <option value="">Todas</option>{divisions.map(division => <option value={division} key={division}>{division}</option>)}
    </select></label>
  </div>;
}

export function ClassroomCollectionFilters(props: CollectionFiltersProps) {
  const { all, search, onSearch, role, onRole, options, onOptions, expanded, onToggle, view, onView, toggleRef, onClear } = props;
  const active = activeCollectionFilters(options);
  return <>
    <div className="fm3-collection-toolbar">
      <label className="fm3-collection-search"><span className="entry-sr-only">Buscar aula</span>
        <FoxmindIcon name="search" /><input type="search" placeholder="Buscar por nombre, materia o docente…"
          value={search} onChange={event => onSearch?.(event.target.value)} />
      </label>
      <nav className="fm3-collection-filters" aria-label="Filtrar aulas">{roles.map(item => <button type="button" key={item.key}
        aria-pressed={role === item.key} onClick={() => onRole(item.key)}>
        {item.label} · {item.key === 'all' ? all.length : all.filter(room => room.role === (item.key === 'teach' ? 'teacher' : 'student')).length}
      </button>)}</nav>
      <button type="button" ref={toggleRef} className="collection-more-filters" aria-expanded={expanded}
        aria-controls="collection-advanced-filters" onClick={onToggle}>
        <FoxmindIcon name="filter" />Más filtros{active ? ` · ${active}` : ''}<FoxmindIcon name="chevron-down" />
      </button>
      <div className="collection-view-switch" role="group" aria-label="Presentación de aulas">
        <button type="button" aria-label="Vista de tarjetas" aria-pressed={view === 'grid'} onClick={() => onView('grid')}><EntryIcon name="grid" /></button>
        <button type="button" aria-label="Vista de lista" aria-pressed={view === 'list'} onClick={() => onView('list')}><EntryIcon name="list" /></button>
      </div>
    </div>
    {expanded ? <AdvancedFilters all={all} options={options} onOptions={onOptions} /> : null}
    {active ? <button type="button" className="collection-clear-filters" onClick={onClear}>Limpiar filtros</button> : null}
  </>;
}
