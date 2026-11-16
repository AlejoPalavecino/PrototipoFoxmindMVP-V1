import { useEffect, useState } from 'react';
import type { AgendaItem, HomeResponse, HomeTarget } from '../../../../../../src/core/domain/index.ts';
import type { HomeClient } from '../api/home-api.ts';
import type { HomeAgendaReader } from '../api/home-api.ts';
import {readHomeDay} from '../model/home-daily-agenda.ts';
import { homeCalendarWeek, homeGreetingDate, homeAgendaTime, homeEventDuration } from '../model/home-presentation.ts';
import { HomeReferenceIcon as FoxmindIcon } from '../../../../../shared-ui/HomeReferenceIcon.tsx';
export function HomeMiniagenda({data,agendaClient,onAction,onAgenda,onUnauthorized,busy}:{data:HomeResponse;teacher:boolean;client?:HomeClient;agendaClient?:HomeAgendaReader;onAction:(target:HomeTarget)=>void;onAgenda:()=>void;onRetry:()=>void;onUnauthorized:()=>void;busy?:boolean}){
  const [upcoming,setEvents]=useState<AgendaItem[]>([]),[dates,setDates]=useState(new Set<string>()),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{
   const controller=new AbortController();setLoading(true);setFailed(false);setEvents([]);setDates(new Set());
   if(!agendaClient){setFailed(true);setLoading(false);return;}
   void readHomeDay(agendaClient,data.generatedAt,data.timeZone,controller.signal).then(result=>{setEvents(result.events);setDates(result.dates);}).catch(error=>{
    if(controller.signal.aborted)return;
    setFailed(true);if(['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','FORBIDDEN'].includes(error?.code))onUnauthorized();
   }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
   return()=>controller.abort();
  },[agendaClient,data.generatedAt,data.timeZone,data.subjectId,revision]);
  const date=new Date(data.generatedAt), parts=new Intl.DateTimeFormat('es-AR',{timeZone:data.timeZone,month:'long',day:'numeric'}).formatToParts(date), value=(type:string)=>parts.find(p=>p.type===type)?.value;
  return <section className="panel today-widget home-today day-planner" aria-labelledby="home-planner-title">
   <header className="planner-header"><div className="planner-title"><h2 id="home-planner-title">Tu día, con calma</h2><button className="text-button" onClick={onAgenda}>Ver agenda<FoxmindIcon name="arrow-right"/></button></div><div className="planner-date"><div className="planner-paper" aria-hidden="true"><span>{value('month')?.replace(/^./,letter=>letter.toUpperCase())}</span><b>{value('day')}</b></div><div className="planner-date-copy"><h3>{homeGreetingDate(data.generatedAt,data.timeZone)}</h3><p>{loading?'Cargando tu día…':failed?'Tu agenda no está disponible':upcoming.length?`${upcoming.length} ${upcoming.length===1?'evento':'eventos'} en tu día`:'Un día con espacio para vos'}</p></div><span className="planner-spark"><FoxmindIcon name="spark"/></span></div></header>
   <div className="planner-content"><nav className="planner-week" aria-label="Abrir un día en la agenda">{homeCalendarWeek(data.generatedAt,data.timeZone).map((day,index)=><a className={day.today?'is-reference':''} key={day.date} href={'/agenda?date='+day.date+'&view=day'} aria-label={'Ver agenda del '+day.date}><span>{['Lun','Mar','Mié','Jue','Vie'][index]}</span><b>{day.day}</b><i className={dates.has(day.date)?'has-events':''}/></a>)}</nav>
   {failed?<div role="alert"><p>No pudimos cargar tu agenda.</p><button onClick={()=>setRevision(value=>value+1)}>Reintentar agenda</button></div>:<><ol className="home-day-events planner-events">{upcoming.map(item=><li className="planner-event" key={item.id}><div className="planner-hours"><time>{homeAgendaTime(item,data.timeZone)}</time><span>{item.endAt?`a ${homeAgendaTime({...item,startAt:item.endAt},data.timeZone)}`:''}</span></div><button className={'planner-event-card event-'+(item.color ? ({BLUE:'blue',GREEN:'green',YELLOW:'yellow',ORANGE:'orange',PINK:'rose',PURPLE:'violet',GRAPHITE:'slate'}[item.color]) : item.source==='ACADEMIC_DEADLINE'||item.category==='CLASS'?'blue':item.category==='ACTIVITY'?'green':'orange')} disabled={busy} onClick={()=>onAction(item.target)} aria-label={'Ver evento '+item.title}><span className="planner-event-meta"><span><FoxmindIcon name={item.source==='ACADEMIC_DEADLINE'?'book':'calendar'}/>{item.source==='ACADEMIC_DEADLINE'?'Entrega':item.category==='CLASS'?'Clase':item.category==='ACTIVITY'?'Actividad':item.category==='EVALUATION'?'Evaluación':'Personal'}</span>{!item.allDay && item.startAt && item.endAt ? <small>{homeEventDuration(item.startAt,item.endAt)}</small> : null}</span><b>{item.title}</b><FoxmindIcon name="chevron-right" className="planner-event-arrow"/></button></li>)}</ol>{!upcoming.length?<div className="planner-empty"><FoxmindIcon name="calendar"/><h3>{loading?'Cargando los eventos de hoy…':'Un espacio para lo que te gusta.'}</h3><p>Agendá un repaso, una idea o un momento para vos.</p></div>:null}</>}
   <footer className="day-footer planner-footer"><a className="button full" href="/agenda?create=1"><FoxmindIcon name="plus"/>Crear un evento</a></footer></div>
  </section>;
}
