'use client';
import { useState } from 'react';
import type { HomeModuleName, HomeTarget, HomeResponse } from '../../../../../../src/core/domain/index.ts';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { NotificationTarget } from '../../../../../../src/core/contracts/notifications.ts';
import type { Classroom, Draft, Invitation } from '../../../../../../src/core/contracts/classrooms.ts';
import type { HomeClient } from '../api/home-api.ts';
import { FoxmindIllustration, FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { useHome } from '../model/use-home.ts';
import { HomeModule } from './HomeModule.tsx';
import { HomeFocus } from './HomeFocus.tsx';
import { HomeModulePanel } from './HomeModulePanel.tsx';
import { HomeWorkList } from './HomeWorkList.tsx';
import { HomeMiniagenda } from './HomeMiniagenda.tsx';
import { HomeShortcuts, HomeTeacherTools } from './HomeShortcuts.tsx';
import { homeParticipation } from '../model/home-labels.ts';
import { homeGreetingDate } from '../model/home-presentation.ts';
export interface HomeProps {
  accountRole:'teacher'|'student';displayName:string;subjectId?:string;homeClient?:HomeClient;busy?:boolean;
  onCreate:()=>void;onJoin:()=>void;onClassrooms:()=>void;onAction:(target:HomeTarget)=>void;onAgenda?:()=>void;
  api?:ClassroomClient;data?:{teach:Classroom[];study:Classroom[];drafts:Draft[];invitations:Invitation[]}|null;
  onEnter?:(id:string)=>void;onOpenTarget?:(target:NotificationTarget)=>void;
}
export function Home(props:HomeProps) {
  const {accountRole,displayName,subjectId,homeClient,busy,onAction,onCreate,onJoin,onClassrooms}=props;
  const home=useHome(homeClient,subjectId),[panel,setPanel]=useState<HomeModuleName|null>(null);
  const [attentionTab,setAttentionTab]=useState<'review'|'queries'>('review');
  const [focusRoom,setFocusRoom]=useState('');
  const [workList,setWorkList]=useState(false);
  const data=home.data,onAgenda=props.onAgenda??(()=>{window.location.assign('/agenda');});
  const module=(name:HomeModuleName,title?:string)=>data?<HomeModule key={name} name={name} title={title} page={data.modules[name]} timeZone={data.timeZone} generatedAt={data.generatedAt}
    onAction={onAction} onRetry={()=>void home.retry(name)} onExpand={()=>setPanel(name)} onAgenda={onAgenda} onList={name==='pending'?()=>setWorkList(true):undefined} previewLimit={name==='feedback'?1:name==='pending'?3:undefined} busy={busy}/>:null;
  if(home.loading)return <section className="fm-home fm-home-loading" aria-label="Inicio" aria-busy="true"><h1>Hola, {displayName}</h1><p role="status">Cargando tus actividades y próximos pasos…</p><div className="fm-home-skeleton"/></section>;
  if(!data)return <section className="fm-home fm-home-global-error" aria-label="Inicio"><h1>Hola, {displayName}</h1><p role="alert">No pudimos comprobar tu Inicio. Actualiza para volver a consultar tus aulas y permisos.</p><button onClick={()=>void home.refresh()}>Reintentar Inicio</button></section>;
  if(panel && homeClient)return <section className="fm-home"><HomeModulePanel key={`${panel}:${data.generatedAt}`} name={panel} data={data} client={homeClient} onClose={()=>{const previous=panel;setPanel(null);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`[data-home-expand="${previous}"]`)?.focus());}} onAction={onAction} onUnauthorized={()=>void home.refresh()}/></section>;
  const teacher = accountRole === 'teacher';
  const count = (name:HomeModuleName) => { const page=data.modules[name]; return page.status==='ready'?page.totalItems:null; };
  return <section className={`fm-home fm-home--reference fm-home--warm fm-home--${data.participation}`} aria-label="Inicio">
    <div className="fm-brujula-home-layout">
    <div className="fm-brujula-home-main"><HomeGreeting data={data} accountRole={accountRole} displayName={displayName}/>
    {data.participation==='none'?<HomeWelcome accountRole={accountRole} data={data} onCreate={onCreate} onJoin={onJoin} onClassrooms={onClassrooms} busy={busy}/>:null}
    {teacher ? <section className="fm-brujula-attention" aria-label="Por atender"><header><small>Seguimiento docente</small><h2>Por atender</h2><span className="fm-brujula-attention-scope">Todas tus aulas activas</span></header>
      <div className="fm-brujula-tabs" role="group" aria-label="Filtrar pendientes">
        <button type="button" aria-pressed={attentionTab === 'review'} onClick={() => setAttentionTab('review')}><FoxmindIcon name="clipboard"/>Entregas<span>{count('review')}</span></button>
        <button type="button" aria-pressed={attentionTab === 'queries'} onClick={() => setAttentionTab('queries')}><FoxmindIcon name="chat"/>Consultas<span>{count('queries')}</span></button>
      </div><div hidden={attentionTab !== 'review'}>{module('review')}</div><div hidden={attentionTab !== 'queries'}>{module('queries')}</div><small className="fm-brujula-queue-order">{attentionTab==='review'?'Las más antiguas primero':'Las más recientes primero'}</small></section> : module('pending','Mis entregas')}
    {teacher ? <HomeTeacherTools data={data} onAction={onAction} onClassrooms={onClassrooms} onRetry={()=>void home.retry('classrooms')} onSelected={setFocusRoom} busy={busy}/> : <HomeShortcuts data={data} onAction={onAction} onClassrooms={onClassrooms} onRetry={()=>void home.retry('classrooms')} busy={busy}/>}
    </div><aside className="fm-brujula-home-rail" aria-label={teacher ? 'Organización docente' : 'Organización personal'}>
    {!teacher ? module('feedback','Mis devoluciones') : null}<HomeMiniagenda data={data} teacher={teacher} client={homeClient} onAction={onAction} onAgenda={onAgenda} onRetry={()=>void home.retry('agenda')} onUnauthorized={()=>void home.refresh()} busy={busy}/>{teacher ? <HomeFocus data={data} selected={focusRoom} onAction={onAction} onClassrooms={onClassrooms} onRetry={()=>void home.retry('classrooms')} onDraftRetry={()=>void home.retry('drafts')} onDrafts={()=>setPanel('drafts')} busy={busy}/> : null}
    </aside></div>{workList?<HomeWorkList key={`${data.subjectId}:${data.generatedAt}`} data={data} client={homeClient} onClose={()=>setWorkList(false)} onAction={onAction} onUnauthorized={()=>{setWorkList(false);void home.refresh();}}/>:null}
  </section>;
}

function HomeGreeting({data,accountRole,displayName}:{data:HomeResponse;accountRole:HomeProps['accountRole'];displayName:string}) {
  const number = (name:HomeModuleName) => { const page=data.modules[name]; return page.status==='ready' ? page.totalItems : null; };
  const reviews=number('review'),queries=number('queries'),pending=number('pending');
  return <header className={`fm-home-greeting fm-home-greeting--welcome fm-brujula-welcome--${accountRole}`}>
    <img className="fm-home-panorama" src={`/brujula/banner-${accountRole === 'teacher' ? 'docente' : 'alumno'}.webp`} alt="" fetchPriority="high" decoding="async"/>
    <img className="fm-brujula-foxy" src="/brujula/foxy-bienvenida.webp" alt="" decoding="async"/>
    <div className="fm-home-glass">
    <time dateTime={data.generatedAt}><FoxmindIcon name="sun"/>{homeGreetingDate(data.generatedAt,data.timeZone)}</time>
    <h1>¡Buen día, <span>{displayName.trim().split(/\s+/)[0]}!</span></h1>
    <p>{accountRole==='teacher' && reviews===0 && queries===0?'Las correcciones y las consultas de tus aulas están al día.':accountRole==='student' && pending===0?'Estás al día con las entregas abiertas de tus aulas.':accountRole==='teacher' && reviews!==null ? `Tenés ${reviews} ${reviews===1?'entrega por corregir':'entregas por corregir'}${queries!==null?` y ${queries} ${queries===1?'consulta sin responder':'consultas sin responder'}`:''}.` : accountRole==='student' && pending!==null ? `Tenés ${pending} ${pending===1?'actividad pendiente':'actividades pendientes'}.${data.modules.pending.status==='ready' && data.modules.pending.items.some(item=>item.attemptId)?' Una tiene un borrador para retomar.':''}` : 'Tu espacio para aprender y enseñar.'}</p>
    <span className="sr-only">{homeParticipation(data,accountRole)}</span></div>
  </header>;
}


function HomeWelcome({accountRole,data,onCreate,onJoin,onClassrooms,busy}:{accountRole:'teacher'|'student';data:HomeResponse;onCreate:()=>void;onJoin:()=>void;onClassrooms:()=>void;busy?:boolean}) {
  return <section className="fm-home-welcome"><FoxmindIllustration name="states/empty" sizes="180px"/>
    <div><h2>{data.memberships.archived?'Tu historial sigue aquí':'Tu próximo paso empieza aquí'}</h2>
      <p>{data.memberships.archived?'Consulta tus aulas archivadas o comienza una nueva experiencia.':accountRole==='teacher'?'Crea tu primera aula para empezar a enseñar.':'Unite a un aula con el código de tu docente.'}</p>
      <div className="fm-home-entry-actions">
        {data.memberships.archived>0?<button onClick={onClassrooms}>Ver aulas archivadas<FoxmindIcon name="arrow-right"/></button>:null}
        {accountRole==='teacher' && data.setup.drafts>0?<button onClick={onClassrooms}>Continuar un borrador<FoxmindIcon name="arrow-right"/></button>:
          accountRole==='teacher'?<button onClick={onCreate} disabled={busy}>Crear mi primera aula<FoxmindIcon name="plus"/></button>:
          data.setup.invitations>0?<button onClick={onClassrooms}>Ver invitaciones<FoxmindIcon name="arrow-right"/></button>:
          <button onClick={onJoin} disabled={busy}>Unirme con código<FoxmindIcon name="arrow-right"/></button>}
      </div>
    </div></section>;
}
