'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import { type Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { type FileState, type Material } from '../../../../../../src/core/contracts/materials.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';
import { createTextDocument } from '../../../../../shared-ui/text-document';
import { MaterialReader } from './MaterialReader.tsx';
import styles from './library.module.css';

interface Metadata { title: string; unitId: string | null; topicId: string | null; body?: string | null; resourceUse?: Material['resourceUse']; contentKind?: Material['contentKind'] }
type MaterialKind = 'FILE' | 'TEXT';
type WrittenSource = { file: FileState; snapshot: string };

const useLabels = { STUDY: 'Material de estudio', RECOMMENDED: 'Recomendado', COMPLEMENTARY: 'Material complementario' };
function textDocument(title: string, body: string) {
  return new File([createTextDocument(title, body) as BlobPart], 'material.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

const emptyMaterial: Metadata = { title: '', unitId: null, topicId: null, body: '', resourceUse: 'STUDY' };

function MaterialForm({ room, initial, draft, kind, busy, blocked = false, label, onSave, onCancel, onDraft }: {
  room: Detail; initial?: Metadata; draft?: Metadata; kind: MaterialKind; busy: boolean; blocked?: boolean; label: string;
  onSave: (metadata: Metadata) => Promise<void>; onCancel: () => void; onDraft?: (metadata: Metadata) => void;
}) {
  const [local, setLocal] = useState<Metadata>(() => ({ ...emptyMaterial, ...initial }));
  const value = draft ?? local;
  const { title, unitId, topicId, resourceUse } = value, body = value.body ?? '';
  const update = (next: Partial<Metadata>) => (onDraft ?? setLocal)({ ...value, ...next });

  const topics = room.units.find(unit => unit.id === unitId)?.topics ?? [];
  return <form className={styles.form} aria-busy={busy} onSubmit={event => {
    event.preventDefault();
    if (busy || blocked || !title.trim() || kind === 'TEXT' && !body.trim()) return;
    void onSave({ title: title.trim(), unitId: unitId || null, topicId: topicId || null, body, resourceUse });
  }}>
    <fieldset disabled={busy}>
      <legend className="sr-only">{label}</legend>
      <label>Título<input aria-label="Nombre del material" required maxLength={200} value={title} onChange={event => update({ title: event.target.value })} /></label>
      <label>{kind === 'TEXT' ? 'Contenido' : 'Descripción (opcional)'}
        <textarea aria-label={kind === 'TEXT' ? 'Contenido' : 'Descripción (opcional)'} required={kind === 'TEXT'} rows={kind === 'TEXT' ? 6 : 3}
          maxLength={20000} value={body} onChange={event => update({ body: event.target.value })} /></label>
      <details className={styles.organize} open={Boolean(initial?.unitId || initial?.resourceUse && initial.resourceUse !== 'STUDY') || undefined}>
        <summary>Organizar en el plan <small>Opcional</small></summary>
        <div className={styles.assignment}><label>Unidad<select aria-label="Unidad del material" value={unitId ?? ''} onChange={event => update({ unitId: event.target.value || null, topicId: null })}>
          <option value="">Material extra / recomendado</option>
          {room.units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
        </select></label>
        <label>Tema<select aria-label="Tema del material" value={topicId ?? ''} disabled={!unitId} onChange={event => update({ topicId: event.target.value || null })}>
          <option value="">Sin tema específico</option>
          {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
        </select></label></div>
        <label>Uso del recurso<select aria-label="Uso del recurso" value={resourceUse ?? 'STUDY'} onChange={event => update({ resourceUse: event.target.value as Material['resourceUse'] })}>
          {Object.entries(useLabels).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select></label>
      </details>
      <footer className="p5-form-footer"><button type="button" onClick={onCancel}>Cancelar</button>
        <button className="primary" aria-label={label} disabled={blocked || !title.trim() || kind === 'TEXT' && !body.trim()}>{busy ? 'Guardando…' : label === 'Guardar datos del material' ? 'Guardar cambios' : label}</button>
      </footer>
    </fieldset>
  </form>;
}

function fileFeedback(file: FileState, busy: boolean, onReview: () => void) {
  return <div className={styles.fileFeedback} role="status">
    <div><strong>{file.name}</strong><p>{file.ready ? 'Archivo aprobado. Ya podés publicarlo.' : file.rejectionCode || file.validation === 'REJECTED' || ['ERROR', 'REJECTED'].includes(file.scan)
      ? 'El archivo no está aprobado. Elegí otro archivo o volvé a consultar la revisión.'
      : 'Archivo en revisión. Todavía no está disponible para publicar ni descargar.'}</p></div>
    {!file.ready ? <button type="button" disabled={busy} onClick={onReview}>Consultar revisión del material</button> : null}
  </div>;
}

export function Library({ api, room, reload, targetMaterialId, openUpload, uploadContext, onUploadContextConsumed, active = true }: { api: ClassroomClient; room: Detail; reload: () => Promise<void>; targetMaterialId?: string; openUpload?: boolean; uploadContext?: ClassroomCreationContext | null; onUploadContextConsumed?: () => void; active?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const targetFocusPending = useRef(false);
  const restoreReaderFocus = useRef<string>(null);
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
  const [kind, setKind] = useState<MaterialKind>('FILE');
  const [written, setWritten] = useState<WrittenSource>();
  const [revisionSource, setRevisionSource] = useState<WrittenSource>();
  const [uploadDrafts, setUploadDrafts] = useState<Partial<Record<MaterialKind, Metadata>>>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [publishedFileId, setPublishedFileId] = useState<string>();
  const uploadDirty = Boolean(uploadDrafts.FILE || uploadDrafts.TEXT);
  const [uploadVersion, setUploadVersion] = useState(0);
  const operation = useRef(false);
  const clearUpload = () => {
    setKind('FILE'); setFile(null); setWritten(undefined); setUploadInitial(undefined);
    setUploadDrafts({}); setConfirmDiscard(false); setUploadVersion(value => value + 1);
  };
  useEffect(() => { if (!active) { setEditing(null); setDeleting(null); setReading(null); setUploadExpanded(false); setConfirmDiscard(false); } }, [active]);
  useEffect(() => { if (active && openUpload) {setReading(null);setUploadExpanded(true);} }, [active, openUpload]);
  const writable = room.role === 'teacher' && !room.archived;
  useEffect(() => {
    if (!uploadContext || uploadContext === consumedContext.current || !writable) return;
    const unit = room.units.find(item => item.id === uploadContext.unitId);
    if (!unit?.id) return;
    consumedContext.current = uploadContext;
    if (file || written || uploadDirty || busy) { setPendingUploadContext(uploadContext); return; }
    const topic = unit.topics.find(item => item.id === uploadContext.topicIds[0]);
    setUploadInitial({ title: '', unitId: unit.id, topicId: topic?.id ?? null });
    setReading(null);
    setUploadExpanded(true);
    onUploadContextConsumed?.();
  }, [uploadContext, writable, room.units, onUploadContextConsumed, file, written, uploadDirty, busy]);
  const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es-AR');
  const matches = normalize(query.trim());
  const currentMaterials = materials.filter(material => !material.supersededBy);
  const filtered = currentMaterials.filter(material => {
    const unit = room.units.find(item => item.id === material.unitId);
    const topic = unit?.topics.find(item => item.id === material.topicId);
    const type = material.contentKind === 'TEXT' ? ['Texto', 'Lectura'] : [material.extension, material.fileName];
    return normalize([material.title, ...type,
      material.resourceUse && useLabels[material.resourceUse], unit?.name, topic?.name].filter(Boolean).join(' ')).includes(matches);
  });
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
  useEffect(() => {
    const id = restoreReaderFocus.current;
    if (reading || !id) return;
    restoreReaderFocus.current = null;
    const item = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-material-id]') ?? []).find(row => row.dataset.materialId === id);
    (item?.querySelector<HTMLButtonElement>('button') ?? root.current?.querySelector<HTMLInputElement>('input[type=search]'))?.focus();
  }, [reading]);
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
    if (operation.current) return;
    operation.current = true; setBusy(true); setError(''); setNotice(''); setPublishedFileId(undefined);
    try { await task(); } catch (e) { setError((e as Error).message); } finally { operation.current = false; setBusy(false); }
  }
  async function change(operation: Record<string, unknown>, onSaved: () => void) {
    await api.call(`/${room.id}/library`, 'POST', { revision: room.revision, operation });
    onSaved();
    try { await Promise.all([reload(), load()]); }
    catch { setError('El cambio se guardó. Actualizá la Biblioteca para ver los datos más recientes.'); }
  }
  async function upload(selected: File | undefined) {
    if (!selected) return;
    await run(async () => {
      if (!api.uploadClassroom) throw new Error('La carga de archivos no está disponible.');
      setFile(null);
      const next = await api.uploadClassroom(room.id, selected, 'material');
      setFile(next);
      if (next.ready) setUploadDrafts(previous => {
        const current = previous.FILE ?? { ...emptyMaterial, ...uploadInitial };
        if (current.title.trim()) return previous;
        return { ...previous, FILE: { ...current, title: (next.name ?? selected.name).replace(/\.[^.]+$/, '').slice(0, 200) } };
      });
    });
  }
  async function getWrittenSource(metadata: Metadata, previous: WrittenSource | undefined, remember: (source: WrittenSource) => void) {
    const body = metadata.body ?? '';
    if (!body.trim()) throw new Error('Escribí el contenido del recurso.');
    const snapshot = JSON.stringify([metadata.title, body]);
    if (previous?.snapshot === snapshot) return previous.file;
    if (!api.uploadClassroom) throw new Error('La carga de archivos no está disponible.');
    const file = await api.uploadClassroom(room.id, textDocument(metadata.title, body), 'material');
    remember({ file, snapshot });
    return file;
  }
  const activeFile = kind === 'FILE' ? file : written?.file;
  const pendingFile = editing ? revisionSource?.file : uploadExpanded && !confirmDiscard ? activeFile : null;
  useEffect(() => {
    if (typeof document === 'undefined' || !active || busy || !pendingFile || pendingFile.ready || pendingFile.rejectionCode
      || pendingFile.validation === 'REJECTED' || ['ERROR', 'REJECTED'].includes(pendingFile.scan)) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let delay = 1500;
    const check = async () => {
      if (document.hidden) { timer = setTimeout(check, delay); return; }
      try {
        const next = await api.fileStatus(pendingFile.id, controller.signal);
        if (controller.signal.aborted || operation.current || next.id !== pendingFile.id) return;
        if (next.ready || next.rejectionCode || next.validation === 'REJECTED' || ['ERROR', 'REJECTED'].includes(next.scan)) {
          if (editing) setRevisionSource(previous => previous?.file.id === next.id ? { ...previous, file: next } : previous);
          else if (kind === 'FILE') setFile(previous => previous?.id === next.id ? next : previous);
          else setWritten(previous => previous?.file.id === next.id ? { ...previous, file: next } : previous);
          setError(''); return;
        }
        delay = Math.min(delay * 2, 10_000);
        timer = setTimeout(check, delay);
      } catch {
        if (!controller.signal.aborted) setError('No pudimos consultar el archivo. Podés volver a consultar la revisión.');
      }
    };
    timer = setTimeout(check, delay);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [api, active, busy, editing, kind, pendingFile]);
  const discardUpload = () => { clearUpload(); setUploadExpanded(false); setError(''); };
  const closeUpload = () => {
    if (busy) return;
    if (confirmDiscard) setConfirmDiscard(false);
    else if (uploadDirty || file || written) setConfirmDiscard(true);
    else discardUpload();
  };
  const published = currentMaterials.find(material => material.fileId === publishedFileId && material.ready && !material.deleted);
  return <section ref={root} aria-label="Biblioteca del aula" className={styles.library}>
    <header hidden={Boolean(reading)} className="p5-section-head cl-section"><div><h2>Biblioteca</h2><p>Materiales de las unidades y lecturas recomendadas.</p></div>
      <div className="p5-actions">{writable ? <button className="primary" disabled={busy} onClick={() => { setReading(null); setUploadExpanded(true); }}><FoxmindIcon name="plus"/>Agregar material</button> : null}</div>
    </header>
     {error && !uploadExpanded && !editing && !deleting ? <Notice error>{error}{' '}
      <button disabled={busy} onClick={() => void run(async () => { await Promise.all([reload(), load()]); })}>Actualizar Biblioteca</button></Notice> : null}
    {notice ? <Notice><span>{notice}</span>{published && !reading ? <button type="button" onClick={() => setReading(published)}>Ver material publicado</button> : null}</Notice> : null}
    {!loaded && !error ? <Notice>Cargando materiales…</Notice> : null}
    {writable && active && uploadExpanded ? <Dialog className={styles.dialog} title={confirmDiscard ? 'Descartar el material sin publicar' : 'Agregar material'} onClose={closeUpload}>
      {confirmDiscard ? <div className={styles.upload}>
        <p>Los cambios de este formulario se perderán si salís. El material todavía no se publicó.</p>
        <footer className="p5-form-footer">
          <button type="button" autoFocus onClick={() => setConfirmDiscard(false)}>Seguir editando</button>
          <button type="button" onClick={discardUpload}>Descartar material</button>
        </footer>
      </div> : <div className={styles.upload}>
      {error ? <Notice error>{error}</Notice> : null}
      <div className={styles.modes} role="group" aria-label="Formato del material">
        {([['FILE', 'Subir archivo'], ['TEXT', 'Escribir material']] as const).map(([value, label]) =>
          <button key={value} type="button" aria-label={label} aria-pressed={kind === value} disabled={busy}
            onClick={() => { setKind(value); setError(''); }}>{label}</button>)}
      </div>
      {kind === 'FILE' ? <div className={styles.drop} onDragOver={event => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault();
      }} onDrop={event => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        if (busy) return;
        if (event.dataTransfer.files.length !== 1) { setError('Elegí un solo archivo por vez.'); return; }
        void upload(event.dataTransfer.files[0]);
      }}>
        <span className={styles.uploadIcon}><FoxmindIcon name={file ? 'file' : 'upload'} /></span>
        <strong>{file ? 'Archivo del material' : 'Arrastrá o seleccioná un archivo'}</strong>
        <small>PDF, DOCX, PPTX, XLSX, JPG, JPEG, PNG o ZIP · hasta 50 MB</small>
        <label className={styles.picker}>{file ? 'Cambiar archivo' : 'Seleccionar archivo'}
          <input type="file" aria-label="Archivo del material" disabled={busy} accept=".pdf,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.zip"
            onChange={event => { const selected = event.target.files?.[0]; event.target.value = ''; void upload(selected); }} />
        </label>
      </div> : null}
      {busy ? <p className={styles.working} role="status"><span aria-hidden="true" />Procesando material…</p> : null}
      {activeFile ? fileFeedback(activeFile, busy, () => void run(async () => {
        const updated = await api.fileStatus(activeFile.id);
        if (kind === 'FILE') setFile(updated);
        else if (written) setWritten({ ...written, file: updated });
      })) : null}
      <MaterialForm key={uploadVersion} room={room} initial={uploadInitial} draft={uploadDrafts[kind] ?? { ...emptyMaterial, ...uploadInitial }} kind={kind}
        busy={busy || kind === 'FILE' && Boolean(file && !file.ready)} blocked={kind === 'FILE' && !file?.ready} label="Publicar en Biblioteca" onCancel={closeUpload} onDraft={draft => setUploadDrafts(previous => ({ ...previous, [kind]: draft }))}
        onSave={metadata => run(async () => {
          const source = kind === 'FILE' ? file : await getWrittenSource(metadata, written, setWritten);
          if (!source?.ready) throw new Error('El archivo debe aprobar la revisión antes de publicar el material.');
          await change({ action: 'publish', fileId: source.id, ...metadata, contentKind: kind }, () => {
            clearUpload(); setQuery(''); setUploadExpanded(false); setPublishedFileId(source.id); setNotice('Material publicado.');
          });
        })} />
    </div>}
    </Dialog> : null}
    {loaded && currentMaterials.length === 0 ? <p className="p5-empty">Todavía no hay materiales disponibles.</p> : null}
    {loaded && targetMaterialId && !materials.some(item => item.id === targetMaterialId) ? <Notice>El material ya no está disponible para tu cuenta.</Notice> : null}
    {openUpload && !writable ? <Notice>No podés publicar material en esta aula con tus permisos actuales.</Notice> : null}
    <div hidden={Boolean(reading)} className={styles.toolbar}><label className={styles.search}><span className="sr-only">Buscar material o tema</span><FoxmindIcon name="search"/><input type="search" aria-label="Buscar material o tema" placeholder="Buscar material o tema" value={query} onChange={event=>setQuery(event.target.value)}/></label></div>
    {loaded && currentMaterials.length > 0 && filtered.length === 0 ? <p className="p5-empty">No se encontraron materiales para esta búsqueda.</p> : null}
    <div hidden={Boolean(reading)} className={styles.list}>{filtered.map(material => {
      const unit = room.units.find(item => item.id === material.unitId), topic = unit?.topics.find(item => item.id === material.topicId);
      return <article className={styles.row} data-current={material.id === targetMaterialId || material.id === published?.id} key={material.id} aria-label={material.title} data-material-id={material.id} tabIndex={material.id === targetMaterialId ? -1 : undefined}>
        <div className={styles.copy}>
          <div className={styles.metadata}><span className={styles.badge}>{material.contentKind === 'TEXT' ? 'Lectura' : material.extension?.toUpperCase() ?? 'Archivo'}</span>
            {material.resourceUse ? <small>{useLabels[material.resourceUse]}</small> : null}</div>
          <h3>{material.title}</h3><p>{unit ? `${unit.name}${topic ? ` · ${topic.name}` : ''}` : 'Material extra / recomendado'}</p>
        </div>
        <div className={styles.rowActions}>
        {material.deleted ? <Notice>{material.deletionPending ? 'Material eliminado. El borrado del archivo está pendiente; su espacio sigue reservado hasta confirmarlo.' : 'Material y archivo eliminados. El espacio fue liberado.'}</Notice>
          : material.ready ? <div className="p5-actions">
            <button type="button" aria-label={`Abrir material: ${material.title}`} onClick={() => setReading(material)}>{material.contentKind === 'TEXT' ? 'Leer material' : 'Ver archivo'}</button>
            {writable ? <><button type="button" disabled={busy} aria-label={`Editar material: ${material.title}`} onClick={() => { setRevisionSource(undefined); setEditing(material); }}>Editar</button>
              <button type="button" disabled={busy || material.linked} title={material.linked ? 'Vinculado a una actividad' : undefined}
                aria-label={`Eliminar material: ${material.title}`} onClick={() => setDeleting(material)}>Eliminar</button></> : null}
          </div> : <Notice>Archivo no disponible: la revisión de seguridad no permite descargarlo.</Notice>}
        </div>
      </article>;
    })}</div>
    {active && reading ? <MaterialReader api={api} room={room} material={reading} writable={writable} busy={busy} onClose={() => { restoreReaderFocus.current = reading.id; setReading(null); }} onEdit={() => { setRevisionSource(undefined); setEditing(reading); }} onDelete={()=>setDeleting(reading)}/> : null}
    {active && editing ? <Dialog className={styles.dialog} title="Editar material" onClose={() => !busy && setEditing(null)}>
      <div className={styles.upload}>
        {revisionSource && !revisionSource.file.ready ? fileFeedback(revisionSource.file, busy, () => void run(async () => {
          setRevisionSource({ ...revisionSource, file: await api.fileStatus(revisionSource.file.id) });
        })) : null}
        {error ? <Notice error>{error}</Notice> : null}
        <MaterialForm key={editing.id} room={room} initial={editing} kind={editing.contentKind ?? 'FILE'} busy={busy}
          label="Guardar datos del material" onCancel={() => { setEditing(null); setError(''); }} onSave={metadata => run(async () => {
            const onSaved = () => { setEditing(null); setRevisionSource(undefined); setNotice('Datos del material guardados.'); };
            if (editing.contentKind === 'TEXT' && (metadata.title !== editing.title || metadata.body !== editing.body)) {
              const source = await getWrittenSource(metadata, revisionSource, setRevisionSource);
              if (!source.ready) throw new Error('El archivo debe aprobar la revisión antes de guardar el material.');
              await change({ action: 'revise', id: editing.id, fileId: source.id, ...metadata, contentKind: 'TEXT' }, onSaved);
            } else await change({ action: 'edit', id: editing.id, ...metadata, contentKind: editing.contentKind ?? 'FILE' }, onSaved);
          })} />
      </div>
    </Dialog> : null}
    {active && pendingUploadContext ? <Dialog title="Cambiar el destino del material" onClose={() => { setPendingUploadContext(null); onUploadContextConsumed?.(); }}>
      <p>Ya tenés un material sin publicar. Podés volver al formulario y conservar sus datos. Si cambiás el destino, se descartan los datos que escribiste en el formulario.</p>
      <button disabled={busy} onClick={() => { setPendingUploadContext(null); onUploadContextConsumed?.(); }}>Conservar el formulario abierto</button>
      <button disabled={busy} onClick={() => {
        const unit = room.units.find(item => item.id === pendingUploadContext.unitId);
        if (!unit?.id) return;
        const topic = unit.topics.find(item => item.id === pendingUploadContext.topicIds[0]);
        setUploadInitial({ title: '', unitId: unit.id, topicId: topic?.id ?? null });
        setUploadVersion(value => value + 1); setUploadDrafts({});
        setUploadExpanded(true); setPendingUploadContext(null); onUploadContextConsumed?.();
      }}>Descartar datos locales y cambiar destino</button>
    </Dialog> : null}
    {active && deleting ? <Dialog title="Eliminar material" onClose={() => !busy && setDeleting(null)}>
      <p>¿Eliminar «{deleting.title}»? Dejará de estar disponible. Solo se elimina si no está vinculado a actividades ni comparte su archivo. El espacio se libera cuando se confirme el borrado del archivo.</p>
      {error ? <Notice error>{error}</Notice> : null}
      <button disabled={busy} onClick={() => void run(async () => {
        await change({ action: 'delete', id: deleting.id, confirm: true }, () => {
          setDeleting(null); setReading(current => current?.id === deleting.id ? null : current);
          setNotice('Material eliminado. El cupo se libera al confirmar el borrado del archivo.');
        });
      })}>Confirmar eliminación del material</button>
      <button disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button>
    </Dialog> : null}
  </section>;
}
