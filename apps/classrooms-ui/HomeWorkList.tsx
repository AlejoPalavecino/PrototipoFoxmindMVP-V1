import { useEffect, useState } from 'react';
import type { HomeResponse, HomeTarget } from '../../src/core/domain/index.ts';
import type { HomeClient } from './home-api.ts';
import { Dialog } from './components.tsx';
import { HomeRow } from './HomeRow.tsx';
import type { HomeRowItem } from './home-labels.ts';

type WorkModule='pending'|'submitted'|'feedback';
export function HomeWorkList({data,client,onClose,onAction,onUnauthorized}:{data:HomeResponse;client?:HomeClient;onClose:()=>void;onAction:(target:HomeTarget)=>void;onUnauthorized:()=>void}){
  return <Dialog title="Mis entregas" onClose={onClose} className="fm-brujula-work-list">
    <HomeWorkGroup name="pending" data={data} client={client} onAction={onAction} onUnauthorized={onUnauthorized}/>
    <HomeWorkGroup name="submitted" data={data} client={client} onAction={onAction} onUnauthorized={onUnauthorized}/>
    <HomeWorkGroup name="feedback" data={data} client={client} onAction={onAction} onUnauthorized={onUnauthorized}/>
  </Dialog>;
}
function HomeWorkGroup({name,data,client,onAction,onUnauthorized}:{name:WorkModule;data:HomeResponse;client?:HomeClient;onAction:(target:HomeTarget)=>void;onUnauthorized:()=>void}){
  const original=data.modules[name], [items,setItems]=useState<HomeRowItem[]>(original?.status==='ready'?original.items:[]);
  const [cursor,setCursor]=useState(original?.status==='ready'?original.nextCursor:null),[busy,setBusy]=useState(false),[error,setError]=useState(original?.status==='error'?'No pudimos cargar esta lista.':'');
  const [controller]=useState(()=>new AbortController());
  useEffect(()=>()=>controller.abort(),[controller]);
  async function more(){
    if(!client||busy)return;setBusy(true);setError('');
    try{
      const result=await client.page({module:name,timeZone:data.timeZone,cursor},controller.signal);
      if(controller.signal.aborted)return;
      if(result.subjectId!==data.subjectId){onUnauthorized();return;}
      if(result.page.status!=='ready')throw new Error();
      const next=result.page;setItems(old=>[...old,...next.items.filter(item=>!old.some(previous=>previous.id===item.id))]);setCursor(next.nextCursor);
    }catch(failure){if(controller.signal.aborted)return;if(['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','FORBIDDEN'].includes((failure as {code?:string}).code??'')){onUnauthorized();return;}setError('No pudimos cargar esta lista. Intentá nuevamente.');}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  const groups=name==='pending'?[{title:'Pendientes',rows:items.filter(item=>'reception' in item&&item.reception==='open')},{title:'Plazo cerrado',rows:items.filter(item=>'reception' in item&&item.reception==='closed')}]:[{title:name==='submitted'?'Entregadas, en revisión':'Con devolución',rows:items}];
  return <div className="fm-brujula-work-group" aria-busy={busy}>{groups.map(group=><section key={group.title}><h3>{group.title}</h3>{group.rows.length?<ul>{group.rows.map(item=><HomeRow key={item.id} item={item} module={name} timeZone={data.timeZone} onAction={onAction} busy={busy}/>)}</ul>:!error?<p className="fm-home-empty">No hay actividades en esta sección.</p>:null}</section>)}
    {error?<p role="alert">{error}</p>:null}{client&&(cursor||error)?<button disabled={busy} onClick={()=>void more()}>{error?'Reintentar':busy?'Cargando…':'Cargar más'}</button>:null}
  </div>;
}
