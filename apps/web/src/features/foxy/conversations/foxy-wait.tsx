import { useEffect, useState } from 'react';
import { ChatByline } from '../../../../../shared-ui/FoxyChatLayout';
import styles from '../workspace/foxy-workspace.module.css';

/** Elapsed wait, shown only after a few seconds so a quick answer does not flash a counter. */
export function waitElapsed(startedAt: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  if (seconds < 5) return '';
  return seconds < 60 ? `Van ${seconds} s` : `Van ${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`;
}

/**
 * Waiting card. For generated creations it lists only stages the server state proves: sent, queued, preparing.
 * It never shows a percentage because the provider does not report one.
 */
export function FoxyWait({ title, generating=false, queued=false, sending=false, since, onStop, disabled, partialText }: {title:string;generating?:boolean;queued?:boolean;sending?:boolean;since?:string;onStop?:()=>void;disabled?:boolean;partialText?:string}){
  const [delayed,setDelayed]=useState(false);
  const [mountedAt]=useState(()=>Date.now());
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setTimeout(()=>setDelayed(true),12000);return()=>clearTimeout(timer);},[]);
  useEffect(()=>{if(!generating||partialText)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[generating,partialText]);
  const sentAt=since?Date.parse(since):NaN;
  const startedAt=Number.isFinite(sentAt)&&sentAt<=now&&now-sentAt<3600000?sentAt:mountedAt;
  const elapsed=generating&&!partialText?waitElapsed(startedAt,now):'';
  const step=sending?0:queued?1:2;
  const stages=[{label:sending?'Enviando tu pedido':'Pedido recibido'},{label:'En cola'},{label:'Preparando la propuesta'}];
  return <div className={partialText ? styles.answer + ' parity-ai-answer' : `parity-foxy-wait ${generating?'generation':''}`}>
    {partialText ? <><ChatByline/><p role="status" aria-live="polite">Foxy está escribiendo…</p>
      <p className={styles.partialText}>{partialText}</p></> : <>
    <img src="/brujula/foxy-logotipo-redondo.webp" alt="" width={36} height={36}/>
    {!generating&&<span className="parity-foxy-spinner" aria-hidden="true"/>}
    <div role="status" aria-live="polite">{generating&&<span className="parity-foxy-waitAuthor">Foxy está preparando tu propuesta</span>}<strong>{title}</strong>
      {generating&&<ol className="parity-foxy-steps" aria-label="Etapas de la propuesta">
        {stages.map((stage,index)=><li key={index} data-state={index<step?'done':index===step?'current':'pending'} aria-current={index===step?'step':undefined}>{stage.label}</li>)}
      </ol>}
      <small>{delayed?'Está tardando más de lo habitual. Seguimos esperando la respuesta.':generating?'Podés seguir en este chat. La propuesta queda acá para revisarla.':'Un momento para preparar una respuesta.'}</small>
    </div>
    {elapsed&&<span className="parity-foxy-elapsed">{elapsed}</span>}</>}{onStop&&<button type="button" disabled={disabled} onClick={onStop}>Detener</button>}
  </div>;
}
