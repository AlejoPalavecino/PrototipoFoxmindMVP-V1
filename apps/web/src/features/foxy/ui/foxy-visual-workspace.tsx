import { useState, type ReactNode } from 'react';
import type { FoxyAspectRatio, FoxyVisualKind } from '../../../../../../src/core/domain/index.ts';
import type { FoxyVisualJob } from '../api/foxy-client';
import styles from './foxy-workspace.module.css';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { FoxyWait } from './foxy-wait';
type Props = { capabilities: Record<FoxyVisualKind, boolean>;
  topics?: {id:string;name:string}[]; initialTopicIds?:string[]; contextName?:string; materialCount?:number;
  kind: FoxyVisualKind; prompt: string; aspectRatio: FoxyAspectRatio; jobs: FoxyVisualJob[]; selectedId: string | null; busy: boolean; error: string | null; pending?: unknown;
  actions: { setKind(value: FoxyVisualKind): void; setPrompt(value: string): void; setAspectRatio(value: FoxyAspectRatio): void; start(topicIds?:string[]): void; retry?(): void; refresh?(): void; cancel?(id: string): void; select?(id: string): void };
  assetFileUrl(id: string,mode: 'preview' | 'download'): string; sharing?: ReactNode };
export function FoxyVisualWorkspace(props: Props) {
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [chosenTopics,setChosenTopics]=useState<string[]|null>(null);
  const topics=props.topics??[],topicIds=chosenTopics??props.initialTopicIds??topics.map(topic=>topic.id);
  const selected = props.jobs.find(job => job.id === props.selectedId), valid = !!props.prompt.trim() && [...props.prompt].length <= 5000
    && !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(props.prompt);
  const preview = selected?.state === 'READY' ? props.assetFileUrl(selected.assetId,'preview') : '';
  const safePreview = selected && preview === `/api/v1/foxy-ai/assets/${selected.assetId}/file?mode=preview` ? preview : '';
  const download = safePreview && selected?.state === 'READY' ? props.assetFileUrl(selected.assetId,'download') : '';
  const safeDownload = selected && download === `/api/v1/foxy-ai/assets/${selected.assetId}/file?mode=download` ? download : '';
  return <section className={`${styles.tool} ${styles.visualForm} parity-foxy-visualForm`} aria-label="Generar recurso visual">
    {safePreview && selected?.state === 'READY' ? <section className={styles.visualPreview} aria-label="Vista previa del recurso visual">
      <h3>{selected.kind === 'IMAGE' ? 'Imagen generada' : 'Esquema generado'}</h3>
      <div className={styles.resourceActions}>
        <a className="p5-action" href={safePreview} target="_blank" rel="noopener noreferrer">Abrir en grande</a>
        {safeDownload && <a className="p5-action" href={safeDownload}>Descargar imagen</a>}
      </div>
      <img src={safePreview} alt={selected.kind === 'IMAGE' ? 'Vista previa de la imagen generada' : 'Vista previa del esquema generado'} />
      {props.sharing}
    </section> : null}
    {safePreview && <button type="button" aria-expanded={generatorOpen} aria-controls="foxy-visual-form"
      onClick={() => setGeneratorOpen(open => !open)}>Nuevo recurso visual</button>}
    <form id="foxy-visual-form" className="parity-foxy-toolForm" hidden={!!safePreview && !generatorOpen}
      onSubmit={event => { event.preventDefault(); if ((!safePreview || generatorOpen) && !props.busy && !props.pending && props.capabilities[props.kind] && valid) props.actions.start(topics.length?topicIds:undefined); }}>
      {props.contextName&&<div className="parity-foxy-scopeBanner"><FoxmindIcon name="book"/><div><strong>{props.contextName}</strong>{props.materialCount!==undefined&&<p>{props.materialCount} materiales incluidos en esta conversación.</p>}</div></div>}
      <label>¿Qué te gustaría preparar?<textarea autoFocus rows={5} maxLength={1500} placeholder="Por ejemplo: un esquema para explicar las ideas principales…" disabled={props.busy} value={props.prompt} onChange={event=>props.actions.setPrompt(event.target.value)}/></label>
      <button type="button" className="parity-foxy-example" onClick={()=>props.actions.setPrompt('Prepará una explicación visual con un ejemplo cotidiano y sus ideas principales.')}><FoxmindIcon name="spark"/>Usar una idea para empezar</button>
      {topics.length>0&&<fieldset className="parity-foxy-choiceGroup"><legend>Temas que querés incluir</legend><div>{topics.map(topic=><label key={topic.id}><input type="checkbox" disabled={props.busy||!!props.pending} checked={topicIds.includes(topic.id)} onChange={()=>setChosenTopics(topicIds.includes(topic.id)?topicIds.filter(id=>id!==topic.id):[...topicIds,topic.id])}/>{topic.name}</label>)}</div></fieldset>}
      <fieldset className="parity-foxy-choiceGroup"><legend>¿Cómo querés mostrarlo?</legend><div>{(['DIAGRAM','IMAGE'] as const).map(kind=><label key={kind}><input type="radio" name="foxy-visual-kind" checked={props.kind===kind} disabled={props.busy||!props.capabilities[kind]} onChange={()=>props.actions.setKind(kind)}/>{kind==='DIAGRAM'?'Esquema':'Imagen de ejemplo'}</label>)}</div></fieldset>
      {!props.capabilities[props.kind]&&<p role="status">Este formato no está disponible en este momento.</p>}
    </form>
    {props.error ? <div role="alert"><p>{props.error}</p>{props.pending && props.actions.retry ? <button type="button" disabled={props.busy} onClick={() => props.actions.retry?.()}>Reintentar solicitud</button> : null}</div> : null}
  </section>;
}

export function FoxyVisualTimeline({jobs,pending,error,busy,onStop,onRetry,onOpen}:{jobs:FoxyVisualJob[];pending?:unknown;error?:string|null;busy?:boolean;onStop:(id:string)=>void;onRetry:()=>void;onOpen:(id:string)=>void}){
  return <div className="parity-foxy-visualTimeline">
    {!!pending&&<FoxyWait generating queued title="Preparando tu solicitud visual"/>}
    {jobs.map(job=><article key={job.id}>{job.state==='QUEUED'||job.state==='RUNNING'?<FoxyWait generating queued={job.state==='QUEUED'} title={job.state==='QUEUED'?'Tu solicitud está en cola':job.kind==='IMAGE'?'Diseñando una imagen para explicarla':'Diseñando tu esquema'} onStop={()=>onStop(job.id)} disabled={busy}/>:job.state==='READY'?<div className="parity-foxy-visualReady"><img src="/brujula/foxy-logotipo-redondo.webp" width={36} height={36} alt=""/><div><b>Foxy</b><p>Tu propuesta está lista. Abrila para revisarla y darle tu mirada.</p><button type="button" onClick={()=>onOpen(job.id)}><FoxmindIcon name="file"/>Abrir creación</button></div></div>:<p role="status">{job.state==='CANCELLED'?'Detuviste la propuesta. Podés preparar otra cuando quieras.':'No pudimos completar esta propuesta. Podés volver a prepararla desde Herramientas.'}</p>}</article>)}
    {error&&<p role="alert">{error}{!!pending&&<button type="button" disabled={busy} onClick={onRetry}>Reintentar</button>}</p>}
  </div>;
}
