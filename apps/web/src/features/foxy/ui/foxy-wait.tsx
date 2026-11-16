import { useEffect, useState } from 'react';
export function FoxyWait({ title, generating=false, queued=false, onStop, disabled }: {title:string;generating?:boolean;queued?:boolean;onStop?:()=>void;disabled?:boolean}){
  const [delayed,setDelayed]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setDelayed(true),12000);return()=>clearTimeout(timer);},[]);
  return <div className={`parity-foxy-wait ${generating?'generation':''}`} role="status" aria-live="polite">
    <img src="/brujula/foxy-logotipo-redondo.webp" alt="" width={36} height={36}/>
    {!generating&&<span className="parity-foxy-spinner" aria-hidden="true"/>}
    <div>{generating&&<span className="parity-foxy-waitAuthor">Foxy está preparando tu propuesta</span>}<strong>{title}</strong>
      {generating&&<span className="parity-foxy-stages" aria-hidden="true"><i className="done"/><i className={queued?'':'done'}/><i/></span>}
      <small>{delayed?'Está tardando más de lo habitual. Seguimos esperando la respuesta.':generating?'Podés seguir en este chat. La propuesta queda acá para revisarla.':'Un momento para preparar una respuesta.'}</small>
    </div>{onStop&&<button type="button" disabled={disabled} onClick={onStop}>Detener</button>}
  </div>;
}
