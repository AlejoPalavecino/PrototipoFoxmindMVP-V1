'use client';
import { useState } from 'react';
import type { HomeModuleName,HomeTarget,HomeResponse } from '../../src/core/domain/index.ts';
import type { ClassroomClient,NotificationTarget,Classroom,Draft,Invitation } from './api.ts';
import type { HomeClient } from './home-api.ts';
import { FoxmindIllustration,FoxmindIcon } from '../shared-ui/index.ts';
import { useHome } from './use-home.ts';
import { HomeModule } from './HomeModule.tsx';
import { HomeModulePanel } from './HomeModulePanel.tsx';
import { HomeShortcuts } from './HomeShortcuts.tsx';
import { HomeFoxyNote } from './HomeFoxyNote.tsx';
import { homeParticipation } from './home-labels.ts';
import { homeGreetingDate } from './home-presentation.ts';
export interface HomeProps {
  accountRole:'teacher'|'student';displayName:string;subjectId?:string;homeClient?:HomeClient;busy?:boolean;
  onCreate:()=>void;onJoin:()=>void;onClassrooms:()=>void;onAction:(target:HomeTarget)=>void;onAgenda?:()=>void;
  api?:ClassroomClient;data?:{teach:Classroom[];study:Classroom[];drafts:Draft[];invitations:Invitation[]}|null;
  onEnter?:(id:string)=>void;onOpenTarget?:(target:NotificationTarget)=>void;
}
export function Home(props:HomeProps) {
  const {accountRole,displayName,subjectId,homeClient,busy,onAction,onCreate,onJoin,onClassrooms}=props;
  const home=useHome(homeClient,subjectId),[panel,setPanel]=useState<HomeModuleName|null>(null);
  const data=home.data,onAgenda=props.onAgenda??(()=>{window.location.assign('/agenda');});
  const module=(name:HomeModuleName,title?:string)=>data?<HomeModule key={name} name={name} title={title} page={data.modules[name]} timeZone={data.timeZone} generatedAt={data.generatedAt}
    onAction={onAction} onRetry={()=>void home.retry(name)} onExpand={()=>setPanel(name)} onAgenda={onAgenda} busy={busy}/>:null;
  if(home.loading)return <section className="fm-home fm-home-loading" aria-label="Inicio" aria-busy="true"><h1>Hola, {displayName}</h1><p role="status">Cargando tus actividades y próximos pasos…</p><div className="fm-home-skeleton"/></section>;
  if(!data)return <section className="fm-home fm-home-global-error" aria-label="Inicio"><h1>Hola, {displayName}</h1><p role="alert">No pudimos comprobar tu Inicio. Actualiza para volver a consultar tus aulas y permisos.</p><button onClick={()=>void home.refresh()}>Reintentar Inicio</button></section>;
  if(panel && homeClient)return <section className="fm-home"><HomeModulePanel key={`${panel}:${data.generatedAt}`} name={panel} data={data} client={homeClient} onClose={()=>{const previous=panel;setPanel(null);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`[data-home-expand="${previous}"]`)?.focus());}} onAction={onAction} onUnauthorized={()=>void home.refresh()}/></section>;
  const teacher = accountRole === 'teacher';
  return <section className={`fm-home fm-home--reference fm-home--warm fm-home--${data.participation}`} aria-label="Inicio">
    <HomeGreeting data={data} accountRole={accountRole} displayName={displayName}/>
    <div className="fm-home-access-row"><HomeShortcuts/>
      <HomeFoxyNote role={accountRole} modules={data.modules} onAction={onAction} onClassrooms={onClassrooms} busy={busy}/>
    </div>
    {data.participation==='none'?<HomeWelcome accountRole={accountRole} data={data} onCreate={onCreate} onJoin={onJoin} onClassrooms={onClassrooms} busy={busy}/>:null}
    <div className="fm-home-dashboard">
    <div className="fm-home-priorities">
    {module(teacher ? 'review' : 'pending')}
    {module(teacher ? 'queries' : 'feedback')}
    </div>
    {module('agenda')}
    {module('classrooms', teacher && data.memberships.teach > 0 ? 'Avance del plan por aula' : undefined)}
    </div>
  </section>;
}

function HomeGreeting({data,accountRole,displayName}:{data:HomeResponse;accountRole:HomeProps['accountRole'];displayName:string}) {
  return <header className="fm-home-greeting fm-home-greeting--welcome">
    <img className="fm-home-panorama" src="/foxmind-3d/hero/welcome-warm-1600.webp"
      srcSet="/foxmind-3d/hero/welcome-warm-960.webp 960w, /foxmind-3d/hero/welcome-warm-1600.webp 1600w, /foxmind-3d/hero/welcome-warm-2172.webp 2172w"
      sizes="(min-width: 1024px) calc(100vw - 280px), 135vw" alt="" fetchPriority="high" decoding="async"/>
    <div className="fm-home-glass">
    <time dateTime={data.generatedAt}>{homeGreetingDate(data.generatedAt,data.timeZone)}</time>
    <h1>¡Hola, <span>{displayName}!</span></h1>
    <p>{accountRole==='teacher'?'Un nuevo día para compartir lo que sabés.':'Tu próximo aprendizaje empieza acá.'}</p>
    <span className="sr-only">{homeParticipation(data,accountRole)}</span></div>
  </header>;
}

function HomeWelcome({accountRole,data,onCreate,onJoin,onClassrooms,busy}:{accountRole:'teacher'|'student';data:HomeResponse;onCreate:()=>void;onJoin:()=>void;onClassrooms:()=>void;busy?:boolean}) {
  return <section className="fm-home-welcome"><FoxmindIllustration name="states/empty" sizes="180px"/>
    <div><h2>{data.memberships.archived?'Tu historial sigue aquí':'Tu próximo paso empieza aquí'}</h2>
      <p>{data.memberships.archived?'Consulta tus aulas archivadas o comienza una nueva experiencia.':accountRole==='teacher'?'Crea tu primera aula para empezar a enseñar.':'Unite a un aula con el código de tu docente.'}</p>
      <div className="fm-home-entry-actions">
        {accountRole==='teacher' && data.setup.drafts>0?<button onClick={onClassrooms}>Continuar un borrador<FoxmindIcon name="arrow-right"/></button>:
          accountRole==='teacher'?<button onClick={onCreate} disabled={busy}>Crear mi primera aula<FoxmindIcon name="plus"/></button>:
          data.setup.invitations>0?<button onClick={onClassrooms}>Ver invitaciones<FoxmindIcon name="arrow-right"/></button>:
          <button onClick={onJoin} disabled={busy}>Unirme con código<FoxmindIcon name="arrow-right"/></button>}
      </div>
    </div></section>;
}
