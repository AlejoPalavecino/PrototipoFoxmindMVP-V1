import type { ReactNode } from 'react';
import type { HomeModuleName, HomeModules } from '../../../../../../src/core/domain/home/home.ts';
import { homeLabels, type HomeAction } from '../model/home-labels.ts';
import { HomeAgendaRow, HomeRow } from './HomeRow.tsx';
import { homeReviewSummary, homeCalendarWeek } from '../model/home-presentation.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
const moduleIcons={pending:'clock',review:'clipboard',feedback:'check',agenda:'calendar',queries:'chat',materials:'folder',classrooms:'book',drafts:'edit',submitted:'clock'} as const;
export function HomeModule({name,page,timeZone,onAction,onRetry,onExpand,onAgenda,onList,busy,title,generatedAt,previewLimit,headerAction}:{
  name:HomeModuleName;page:HomeModules[HomeModuleName];timeZone:string;onAction:HomeAction;
  onRetry:()=>void;onExpand?:()=>void;onAgenda?:()=>void;onList?:()=>void;busy?:boolean;title?:string;generatedAt?:string;previewLimit?:number;headerAction?:ReactNode;
}) {
  if(page.status==='not-applicable')return null;
  const label={...homeLabels[name],title:title??homeLabels[name].title};
  return <section className={`fm-home-module fm-home-module--${name}`} aria-label={label.title}>
    <header><FoxmindIcon name={moduleIcons[name]}/><div>{name==='pending'||name==='feedback'?<small className="fm-brujula-module-kicker">{name==='pending'?'Actividades':'Resultados publicados'}</small>:null}<h2>{label.title}</h2></div>{name==='feedback'?<span className="fm-brujula-feedback-icon"><FoxmindIcon name="chat"/></span>:name==='drafts'?<FoxmindIcon name="lock"/>:!['agenda','pending','feedback'].includes(name) && page.status==='ready' && page.totalItems!==null?<span className="fm-home-count">{name==='review' ? `${page.totalItems} ${page.totalItems === 1 ? 'entrega' : 'entregas'}` : page.totalItems}</span>:null}
      {headerAction}
      {name==='agenda' && onAgenda?<button className="fm-home-agenda-link" onClick={onAgenda}>Abrir agenda<FoxmindIcon name="arrow-right"/></button>:null}
      {onList?<button className="fm-brujula-work-list-link" onClick={onList}>Ver listado<FoxmindIcon name="arrow-right"/></button>:null}
      {!onList && page.status==='ready' && (page.nextCursor || previewLimit!==undefined && page.items.length>previewLimit) && onExpand?<button data-home-expand={name} onClick={onExpand}>Ver todas<span className="sr-only">: {label.title}</span></button>:null}</header>
    {name==='drafts'?<p className="fm-home-hint">Solo visibles para vos</p>:null}
    {name==='agenda' && generatedAt?<div className="fm-home-week" aria-label="Semana actual">
      {homeCalendarWeek(generatedAt,timeZone).map((day,index)=><div key={day.date}>
        <span aria-hidden="true">{['L','M','M','J','V','S','D'][index]}</span>
        <time dateTime={day.date} aria-current={day.today?'date':undefined}
          aria-label={new Intl.DateTimeFormat('es-AR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(new Date(day.date+'T12:00:00Z'))}>{day.day}</time>
      </div>)}
    </div>:null}
    {name==='agenda'?<p className="fm-home-hint">Próximos eventos</p>:null}
    {name==='review' && page.status==='ready' && 'totals' in page && page.totals?<dl className="fm-home-review-stats" aria-label={homeReviewSummary(page.totals)}>
      <div><dt>Entregas</dt><dd>{page.totals.attempts}</dd></div>
      <div><dt>Por revisar</dt><dd>{page.totals.needsReview}</dd></div>
      <div><dt>Para publicar</dt><dd>{page.totals.readyToPublish}</dd></div>
    </dl>:null}
    {page.status==='error'?<div className="fm-home-module-error" role="status"><p>No pudimos cargar {label.title.toLowerCase()}.</p><button onClick={onRetry} disabled={busy}>Reintentar {label.title.toLowerCase()}</button></div>:
      page.items.length&&name==='pending'?<><ul><HomeRow key={page.items[0].id} item={page.items[0]} module={name} featured timeZone={timeZone} onAction={onAction} busy={busy}/></ul>{page.items.length>1?<><h3 className="fm-home-following-heading">Siguientes entregas</h3><ul>{page.items.slice(1,previewLimit).map(item=><HomeRow key={item.id} item={item} module={name} timeZone={timeZone} onAction={onAction} busy={busy}/>)}</ul></>:null}</>:page.items.length?<ul>{page.items.slice(0,previewLimit).map((item,index)=>'source' in item && name==='agenda'?<HomeAgendaRow key={item.id} item={item} timeZone={timeZone} onAction={onAction} busy={busy}/>:<HomeRow key={item.id} item={item} module={name} featured={name==='pending' && index===0} timeZone={timeZone} onAction={onAction} busy={busy}/>)}</ul>:<p className="fm-home-empty">{label.empty}</p>}
  </section>;
}
