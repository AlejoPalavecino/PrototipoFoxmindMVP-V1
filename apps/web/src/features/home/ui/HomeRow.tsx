import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { HomeCover } from './HomeCover.tsx';
import { homeLabels, homeTime, type HomeRowItem, type HomeAction } from '../model/home-labels.ts';
import type { PendingItem, FeedbackItem, HomeModuleName } from '../../../../../../src/core/domain/index.ts';
import { homeAgendaDate, homeAgendaTime } from '../model/home-presentation.ts';
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
    {'submittedAt' in item?<span>Intento {item.attemptNumber} · Entregada {homeTime(item.submittedAt,timeZone)} · En revisión</span>:null}
  </div>;
}
export function HomeRow({item,module,timeZone,onAction,busy,featured=false}:{item:HomeRowItem;module:HomeModuleName;timeZone:string;onAction:HomeAction;busy?:boolean;featured?:boolean}) {
  if(module==='pending'&&'reception' in item)return <PendingHomeRow item={item} timeZone={timeZone} onAction={onAction} busy={busy} featured={featured}/>;
  if(module==='feedback' && 'finalGrade' in item)return <FeedbackHomeRow item={item} timeZone={timeZone} onAction={onAction} busy={busy}/>;
  const nextTopic=module==='classrooms' && 'nextTopic' in item?item.nextTopic:null;
  const target=nextTopic && item.classroom?{kind:'classroom' as const,classroomId:item.classroom.id,section:'plan' as const,topicId:nextTopic.topicId}:item.target;
  const action = nextTopic?'Abrir tema':'reception' in item
    ? item.reception==='closed'?'Consultar actividad':item.attemptId?'Continuar borrador':'Empezar'
    : 'studentName' in item ? 'Corregir' : module === 'feedback' ? 'Leer devolución' : homeLabels[module].action;
  return <li className={`fm-home-row fm-home-row--${module}${featured?' fm-home-row--featured':''}`}>
    {'source' in item?<AgendaDate item={item} timeZone={timeZone}/>:module==='classrooms' && item.classroom?<HomeCover coverKey={item.classroom.coverKey}/>:<span className="fm-brujula-row-glyph">{'studentName' in item && item.studentName ? item.studentName.split(/\s+/).slice(0,2).map(word=>word[0]).join('') : <FoxmindIcon name={module==='queries'?'chat':module==='feedback'?'check':module==='drafts'?'notebook-pen':'file'}/>}</span>}
    <div className="fm-home-row-copy"><h3>{'studentName' in item ? item.studentName : item.title}</h3>
      {'studentName' in item ? <span>{item.title} · {item.classroom.name} · {item.classroom.division}</span> : null}
      {module==='classrooms' && item.classroom?<span className="fm-home-room-label">{item.classroom.division}{item.classroom.archived?' · Archivada · Solo lectura':''}</span>:module==='drafts'&&item.classroom?<span>{item.classroom.name} · {item.classroom.division}</span>:'studentName' in item?null:<RowDetails item={item} timeZone={timeZone}/>}
      {module==='classrooms' && item.classroom?<span className={`fm-home-classroom-role fm-home-classroom-role--${item.classroom.role}`}>{item.classroom.role==='teacher'?'Enseño':'Estudio'}</span>:null}</div>
    {module==='classrooms' && item.classroom?.role==='teacher' && !item.classroom.archived?<HomePlanProgress title={item.title} progress={'planProgress' in item?item.planProgress:undefined}/>:null}
    {nextTopic?<div className="fm-brujula-next-topic"><small>Próximo tema · {nextTopic.unitName}</small><strong>{nextTopic.topicName}</strong><button disabled={busy} className="fm-home-topic-action" onClick={()=>onAction(target)} aria-label={`Abrir tema: ${nextTopic.topicName}`}>Abrir tema<span><FoxmindIcon name="arrow-right"/></span></button></div>:null}
    {!nextTopic?<div className="fm-brujula-row-end">{'oldestSubmittedAt' in item?<small>{homeTime(item.oldestSubmittedAt,timeZone)}</small>:null}<button disabled={busy} className="fm-home-row-action" onClick={()=>onAction(target)} aria-label={`${action}: ${item.title}`}>
      {module==='drafts'?'Continuar':action}<FoxmindIcon name="arrow-right"/>
    </button></div>:null}
  </li>;
}

function HomePlanProgress({title,progress}:{title:string;progress?:{taught:number;total:number}}) {
  if(!progress || progress.total===0)return <p className="fm-home-plan-empty">{progress?'Plan sin temas todavía':'Avance no disponible'}</p>;
  const percent=Math.round(progress.taught/progress.total*100),label=`${progress.taught} de ${progress.total} temas dados`;
  return <div className="fm-home-plan-progress">
    <small className="fm-brujula-plan-label">Avance del plan</small>
    <div className="fm-home-progress-ring" role="progressbar" aria-label={`Avance del plan de ${title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={label}>
      <span className="fm-brujula-progress-track" aria-hidden="true"><i style={{width:`${percent}%`}}/></span>
      <strong aria-hidden="true">{percent}%</strong>
    </div><span>{label}</span>
  </div>;
}

function AgendaDate({item,timeZone}:{item:Extract<HomeRowItem,{source:string}>;timeZone:string}) {
  const date=homeAgendaDate(item,timeZone);
  return <time className="fm-home-agenda-date" dateTime={date.dateTime}><span>{date.weekday}</span><strong>{date.day}</strong><small>{date.month}</small></time>;
}

export function HomeAgendaRow({item,timeZone,onAction,busy,generatedAt=new Date().toISOString(),dateInTileOnly=false}:{item:Extract<HomeRowItem,{source:string}>;timeZone:string;onAction:HomeAction;busy?:boolean;generatedAt?:string;dateInTileOnly?:boolean}) {
  const date = (value:string)=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const today=date(generatedAt),tomorrow=date(new Date(Date.parse(generatedAt)+86400000).toISOString());
  const day=item.allDay?item.date:date(item.startAt!);
  const relative=day===today?'Hoy':day===tomorrow?'Mañana':new Intl.DateTimeFormat('es-AR',{timeZone:item.allDay?'UTC':timeZone,day:'numeric',month:'short'}).format(new Date(item.allDay?item.date+'T12:00Z':item.startAt!));
  return <li className="fm-home-row fm-home-row--agenda" data-source={item.source}>
    <AgendaDate item={item} timeZone={timeZone}/>
    <div className="fm-home-row-copy"><h3>{item.title}</h3>
      <div className="fm-home-agenda-time"><span>{dateInTileOnly?homeAgendaTime(item,timeZone):<>{relative} · {homeAgendaTime(item,timeZone)}</>}</span></div>
      {item.source==='ACADEMIC_DEADLINE'&&item.classroom?<div className="fm-home-agenda-meta">{item.classroom.name} · {item.classroom.division}</div>:null}
    </div>
    <button disabled={busy} className="fm-home-agenda-action" onClick={()=>onAction(item.target)} aria-label={`Abrir: ${item.title}`}><FoxmindIcon name="chevron-right"/></button>
  </li>;
}

function PendingHomeRow({item,timeZone,onAction,busy,featured}:{item:PendingItem;timeZone:string;onAction:HomeAction;busy?:boolean;featured:boolean}){
 const label=item.reception==='closed'?'Ver consigna':item.attemptId?'Retomar borrador':item.activityType==='ASSIGNMENT'?'Preparar entrega':'Responder actividad';
 const target=item.target.kind==='activity'&&item.reception==='open'?{...item.target,mode:'respond' as const}:item.target;
 const date=item.deadlineAt?homeTime(item.deadlineAt,timeZone):'Sin fecha límite';
 return <li className={`fm-home-pending-item${featured?' featured':''}`}>
  <span className="fm-home-pending-icon"><FoxmindIcon name={item.activityType==='ASSIGNMENT'?'notebook-pen':item.activityType==='QUESTIONNAIRE'?'list-checks':'clipboard'}/></span>
  <div className="fm-home-pending-title"><small>{item.classroom.name} · {item.classroom.division}</small><h3>{item.title}</h3>{!featured&&item.questionProgress&&item.attemptId?<small>{item.questionProgress.answered} de {item.questionProgress.total} preguntas respondidas</small>:null}</div>
  <div className="fm-home-pending-date"><span><FoxmindIcon name="calendar"/>{date}</span>{featured?<small>{{ASSIGNMENT:'Trabajo práctico',QUESTIONNAIRE:'Cuestionario',EVALUATION:'Evaluación'}[item.activityType]}</small>:item.attemptId?<small>Borrador guardado</small>:null}</div>
  <div className="fm-home-pending-actions"><button className={featured?'primary':undefined} disabled={busy} onClick={()=>onAction(target)} aria-label={`${label}: ${item.title}`}>{featured?label:<span className="sr-only">{label}</span>}<FoxmindIcon name="arrow-right"/></button>{featured&&item.reception==='open'?<button disabled={busy} onClick={()=>onAction(item.target)}>Ver consigna</button>:null}</div>
 </li>;
}
function FeedbackHomeRow({item,onAction,busy}:{item:FeedbackItem;timeZone:string;onAction:HomeAction;busy?:boolean}){
 return <li className="fm-brujula-feedback"><div><small>{item.classroom.name} · Intento {item.attemptNumber}</small><h3>{item.title}</h3></div><strong className="fm-brujula-grade">{Number(item.finalGrade).toLocaleString('es-AR',{maximumFractionDigits:2})} / 10</strong><p>{item.overallFeedback||'Tu devolución ya está disponible.'}</p><button className="fm-home-row-action" disabled={busy} onClick={()=>onAction(item.target)} aria-label={`Leer devolución: ${item.title}`}>Leer devolución<FoxmindIcon name="arrow-right"/></button></li>;
}
