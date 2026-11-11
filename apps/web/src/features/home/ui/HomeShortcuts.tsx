'use client';
import { useState } from 'react';
import type { HomeResponse, HomeTarget } from '../../../../../../src/core/domain/index.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { Dialog } from '../../../../../shared-ui/feedback.tsx';
import { Cover } from '../../../../../shared-ui/academic-cover.tsx';
import type { HomeClient } from '../api/home-api.ts';
import { HomeRoomPicker } from './HomeRoomPicker.tsx';
type Props = { data:HomeResponse; onAction:(target:HomeTarget)=>void; onClassrooms:()=>void; onRetry?:()=>void; onSelected?:(id:string)=>void; busy?:boolean; client?:HomeClient; onUnauthorized?:()=>void };
export function ClassroomActions({data,onAction,onClassrooms,onRetry,onSelected,busy,teacher}:{teacher:boolean}&Props) {
  const rooms=data.modules.classrooms.status==='ready'?data.modules.classrooms.items.map(item=>item.classroom).filter(room=>!room.archived && room.role===(teacher?'teacher':'student')):[];
  const [selected,setSelected]=useState(''),[choosing,setChoosing]=useState(false);
  const room=rooms.find(item=>item.id===selected)??rooms[0];
  if(data.modules.classrooms.status==='error')return <section className="fm-home-teacher-tools"><h2>{teacher?'Acciones del aula':'Accesos de mi aula'}</h2><p role="status">No pudimos cargar tus aulas.</p><button disabled={busy} onClick={onRetry}>Reintentar aulas</button></section>;
  if(!room)return <section className="fm-home-teacher-tools"><h2>{teacher?'Acciones del aula':'Accesos de mi aula'}</h2><button onClick={onClassrooms}>Elegir un aula en Mis aulas</button></section>;
  const actions=teacher?([
    ['create-activity','Crear actividad','clipboard'],['upload-material','Agregar material','book'],['publish-notice','Publicar aviso','chat'],['progress','Ver progreso','progress'],
  ] as const):([
    ['library','Materiales','book'],['progress','Mi progreso','progress'],['plan','Plan de estudio','route'],['wall','Muro del aula','chat'],
  ] as const);
  return <section className="fm-home-teacher-tools" aria-label={teacher?'Acciones del aula':'Accesos de mi aula'}>
    <header className="fm-brujula-shortcuts-heading"><div><h2>{teacher?'Acciones del aula':'Accesos de mi aula'}</h2><p>{room.name} · {room.division}</p></div>{rooms.length>1?<button className="fm-brujula-change-room" onClick={()=>setChoosing(true)} aria-expanded={choosing}>Cambiar aula<FoxmindIcon name="chevron-down"/></button>:null}</header>
    {choosing?<Dialog title="Elegí un aula" onClose={()=>setChoosing(false)}><div className="fm-brujula-room-picker">{rooms.map(item=><button key={item.id} aria-pressed={item.id===room.id} onClick={()=>{setSelected(item.id);onSelected?.(item.id);setChoosing(false);}}><Cover kind={item.coverKey}/><span><strong>{item.name}</strong><small>{item.division}</small></span><FoxmindIcon name="chevron-right"/></button>)}</div></Dialog>:null}
    <div className={`fm-home-shortcut-grid${teacher?'':' fm-home-student-shortcuts'}`}>{actions.map(([kind,label,icon])=><button key={kind} disabled={busy} onClick={()=>onAction(kind==='create-activity'||kind==='upload-material'||kind==='publish-notice'?{kind,classroomId:room.id}:{kind:'classroom',classroomId:room.id,section:kind})}><span className="fm-brujula-shortcut-icon"><FoxmindIcon name={icon}/></span><strong>{label}</strong></button>)}</div>
    {data.modules.classrooms.status==='ready' && data.modules.classrooms.nextCursor?<button className="fm-brujula-change-room" onClick={onClassrooms}>Ver todas mis aulas</button>:null}
  </section>;
}
export function HomeShortcuts(props:Props){return <ClassroomActions {...props} teacher={false}/>;}
const teacherActions=[
  {kind:'create-activity',label:'Crear actividad',verb:'crear la actividad',icon:'clipboard'},
  {kind:'upload-material',label:'Agregar material',verb:'agregar el material',icon:'book'},
  {kind:'publish-notice',label:'Publicar aviso',verb:'publicar el aviso',icon:'chat'},
  {kind:'progress',label:'Ver progreso',verb:'ver el progreso',icon:'progress'},
] as const;
export function HomeTeacherTools({data,client,onAction,onClassrooms,onUnauthorized,busy}:Props){
  const [action,setAction]=useState<typeof teacherActions[number]|null>(null);
  return <section className="fm-home-teacher-tools" aria-label="Acciones del aula">
    <header><h2>Acciones del aula</h2><p>Elegí qué querés hacer y en qué aula.</p></header>
    <div className="fm-home-shortcut-grid">{teacherActions.map(item=><button key={item.kind} disabled={busy} onClick={()=>setAction(item)}>
      <span className="fm-brujula-shortcut-icon"><FoxmindIcon name={item.icon}/></span><strong>{item.label}</strong>
    </button>)}</div>
    {action?<HomeRoomPicker key={data.generatedAt+action.kind} data={data} client={client} title={`¿En qué aula querés ${action.verb}?`} tone={action.kind}
      onClose={()=>setAction(null)} onClassrooms={onClassrooms} onUnauthorized={()=>{setAction(null);onUnauthorized?.();}}
      onSelect={item=>{setAction(null);onAction(action.kind==='progress'?{kind:'classroom',classroomId:item.classroom.id,section:'progress'}:{kind:action.kind,classroomId:item.classroom.id});}}/>:null}
  </section>;
}
