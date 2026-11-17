import type { Classroom } from '../../../../../../src/core/contracts/classrooms.ts';
import type { RefObject } from 'react';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import type { ClassroomFilterOptions } from './collection-filter.ts';
interface CollectionFiltersProps {
 all: Classroom[]; search:string; onSearch?:(value:string)=>void;
 options:ClassroomFilterOptions; onOptions:(value:ClassroomFilterOptions)=>void;
 pendingCount?:number; pendingTabRef:RefObject<HTMLButtonElement|null>;
}
export function ClassroomCollectionFilters(props:CollectionFiltersProps) {
 const {all,search,onSearch,options,onOptions,pendingCount}=props;
 return (
    <div className="toolbar collection-toolbar">
      <div className="segmented" aria-label="Estado de las aulas">{([{value:'active',label:'Activas',count:all.filter(room=>!room.archived).length},{value:'archived',label:'Archivadas',count:all.filter(room=>room.archived).length},...(pendingCount===undefined?[]:[{value:'pending',label:'Borradores',count:pendingCount}])] as const).map(item=><button key={item.value} ref={item.value==='pending'?props.pendingTabRef:undefined} type="button" aria-pressed={options.state===item.value} onClick={()=>onOptions({...options,state:item.value as ClassroomFilterOptions['state']})}>{item.label}{' '}<span className="collection-count">{item.count}</span></button>)}</div>
      <label className="search-field"><span className="entry-sr-only">Buscar aula</span><FoxmindIcon name="search"/><input type="search" placeholder="Nombre, materia o grupo" value={search} onChange={event=>onSearch?.(event.target.value)}/></label>
    </div>
 );
}
