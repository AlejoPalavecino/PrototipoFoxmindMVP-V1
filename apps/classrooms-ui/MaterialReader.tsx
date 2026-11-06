import {canPreviewMaterial,type ClassroomClient,type Detail,type Material} from './api.ts';
import {FoxmindIcon} from '../shared-ui/FoxmindIcon';

export function MaterialReader({api,room,material,writable,busy,onClose,onEdit,onDelete}:{api:ClassroomClient;room:Detail;material:Material;writable:boolean;busy:boolean;onClose:()=>void;onEdit:()=>void;onDelete:()=>void}){
 const unit=room.units.find(item=>item.id===material.unitId),topic=unit?.topics.find(item=>item.id===material.topicId);
 return <section className="brujula-material-page" aria-label={`Lectura de ${material.title}`}>
  <button className="brujula-material-back" onClick={onClose}>Volver a Biblioteca<FoxmindIcon name="arrow-right"/></button>
  <header className="p5-section-head"><div><h2>{material.title}</h2><p>{unit?`${unit.name}${topic?` · ${topic.name}`:''}`:'Material extra / recomendado'}</p></div>{writable?<button disabled={busy} onClick={onEdit}><FoxmindIcon name="edit"/>Editar datos</button>:null}</header>
  <article className="brujula-material-document"><small className="brujula-material-type">{material.contentKind==='TEXT'?'Texto':material.extension?.toUpperCase()??'Archivo'}</small>
   <div className="brujula-material-paper"><small>BIBLIOTECA · {room.name.toLocaleUpperCase('es-AR')}</small><h3>{material.title}</h3>{material.body?<p className="p7-multiline">{material.body}</p>:null}{material.contentKind!=='TEXT'&&canPreviewMaterial(material)&&material.previewable?<a href={api.fileUrl(material.fileId,true)} target="_blank" rel="noreferrer">Abrir archivo</a>:null}</div>
   <footer><a href={api.fileUrl(material.fileId)} aria-label="Descargar material" target="_blank" rel="noreferrer"><FoxmindIcon name="download"/>Descargar</a>{writable?<button disabled={busy||material.linked} onClick={onDelete}><FoxmindIcon name="trash"/>Eliminar material</button>:null}{writable&&material.linked?<small>Vinculado a una actividad: no se puede eliminar.</small>:null}</footer>
  </article>
 </section>;
}
