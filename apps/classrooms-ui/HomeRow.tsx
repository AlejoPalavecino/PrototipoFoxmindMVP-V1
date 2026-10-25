import { FoxmindIcon } from '../shared-ui/index.ts';
import { HomeCover } from './HomeCover.tsx';
import { homeLabels,homeTime,type HomeRowItem,type HomeAction } from './home-labels.ts';
import type { HomeModuleName } from '../../src/core/domain/index.ts';
function RowDetails({item,timeZone}:{item:HomeRowItem;timeZone:string}) {
  return <div className="fm-home-row-detail">
    {item.classroom?<span className="fm-home-room-label">{item.classroom.name} · {item.classroom.division}{item.classroom.archived?' · Archivada · Solo lectura':''}</span>:null}
    {'deadlineAt' in item?<><span>{item.state==='resubmission'?'Reentrega habilitada':'Primera entrega'} · {item.late?'Plazo vencido':'Pendiente'}</span>
      <span>{item.deadlineAt?`Plazo: ${homeTime(item.deadlineAt,timeZone)}`:'Sin fecha límite'}{item.reception==='closed'?' · Recepción cerrada. Puedes consultar la actividad.':''}</span></>:null}
    {'needsReview' in item?<span>{item.needsReview} por revisar · {item.readyToPublish} listas para publicar</span>:null}
    {'finalGrade' in item?<span>Nota {item.finalGrade} · Intento {item.attemptNumber} · Disponible<br/>Publicada {homeTime(item.publishedAt,timeZone)}</span>:null}
    {'source' in item?<span>{item.source==='PRIVATE_EVENT'?'Evento personal':'Plazo académico'} · {item.allDay?`${item.date} · Todo el día`:homeTime(item.startAt!,timeZone)}
      {item.timeZone!==timeZone?` · Zona original: ${item.timeZone}`:''}</span>:null}
    {'extension' in item?<span>{item.extension.toUpperCase()} · Publicado {homeTime(item.publishedAt,timeZone)}</span>:null}
    {'updatedAt' in item?<span>Actualizada {homeTime(item.updatedAt,timeZone)}</span>:null}
  </div>;
}
export function HomeRow({item,module,timeZone,onAction,busy}:{item:HomeRowItem;module:HomeModuleName;timeZone:string;onAction:HomeAction;busy?:boolean}) {
  return <li className={`fm-home-row fm-home-row--${module}`}>
    {item.classroom?<HomeCover coverKey={item.classroom.coverKey}/>:
      <span className="fm-home-event-icon"><FoxmindIcon name="calendar"/></span>}
    <div className="fm-home-row-copy"><h3>{item.title}</h3><RowDetails item={item} timeZone={timeZone}/></div>
    <button disabled={busy} className="fm-home-row-action" onClick={()=>onAction(item.target)} aria-label={`${'reception' in item && item.reception==='closed'?'Consultar actividad':homeLabels[module].action}: ${item.title}`}>
      {'reception' in item && item.reception==='closed'?'Consultar actividad':homeLabels[module].action}<FoxmindIcon name="arrow-right"/>
    </button>
  </li>;
}
