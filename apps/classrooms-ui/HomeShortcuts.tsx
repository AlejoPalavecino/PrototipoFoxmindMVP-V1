'use client';
import { useState } from 'react';
import type { HomeResponse,HomeTarget } from '../../src/core/domain/index.ts';
import { FoxmindIcon } from '../shared-ui/index.ts';
export function HomeShortcuts({data,onAction,onCreate,onJoin,onClassrooms,onAgenda,busy}:{
  data:HomeResponse;onAction:(target:HomeTarget)=>void;onCreate:()=>void;onJoin:()=>void;
  onClassrooms:()=>void;onAgenda:()=>void;busy?:boolean;
}) {
  const rooms=data.modules.classrooms.status==='ready'?data.modules.classrooms.items.map(item=>item.classroom).filter(room=>room.role==='teacher' && !room.archived):[];
  const [selected,setSelected]=useState(''),room=rooms.find(item=>item.id===selected)??rooms[0];
  const teacherTools=data.memberships.teach>0?<div className="fm-home-teacher-tools"><h2>Herramientas del aula</h2>
      {room?<><label>Aula destino<select value={room.id} onChange={event=>setSelected(event.target.value)}>{rooms.map(item=><option key={item.id} value={item.id}>{item.name} · {item.division}</option>)}</select></label>
        <div className="fm-home-shortcut-grid">{([['create-activity','Crear actividad','file'],['upload-material','Subir material','upload'],['publish-notice','Publicar aviso','chat']] as const).map(([kind,label,icon])=>
          <button key={kind} disabled={busy} onClick={()=>onAction({kind,classroomId:room.id})}><FoxmindIcon name={icon}/><span>{label}<small>{room.name} · {room.division}</small></span></button>)}</div></>:
        <p>Elige un aula docente desde <button onClick={onClassrooms}>Mis aulas</button> para usar sus herramientas.</p>}
      {data.modules.classrooms.status==='ready' && data.modules.classrooms.nextCursor?<button onClick={onClassrooms}>Buscar otras aulas docentes en Mis aulas</button>:null}</div>:null;
  return <section className={`fm-home-module fm-home-shortcuts${data.participation==='teach'?' fm-home-shortcuts--teach':''}`} aria-label="Accesos rápidos">
    {data.participation==='teach'?teacherTools:null}
    <header><h2>Accesos rápidos</h2></header>
    <div className="fm-home-shortcut-grid"><button onClick={onClassrooms}><FoxmindIcon name="book"/><span>Mis aulas<small>Estudio, Enseño e historial</small></span></button>
      <button onClick={onAgenda}><FoxmindIcon name="calendar"/><span>Mi Agenda<small>Organiza tu semana</small></span></button>
      <button onClick={onJoin} disabled={busy}><FoxmindIcon name="plus"/><span>Unirme a un aula<small>Con código o invitación</small></span></button></div>
    {data.participation!=='teach'?teacherTools:null}
    <div className="fm-home-entry-actions"><button onClick={onCreate} disabled={busy}>Crear aula</button></div>
  </section>;
}
