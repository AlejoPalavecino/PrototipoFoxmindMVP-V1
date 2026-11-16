import type { RefObject } from 'react';
import { FoxmindIcon, type IconKey } from '../../../../../shared-ui/index.ts';

export const classroomSections = (teacher: boolean): {key:string;label:string;icon:IconKey;group:'learning'|'management'}[] => [
  {key:'plan',label:'Plan',icon:'book',group:'learning'},
  {key:'wall',label:'Muro',icon:'chat-square',group:'learning'},
  {key:'library',label:'Biblioteca',icon:'folder',group:'learning'},
  {key:'activities',label:'Actividades',icon:'pencil',group:'learning'},
  {key:'progress',label:teacher?'Progreso':'Mi progreso',icon:'progress',group:'learning'},
  {key:'members',label:teacher?'Estudiantes':'Compañeros',icon:'users',group:teacher?'management':'learning'},
  ...(teacher ? [
    {key:'history',label:'Historial',icon:'clock' as const,group:'management' as const},
    {key:'settings',label:'Ajustes',icon:'settings' as const,group:'management' as const},
  ] : []),
];

export function ClassroomNavigation({teacher,selected,onSelect,tabsRef}:{
  teacher:boolean;selected:string;onSelect:(key:string)=>void;tabsRef:RefObject<HTMLElement|null>;
}) {
  return <div className="classroom-section-navigation"><nav ref={tabsRef} className="class-tabs brujula-class-tabs parity-room-navigation" data-role={teacher ? 'teacher' : 'student'} aria-label="Secciones del aula">
    {classroomSections(teacher).map(item=><button key={item.key} type="button" data-section={item.key}
      data-group={item.group} aria-current={selected===item.key?'page':undefined} onClick={()=>onSelect(item.key)}>
      <FoxmindIcon name={item.icon}/><span>{item.label}</span>
    </button>)}
  </nav></div>;
}
