'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { type ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import { type Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { type FileState, type Material } from '../../../../../../src/core/contracts/materials.ts';
import type { ActivitySummary } from '../../../../../../src/core/contracts/activities.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';
import { createTextDocument } from '../../../../../shared-ui/text-document';
import { MaterialReader } from './MaterialReader.tsx';
import styles from './library.module.css';
import { materialSize } from './material-presentation.ts';

interface Metadata { title: string; unitId: string | null; topicId: string | null; body?: string | null; description?: string | null; activityIds?: string[]; resourceUse?: Material['resourceUse']; contentKind?: Material['contentKind'] }
type MaterialKind = 'FILE' | 'TEXT';
type WrittenSource = { file: FileState; snapshot: string };

const useLabels = { STUDY: 'Material de estudio', RECOMMENDED: 'Recomendado', COMPLEMENTARY: 'Material complementario' };
function textDocument(title: string, body: string) {
  return new File([createTextDocument(title, body) as BlobPart], 'material.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

const emptyMaterial: Metadata = { title: '', unitId: null, topicId: null, body: '', resourceUse: 'STUDY' };

export function MaterialForm({ api, room, initial, draft, kind, busy, editing = false, blocked = false, label, onSave, onCancel, onDraft, step = 'all', onContinue, onBack }: {
  api: ClassroomClient;
  room: Detail; initial?: Metadata; draft?: Metadata; kind: MaterialKind; busy: boolean; editing?: boolean; blocked?: boolean; label: string;
  step?: 'all' | 'details' | 'organization'; onContinue?: (metadata: Metadata) => Promise<void>; onBack?: () => void;
  onSave: (metadata: Metadata) => Promise<void>; onCancel: () => void; onDraft?: (metadata: Metadata) => void;
}) {
  const [local, setLocal] = useState<Metadata>(() => ({ ...emptyMaterial, ...initial }));
  const value = draft ?? local;
  const { title, unitId, topicId, resourceUse } = value, body = value.body ?? '';
  const update = (next: Partial<Metadata>) => (onDraft ?? setLocal)({ ...value, ...next });
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [activityError, setActivityError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setActivityError('');
    void api.call<{activities: ActivitySummary[]}>(`/${room.id}/activities`, 'GET', undefined, controller.signal)
      .then(result => { if (!controller.signal.aborted) setActivities(result.activities); })
      .catch(() => { if (!controller.signal.aborted) setActivityError('No pudimos cargar las actividades. Los vínculos actuales se conservan.'); });
    return () => controller.abort();
  }, [api, room.id, retry]);

  const topics = room.units.find(unit => unit.id === unitId)?.topics ?? [];
  const originalDescription = initial?.description ?? (kind === 'FILE' ? initial?.body : null) ?? '';
  const description = value.description ?? (kind === 'FILE' ? value.body : null) ?? '';
  const descriptionHelpId = useId();
  const descriptionTooLong = [...description.trim()].length > 2000;
  const unchangedDescription = editing && description === originalDescription;
  const retainLongDescription = kind === 'FILE' && descriptionTooLong && unchangedDescription;
  const invalidDescription = descriptionTooLong && !retainLongDescription;
  return <form className={styles.form} aria-busy={busy} onSubmit={event => {
    event.preventDefault();
    if (busy || blocked || invalidDescription || !title.trim() || kind === 'TEXT' && !body.trim()) return;
    void (step === 'details' && onContinue ? onContinue : onSave)({ title: title.trim(), unitId: unitId || null, topicId: topicId || null, ...(kind === 'TEXT' ? {body} : {}), ...(unchangedDescription ? {} : { description: description.trim() || null }), activityIds: value.activityIds, resourceUse });
  }}>
    <fieldset disabled={busy}>
      <legend className="sr-only">{label}</legend>
      <div hidden={step === 'organization'} className={styles.detailsFields}>
      <label>Título<input aria-label="Nombre del material" required maxLength={200} value={title} onChange={event => update({ title: event.target.value })} /></label>
      {kind === 'TEXT' ? <label>Contenido<textarea aria-label="Contenido" required rows={6} maxLength={20000} value={body} onChange={event => update({body: event.target.value})}/></label> : null}
      <label>Descripción (opcional)<textarea aria-label="Descripción (opcional)" rows={3} value={description}
        aria-invalid={invalidDescription} aria-describedby={descriptionTooLong ? descriptionHelpId : undefined}
        onChange={event => update({description:event.target.value})}/></label>
      {descriptionTooLong ? <small id={descriptionHelpId} role={invalidDescription ? 'alert' : undefined}>
        {retainLongDescription ? 'Esta descripción supera los 2000 caracteres. Podés conservarla tal como está, acortarla o borrarla.'
          : 'Usá hasta 2000 caracteres para guardar la descripción.'}</small> : null}
      </div>
      <section hidden={step === 'details'} className={styles.organize} aria-label="Organizar material">
        <header><FoxmindIcon name="book"/><strong>¿Dónde lo van a encontrar?</strong><small>Opcional</small></header>
        <div className={styles.assignment}><label>Unidad<select aria-label="Unidad del material" value={unitId ?? ''} onChange={event => update({ unitId: event.target.value || null, topicId: null })}>
          <option value="">Sin unidad</option>
          {room.units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
        </select></label>
        <label>Tema<select aria-label="Tema del material" value={topicId ?? ''} disabled={!unitId} onChange={event => update({ topicId: event.target.value || null })}>
          <option value="">Sin tema</option>
          {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
        </select></label></div>
        <div className={styles.activityChoices}><strong>Actividades vinculadas <small>(opcional)</small></strong>
          {activityError ? <Notice error>{activityError}<button type="button" onClick={() => setRetry(current => current + 1)}>Reintentar</button></Notice> : null}
          {!activityError && activities.length === 0 ? <p>Cuando haya actividades compartidas en esta aula, vas a poder vincularlas.</p> : null}
          {activities.map(activity => <label key={activity.id}><input type="checkbox" checked={value.activityIds?.includes(activity.id) ?? false} disabled={activity.locked || activity.status === 'WITHDRAWN' && !value.activityIds?.includes(activity.id)} onChange={event => update({activityIds:event.target.checked ? [...(value.activityIds ?? []),activity.id] : (value.activityIds ?? []).filter(id => id !== activity.id)})}/><span>{activity.title || 'Borrador sin título'}<small>{activity.locked ? 'Ya tiene respuestas · vínculo protegido' : activity.status === 'DRAFT' ? 'Borrador privado' : activity.status === 'WITHDRAWN' ? 'Retirada del aula' : 'Compartida con el aula'}</small></span></label>)}
        </div>
      </section>
      <footer className="p5-form-footer"><button type="button" onClick={onCancel}>Cancelar</button>
        {step === 'organization' && onBack ? <button type="button" onClick={onBack}>Volver</button> : null}
        <button className="primary" aria-label={step === 'details' ? 'Preparar y continuar' : label} disabled={blocked || invalidDescription || !title.trim() || kind === 'TEXT' && !body.trim()}>{busy ? 'Guardando…' : step === 'details' ? 'Preparar y continuar' : label === 'Guardar datos del material' ? 'Guardar cambios' : label}</button>
      </footer>
    </fieldset>
  </form>;
}

function fileFeedback(file: FileState, busy: boolean, onReview: () => void) {
  const rejected = Boolean(file.rejectionCode || file.validation === 'REJECTED' || ['ERROR', 'REJECTED'].includes(file.scan));
  return <div className={styles.fileFeedback} data-state={file.ready ? 'success' : rejected ? 'error' : 'pending'} role={rejected ? 'alert' : 'status'}>
    <div><strong>{file.name}</strong><p>{file.ready ? 'Archivo aprobado. Ya podés publicarlo.' : file.rejectionCode || file.validation === 'REJECTED' || ['ERROR', 'REJECTED'].includes(file.scan)
      ? 'El archivo no está aprobado. Elegí otro archivo o volvé a consultar la revisión.'
      : 'Archivo en revisión. Todavía no está disponible para publicar ni descargar.'}</p></div>
    {!file.ready ? <button type="button" disabled={busy} onClick={onReview}>Consultar revisión del material</button> : null}
  </div>;
}

export function Library({ api, room, reload, targetMaterialId, openUpload, uploadContext, onUploadContextConsumed, active = true, presentation = 'library', onReaderClose, onUploadClose }: { presentation?: 'library' | 'reader' | 'upload'; onReaderClose?: () => void; onUploadClose?: () => void; api: ClassroomClient; room: Detail; reload: () => Promise<void>; targetMaterialId?: string; openUpload?: boolean; uploadContext?: ClassroomCreationContext | null; onUploadContextConsumed?: () => void; active?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const targetFocusPending = useRef(false);
  const restoreReaderFocus = useRef<string>(null);
  const [materials, setMaterials] = useState<Material[]>([]), [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('all');
  const [uploadInitial, setUploadInitial] = useState<Metadata | undefined>();
  const [uploadExpanded, setUploadExpanded] = useState(Boolean(openUpload) || presentation === 'upload');
  const consumedContext = useRef<ClassroomCreationContext | null>(null);
  const [pendingUploadContext, setPendingUploadContext] = useState<ClassroomCreationContext | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [file, setFile] = useState<FileState | null>(null), [editing, setEditing] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState<Material | null>(null);
  const [reading,setReading]=useState<Material|null>(null);
  const [readerDismissed, setReaderDismissed] = useState(false);
  const [kind, setKind] = useState<MaterialKind>('FILE');
  const [uploadStep, setUploadStep] = useState<'details' | 'organization'>('details');
  const [uploadPublished, setUploadPublished] = useState(false);
  const [written, setWritten] = useState<WrittenSource>();
  const [revisionSource, setRevisionSource] = useState<WrittenSource>();
  const [uploadDrafts, setUploadDrafts] = useState<Partial<Record<MaterialKind, Metadata>>>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [publishedFileId, setPublishedFileId] = useState<string>();
  const uploadDirty = Boolean(uploadDrafts.FILE || uploadDrafts.TEXT);
  const [uploadVersion, setUploadVersion] = useState(0);
  const operation = useRef(false);
  const clearUpload = () => {
    setUploadPublished(false); setUploadStep('details'); setKind('FILE'); setFile(null); setWritten(undefined); setUploadInitial(undefined);
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
    return (location === 'all' || location === material.unitId || location === material.topicId || location === 'none' && !material.unitId && !material.topicId) && normalize([material.title, ...type,
      material.description, material.resourceUse && useLabels[material.resourceUse], unit?.name, topic?.name].filter(Boolean).join(' ')).includes(matches);
  });
  useEffect(() => {
    setReaderDismissed(false);
    targetFocusPending.current = Boolean(targetMaterialId && active);
    if (targetMaterialId && active) { setQuery(''); setLocation('all'); }
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
    try { await Promise.all([reload(), load()]); return true; }
    catch { setError(presentation === 'upload' ? 'El material se publicó. No pudimos actualizar el Plan; podés reintentar sin volver a publicar.' : 'El cambio se guardó. Actualizá la Biblioteca para ver los datos más recientes.'); return false; }
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
  const discardUpload = () => { clearUpload(); setUploadExpanded(false); setError(''); if (presentation === 'upload') onUploadClose?.(); };
  const closeUpload = () => {
    if (busy) return;
    if (uploadPublished) discardUpload();
    else if (confirmDiscard) setConfirmDiscard(false);
    else if (uploadDirty || file || written) setConfirmDiscard(true);
    else discardUpload();
  };
  const published = currentMaterials.find(material => material.fileId === publishedFileId && material.ready && !material.deleted);
  const uploadDialog = writable && active && uploadExpanded ? <Dialog className={styles.dialog} title={uploadPublished ? 'Material publicado' : confirmDiscard ? 'Descartar el material sin publicar' : 'Subir archivo'} onClose={closeUpload}>
      {uploadPublished ? <div className={styles.upload}>
        <p role="status">El material ya está publicado en el aula.</p>
        {error ? <Notice error>{error}</Notice> : busy ? <p role="status">Actualizando el Plan…</p> : null}
        <footer className="p5-form-footer"><button type="button" disabled={busy} onClick={discardUpload}>Cerrar</button>
          <button type="button" disabled={busy} onClick={() => void run(async () => { await Promise.all([reload(), load()]); discardUpload(); })}>Actualizar Plan y cerrar</button></footer>
      </div> : confirmDiscard ? <div className={styles.upload}>
        <p>Los cambios de este formulario se perderán si salís. El material todavía no se publicó.</p>
        <footer className="p5-form-footer">
          <button type="button" autoFocus onClick={() => setConfirmDiscard(false)}>Seguir editando</button>
          <button type="button" onClick={discardUpload}>Descartar material</button>
        </footer>
      </div> : <div className={styles.upload}>
      {error ? <Notice error>{error}</Notice> : null}
      <ol className={styles.steps} aria-label="Pasos de carga"><li aria-current={uploadStep === 'details' ? 'step' : undefined}>1. Archivo y detalles</li><li aria-current={uploadStep === 'organization' ? 'step' : undefined}>2. Organización</li></ol>
      {kind === 'FILE' && uploadStep === 'details' ? <div className={styles.drop} onDragOver={event => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault();
      }} onDrop={event => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        if (busy) return;
        if (event.dataTransfer.files.length !== 1) { setError('Elegí un solo archivo por vez.'); return; }
        void upload(event.dataTransfer.files[0]);
      }}>
        <span className={styles.uploadIcon}><FoxmindIcon name={file ? 'file' : 'upload'} /></span>
        <strong>{file ? 'Archivo del material' : 'Elegir archivo'}</strong>
        <small>PDF, Word y PowerPoint · hasta 20 MB. Imágenes, Excel y ZIP · hasta 50 MB.</small>
        <label className={styles.picker}>{file ? 'Cambiar archivo' : 'Seleccionar archivo'}
          <input type="file" aria-label="Archivo del material" disabled={busy} accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.jpg,.jpeg,.png,.zip"
            onChange={event => { const selected = event.target.files?.[0]; event.target.value = ''; void upload(selected); }} />
        </label>
      </div> : null}
      {busy ? <p className={styles.working} role="status"><span aria-hidden="true" />Procesando material…</p> : null}
      {activeFile ? fileFeedback(activeFile, busy, () => void run(async () => {
        const updated = await api.fileStatus(activeFile.id);
        if (kind === 'FILE') setFile(updated);
        else if (written) setWritten({ ...written, file: updated });
      })) : null}
      <MaterialForm api={api} key={uploadVersion} room={room} initial={uploadInitial} draft={uploadDrafts[kind] ?? { ...emptyMaterial, ...uploadInitial }} kind={kind}
        step={uploadStep} onBack={() => setUploadStep('details')} onContinue={metadata => run(async () => {
          const source = kind === 'FILE' ? file : await getWrittenSource(metadata, written, setWritten);
          if (!source?.ready) throw new Error('El archivo debe aprobar la revisión antes de continuar.');
          setUploadStep('organization');
        })}
        busy={busy || kind === 'FILE' && Boolean(file && !file.ready)} blocked={kind === 'FILE' && !file?.ready} label="Publicar material" onCancel={closeUpload} onDraft={draft => setUploadDrafts(previous => ({ ...previous, [kind]: draft }))}
        onSave={metadata => run(async () => {
          const source = kind === 'FILE' ? file : await getWrittenSource(metadata, written, setWritten);
          if (!source?.ready) throw new Error('El archivo debe aprobar la revisión antes de publicar el material.');
          const refreshed = await change({ action: 'publish', fileId: source.id, ...metadata, contentKind: kind }, () => {
            clearUpload(); setQuery(''); setUploadExpanded(presentation === 'upload'); setPublishedFileId(source.id); setNotice('Material publicado.');
            setUploadPublished(presentation === 'upload');
          });
          if (refreshed && presentation === 'upload') { setUploadExpanded(false); onUploadClose?.(); }
        })} />
    </div>}
    </Dialog> : null;
  const contextDialog = active && pendingUploadContext ? <Dialog title="Cambiar el destino del material" onClose={() => { setPendingUploadContext(null); onUploadContextConsumed?.(); }}>
      <p>Ya tenés un material sin publicar. Podés volver al formulario y conservar sus datos. Si cambiás el destino, se descartan los datos que escribiste en el formulario.</p>
      <button disabled={busy} onClick={() => { setPendingUploadContext(null); onUploadContextConsumed?.(); }}>Conservar el formulario abierto</button>
      <button disabled={busy} onClick={() => {
        const unit = room.units.find(item => item.id === pendingUploadContext.unitId);
        if (!unit?.id) return;
        const topic = unit.topics.find(item => item.id === pendingUploadContext.topicIds[0]);
        setUploadInitial({ title: '', unitId: unit.id, topicId: topic?.id ?? null });
        setUploadVersion(value => value + 1); setUploadDrafts({}); setUploadStep('details');
        setUploadExpanded(true); setPendingUploadContext(null); onUploadContextConsumed?.();
      }}>Descartar datos locales y cambiar destino</button>
    </Dialog> : null;
  if (presentation === 'upload') {
    if (!active) return null;
    if (!writable) return <Dialog title="No podés publicar material" onClose={discardUpload}><p>No podés publicar material en esta aula con tus permisos actuales.</p><button type="button" onClick={discardUpload}>Cerrar</button></Dialog>;
    return <>{uploadDialog}{contextDialog}</>;
  }
  if (presentation === 'reader') {
    if (!active || readerDismissed) return null;
    const closeReader = () => { setReaderDismissed(true); setReading(null); onReaderClose?.(); };
    if (reading) return <MaterialReader api={api} room={room} material={reading} writable={writable} busy={busy} onClose={closeReader} onEdit={() => {}} onDelete={() => {}}/>;
    return <Dialog title={loaded ? 'Material no disponible' : 'Abriendo material'} onClose={closeReader}>
      {error ? <Notice error>{error}<button disabled={busy} onClick={() => void run(async () => { await load(); targetFocusPending.current = true; })}>Reintentar</button></Notice>
        : loaded ? <p>El material ya no está disponible para tu cuenta.</p> : <p role="status">Cargando material…</p>}
      <button type="button" onClick={closeReader}>Cerrar</button>
    </Dialog>;
  }
  return <section ref={root} aria-label="Biblioteca del aula" className={styles.library}>
    <header className="p5-section-head cl-section"><div><h2>Biblioteca</h2><p>Archivos y apuntes compartidos con el aula.</p></div>
      <div className="p5-actions">{writable ? <button className="primary" disabled={busy} onClick={() => { setReading(null); setUploadExpanded(true); }}><FoxmindIcon name="upload"/>Subir archivo</button> : null}</div>
    </header>
     {error && !uploadExpanded && !editing && !deleting ? <Notice error>{error}{' '}
      <button disabled={busy} onClick={() => void run(async () => { await Promise.all([reload(), load()]); })}>Actualizar Biblioteca</button></Notice> : null}
    {notice ? <Notice><span>{notice}</span>{published && !reading ? <button type="button" onClick={() => setReading(published)}>Ver material publicado</button> : null}</Notice> : null}
    {!loaded && !error ? <Notice>Cargando materiales…</Notice> : null}
    {uploadDialog}
    {loaded && targetMaterialId && !materials.some(item => item.id === targetMaterialId) ? <Notice>El material ya no está disponible para tu cuenta.</Notice> : null}
    {openUpload && !writable ? <Notice>No podés publicar material en esta aula con tus permisos actuales.</Notice> : null}
    <div className={styles.toolbar}>
      <label className={styles.search}><span>Buscar material</span><div><FoxmindIcon name="search"/><input type="search" aria-label="Buscar material o tema" placeholder="Título o archivo" value={query} onChange={event=>setQuery(event.target.value)}/></div></label>
      <label className={styles.location}><span>Unidad o tema</span><select value={location} onChange={event=>setLocation(event.target.value)}><option value="all">Todos los materiales</option><option value="none">Sin unidad ni tema</option>{room.units.map(unit=><optgroup key={unit.id} label={unit.name}><option value={unit.id}>{unit.name}</option>{unit.topics.map(topic=><option key={topic.id} value={topic.id}>{topic.name}</option>)}</optgroup>)}</select></label>
    </div>
    {loaded ? <small role="status" className={styles.count}>{filtered.length} {filtered.length === 1 ? 'material' : 'materiales'}</small> : null}
    {loaded && filtered.length === 0 ? <div className={styles.empty}>
      <FoxmindIcon name="folder"/>
      <h3>{query.trim() || location !== 'all' ? 'No encontramos materiales con esos filtros' : 'Todavía no hay materiales'}</h3>
      <p>{query.trim() || location !== 'all' ? 'Probá otra búsqueda o cambiá el filtro.' : 'Los recursos compartidos para esta aula van a aparecer acá.'}</p>
    </div> : null}
    <div className={styles.list}>{filtered.map(material => {
      const unit = room.units.find(item => item.id === material.unitId), topic = unit?.topics.find(item => item.id === material.topicId);
      return <article className={styles.row} data-current={material.id === targetMaterialId || material.id === published?.id} key={material.id} aria-label={material.title} data-material-id={material.id} tabIndex={material.id === targetMaterialId ? -1 : undefined}>
        <span className={styles.fileMark}><FoxmindIcon name="file"/><small>{material.contentKind === 'TEXT' ? 'TXT' : material.extension?.toUpperCase() ?? 'DOC'}</small></span>
        <div className={styles.copy}>
          <div className={styles.metadata}><span className={styles.badge}>{material.contentKind === 'TEXT' ? 'Lectura' : material.extension?.toUpperCase() ?? 'Archivo'}</span>
            {material.resourceUse ? <small>{useLabels[material.resourceUse]}</small> : null}</div>
          <h3>{material.title}</h3><p>{[material.extension?.toUpperCase(), unit ? `${unit.name}${topic ? ` · ${topic.name}` : ''}` : 'Sin unidad ni tema', materialSize(material.sizeBytes)].filter(Boolean).join(' · ')}</p>{material.description ? <p>{material.description}</p> : null}{material.activityIds?.length ? <strong className={styles.linked}>{material.activityIds.length} {material.activityIds.length === 1 ? 'actividad vinculada' : 'actividades vinculadas'}</strong> : null}
        </div>
        <div className={styles.rowActions}>
        {material.deleted ? <Notice>{material.deletionPending ? 'Material eliminado. El borrado del archivo está pendiente; su espacio sigue reservado hasta confirmarlo.' : 'Material y archivo eliminados. El espacio fue liberado.'}</Notice>
          : material.ready ? <div className="p5-actions">
            <button type="button" aria-label={`Abrir material: ${material.title}`} onClick={() => setReading(material)}><FoxmindIcon name="book"/>Abrir</button>

          </div> : <Notice>Archivo no disponible: la revisión de seguridad no permite descargarlo.</Notice>}
        </div>
      </article>;
    })}</div>
    {active && reading ? <MaterialReader api={api} room={room} material={reading} writable={writable} busy={busy} onClose={() => { restoreReaderFocus.current = reading.id; setReading(null); }} onEdit={() => { setRevisionSource(undefined); setEditing(reading); }} onDelete={()=>setDeleting(reading)}/> : null}
    {active && editing ? <Dialog className={styles.dialog} title="Editar material" onClose={() => !busy && setEditing(null)}>
      <div className={styles.upload}>
        {editing.contentKind === 'TEXT' && editing.linked ? <p>Si cambiás el contenido, las actividades que ya tienen respuestas conservan la versión anterior. La nueva versión estará disponible en Biblioteca.</p> : null}
        {revisionSource && !revisionSource.file.ready ? fileFeedback(revisionSource.file, busy, () => void run(async () => {
          setRevisionSource({ ...revisionSource, file: await api.fileStatus(revisionSource.file.id) });
        })) : null}
        {error ? <Notice error>{error}</Notice> : null}
        <MaterialForm api={api} key={editing.id} room={room} initial={editing} editing kind={editing.contentKind ?? 'FILE'} busy={busy}
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
    {contextDialog}
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
