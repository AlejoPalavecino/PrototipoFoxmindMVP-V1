import type { HomeModuleName,HomeModules } from '../../src/core/domain/index.ts';
import { homeLabels,type HomeAction } from './home-labels.ts';
import { HomeRow } from './HomeRow.tsx';
import { FoxmindIcon } from '../shared-ui/index.ts';
export function HomeModule({name,page,timeZone,onAction,onRetry,onExpand,onAgenda,busy}:{
  name:HomeModuleName;page:HomeModules[HomeModuleName];timeZone:string;onAction:HomeAction;
  onRetry:()=>void;onExpand?:()=>void;onAgenda?:()=>void;busy?:boolean;
}) {
  if(page.status==='not-applicable')return null;
  const label=homeLabels[name];
  return <section className={`fm-home-module fm-home-module--${name}`} aria-label={label.title}>
    <header><h2>{label.title}</h2>{page.status==='ready' && page.totalItems!==null?<span className="fm-home-count">{page.totalItems} {name==='review'?'actividades':''}</span>:null}
      {name==='agenda' && onAgenda?<button className="fm-home-agenda-link" onClick={onAgenda}>Abrir Agenda<FoxmindIcon name="arrow-right"/></button>:null}
      {page.status==='ready' && page.nextCursor && onExpand?<button data-home-expand={name} onClick={onExpand}>Ver todas<span className="sr-only">: {label.title}</span></button>:null}</header>
    {name==='agenda'?<p className="fm-home-hint">Próximos 90 días · Zona {timeZone}</p>:null}
    {name==='review' && page.status==='ready' && 'totals' in page && page.totals?<p className="fm-home-hint">{page.totals.attempts} entregas · {page.totals.needsReview} por revisar · {page.totals.readyToPublish} listas para publicar</p>:null}
    {page.status==='error'?<div className="fm-home-module-error" role="status"><p>No pudimos cargar {label.title.toLowerCase()}.</p><button onClick={onRetry} disabled={busy}>Reintentar {label.title.toLowerCase()}</button></div>:
      page.items.length?<ul>{page.items.map(item=><HomeRow key={item.id} item={item} module={name} timeZone={timeZone} onAction={onAction} busy={busy}/>)}</ul>:<p className="fm-home-empty">{label.empty}</p>}
  </section>;
}
