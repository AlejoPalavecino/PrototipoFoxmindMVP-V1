import {useState} from 'react';
import {FoxmindIcon} from '../../../../../shared-ui/FoxmindIcon';
import {learningCover} from '../../../../../shared-ui/parity-assets';
import {Notice} from '../../../../../shared-ui/feedback';
import {createStudyClient,type StudyCollection} from '../api/study-client';
import {StudyConfirmation} from './study-confirmation';

const api=createStudyClient();
export function StudyCollectionView({catalog,onCreate,onEnter,status:controlledStatus,onStatusChange}:{catalog:StudyCollection;onCreate:()=>void;onEnter:(id:string)=>void;status?:string;onStatusChange?:(status:string)=>void}) {
 const [localStatus,setLocalStatus]=useState('ACTIVE'),[removed,setRemoved]=useState<string[]>([]),[removal,setRemoval]=useState<StudyCollection['items'][number]>();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const status=controlledStatus??localStatus,setStatus=onStatusChange??setLocalStatus;
 const available=catalog.items.filter(item=>!removed.includes(item.id)),items=available.filter(item=>item.status===status);
 const archived=available.filter(item=>item.status==='ARCHIVED');
 return <div className="parity-study-collection study-exact-collection">
  <header><div><h1>Mi estudio</h1><p>Organizá tus temas, consultá tus materiales y practicá con Foxy.</p></div><button onClick={onCreate}><FoxmindIcon name="plus"/>Crear carpeta</button></header>
  <section aria-label="Carpetas de estudio">
   <div className="study-exact-collection-toolbar"><div className="study-exact-segmented" role="group" aria-label="Estado de las carpetas">{[['ACTIVE','Activas'],['DRAFT','Borradores']].map(([value,label])=><button key={value} aria-pressed={status===value} onClick={()=>setStatus(value)}>{label}<span>{available.filter(item=>item.status===value).length}</span></button>)}</div></div>
   {error&&<Notice error>{error}</Notice>}
   {!items.length?<div className="study-exact-empty"><img src="/foxmind/classroom-world.webp" alt=""/><h2>{status==='DRAFT'?'Todavía no tenés borradores':'Todavía no tenés carpetas'}</h2><p>{status==='DRAFT'?'Usá Guardar y salir para retomar la creación de una carpeta más adelante.':'Creá una carpeta para guardar tu programa y ordenar tus temas.'}</p></div>:
   <div className={status==='DRAFT'?'study-exact-draft-grid':'study-exact-card-grid'}>{items.map(folder=>status==='DRAFT'?<article key={folder.id} className="study-exact-draft"><img src={learningCover(folder.bannerKey)} alt=""/><div><span className="study-exact-draft-label"><FoxmindIcon name="edit"/>Borrador</span><h2>{folder.name||'Carpeta sin nombre'}</h2><p>{folder.subject||'Materia pendiente'}</p><div className="study-exact-draft-progress" aria-label={`Paso ${(folder.wizardStep??0)+1} de 4`}>{[0,1,2,3].map(index=><i key={index} className={index<=(folder.wizardStep??0)?'done':''}/>)}</div><div className="study-exact-draft-actions"><button className="primary" onClick={()=>onEnter(folder.id)}><FoxmindIcon name="arrow-right"/>Retomar creación</button><button className="study-exact-icon" onClick={()=>setRemoval(folder)} aria-label={`Eliminar borrador ${folder.name||'sin nombre'}`}><FoxmindIcon name="trash"/></button></div></div></article>:
   <button key={folder.id} className="study-exact-card" onClick={()=>onEnter(folder.id)}><span className="study-exact-cover"><img src={learningCover(folder.bannerKey)} alt=""/><span><FoxmindIcon name="lock"/>Privada</span></span><span className="study-exact-card-body"><strong>{folder.name}</strong><span>{folder.subject||folder.academicYear}</span>{folder.linkedClassroomId&&<span className="study-exact-linked"><FoxmindIcon name="book"/>{catalog.classrooms.find(room=>room.id===folder.linkedClassroomId)?.name??'Aula vinculada'}</span>}<span className="study-exact-card-bottom"><span>Abrir carpeta</span><FoxmindIcon name="arrow-right"/></span></span></button>)}</div>}
   {!!archived.length&&<details className="study-exact-archived"><summary>Carpetas archivadas · {archived.length}</summary>{archived.map(folder=><button key={folder.id} onClick={()=>onEnter(folder.id)}>{folder.name}<FoxmindIcon name="arrow-right"/></button>)}</details>}
  </section>
  {removal&&<StudyConfirmation title="¿Eliminar este borrador?" description="Vas a perder los datos y el plan guardados en el borrador." confirmLabel="Eliminar borrador" destructive busy={busy} onClose={()=>setRemoval(undefined)} onConfirm={async()=>{setBusy(true);setError('');try{await api.command(removal.id,removal.revision,'DELETE',{confirmed:true});setRemoved(values=>[...values,removal.id]);}catch(error){setError(error instanceof Error?error.message:'No pudimos eliminar el borrador.');throw error;}finally{setBusy(false);}}}/>}
 </div>;
}
