import { FoxmindIcon } from '../shared-ui/index.ts';
import { HomeCover } from './HomeCover.tsx';
import { homeLabels,homeTime,type HomeRowItem,type HomeAction } from './home-labels.ts';
import type { HomeModuleName } from '../../src/core/domain/index.ts';
import { homeAgendaDate,homeAgendaTime } from './home-presentation.ts';
function RowDetails({item,timeZone}:{item:HomeRowItem;timeZone:string}) {
  return <div className="fm-home-row-detail">
    {item.classroom?<span className="fm-home-room-label">{item.classroom.name} · {item.classroom.division}{item.classroom.archived?' · Archivada · Solo lectura':''}</span>:null}
    {'deadlineAt' in item?<><span>{item.state==='resubmission'?'Reentrega habilitada':'Primera entrega'} · {item.late?'Plazo vencido':'Pendiente'}</span>
      <span>{item.deadlineAt?`Plazo: ${homeTime(item.deadlineAt,timeZone)}`:'Sin fecha límite'}{item.reception==='closed'?' · Recepción cerrada. Puedes consultar la actividad.':''}</span></>:null}
    {'needsReview' in item?<span>{item.needsReview} por revisar · {item.readyToPublish} {item.readyToPublish===1?'lista':'listas'} para publicar</span>:null}
    {'finalGrade' in item?<span>Nota {item.finalGrade} · Intento {item.attemptNumber} · Disponible<br/>Publicada {homeTime(item.publishedAt,timeZone)}</span>:null}
    {'source' in item?<span>{item.source==='PRIVATE_EVENT'?'Evento personal':'Plazo académico'} · {item.allDay?`${item.date} · Todo el día`:homeTime(item.startAt!,timeZone)}
      {item.timeZone!==timeZone?<small className="fm-home-original-zone">Zona original: {item.timeZone}</small>:null}</span>:null}
    {'extension' in item?<span>{item.extension.toUpperCase()} · Publicado {homeTime(item.publishedAt,timeZone)}</span>:null}
    {'updatedAt' in item?<span>Actualizada {homeTime(item.updatedAt,timeZone)}</span>:null}
  </div>;
}
export function HomeRow({item,module,timeZone,onAction,busy}:{item:HomeRowItem;module:HomeModuleName;timeZone:string;onAction:HomeAction;busy?:boolean}) {
  return <li className={`fm-home-row fm-home-row--${module}`}>
    {'source' in item?<AgendaDate item={item} timeZone={timeZone}/>:item.classroom?<HomeCover coverKey={item.classroom.coverKey}/>:
      <span className="fm-home-event-icon"><FoxmindIcon name="calendar"/></span>}
    <div className="fm-home-row-copy"><h3>{item.title}</h3>
      {module==='classrooms' && item.classroom?<span className="fm-home-room-label">{item.classroom.division}{item.classroom.archived?' · Archivada · Solo lectura':''}</span>:<RowDetails item={item} timeZone={timeZone}/>}
      {module==='classrooms' && item.classroom?<span className={`fm-home-classroom-role fm-home-classroom-role--${item.classroom.role}`}>{item.classroom.role==='teacher'?'Enseño':'Estudio'}</span>:null}</div>
    <button disabled={busy} className="fm-home-row-action" onClick={()=>onAction(item.target)} aria-label={`${'reception' in item && item.reception==='closed'?'Consultar actividad':homeLabels[module].action}: ${item.title}`}>
      {'reception' in item && item.reception==='closed'?'Consultar actividad':homeLabels[module].action}<FoxmindIcon name="arrow-right"/>
    </button>
  </li>;
}

function AgendaDate({item,timeZone}:{item:Extract<HomeRowItem,{source:string}>;timeZone:string}) {
  const date=homeAgendaDate(item,timeZone);
  return <time className="fm-home-agenda-date" dateTime={date.dateTime}><span>{date.weekday}</span><strong>{date.day}</strong><small>{date.month}</small></time>;
}

export function HomeAgendaRow({item,timeZone,onAction,busy}:{item:Extract<HomeRowItem,{source:string}>;timeZone:string;onAction:HomeAction;busy?:boolean}) {
  return <li className="fm-home-row fm-home-row--agenda">
    <AgendaDate item={item} timeZone={timeZone}/>
    <div className="fm-home-row-copy"><h3>{item.title}</h3>
      {item.classroom?<span className="fm-home-room-label">{item.classroom.name} · {item.classroom.division}{item.classroom.archived?' · Archivada · Solo lectura':''}</span>:null}
      <div className="fm-home-agenda-time"><FoxmindIcon name="clock"/><span>{homeAgendaTime(item,timeZone)}</span></div>
      <div className="fm-home-agenda-meta">{item.source==='PRIVATE_EVENT'?'Evento personal':'Plazo académico'}
        {item.timeZone!==timeZone?` · Zona original: ${item.timeZone}`:null}</div>
    </div>
    <button disabled={busy} className="fm-home-agenda-action" onClick={()=>onAction(item.target)} aria-label={`Abrir: ${item.title}`}><FoxmindIcon name="chevron-right"/></button>
  </li>;
}
