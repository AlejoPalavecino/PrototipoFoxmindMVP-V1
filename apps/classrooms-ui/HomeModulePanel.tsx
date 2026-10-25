'use client';
import { useEffect,useRef,useState } from 'react';
import type { HomeModuleName,HomeModules,HomeResponse } from '../../src/core/domain/index.ts';
import type { HomeClient } from './home-api.ts';
import { HomeRow } from './HomeRow.tsx';
import { homeLabels,type HomeAction,type HomeRowItem } from './home-labels.ts';
export function HomeModulePanel({name,data,client,onClose,onAction,onUnauthorized}:{
  name:HomeModuleName;data:HomeResponse;client:HomeClient;onClose:()=>void;onAction:HomeAction;onUnauthorized:()=>void;
}) {
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus();},[]);
  const original=data.modules[name];
  const [items,setItems]=useState<HomeRowItem[]>(original.status==='ready'?original.items:[]);
  const [cursor,setCursor]=useState(original.status==='ready'?original.nextCursor:null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [controller]=useState(()=>new AbortController());
  useEffect(()=>()=>controller.abort(),[controller]);
  async function more() {
    if(!cursor || busy)return;setBusy(true);setError('');
    try {
      const result=await client.page({module:name,timeZone:data.timeZone,cursor},controller.signal);
      if(controller.signal.aborted)return;
      if(result.subjectId!==data.subjectId) { onUnauthorized();return; }
      if(result.page.status!=='ready')throw new Error('No pudimos cargar la siguiente página.');
      const page=result.page as Extract<HomeModules[HomeModuleName],{status:'ready'}>;
      setItems(old=>[...old,...page.items.filter(item=>!old.some(previous=>previous.id===item.id))]);setCursor(page.nextCursor);
    }catch(failure){
      if(controller.signal.aborted)return;
      if(['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','FORBIDDEN'].includes((failure as {code?:string}).code??'')){onUnauthorized();return;}
      setItems([]);setError('No pudimos cargar la siguiente página. Vuelve a Inicio para reintentar con datos actuales.');setCursor(null);
    }finally{if(!controller.signal.aborted)setBusy(false);}
  }
  return <section className="fm-home-module fm-home-panel" aria-label={`Todas: ${homeLabels[name].title}`} aria-busy={busy}>
    <header><h2 ref={heading} tabIndex={-1}>{homeLabels[name].title}</h2><button onClick={onClose}>Volver a Inicio</button></header>
    {error?<p role="alert">{error}</p>:null}<ul>{items.map(item=><HomeRow key={item.id} item={item} module={name} timeZone={data.timeZone} onAction={onAction} busy={busy}/>)}</ul>
    {cursor?<button onClick={()=>void more()} disabled={busy}>{busy?'Cargando…':'Cargar más'}</button>:!error?<p role="status">Has llegado al final de esta lista.</p>:null}
  </section>;
}
