import {useRef,useState} from 'react';
import {seriesSchedules,type PrivateEvent} from '../../../../../../src/core/domain/agenda/index.ts';
import {Dialog,Notice} from '../../../../../shared-ui/feedback.tsx';
import {FoxmindIcon} from '../../../../../shared-ui/index.ts';
import type {AgendaClient} from '../api/api.ts';
import {categoryLabels} from '../model/calendar.ts';

export function EventDetails({api,event,occurrenceDate,onBack,onEdit,onRemoved}:{
 api:AgendaClient;event:PrivateEvent;occurrenceDate:string;onBack:()=>void;onEdit:(scope:'single'|'series')=>void;onRemoved:()=>void;
}){
 const [menu,setMenu]=useState<'edit'|'remove'|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 function edit(scope:'single'|'series'){setMenu(null);onEdit(scope);}
 const locked=useRef(false),exception=event.exceptions?.find(item=>item.date===occurrenceDate);
 const schedule=seriesSchedules(event).find(item=>(item.kind==='ALL_DAY'?item.startDate:item.startLocal.slice(0,10))===occurrenceDate);
 const value=exception?.replacement??{...event,schedule:schedule??event.schedule};
 const date=value.schedule.kind==='ALL_DAY'?value.schedule.startDate:value.schedule.startLocal.slice(0,10);
 const dateLabel=new Intl.DateTimeFormat('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
 async function remove(scope:'single'|'series'){
  if(locked.current)return;locked.current=true;setBusy(true);setError('');
  try{if(scope==='single'&&event.repeat.kind!=='NONE'){
   if(!api.changeOccurrence)throw Error('No pudimos eliminar este evento. Volvé a consultar tu agenda.');
   await api.changeOccurrence(event.id,event.revision,occurrenceDate,null);
  }else await api.remove(event.id,event.revision);onRemoved();}
  catch(error){setError((error as Error).message);}finally{locked.current=false;setBusy(false);}
 }
 return <>
  <nav className="agenda-location" aria-label="Ubicación"><a href="/inicio">Inicio</a><FoxmindIcon name="chevron-right"/><button onClick={onBack}>Agenda</button><FoxmindIcon name="chevron-right"/><span>Evento personal</span></nav>
  <header className="agenda-header brujula-agenda-heading"><div><span className="agenda-eyebrow">Agenda · Evento personal</span><h1>{value.title}</h1><p>{dateLabel.charAt(0).toUpperCase()+dateLabel.slice(1)}</p></div><button onClick={onBack}><FoxmindIcon name="arrow-left"/>Volver a la agenda</button></header>
  {exception?.replacement===null||!schedule ? <Notice>Este evento ya no está disponible. <button onClick={onBack}>Volver a la agenda</button></Notice> : <section className="brujula-event-details">
   <small><FoxmindIcon name="lock"/>Solo para vos</small><h2>Detalles del evento</h2>
   <dl><dt>Tipo</dt><dd>{categoryLabels[value.category]}</dd><dt>Horario</dt><dd>{value.schedule.kind==='ALL_DAY'?'Todo el día':`${value.schedule.startLocal.slice(11)} – ${value.schedule.endLocal.slice(11)}`}</dd><dt>Repetición</dt><dd>{{NONE:'Sin repetición',DAILY:'Diariamente',WEEKLY:'Semanalmente',MONTHLY:'Mensualmente'}[event.repeat.kind]}</dd>{value.description?<><dt>Notas</dt><dd className="p7-multiline">{value.description}</dd></>:null}</dl>
   <footer><button className="danger" onClick={()=>setMenu('remove')}>Eliminar evento</button><button className="primary" onClick={()=>event.repeat.kind==='NONE'?edit('series'):setMenu('edit')}><FoxmindIcon name="edit"/>Editar evento</button></footer>
  </section>}
  {menu ? <Dialog title={menu==='remove'?'Eliminar evento':'Editar evento recurrente'} onClose={()=>{if(!busy)setMenu(null);}}><div className="brujula-event-scope"><p>{value.title} · {dateLabel}</p><h3>{menu==='remove'?'¿Qué querés eliminar?':'¿Qué querés editar?'}</h3>{error?<Notice error>{error}<button onClick={onBack}>Volver a consultar la agenda</button></Notice>:null}
   <button disabled={busy} onClick={()=>menu==='remove'?void remove('single'):edit('single')}>Solo este evento</button>{event.repeat.kind!=='NONE'?<button disabled={busy} onClick={()=>menu==='remove'?void remove('series'):edit('series')}>Toda la serie</button>:null}<button disabled={busy} onClick={()=>setMenu(null)}>Cancelar</button>
  </div></Dialog>:null}
 </>;
}
