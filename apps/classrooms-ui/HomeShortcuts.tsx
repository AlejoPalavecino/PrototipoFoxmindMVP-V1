'use client';
import { useState } from 'react';
import type { HomeResponse, HomeTarget } from '../../src/core/domain/index.ts';
import { FoxmindIcon } from '../shared-ui/index.ts';
import { Dialog, Cover } from './components.tsx';
type Props = { data:HomeResponse; onAction:(target:HomeTarget)=>void; onClassrooms:()=>void; onRetry?:()=>void; onSelected?:(id:string)=>void; busy?:boolean };
export function ClassroomActions({data,onAction,onClassrooms,onRetry,onSelected,busy,teacher}:{teacher:boolean}&Props) {
  const rooms=data.modules.classrooms.status==='ready'?data.modules.classrooms.items.map(item=>item.classroom).filter(room=>!room.archived && room.role===(teacher?'teacher':'student')):[];
  const [selected,setSelected]=useState(''),[choosing,setChoosing]=useState(false);
  const room=rooms.find(item=>item.id===selected)??rooms[0];
  if(data.modules.classrooms.status==='error')return <section className="fm-home-teacher-tools"><h2>{teacher?'Acciones del aula':'Accesos de mi aula'}</h2><p role="status">No pudimos cargar tus aulas.</p><button disabled={busy} onClick={onRetry}>Reintentar aulas</button></section>;
  if(!room)return <section className="fm-home-teacher-tools"><h2>{teacher?'Acciones del aula':'Accesos de mi aula'}</h2><button onClick={onClassrooms}>Elegir un aula en Mis aulas</button></section>;
  const actions=teacher?([
    ['create-activity','Crear actividad','file'],['upload-material','Subir material','upload'],['publish-notice','Publicar aviso','chat'],['progress','Ver progreso','check'],
  ] as const):([
    ['library','Materiales','folder'],['progress','Mi progreso','check'],['plan','Plan de estudio','book'],['wall','Muro del aula','chat'],
  ] as const);
  return <section className="fm-home-teacher-tools" aria-label={teacher?'Acciones del aula':'Accesos de mi aula'}>
    <header className="fm-brujula-shortcuts-heading"><div><h2>{teacher?'Acciones del aula':'Accesos de mi aula'}</h2><p>{room.name} · {room.division}</p></div>{rooms.length>1?<button className="fm-brujula-change-room" onClick={()=>setChoosing(true)} aria-expanded={choosing}>Cambiar aula<FoxmindIcon name="chevron-down"/></button>:null}</header>
    {choosing?<Dialog title="Elegí un aula" onClose={()=>setChoosing(false)}><div className="fm-brujula-room-picker">{rooms.map(item=><button key={item.id} aria-pressed={item.id===room.id} onClick={()=>{setSelected(item.id);onSelected?.(item.id);setChoosing(false);}}><Cover kind={item.coverKey}/><span><strong>{item.name}</strong><small>{item.division}</small></span><FoxmindIcon name="chevron-right"/></button>)}</div></Dialog>:null}
    <div className="fm-home-shortcut-grid">{actions.map(([kind,label,icon])=><button key={kind} disabled={busy} onClick={()=>onAction(kind==='create-activity'||kind==='upload-material'||kind==='publish-notice'?{kind,classroomId:room.id}:{kind:'classroom',classroomId:room.id,section:kind})}><span className="fm-brujula-shortcut-icon"><FoxmindIcon name={icon}/></span><strong>{label}</strong></button>)}</div>
    {data.modules.classrooms.status==='ready' && data.modules.classrooms.nextCursor?<button className="fm-brujula-change-room" onClick={onClassrooms}>Ver todas mis aulas</button>:null}
  </section>;
}
export function HomeShortcuts(props:Props){return <ClassroomActions {...props} teacher={false}/>;}
export function HomeTeacherTools(props:Props){return <ClassroomActions {...props} teacher/>;}
