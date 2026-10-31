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
import { HomeActivitySummary } from './HomeActivitySummary.tsx';
import { HomeFoxyNote } from './HomeFoxyNote.tsx';
import { homeParticipation } from './home-labels.ts';
import { homeGreetingDate,shouldShowHomeModule } from './home-presentation.ts';
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
  const module=(name:HomeModuleName)=>data && !(['queries','feedback'].includes(name) && data.modules[name].status==='ready' && !data.modules[name].items.length) && shouldShowHomeModule(data.participation,name,data.modules[name])?<HomeModule key={name} name={name} page={data.modules[name]} timeZone={data.timeZone}
    onAction={onAction} onRetry={()=>void home.retry(name)} onExpand={()=>setPanel(name)} onAgenda={onAgenda} busy={busy}/>:null;
  if(home.loading)return <section className="fm-home fm-home-loading" aria-label="Inicio" aria-busy="true"><h1>Hola, {displayName}</h1><p role="status">Cargando tus actividades y próximos pasos…</p><div className="fm-home-skeleton"/></section>;
  if(!data)return <section className="fm-home fm-home-global-error" aria-label="Inicio"><h1>Hola, {displayName}</h1><p role="alert">No pudimos comprobar tu Inicio. Actualiza para volver a consultar tus aulas y permisos.</p><button onClick={()=>void home.refresh()}>Reintentar Inicio</button></section>;
  if(panel && homeClient)return <section className="fm-home"><HomeModulePanel key={`${panel}:${data.generatedAt}`} name={panel} data={data} client={homeClient} onClose={()=>{const previous=panel;setPanel(null);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`[data-home-expand="${previous}"]`)?.focus());}} onAction={onAction} onUnauthorized={()=>void home.refresh()}/></section>;
  const learning=[module('pending'),module('feedback')],teaching=[module('review'),module('queries')];
  const materials=module('materials');
  return <section className={`fm-home fm-home--reference fm-home--${data.participation}`} aria-label="Inicio">
    <div className="fm-home-columns"><div className="fm-home-work">
    <HomeGreeting data={data} accountRole={accountRole} displayName={displayName} onClassrooms={onClassrooms}/>
    <HomeShortcuts accountRole={accountRole} data={data} onAction={onAction} onCreate={onCreate} onJoin={onJoin} onClassrooms={onClassrooms} onAgenda={onAgenda} busy={busy}/>
    {data.participation==='none'?<HomeWelcome accountRole={accountRole} data={data} onCreate={onCreate} onJoin={onJoin} busy={busy}/>:null}
    {module('classrooms')}
    <div className="fm-home-learning-groups">
      {learning.some(Boolean)?<section className="fm-home-learning-group" aria-label="Mi aprendizaje"><header><FoxmindIcon name="book"/><h2>Mi aprendizaje</h2></header>{learning}</section>:null}
      {teaching.some(Boolean)?<section className="fm-home-teaching-group" aria-label="Mi actividad docente"><header><FoxmindIcon name="users"/><h2>Mi actividad docente</h2></header>{teaching}</section>:null}
    </div>
    {materials?<details className="fm-home-resources" open={data.modules.materials.status==='error'||undefined}><summary>Recursos y herramientas<span>Biblioteca y accesos de trabajo</span></summary><div>{materials}</div></details>:null}
    <div className="fm-home-toolbar"><time dateTime={data.generatedAt}>{homeGreetingDate(data.generatedAt,data.timeZone)}</time><button aria-label="Actualizar Inicio" onClick={()=>void home.refresh()}><FoxmindIcon name="refresh"/>Actualizar</button></div>
    </div><aside className="fm-home-aside">{module('agenda')}<HomeActivitySummary data={data}/><HomeFoxyNote/></aside></div>
  </section>;
}

function HomeGreeting({data,accountRole,displayName,onClassrooms}:{data:HomeResponse;accountRole:HomeProps['accountRole'];displayName:string;onClassrooms:()=>void}) {
  return <header className="fm-home-greeting"><div><span className="fm-home-welcome-eyebrow"><FoxmindIcon name="spark"/>¡Qué bueno verte por aquí!</span><h1>¡Hola, <span>{displayName}</span>!</h1>
    <p>{data.participation==='teach'?'Tus clases':'Tus actividades'} y próximos pasos, en un solo lugar.</p>
    <button className="primary fm-sky-hero-action" onClick={onClassrooms}>Ir a mis aulas<FoxmindIcon name="arrow-right"/></button>
    <span className="sr-only">{homeParticipation(data,accountRole)}</span></div>
    <picture className="fm-home-reference-scene" aria-hidden="true"><img
      src="/foxmind-3d/hero/inicio-reference-1600.webp"
      srcSet="/foxmind-3d/hero/inicio-reference-480.webp 480w, /foxmind-3d/hero/inicio-reference-960.webp 960w, /foxmind-3d/hero/inicio-reference-1600.webp 1600w"
      sizes="(max-width: 900px) 100vw, 70vw" width="1600" height="533" alt="" loading="eager" fetchPriority="high"/>
    </picture>
  </header>;
}

function HomeWelcome({accountRole,data,onCreate,onJoin,busy}:{accountRole:'teacher'|'student';data:HomeResponse;onCreate:()=>void;onJoin:()=>void;busy?:boolean}) {
  return <section className="fm-home-welcome"><FoxmindIllustration name="states/empty" sizes="180px"/>
    <div><h2>{data.memberships.archived?'Tu historial sigue aquí':'Tu próximo paso empieza aquí'}</h2>
      <p>{data.memberships.archived?'Consulta tus aulas archivadas o comienza una nueva experiencia.':accountRole==='teacher'?'Crea tu primera aula para empezar a enseñar.':'Unite a un aula con el código de tu docente.'}</p>
      <div className="fm-home-entry-actions">{accountRole==='teacher'?<button onClick={onCreate} disabled={busy}>Crear mi primera aula<FoxmindIcon name="plus"/></button>:<button onClick={onJoin} disabled={busy}>Unirme con código<FoxmindIcon name="arrow-right"/></button>}</div>
    </div></section>;
}
