import type { Classroom } from './api.ts';
import type { RefObject } from 'react';
import { EntryIcon, FoxmindIcon } from '../shared-ui/index.ts';
import type { ClassroomFilterOptions } from './collection-filter.ts';

export interface CollectionFiltersProps {
  all: Classroom[]; search: string; onSearch?: (value: string) => void;
  options: ClassroomFilterOptions; onOptions: (value: ClassroomFilterOptions) => void;
  expanded: boolean; onToggle: () => void; view: 'grid' | 'list'; onView: (value: 'grid' | 'list') => void;
  toggleRef: RefObject<HTMLButtonElement | null>; onClear: () => void;
}
export function activeCollectionFilters(options: ClassroomFilterOptions): number {
  return Number(Boolean(options.academicYear)) + Number(Boolean(options.division));
}
export function AdvancedFilters({ all, options, onOptions }: Pick<CollectionFiltersProps, 'all' | 'options' | 'onOptions'>) {
  const years = [...new Set(all.map(room => room.academicYear))].sort((a, b) => b - a);
  const divisions = [...new Set(all.map(room => room.division))].sort((a, b) => a.localeCompare(b, 'es'));
  return <div id="collection-advanced-filters" className="collection-advanced-filters">
    <label>Ciclo lectivo<select value={options.academicYear ?? ''} onChange={event => onOptions({ ...options, academicYear: event.target.value })}>
      <option value="">Todos</option>{years.map(year => <option value={String(year)} key={year}>{year}</option>)}
    </select></label>
    <label>División<select value={options.division ?? ''} onChange={event => onOptions({ ...options, division: event.target.value })}>
      <option value="">Todas</option>{divisions.map(division => <option value={division} key={division}>{division}</option>)}
    </select></label>
  </div>;
}
export function ClassroomCollectionFilters(props: CollectionFiltersProps) {
  const { all, search, onSearch, options, onOptions, expanded, onToggle, view, onView, toggleRef, onClear } = props;
  const active = activeCollectionFilters(options);
  return <>
    <div className="collection-workspace-heading"><h2>Tus aulas</h2>
      <nav className="collection-workspace-states" aria-label="Estado de las aulas">
        {(['active', 'archived'] as const).map(state => <button type="button" key={state} aria-pressed={options.state === state}
          onClick={() => onOptions({ ...options, state })}>{state === 'active' ? 'Activas' : 'Archivadas'} · {all.filter(room => room.archived === (state === 'archived')).length}</button>)}
      </nav>
    </div>
    <div className="fm3-collection-toolbar">
      <label className="fm3-collection-search"><span className="entry-sr-only">Buscar aula</span>
        <FoxmindIcon name="search" /><input type="search" placeholder="Buscar por nombre, materia o docente…" value={search} onChange={event => onSearch?.(event.target.value)} />
      </label>
      <button type="button" ref={toggleRef} className="collection-more-filters" aria-expanded={expanded} aria-controls="collection-advanced-filters" onClick={onToggle}>
        <FoxmindIcon name="filter" />Más filtros{active ? ` · ${active}` : ''}<FoxmindIcon name="chevron-down" />
      </button>
      <div className="collection-view-switch" role="group" aria-label="Presentación de aulas">
        <button type="button" aria-label="Vista de tarjetas" aria-pressed={view === 'grid'} onClick={() => onView('grid')}><EntryIcon name="grid" /></button>
        <button type="button" aria-label="Vista de lista" aria-pressed={view === 'list'} onClick={() => onView('list')}><EntryIcon name="list" /></button>
      </div>
    </div>
    {expanded ? <AdvancedFilters all={all} options={options} onOptions={onOptions} /> : null}
    {search.trim() || active ? <div className="collection-workspace-chips" aria-label="Criterios aplicados">
      {search.trim() && onSearch ? <button type="button" aria-label={`Quitar búsqueda ${search}`} onClick={() => onSearch('')}>Búsqueda: {search} ×</button> : null}
      {options.academicYear ? <button type="button" aria-label={`Quitar ciclo lectivo ${options.academicYear}`} onClick={() => onOptions({ ...options, academicYear: '' })}>Ciclo: {options.academicYear} ×</button> : null}
      {options.division ? <button type="button" aria-label={`Quitar división ${options.division}`} onClick={() => onOptions({ ...options, division: '' })}>División: {options.division} ×</button> : null}
      {active ? <button type="button" className="collection-clear-filters" onClick={onClear}>Limpiar filtros</button> : null}
    </div> : null}
  </>;
}
