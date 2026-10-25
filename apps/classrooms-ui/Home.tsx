'use client';
import { useState } from 'react';
import type { HomeModuleName,HomeTarget } from '../../src/core/domain/index.ts';
import type { ClassroomClient,NotificationTarget,Classroom,Draft,Invitation } from './api.ts';
import type { HomeClient } from './home-api.ts';
import { FoxmindIllustration,FoxmindIcon } from '../shared-ui/index.ts';
import { useHome } from './use-home.ts';
import { HomeModule } from './HomeModule.tsx';
import { HomeModulePanel } from './HomeModulePanel.tsx';
import { HomeShortcuts } from './HomeShortcuts.tsx';
import { homeParticipation } from './home-labels.ts';
export interface HomeProps {
  displayName:string;subjectId?:string;homeClient?:HomeClient;busy?:boolean;
  onCreate:()=>void;onJoin:()=>void;onClassrooms:()=>void;onAction:(target:HomeTarget)=>void;onAgenda?:()=>void;
  api?:ClassroomClient;data?:{teach:Classroom[];study:Classroom[];drafts:Draft[];invitations:Invitation[]}|null;
  onEnter?:(id:string)=>void;onOpenTarget?:(target:NotificationTarget)=>void;
}
export function Home(props:HomeProps) {
  const {displayName,subjectId,homeClient,busy,onAction,onCreate,onJoin,onClassrooms}=props;
  const home=useHome(homeClient,subjectId),[panel,setPanel]=useState<HomeModuleName|null>(null);
  const data=home.data,onAgenda=props.onAgenda??(()=>{window.location.assign('/agenda');});
  const module=(name:HomeModuleName)=><HomeModule key={name} name={name} page={data!.modules[name]} timeZone={data!.timeZone}
    onAction={onAction} onRetry={()=>void home.retry(name)} onExpand={()=>setPanel(name)} busy={busy}/>;
  if(home.loading)return <section className="fm-home fm-home-loading" aria-label="Inicio" aria-busy="true"><h1>Hola, {displayName}</h1><p role="status">Cargando tus actividades y próximos pasos…</p><div className="fm-home-skeleton"/></section>;
  if(!data)return <section className="fm-home fm-home-global-error" aria-label="Inicio"><h1>Hola, {displayName}</h1><p role="alert">No pudimos comprobar tu Inicio. Actualiza para volver a consultar tus aulas y permisos.</p><button onClick={()=>void home.refresh()}>Reintentar Inicio</button></section>;
  if(panel && homeClient)return <section className="fm-home"><HomeModulePanel key={`${panel}:${data.generatedAt}`} name={panel} data={data} client={homeClient} onClose={()=>{const previous=panel;setPanel(null);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`[data-home-expand="${previous}"]`)?.focus());}} onAction={onAction} onUnauthorized={()=>void home.refresh()}/></section>;
  return <section className={`fm-home fm-home--${data.participation}`} aria-label="Inicio">
    <header className="fm-home-greeting"><div><h1>¡Hola, {displayName}!</h1><p>{data.participation==='teach'?'Tus clases y próximos pasos, en un solo lugar.':'Tus actividades y próximos pasos, en un solo lugar.'}</p><small>{homeParticipation(data)}</small></div>
      <FoxmindIllustration name={data.participation==='teach'?'hero/welcome-teach':'hero/welcome-learn'} priority className="fm-home-hero" sizes="(max-width: 767px) 600px, 960px"/></header>
    <div className="fm-home-toolbar"><small>Actualizado {new Date(data.generatedAt).toLocaleTimeString('es-AR',{timeZone:data.timeZone,hour:'2-digit',minute:'2-digit'})}</small><button onClick={()=>void home.refresh()}><FoxmindIcon name="refresh"/>Actualizar</button></div>
    {data.setup.drafts+data.setup.invitations>0?<section className="fm-home-setup"><p>{data.setup.drafts} borradores privados · {data.setup.invitations} invitaciones pendientes</p><button onClick={onClassrooms}>Ver borradores e invitaciones</button></section>:null}
    {data.participation==='none'?<section className="fm-home-welcome"><FoxmindIllustration name="states/empty" sizes="120px"/><div><h2>{data.memberships.archived?'Tu historial sigue aquí':'Tu próximo paso empieza aquí'}</h2><p>{data.memberships.archived?'Consulta tus aulas archivadas o comienza una nueva experiencia.':'Puedes aprender y enseñar con la misma cuenta.'}</p><button onClick={onCreate} disabled={busy}>Crear mi primera aula</button> <button onClick={onJoin} disabled={busy}>Unirme con código</button></div></section>:null}
    <div className="fm-home-columns"><div className="fm-home-work">{module('pending')}{module('review')}{module('queries')}{module('materials')}</div>
      <aside className="fm-home-aside">{module('agenda')}<button className="fm-home-agenda-link" onClick={onAgenda}>Abrir Agenda<FoxmindIcon name="arrow-right"/></button>{module('feedback')}{module('classrooms')}</aside></div>
    <HomeShortcuts data={data} onAction={onAction} onCreate={onCreate} onJoin={onJoin} onClassrooms={onClassrooms} onAgenda={onAgenda} busy={busy}/>
  </section>;
}
