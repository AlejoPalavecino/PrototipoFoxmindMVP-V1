'use client';
import { useEffect,useRef,useState } from 'react';
import type { HomeModuleName, HomeModules, HomeResponse } from '../../../../../../src/core/domain/home/home.ts';
import type { HomeClient } from '../api/home-api.ts';
import { HomeRow } from './HomeRow.tsx';
import { homeLabels, type HomeAction, type HomeRowItem } from '../model/home-labels.ts';
export function HomeModulePanel({name,data,client,onClose,onAction,onUnauthorized,onRefresh,order}:{
  name:HomeModuleName;data:HomeResponse;client:HomeClient;onClose:()=>void;onAction:HomeAction;onUnauthorized:()=>void;onRefresh?:()=>void;order?:'asc'|'desc';
}) {
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus();},[]);
  const original=data.modules[name];
  const [items,setItems]=useState<HomeRowItem[]>(original.status==='ready'?original.items:[]);
  const [cursor,setCursor]=useState(original.status==='ready'?original.nextCursor:null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const controller=useRef<AbortController|null>(null),pending=useRef(false);
  useEffect(()=>()=>controller.current?.abort(),[]);
  async function more() {
    if(!cursor || pending.current)return;pending.current=true;setBusy(true);setError('');
    const request=new AbortController();controller.current=request;
    try {
      const result=await client.page({module:name,timeZone:data.timeZone,cursor,...(order?{order}:{})},request.signal);
      if(request.signal.aborted)return;
      if(result.subjectId!==data.subjectId) { onUnauthorized();return; }
      if(result.module!==name||result.page.status!=='ready')throw new Error('No pudimos cargar la siguiente página.');
      const page=result.page as Extract<HomeModules[HomeModuleName],{status:'ready'}>;
      setItems(old=>[...old,...page.items.filter(item=>!old.some(previous=>previous.id===item.id))]);setCursor(page.nextCursor);
    }catch(failure){
      if(request.signal.aborted)return;
      if(['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','FORBIDDEN'].includes((failure as {code?:string}).code??'')){onUnauthorized();return;}
      if((failure as {code?:string}).code==='INVALID_INPUT'){setCursor(null);setError('Esta lista cambió. Actualizala para continuar.');return;}
      setError('No pudimos cargar la siguiente página. Podés reintentar o volver a Inicio para actualizar.');
    }finally{pending.current=false;if(!request.signal.aborted)setBusy(false);}
  }
  return <section className="fm-home-module fm-home-panel" aria-label={`Todas: ${homeLabels[name].title}`} aria-busy={busy}>
    <header><h2 ref={heading} tabIndex={-1}>{homeLabels[name].title}</h2><button onClick={onClose}>Volver a Inicio</button></header>
    {error?<p role="alert">{error}</p>:null}<ul>{items.map(item=><HomeRow key={item.id} item={item} module={name} timeZone={data.timeZone} onAction={onAction} busy={busy}/>)}</ul>
    {cursor?<button onClick={()=>void more()} disabled={busy}>{busy?'Cargando…':error?'Reintentar':'Cargar más'}</button>:!error?<p role="status">Has llegado al final de esta lista.</p>:null}
    {error&&!cursor&&onRefresh?<button onClick={onRefresh}>Actualizar lista</button>:null}
  </section>;
}
