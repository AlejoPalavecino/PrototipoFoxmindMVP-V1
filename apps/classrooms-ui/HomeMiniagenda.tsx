import { useEffect, useState } from 'react';
import type { AgendaItem,HomeResponse,HomeTarget } from '../../src/core/domain/index.ts';
import type { HomeClient } from './home-api.ts';
import { HomeAgendaRow } from './HomeRow.tsx';
import { FoxmindIcon } from '../shared-ui/index.ts';
export function HomeMiniagenda({data,teacher,client,onAction,onAgenda,onRetry,onUnauthorized,busy}:{data:HomeResponse;teacher:boolean;client?:HomeClient;onAction:(target:HomeTarget)=>void;onAgenda:()=>void;onRetry:()=>void;onUnauthorized:()=>void;busy?:boolean}){
  const page=data.modules.agenda,[extra,setExtra]=useState<AgendaItem[]>([]),[loading,setLoading]=useState(false),[failed,setFailed]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();setExtra([]);setFailed(false);
    if(page.status!=='ready'||page.preview||!client||!page.nextCursor)return;
    const first=page.items;let cursor=page.nextCursor;
    const sufficient=(items:AgendaItem[])=>items.filter(item=>item.source==='PRIVATE_EVENT').length>=2&&(!teacher||items.some(item=>item.source==='ACADEMIC_DEADLINE'));
    if(sufficient(first))return;
    setLoading(true);
    void (async()=>{let accumulated=first;const seen=new Set<string>();
      try{while(cursor&&!sufficient(accumulated)){
        if(seen.has(cursor)||seen.size>=8)throw new Error();seen.add(cursor);
        const result=await client.page({module:'agenda',timeZone:data.timeZone,cursor},controller.signal);
        if(controller.signal.aborted)return;
        if(result.subjectId!==data.subjectId){onUnauthorized();return;}
        if(result.module!=='agenda'||result.page.status!=='ready')throw new Error();
        const next=result.page.items as AgendaItem[];
        accumulated=[...accumulated,...next.filter(item=>!accumulated.some(previous=>previous.id===item.id))];cursor=result.page.nextCursor??'';
        setExtra(accumulated.slice(first.length));
      }}catch(failure){if(!controller.signal.aborted){if(['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','FORBIDDEN'].includes((failure as {code?:string}).code??''))onUnauthorized();else setFailed(true);}}
      finally{if(!controller.signal.aborted)setLoading(false);}
    })();return()=>controller.abort();
  },[page,client,data.subjectId,data.timeZone,teacher]);
  if(page.status==='not-applicable')return null;
  const items=page.status==='ready'?(page.preview?[...page.preview.personal,...(page.preview.deadline?[page.preview.deadline]:[])]:[...page.items,...extra]):[],personal=items.filter(item=>item.source==='PRIVATE_EVENT').slice(0,2),due=teacher?items.filter(item=>item.source==='ACADEMIC_DEADLINE').slice(0,1):[];
  return <section className="fm-home-module fm-home-module--agenda" aria-label="Mi agenda"><header><h2>Mi agenda</h2><button className="fm-home-agenda-link" onClick={onAgenda} aria-label="Abrir agenda"><FoxmindIcon name="calendar"/></button></header>
    {page.status==='error'?<><p role="status">No pudimos cargar tu agenda.</p><button onClick={onRetry}>Reintentar agenda</button></>:<><h3 className="fm-brujula-rail-label">Eventos personales</h3>{personal.length?<ul>{personal.map(item=><HomeAgendaRow key={item.id} item={item} timeZone={data.timeZone} generatedAt={data.generatedAt} onAction={onAction} busy={busy}/>)}</ul>:<p className="fm-home-empty">{loading?'Consultando eventos personales…':page.preview?'Sin eventos personales para los próximos siete días.':'Sin próximos eventos personales.'}</p>}
    {due.length?<><h3 className="fm-brujula-rail-label">Próxima fecha de entrega</h3><ul>{due.map(item=><HomeAgendaRow key={item.id} item={item} timeZone={data.timeZone} generatedAt={data.generatedAt} onAction={onAction} busy={busy}/>)}</ul></>:null}
    {failed?<p role="status">No pudimos completar los próximos eventos. <button onClick={onRetry}>Reintentar agenda</button></p>:null}</>}
  </section>;
}
