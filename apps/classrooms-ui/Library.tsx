'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type ClassroomClient, type Detail, type FileState, type Material } from './api.ts';
import { Dialog, Notice } from './components.tsx';
import { FoxmindIcon } from '../shared-ui/FoxmindIcon';
import type { ClassroomCreationContext } from './classroom-creation-context';
import { createTextDocument } from '../shared-ui/text-document';
import {MaterialReader} from './MaterialReader';

interface Metadata { title: string; unitId: string | null; topicId: string | null; body?: string | null; resourceUse?: Material['resourceUse']; contentKind?: Material['contentKind'] }
function MaterialForm({ room, initial, busy, label, onSave }: {
  room: Detail; initial?: Metadata; busy: boolean; label: string; onSave: (metadata: Metadata) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body,setBody]=useState(initial?.body ?? ''),[resourceUse,setResourceUse]=useState<Material['resourceUse']>(initial?.resourceUse ?? 'STUDY');
  const [unitId, setUnit] = useState(initial?.unitId ?? ''), [topicId, setTopic] = useState(initial?.topicId ?? '');
  const topics = room.units.find(unit => unit.id === unitId)?.topics ?? [];
  return <form onSubmit={event => { event.preventDefault(); void onSave({ title:title.trim(), unitId: unitId || null, topicId: topicId || null, body, resourceUse }); }}>
    <fieldset disabled={busy}>
      <legend className="sr-only">{label}</legend>
      <label>Título<input aria-label="Nombre del material" required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>Contenido o descripción<textarea aria-label="Contenido o descripción" rows={3} maxLength={20000} value={body} onChange={event=>setBody(event.target.value)}/></label>
      <div className="brujula-material-assignment"><label>Unidad<select aria-label="Unidad del material" value={unitId} onChange={event => { setUnit(event.target.value); setTopic(''); }}>
        <option value="">Material extra / recomendado</option>
        {room.units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
      </select></label>
      <label>Tema<select aria-label="Tema del material" value={topicId} disabled={!unitId} onChange={event => setTopic(event.target.value)}>
        <option value="">Sin tema específico</option>
        {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
      </select></label></div>
      <label>Uso del recurso<select aria-label="Uso del recurso" value={resourceUse} onChange={event=>setResourceUse(event.target.value as Material['resourceUse'])}><option value="STUDY">Material de estudio</option><option value="RECOMMENDED">Recomendado</option><option value="COMPLEMENTARY">Material complementario</option></select></label>
      <footer className="p5-form-footer"><button className="primary" aria-label={label}>{label==='Guardar datos del material'?'Guardar cambios':label}</button></footer>
    </fieldset>
  </form>;
}

export function Library({ api, room, reload, targetMaterialId, openUpload, uploadContext, onUploadContextConsumed, active = true }: { api: ClassroomClient; room: Detail; reload: () => Promise<void>; targetMaterialId?: string; openUpload?: boolean; uploadContext?: ClassroomCreationContext | null; onUploadContextConsumed?: () => void; active?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const targetFocusPending = useRef(false);
  const [materials, setMaterials] = useState<Material[]>([]), [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [uploadInitial, setUploadInitial] = useState<Metadata | undefined>();
  const [uploadExpanded, setUploadExpanded] = useState(Boolean(openUpload));
  const consumedContext = useRef<ClassroomCreationContext | null>(null);
  const [pendingUploadContext, setPendingUploadContext] = useState<ClassroomCreationContext | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [file, setFile] = useState<FileState | null>(null), [editing, setEditing] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState<Material | null>(null);
  const [reading,setReading]=useState<Material|null>(null);
  const [writtenFile,setWrittenFile]=useState(false);
  const writtenSnapshot=useRef<string|null>(null);
  useEffect(() => { if (!active) { setEditing(null); setDeleting(null); setReading(null);setUploadExpanded(false); } }, [active]);
  useEffect(() => { if (active && openUpload) {setReading(null);setUploadExpanded(true);} }, [active, openUpload]);
  const writable = room.role === 'teacher' && !room.archived;
  useEffect(() => {
    if (!uploadContext || uploadContext === consumedContext.current || !writable) return;
    const unit = room.units.find(item => item.id === uploadContext.unitId);
    if (!unit?.id) return;
    consumedContext.current = uploadContext;
    if (file || busy) { setPendingUploadContext(uploadContext); return; }
    const topic = unit.topics.find(item => item.id === uploadContext.topicIds[0]);
    setUploadInitial({ title: '', unitId: unit.id, topicId: topic?.id ?? null });
    setReading(null);
    setUploadExpanded(true);
    onUploadContextConsumed?.();
  }, [uploadContext, writable, room.units, onUploadContextConsumed, file, busy]);
  const filtered = materials.filter(material => !material.supersededBy).filter(material => [material.title,material.contentKind === 'TEXT' ? 'Texto' : material.extension,room.units.find(unit=>unit.id===material.unitId)?.name,room.units.flatMap(unit=>unit.topics).find(topic=>topic.id===material.topicId)?.name].filter(Boolean).join(' ').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase().includes(query.trim().normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase()));
  useEffect(() => {
    targetFocusPending.current = Boolean(targetMaterialId && active);
    if (targetMaterialId && active) { setQuery(''); }
  }, [targetMaterialId,active]);
  useEffect(() => {
    if (!targetFocusPending.current || !targetMaterialId || !loaded || query.trim()) return;
    const selected = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-material-id]') ?? []).find(item => item.dataset.materialId === targetMaterialId);
    selected?.focus();
    const material=materials.find(item=>item.id===targetMaterialId);if(material?.ready&&!material.deleted)setReading(material);
    targetFocusPending.current = false;
  }, [targetMaterialId, loaded, materials, query]);
  const load = useCallback(async (signal?: AbortSignal) => {
    const result = await api.call<Material[]>(`/${room.id}/library`, 'GET', undefined, signal);
    if(signal?.aborted)return;
    setMaterials(result); setLoaded(true);
    setReading(current=>{if(!current)return null;const previous=result.find(item=>item.id===current.id),latest=previous?.supersededBy?result.find(item=>item.id===previous.supersededBy):previous;return latest&&!latest.deleted?latest:null;});
  }, [api, room.id]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [load]);
  async function run(task: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await task(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function change(operation: Record<string, unknown>) {
    await api.call(`/${room.id}/library`, 'POST', { revision: room.revision, operation });
    await Promise.all([reload(), load()]);
  }
  return <section ref={root} aria-label="Biblioteca del aula" className="p6-library">
    <header hidden={Boolean(reading)} className="p5-section-head cl-section"><div><h2>Biblioteca</h2><p>Materiales de las unidades y lecturas recomendadas.</p></div>
      <div className="p5-actions">{writable ? <button className="primary" disabled={busy} onClick={() => {setFile(null);setUploadExpanded(true);}}><FoxmindIcon name="plus"/>Agregar material</button> : null}</div>
    </header>
    {error ? <Notice error>{error} Actualiza la Biblioteca y vuelve a intentar.</Notice> : null}
    {notice ? <Notice>{notice}</Notice> : null}
    {!loaded && !error ? <Notice>Cargando materiales…</Notice> : null}
    {writable && active && uploadExpanded ? <Dialog title="Agregar material" onClose={() => { if (!busy) setUploadExpanded(false); }}><div className="p6-library-upload">
      {error ? <Notice error>{error}</Notice> : null}
      <p>Biblioteca de {room.name} · {room.division}</p>
      {uploadInitial ? <p className="classroom-context-note">Destino inicial: {room.units.find(unit => unit.id === uploadInitial.unitId)?.name}{uploadInitial.topicId ? ` · ${room.units.flatMap(unit => unit.topics).find(topic => topic.id === uploadInitial.topicId)?.name}` : ''}. Podés cambiarlo antes de publicar.</p> : null}
      <p>PDF, DOCX, PPTX, XLSX, JPG, JPEG, PNG o ZIP · hasta 50 MB por archivo.</p>
      <label>Archivo del material<input type="file" disabled={busy} accept=".pdf,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.zip" onChange={event => {
        const selected = event.target.files?.[0]; event.target.value = '';
        if (selected) void run(async () => {
          setFile(null);setWrittenFile(false);
          if (!api.uploadClassroom) throw new Error('La carga de archivos no está disponible.');
          setFile(await api.uploadClassroom(room.id, selected, 'material'));
        });
      }} /></label>
      <small>También podés crear un recurso escribiendo su contenido abajo.</small>
      {file ? <>
        <Notice>{file.ready ? `Archivo aprobado: ${file.name}. Completa los datos para publicarlo.` : file.rejectionCode || ['ERROR', 'REJECTED'].includes(file.scan)
          ? 'El archivo no está aprobado. No se publicará ni podrá descargarse; elige otro archivo o consulta nuevamente la revisión.'
          : 'Archivo pendiente de revisión. Todavía no está publicado ni disponible para descargar.'}</Notice>
        {!file.ready ? <button disabled={busy} onClick={() => void run(async () => setFile(await api.fileStatus(file.id)))}>Consultar revisión del material</button> : null}
      </> : null}
      <MaterialForm key={`${uploadInitial?.unitId}:${uploadInitial?.topicId}`} room={room} initial={uploadInitial} busy={busy || !!file && !file.ready} label="Publicar en Biblioteca" onSave={metadata=>run(async()=>{
        if(!api.uploadClassroom)throw new Error('La carga de archivos no está disponible.');
        if(!file && !metadata.body?.trim())throw new Error('Adjuntá un archivo o escribí el contenido del recurso.');
        const snapshot=JSON.stringify([metadata.title,metadata.body ?? '']),needsDocument=!file || writtenFile&&writtenSnapshot.current!==snapshot;
        const source=needsDocument ? await api.uploadClassroom(room.id,new File([createTextDocument(metadata.title,metadata.body ?? '') as BlobPart],'material.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),'material') : file!;
        const contentKind=!file || writtenFile ? 'TEXT' : 'FILE';
        if(needsDocument){setFile(source);setWrittenFile(true);writtenSnapshot.current=snapshot;}
        if(!source.ready){setFile(source);throw new Error('El archivo todavía está en revisión. No se publicó el material.');}
        await change({action:'publish',fileId:source.id,...metadata,contentKind});setFile(null);setWrittenFile(false);setUploadExpanded(false);setNotice('Material publicado.');
      })}/>
    </div></Dialog> : null}
    {loaded && materials.length === 0 ? <p className="p5-empty">Todavía no hay materiales disponibles.</p> : null}
    {loaded && targetMaterialId && !materials.some(item => item.id === targetMaterialId) ? <Notice>El material ya no está disponible para tu cuenta.</Notice> : null}
    {openUpload && !writable ? <Notice>No podés publicar material en esta aula con tus permisos actuales.</Notice> : null}
    <div hidden={Boolean(reading)} className="interior-library-toolbar"><label className="interior-library-search"><span className="sr-only">Buscar material o tema</span><FoxmindIcon name="search"/><input type="search" aria-label="Buscar material o tema" placeholder="Buscar material o tema" value={query} onChange={event=>setQuery(event.target.value)}/></label></div>
    {loaded && materials.length > 0 && filtered.length === 0 ? <p className="p5-empty">No se encontraron materiales para esta búsqueda.</p> : null}
    <div hidden={Boolean(reading)} className="p6-library-list">{filtered.map(material => {
      const unit = room.units.find(item => item.id === material.unitId), topic = unit?.topics.find(item => item.id === material.topicId);
      return <article className={`folder-row${material.id === targetMaterialId ? ' fm3-target-selected' : ''}`} key={material.id} aria-label={material.title} data-material-id={material.id} tabIndex={material.id === targetMaterialId ? -1 : undefined}>
        <div className="folder-row-content"><span className="interior-material-icon"><FoxmindIcon name="file-text" /></span><div className="interior-material-copy"><h3>{material.title}</h3><p>{unit ? `${unit.name}${topic ? ` · ${topic.name}` : ''}` : 'Material extra / recomendado'}</p></div></div>
        <div className="folder-row-actions">
        <small className="brujula-material-type">{material.contentKind==='TEXT'?'Texto':material.extension?.toUpperCase() ?? 'Archivo'}</small>
        {material.deleted ? <Notice>{material.deletionPending ? 'Material eliminado. El borrado del archivo está pendiente; su espacio sigue reservado hasta confirmarlo.' : 'Material y archivo eliminados. El espacio fue liberado.'}</Notice>
          : material.ready ? <div className="p5-actions">
            <button type="button" aria-label={`Abrir material: ${material.title}`} onClick={()=>setReading(material)}><FoxmindIcon name="chevron-right"/></button>
          </div> : <Notice>Archivo no disponible: la revisión de seguridad no permite descargarlo.</Notice>}
        </div>
      </article>;
    })}</div>
    {active && reading ? <MaterialReader api={api} room={room} material={reading} writable={writable} busy={busy} onClose={()=>setReading(null)} onEdit={()=>{setFile(null);writtenSnapshot.current=null;setEditing(reading);}} onDelete={()=>setDeleting(reading)}/> : null}
    {active && editing ? <Dialog title="Editar material" onClose={() => !busy && setEditing(null)}>
      <p className="brujula-material-dialog-intro">Biblioteca de {room.name} · {room.division}</p>{file&&!file.ready?<Notice>El archivo está en revisión. <button disabled={busy} onClick={()=>void run(async()=>setFile(await api.fileStatus(file.id)))}>Consultar revisión del material</button></Notice>:null}{error?<Notice error>{error}</Notice>:null}
      <MaterialForm key={editing.id} room={room} initial={editing} busy={busy} label="Guardar datos del material" onSave={metadata => run(async () => {
        if(editing.contentKind==='TEXT'&&(metadata.title!==editing.title||metadata.body!==editing.body)){
          if(!api.uploadClassroom)throw Error('La carga de archivos no está disponible.');
          const snapshot=JSON.stringify([metadata.title,metadata.body??'']);
          const source=file&&writtenSnapshot.current===snapshot?file:await api.uploadClassroom(room.id,new File([createTextDocument(metadata.title,metadata.body??'') as BlobPart],'material.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),'material');
          setFile(source);writtenSnapshot.current=snapshot;
          if(!source.ready)throw Error('El archivo debe aprobar la revisión antes de guardar el material.');
          await change({action:'revise',id:editing.id,fileId:source.id,...metadata,contentKind:'TEXT'});
        }else await change({ action: 'edit', id: editing.id, ...metadata,contentKind:editing.contentKind ?? 'FILE' });
        setEditing(null);setFile(null); setNotice('Datos del material guardados.');
      })} />
    </Dialog> : null}
    {active && pendingUploadContext ? <Dialog title="Cambiar el destino del material" onClose={() => { setPendingUploadContext(null); onUploadContextConsumed?.(); }}>
      <p>Ya tenés un archivo con datos sin publicar. Podés volver al formulario y guardarlos. Si cambiás el destino ahora, el archivo se conserva y se descartan los datos locales del formulario antes de elegir el nuevo tema.</p>
      <button disabled={busy} onClick={() => { setPendingUploadContext(null); onUploadContextConsumed?.(); }}>Conservar el formulario abierto</button>
      <button disabled={busy} onClick={() => {
        const unit = room.units.find(item => item.id === pendingUploadContext.unitId);
        if (!unit?.id) return;
        const topic = unit.topics.find(item => item.id === pendingUploadContext.topicIds[0]);
        setUploadInitial({ title: '', unitId: unit.id, topicId: topic?.id ?? null });
        setUploadExpanded(true); setPendingUploadContext(null); onUploadContextConsumed?.();
      }}>Descartar datos locales y cambiar destino</button>
    </Dialog> : null}
    {active && deleting ? <Dialog title="Eliminar material" onClose={() => !busy && setDeleting(null)}>
      <p>¿Eliminar «{deleting.title}»? Dejará de estar disponible. Solo se elimina si no está vinculado a actividades ni comparte su archivo. El espacio se libera cuando se confirme el borrado del archivo.</p>
      <button disabled={busy} onClick={() => void run(async () => {
        await change({ action: 'delete', id: deleting.id, confirm: true }); setDeleting(null);
        setNotice('Material eliminado. El borrado del archivo puede seguir pendiente; actualiza para consultar su estado.');
      })}>Confirmar eliminación del material</button>
      <button disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button>
    </Dialog> : null}
  </section>;
}
