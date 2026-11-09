import { CollectionStateFilter } from '../shared-ui/CollectionStateFilter';
import type { Classroom } from './api.ts';
import type { RefObject } from 'react';
import { EntryIcon, FoxmindIcon } from '../shared-ui/index.ts';
import type { ClassroomFilterOptions } from './collection-filter.ts';

export interface CollectionFiltersProps {
  all: Classroom[]; search: string; onSearch?: (value: string) => void;
  options: ClassroomFilterOptions; onOptions: (value: ClassroomFilterOptions) => void;
  expanded: boolean; onToggle: () => void; view: 'grid' | 'list'; onView: (value: 'grid' | 'list') => void;
  toggleRef: RefObject<HTMLButtonElement | null>; onClear: () => void;
  pendingCount?: number;
  filterValues?: { academicYear?: number; division?: string }[];
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
  const { all, search, onSearch, options, onOptions, view, onView, onClear, pendingCount } = props;
  const active = activeCollectionFilters(options);
  const values = props.filterValues ?? all;
  const years = [...new Set(values.flatMap(room => room.academicYear ? [room.academicYear] : []))].sort((a,b) => b-a);
  const divisions = [...new Set(values.flatMap(room => room.division ? [room.division] : []))].sort((a,b) => a.localeCompare(b,'es'));
  return <>
    <div className="collection-workspace-heading">
      <CollectionStateFilter<'active'|'archived'|'pending'|'all'> label="Estado de las aulas" value={options.state??'active'} selectedRef={props.toggleRef}
        onChange={state=>onOptions({...options,state})} items={[
          {value:'active',label:'Activas',count:all.filter(room=>!room.archived).length},
          {value:'archived',label:'Archivadas',count:all.filter(room=>room.archived).length},
          ...(pendingCount===undefined?[]:[{value:'pending' as const,label:'Pendientes',count:pendingCount}])
        ]}/>
    </div>
    <div className="cl-filter-bar">
      <label className="cl-search"><span className="entry-sr-only">Buscar aula</span>
        <FoxmindIcon name="search" /><input type="search" placeholder="Buscar por nombre, materia o docente…" value={search} onChange={event => onSearch?.(event.target.value)} />
      </label>
      <select aria-label="Ciclo lectivo" value={options.academicYear ?? ''} onChange={event => onOptions({ ...options, academicYear: event.target.value })}>
        <option value="">Todos los ciclos</option>{years.map(year => <option key={year} value={year}>{year}</option>)}
      </select>
      <select aria-label="División" value={options.division ?? ''} onChange={event => onOptions({ ...options, division: event.target.value })}>
        <option value="">Todas las divisiones</option>{divisions.map(division => <option key={division} value={division}>{division}</option>)}
      </select>
      <div className="cl-view" role="group" aria-label="Presentación de aulas">
        <button type="button" className={view === 'grid' ? 'selected' : undefined} aria-label="Vista de tarjetas" aria-pressed={view === 'grid'} onClick={() => onView('grid')}><EntryIcon name="grid" /></button>
        <button type="button" className={view === 'list' ? 'selected' : undefined} aria-label="Vista de lista" aria-pressed={view === 'list'} onClick={() => onView('list')}><EntryIcon name="list" /></button>
      </div>
    </div>
    {search.trim() || active ? <div className="collection-workspace-chips" aria-label="Criterios aplicados">
      {search.trim() && onSearch ? <button type="button" aria-label={`Quitar búsqueda ${search}`} onClick={() => onSearch('')}>Búsqueda: {search} ×</button> : null}
      {options.academicYear ? <button type="button" aria-label={`Quitar ciclo lectivo ${options.academicYear}`} onClick={() => onOptions({ ...options, academicYear: '' })}>Ciclo: {options.academicYear} ×</button> : null}
      {options.division ? <button type="button" aria-label={`Quitar división ${options.division}`} onClick={() => onOptions({ ...options, division: '' })}>División: {options.division} ×</button> : null}
      {active ? <button type="button" className="collection-clear-filters" onClick={onClear}>Limpiar filtros</button> : null}
    </div> : null}
  </>;
}
