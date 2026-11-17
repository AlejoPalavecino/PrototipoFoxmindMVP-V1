import { useState } from 'react';
import type { ChatAttachment } from '../../../../../../src/core/contracts/chat-attachments';
import type { FoxySource } from '../api/foxy-client';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { FoxyDialog } from '../../../../../shared-ui/FoxyChatLayout';
import { ChatAttachmentButton } from '../../../../../shared-ui/ChatAttachmentControls';
type Unit = { id: string; name: string; topics: { id: string; name: string }[] };
export function FoxyLibraryPanel({ attachments, attachmentHref, sources, selectedSourceIds, classroomName, units, disabled, error, onContext, onScope, onTopic, onRemove, onUpload, onOpenSource, onMoreSources }: {
  attachments: ChatAttachment[]; sources: FoxySource[]; classroomName?: string | null; units: Unit[]; disabled?: boolean; error?: string;
  onContext: () => void; onTopic: (name:string) => void; onRemove: (id:string) => void; onUpload: (id:string,file:File,copy:boolean) => Promise<void>;
  selectedSourceIds?: string[]; onScope?: () => void; onOpenSource?: (source:FoxySource)=>void; onMoreSources?:()=>void;
  attachmentHref?: (id:string)=>string;
}) {
  const [tab,setTab]=useState('materials'),[filter,setFilter]=useState('all'),[query,setQuery]=useState('');
  const [removing,setRemoving]=useState<ChatAttachment>();
  const own=attachments.filter(item=>(filter==='all'||filter==='private')&&item.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
  const shared=sources.filter(item=>(filter==='all'||filter==='classroom')&&item.title.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
  return <div className="parity-foxy-library">
    <div className="parity-foxy-libraryScope"><span className="parity-foxy-toolIcon mint"><FoxmindIcon name={classroomName?'layers':'lock'}/></span><div><strong>{classroomName??'Tu biblioteca privada'}</strong><small>{classroomName?'Materiales del aula + tus archivos':'Archivos de este chat'}</small></div><button type="button" onClick={onContext}>{classroomName?'Cambiar':'Vincular aula'}</button></div>
    {onScope && <button type="button" onClick={onScope}>Ajustar temas y fuentes</button>}
    <nav className="parity-foxy-dialogTabs" aria-label="Contenido de la biblioteca">{[['materials','Materiales'],['plan','Plan de estudio']].map(([value,label])=><button key={value} type="button" aria-pressed={tab===value} onClick={()=>setTab(value)}>{label}{value==='materials'&&<span>{attachments.length+sources.filter(item=>item.available).length}</span>}</button>)}</nav>
    {tab==='plan'?<div className="parity-foxy-folderPlan">{units.map((unit,i)=><section key={unit.id}><h3><span>{i+1}</span>{unit.name}</h3>{unit.topics.map(topic=><button key={topic.id} type="button" onClick={()=>onTopic(topic.name)}><FoxmindIcon name="book"/><span>{topic.name}</span><b>Estudiar</b><FoxmindIcon name="chevron-right"/></button>)}</section>)}{!units.length&&<p>Vinculá un aula para consultar su recorrido. También podés trabajar sólo con tus archivos.</p>}</div>:<>
      <div className="parity-foxy-libraryActions"><ChatAttachmentButton label="Agregar material" disabled={disabled} onUpload={onUpload}/><span><FoxmindIcon name="lock"/>Sólo en este chat</span></div>
      <label className="parity-foxy-search"><FoxmindIcon name="search"/><input aria-label="Buscar material" type="search" placeholder="Buscar en tus materiales" value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <div className="parity-foxy-filterRow">{[['all','Todos'],['classroom','Del aula'],['private','Mis materiales']].map(([value,label])=><button key={value} type="button" data-library-filter={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div>
      {error&&<p role="alert">{error}</p>}
      <div className="parity-foxy-libraryList">
        {own.map(item=><article className="parity-foxy-libraryFile" data-origin="private" key={item.id}><a className="parity-foxy-libraryFileMain" href={attachmentHref?.(item.id)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${item.name}`}><DocumentIcon kind={item.name.split('.').at(-1)}/><span><strong>{item.name}</strong><small>Propio · Este chat</small><span className="parity-foxy-sourceStatus"><FoxmindIcon name="check"/>En contexto</span></span></a><button type="button" disabled={disabled} aria-label={`Quitar ${item.name}`} onClick={()=>setRemoving(item)}><FoxmindIcon name="trash"/></button></article>)}
        {shared.map(item=><article className="parity-foxy-libraryFile" data-origin="classroom" key={item.sourceId}><button type="button" className="parity-foxy-libraryFileMain" disabled={!item.available||!onOpenSource} onClick={()=>onOpenSource?.(item)}><DocumentIcon kind={item.extension??'Archivo'}/><span><strong>{item.title}</strong><small>Del aula · {classroomName}</small><span className={`parity-foxy-sourceStatus ${item.available?'':'error'}`}><FoxmindIcon name={item.available?'check':'help'}/>{!item.available?'No disponible':selectedSourceIds && !selectedSourceIds.includes(item.sourceId)?'Disponible':'En contexto'}</span></span></button></article>)}
        {!own.length&&!shared.length&&<div className="parity-foxy-libraryEmpty"><FoxmindIcon name="book"/><h3>{attachments.length+sources.length?'No encontramos ese material':'Tus ideas también tienen fuentes'}</h3><p>{attachments.length+sources.length?'Probá otro nombre o cambiá el filtro.':'Agregá un PDF, Word o PowerPoint. Foxy lo tendrá como referencia en tus próximas consultas.'}</p></div>}
      </div>
      {onMoreSources&&<button type="button" onClick={onMoreSources}>Cargar más materiales</button>}
      <p className="parity-foxy-libraryFootnote"><FoxmindIcon name={classroomName?'check':'lock'}/>{classroomName?'Los materiales del aula se consultan actualizados. Tus archivos propios no se comparten.':'Los archivos propios se incluyen sin necesidad de volver a adjuntarlos.'}</p>
    </>}
    {removing&&<FoxyDialog title="¿Quitamos este material?" description={removing.name} onClose={()=>setRemoving(undefined)} footer={<><button type="button" onClick={()=>setRemoving(undefined)}>Conservar</button><button type="button" disabled={disabled} className="parity-foxy-danger" onClick={()=>{onRemove(removing.id);setRemoving(undefined);}}>Quitar material</button></>}><p>Dejará de usarse en las próximas consultas de este chat. Las conversaciones anteriores se conservan.</p></FoxyDialog>}
  </div>;
}
function DocumentIcon({kind='Archivo'}:{kind?:string}){const label=kind.replace(/^\./,'').toUpperCase();return <span className={`parity-foxy-documentIcon ${label.includes('PPT')?'peach':label.includes('DOC')?'mint':'sky'}`}><FoxmindIcon name="file"/><small>{label}</small></span>;}
