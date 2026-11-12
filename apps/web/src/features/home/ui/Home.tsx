'use client';
import { useState } from 'react';
import type { ClassroomItem, HomeModuleName, HomeTarget, HomeResponse } from '../../../../../../src/core/domain/index.ts';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { NotificationTarget } from '../../../../../../src/core/contracts/notifications.ts';
import type { Classroom, Draft, Invitation } from '../../../../../../src/core/contracts/classrooms.ts';
import type { HomeClient } from '../api/home-api.ts';
import { FoxmindIllustration, FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { useHome } from '../model/use-home.ts';
import { HomeModule } from './HomeModule.tsx';
import { HomeFocus } from './HomeFocus.tsx';
import { HomeRoomPicker } from './HomeRoomPicker.tsx';
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
  const [focusRoom,setFocusRoom]=useState<{item:ClassroomItem;source:HomeResponse['modules']['classrooms']}|null>(null);
  const home=useHome(homeClient,subjectId,focusRoom?.item.classroom.id),[panel,setPanel]=useState<HomeModuleName|null>(null);
  const [attentionTab,setAttentionTab]=useState<'review'|'queries'>('review');
  const [choosingFocus,setChoosingFocus]=useState(false);
  const [workList,setWorkList]=useState(false);
  const data=home.data,onAgenda=props.onAgenda??(()=>{window.location.assign('/agenda');});
  const module=(name:HomeModuleName,title?:string)=>home.ordering[name]?<p role="status">Ordenando {name==='review'?'entregas':'consultas'}…</p>:data?<HomeModule key={name} name={name} title={title} page={data.modules[name]} timeZone={data.timeZone} generatedAt={data.generatedAt}
    onAction={onAction} onRetry={()=>void home.retry(name)} onExpand={name==='review'||name==='queries'?undefined:()=>setPanel(name)} onAgenda={onAgenda} onList={name==='pending'?()=>setWorkList(true):undefined} previewLimit={name==='feedback'?1:name==='pending'?3:undefined} busy={busy}/>:null;
  if(home.loading)return <section className="fm-home fm-home-loading" aria-label="Inicio" aria-busy="true"><h1>Hola, {displayName}</h1><p role="status">Cargando tus actividades y próximos pasos…</p><div className="fm-home-skeleton"/></section>;
  if(!data)return <section className="fm-home fm-home-global-error" aria-label="Inicio"><h1>Hola, {displayName}</h1><p role="alert">No pudimos comprobar tu Inicio. Actualiza para volver a consultar tus aulas y permisos.</p><button onClick={()=>void home.refresh()}>Reintentar Inicio</button></section>;
  if(panel && homeClient)return <section className="fm-home"><HomeModulePanel key={`${panel}:${data.generatedAt}`} name={panel} data={data} client={homeClient} order={panel==='review'||panel==='queries'?home.orders[panel]:undefined} onClose={()=>{const previous=panel;setPanel(null);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`[data-home-expand="${previous}"]`)?.focus());}} onAction={onAction} onRefresh={()=>{setPanel(null);void home.refresh();}} onUnauthorized={()=>{setPanel(null);void home.refresh();}}/></section>;
  const teacher = accountRole === 'teacher';
  const attentionPage=data.modules[attentionTab];
  const count = (name:HomeModuleName) => { const page=data.modules[name]; return page.status==='ready'?page.totalItems:null; };
  const focused=(data.modules.classrooms.status==='ready'?data.modules.classrooms.items.find(item=>item.classroom.id===focusRoom?.item.classroom.id):undefined)??(focusRoom?.source===data.modules.classrooms?focusRoom.item:undefined);
  return <section className={`fm-home fm-home--reference fm-home--warm fm-home--${data.participation}${teacher?' fm-home--teacher-polish':''}`} aria-label="Inicio">
    <div className="fm-brujula-home-layout">
    <div className="fm-brujula-home-main"><HomeGreeting data={data} accountRole={accountRole} displayName={displayName}/>
    {data.participation==='none'?<HomeWelcome accountRole={accountRole} data={data} onCreate={onCreate} onJoin={onJoin} onClassrooms={onClassrooms} busy={busy}/>:null}
    {teacher ? <section className="fm-brujula-attention" aria-label="Por atender"><header className="fm-home-attention-heading"><small>Seguimiento docente</small><h2>Por atender</h2><label className="fm-home-order"><span className="sr-only">Ordenar {attentionTab==='review'?'entregas':'consultas'}</span><select value={home.orders[attentionTab]} onChange={event=>home.changeOrder(attentionTab,event.target.value as 'asc'|'desc')}><option value="desc">Más nuevas primero</option><option value="asc">Más antiguas primero</option></select></label></header>
      <div className="fm-home-attention-toolbar"><div className="fm-brujula-tabs" role="group" aria-label="Filtrar pendientes">
        <button type="button" aria-pressed={attentionTab === 'review'} onClick={() => setAttentionTab('review')}><FoxmindIcon name="clipboard"/>Entregas<span>{count('review')}</span></button>
        <button type="button" aria-pressed={attentionTab === 'queries'} onClick={() => setAttentionTab('queries')}><FoxmindIcon name="chat"/>Consultas<span>{count('queries')}</span></button>
      </div>{attentionPage.status==='ready'&&attentionPage.nextCursor?<button className="fm-home-attention-all" data-home-expand={attentionTab} disabled={busy||home.ordering[attentionTab]} onClick={()=>setPanel(attentionTab)}>Ver todas<span className="sr-only">: {attentionTab==='review'?'entregas':'consultas'}</span><FoxmindIcon name="arrow-right"/></button>:null}</div><div hidden={attentionTab !== 'review'} aria-busy={home.ordering.review}>{module('review')}</div><div hidden={attentionTab !== 'queries'} aria-busy={home.ordering.queries}>{module('queries')}</div></section> : module('pending','Mis entregas')}
    {teacher ? <HomeTeacherTools data={data} client={homeClient} onAction={onAction} onClassrooms={onClassrooms} onUnauthorized={()=>void home.refresh()} busy={busy}/> : <HomeShortcuts data={data} onAction={onAction} onClassrooms={onClassrooms} onRetry={()=>void home.retry('classrooms')} busy={busy}/>}
    </div><aside className="fm-brujula-home-rail" aria-label={teacher ? 'Organización docente' : 'Organización personal'}>
    {!teacher ? module('feedback','Mis devoluciones') : null}<HomeMiniagenda data={data} teacher={teacher} client={homeClient} onAction={onAction} onAgenda={onAgenda} onRetry={()=>void home.retry('agenda')} onUnauthorized={()=>void home.refresh()} busy={busy}/>{teacher ? <HomeFocus data={data} selected={focused?.classroom.id??''} selectedItem={focused} onChoose={()=>setChoosingFocus(true)} onAction={onAction} onClassrooms={onClassrooms} onRetry={()=>void (focusRoom?home.refresh():home.retry('classrooms'))} onDraftRetry={()=>void home.retry('drafts')} onDrafts={()=>setPanel('drafts')} busy={busy}/> : null}
    </aside></div>{workList?<HomeWorkList key={`${data.subjectId}:${data.generatedAt}`} data={data} client={homeClient} onClose={()=>setWorkList(false)} onAction={onAction} onUnauthorized={()=>{setWorkList(false);void home.refresh();}}/>:null}
    {teacher&&choosingFocus?<HomeRoomPicker key={data.generatedAt} data={data} client={homeClient} title="Cambiar aula en foco" onClose={()=>setChoosingFocus(false)} onClassrooms={onClassrooms} onUnauthorized={()=>{setChoosingFocus(false);void home.refresh();}} onSelect={item=>{setFocusRoom({item,source:data.modules.classrooms});setChoosingFocus(false);}}/>:null}
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
