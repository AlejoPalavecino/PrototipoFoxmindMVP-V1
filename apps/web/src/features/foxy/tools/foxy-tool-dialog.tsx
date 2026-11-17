import { useState } from 'react';
import { FoxyDialog } from '../../../../../shared-ui/FoxyChatLayout';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';

export function FoxyToolDialog({ title, contextName, materialCount, topics, initialTopicIds, busy, error, onPrepare, onClose }: {
  title:string; contextName:string; materialCount:number; topics:{id:string;name:string}[]; initialTopicIds?: string[]; busy?:boolean; error?:string|null;
  onPrepare:(brief:string,topicIds:string[])=>Promise<boolean>; onClose:()=>void;
}) {
  const [brief,setBrief]=useState(''),[selected,setSelected]=useState(initialTopicIds ?? topics.map(topic=>topic.id)),[localError,setLocalError]=useState(''),[submitting,setSubmitting]=useState(false);
  async function prepare(){
    if(!brief.trim()){setLocalError('Contá qué querés preparar para que Foxy tenga un punto de partida.');return;}
    if(submitting||busy)return;
    setSubmitting(true);setLocalError('');
    try{if(await onPrepare(brief.trim(),selected))onClose();else setLocalError('No pudimos iniciar la propuesta. Tu idea sigue acá; volvé a intentar.');}
    catch{setLocalError('No pudimos iniciar la propuesta. Tu idea sigue acá; volvé a intentar.');}
    finally{setSubmitting(false);}
  }
  return <FoxyDialog title={title} description="Contale a Foxy qué necesitás. Después podés revisar y editar." className="parity-foxy-toolDialog" onClose={()=>{if(!submitting)onClose();}}
    footer={<><button type="button" disabled={submitting} onClick={onClose}>Cancelar</button><button type="button" className="p5-primary" disabled={submitting||busy} onClick={()=>void prepare()}><FoxmindIcon name="spark"/>{submitting?'Preparando…':'Preparar propuesta'}</button></>}>
    <form onSubmit={event=>{event.preventDefault();void prepare();}} className="parity-foxy-toolForm">
      <div className="parity-foxy-scopeBanner"><FoxmindIcon name="book"/><div><strong>{contextName}</strong><p>{materialCount} materiales incluidos en esta conversación.</p></div></div>
      <label>¿Qué te gustaría preparar?<textarea autoFocus rows={5} maxLength={1500} disabled={submitting} value={brief} onChange={event=>{setBrief(event.target.value);setLocalError('');}} placeholder="Por ejemplo: un apunte con una explicación sencilla y dos ejemplos cotidianos…"/></label>
      <button type="button" className="parity-foxy-example" onClick={()=>setBrief('Prepará una explicación breve con un ejemplo cotidiano y una pregunta para conversar en grupo.')}><FoxmindIcon name="spark"/>Usar una idea para empezar</button>
      {topics.length>0&&<fieldset className="parity-foxy-choiceGroup"><legend>Temas que querés incluir</legend><div>{topics.map(topic=><label key={topic.id}><input type="checkbox" checked={selected.includes(topic.id)} onChange={()=>setSelected(values=>values.includes(topic.id)?values.filter(id=>id!==topic.id):[...values,topic.id])}/>{topic.name}</label>)}</div></fieldset>}
      {(localError||error)&&<p role="alert">{localError||error}</p>}
    </form>
  </FoxyDialog>;
}
