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
export function HomeRow({item,module,timeZone,onAction,busy,featured=false}:{item:HomeRowItem;module:HomeModuleName;timeZone:string;onAction:HomeAction;busy?:boolean;featured?:boolean}) {
  const action = 'reception' in item
    ? item.reception==='closed'?'Consultar actividad':item.attemptId?'Continuar':'Empezar'
    : homeLabels[module].action;
  return <li className={`fm-home-row fm-home-row--${module}${featured?' fm-home-row--featured':''}`}>
    {'source' in item?<AgendaDate item={item} timeZone={timeZone}/>:item.classroom?<HomeCover coverKey={item.classroom.coverKey}/>:
      <span className="fm-home-event-icon"><FoxmindIcon name="calendar"/></span>}
    <div className="fm-home-row-copy"><h3>{item.title}</h3>
      {module==='classrooms' && item.classroom?<span className="fm-home-room-label">{item.classroom.division}{item.classroom.archived?' · Archivada · Solo lectura':''}</span>:<RowDetails item={item} timeZone={timeZone}/>}
      {module==='classrooms' && item.classroom?<span className={`fm-home-classroom-role fm-home-classroom-role--${item.classroom.role}`}>{item.classroom.role==='teacher'?'Enseño':'Estudio'}</span>:null}</div>
    {module==='classrooms' && item.classroom?.role==='teacher' && !item.classroom.archived?<HomePlanProgress title={item.title} progress={'planProgress' in item?item.planProgress:undefined}/>:null}
    <button disabled={busy} className="fm-home-row-action" onClick={()=>onAction(item.target)} aria-label={`${action}: ${item.title}`}>
      {action}<FoxmindIcon name="arrow-right"/>
    </button>
  </li>;
}

function HomePlanProgress({title,progress}:{title:string;progress?:{taught:number;total:number}}) {
  if(!progress || progress.total===0)return <p className="fm-home-plan-empty">{progress?'Plan sin temas todavía':'Avance no disponible'}</p>;
  const percent=Math.round(progress.taught/progress.total*100),label=`${progress.taught} de ${progress.total} temas dados`;
  return <div className="fm-home-plan-progress">
    <div className="fm-home-progress-ring" role="progressbar" aria-label={`Avance del plan de ${title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={label}>
      <svg viewBox="0 0 64 64" aria-hidden="true"><circle className="fm-home-ring-track" cx="32" cy="32" r="27"/>{percent>0?<circle className="fm-home-ring-value" cx="32" cy="32" r="27" pathLength="100" strokeDasharray={`${percent} 100`} transform="rotate(-90 32 32)"/>:null}</svg>
      <strong aria-hidden="true">{percent}%</strong>
    </div><span>{label}</span>
  </div>;
}

function AgendaDate({item,timeZone}:{item:Extract<HomeRowItem,{source:string}>;timeZone:string}) {
  const date=homeAgendaDate(item,timeZone);
  return <time className="fm-home-agenda-date" dateTime={date.dateTime}><span>{date.weekday}</span><strong>{date.day}</strong><small>{date.month}</small></time>;
}

export function HomeAgendaRow({item,timeZone,onAction,busy}:{item:Extract<HomeRowItem,{source:string}>;timeZone:string;onAction:HomeAction;busy?:boolean}) {
  return <li className="fm-home-row fm-home-row--agenda">
    <AgendaDate item={item} timeZone={timeZone}/>
    <div className="fm-home-row-copy"><h3>{item.title}</h3>
      <div className="fm-home-agenda-time"><FoxmindIcon name="clock"/><span>{homeAgendaTime(item,timeZone)}</span></div>
      <div className="fm-home-agenda-meta">{item.source==='PRIVATE_EVENT'?'Evento personal':'Plazo académico'}</div>
    </div>
    <button disabled={busy} className="fm-home-agenda-action" onClick={()=>onAction(item.target)} aria-label={`Abrir: ${item.title}`}><FoxmindIcon name="chevron-right"/></button>
  </li>;
}
