'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { MaterialChange, MaterialMetadata as Metadata, MaterialsOperations } from '../model/materials-operations.ts';
import { type Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { type FileState, type Material } from '../../../../../../src/core/contracts/materials.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';
import { createTextDocument } from '../../../../../shared-ui/text-document';
import styles from './publishing.module.css';
import { MaterialForm } from './MaterialForm.tsx';
import { emptyMaterial, type MaterialKind, type WrittenSource } from './material-draft.ts';
function textDocument(title: string, body: string) {
    return new File([createTextDocument(title, body) as BlobPart], 'material.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
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
export interface PublishingControls {
    busy: boolean;
    error: string;
    notice: string;
    publishedFileId?: string;
    showError: boolean;
    open: () => void;
    edit: (material: Material) => void;
    remove: (material: Material) => void;
    retry: () => Promise<void>;
}
interface PublishingProps {
    api: MaterialsOperations;
    room: Detail;
    reload: () => Promise<void>;
    refresh?: () => Promise<void>;
    onPublished?: () => void;
    onDeleted?: (id: string) => void;
    openUpload?: boolean;
    uploadContext?: ClassroomCreationContext | null;
    onUploadContextConsumed?: () => void;
    active?: boolean;
    presentation?: 'library' | 'upload';
    onUploadClose?: () => void;
    children?: (controls: PublishingControls) => ReactNode;
}
export function MaterialPublishing({ api, room, reload, refresh, onPublished, onDeleted, openUpload, uploadContext, onUploadContextConsumed, active = true, presentation = 'library', onUploadClose, children }: PublishingProps) {
    const [uploadInitial, setUploadInitial] = useState<Metadata | undefined>();
    const [uploadExpanded, setUploadExpanded] = useState(Boolean(openUpload) || presentation === 'upload');
    const consumedContext = useRef<ClassroomCreationContext | null>(null);
    const [pendingUploadContext, setPendingUploadContext] = useState<ClassroomCreationContext | null>(null);
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const [file, setFile] = useState<FileState | null>(null), [editing, setEditing] = useState<Material | null>(null);
    const [deleting, setDeleting] = useState<Material | null>(null);
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
        setUploadPublished(false);
        setUploadStep('details');
        setKind('FILE');
        setFile(null);
        setWritten(undefined);
        setUploadInitial(undefined);
        setUploadDrafts({});
        setConfirmDiscard(false);
        setUploadVersion(value => value + 1);
    };
    useEffect(() => { if (!active) {
        setEditing(null);
        setDeleting(null);
        setUploadExpanded(false);
        setConfirmDiscard(false);
    } }, [active]);
    useEffect(() => { if (active && openUpload) {
        setUploadExpanded(true);
    } }, [active, openUpload]);
    const writable = room.role === 'teacher' && !room.archived;
    useEffect(() => {
        if (!uploadContext || uploadContext === consumedContext.current || !writable)
            return;
        const unit = room.units.find(item => item.id === uploadContext.unitId);
        if (!unit?.id)
            return;
        consumedContext.current = uploadContext;
        if (file || written || uploadDirty || busy) {
            setPendingUploadContext(uploadContext);
            return;
        }
        const topic = unit.topics.find(item => item.id === uploadContext.topicIds[0]);
        setUploadInitial({ title: '', unitId: unit.id, topicId: topic?.id ?? null });
        setUploadExpanded(true);
        onUploadContextConsumed?.();
    }, [uploadContext, writable, room.units, onUploadContextConsumed, file, written, uploadDirty, busy]);
    async function run(task: () => Promise<void>) {
        if (operation.current)
            return;
        operation.current = true;
        setBusy(true);
        setError('');
        setNotice('');
        setPublishedFileId(undefined);
        try {
            await task();
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            operation.current = false;
            setBusy(false);
        }
    }
    async function change(operation: MaterialChange, onSaved: () => void) {
        await api.change(room.id, room.revision, operation);
        onSaved();
        try {
            await Promise.all([reload(), refresh?.()]);
            return true;
        }
        catch {
            setError(presentation === 'upload' ? 'El material se publicó. No pudimos actualizar el Plan; podés reintentar sin volver a publicar.' : 'El cambio se guardó. Actualizá la Biblioteca para ver los datos más recientes.');
            return false;
        }
    }
    async function upload(selected: File | undefined) {
        if (!selected)
            return;
        await run(async () => {
            setFile(null);
            const next = await api.upload(room.id, selected);
            setFile(next);
            if (next.ready)
                setUploadDrafts(previous => {
                    const current = previous.FILE ?? { ...emptyMaterial, ...uploadInitial };
                    if (current.title.trim())
                        return previous;
                    return { ...previous, FILE: { ...current, title: (next.name ?? selected.name).replace(/\.[^.]+$/, '').slice(0, 200) } };
                });
        });
    }
    async function getWrittenSource(metadata: Metadata, previous: WrittenSource | undefined, remember: (source: WrittenSource) => void) {
        const body = metadata.body ?? '';
        if (!body.trim())
            throw new Error('Escribí el contenido del recurso.');
        // Same control-character rule the server applies to titles and bodies; failing here avoids uploading a document it would reject.
        if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(`${metadata.title}${body}`))
            throw new Error('El apunte tiene caracteres invisibles que no se pueden guardar. Borralos y volvé a intentar.');
        const snapshot = JSON.stringify([metadata.title, body]);
        if (previous?.snapshot === snapshot)
            return previous.file;
        const file = await api.upload(room.id, textDocument(metadata.title, body));
        remember({ file, snapshot });
        return file;
    }
    const activeFile = kind === 'FILE' ? file : written?.file;
    const pendingFile = editing ? revisionSource?.file : uploadExpanded && !confirmDiscard ? activeFile : null;
    useEffect(() => {
        if (typeof document === 'undefined' || !active || busy || !pendingFile || pendingFile.ready || pendingFile.rejectionCode
            || pendingFile.validation === 'REJECTED' || ['ERROR', 'REJECTED'].includes(pendingFile.scan))
            return;
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        let delay = 1500;
        const check = async () => {
            if (document.hidden) {
                timer = setTimeout(check, delay);
                return;
            }
            try {
                const next = await api.fileStatus(pendingFile.id, controller.signal);
                if (controller.signal.aborted || operation.current || next.id !== pendingFile.id)
                    return;
                if (next.ready || next.rejectionCode || next.validation === 'REJECTED' || ['ERROR', 'REJECTED'].includes(next.scan)) {
                    if (editing)
                        setRevisionSource(previous => previous?.file.id === next.id ? { ...previous, file: next } : previous);
                    else if (kind === 'FILE')
                        setFile(previous => previous?.id === next.id ? next : previous);
                    else
                        setWritten(previous => previous?.file.id === next.id ? { ...previous, file: next } : previous);
                    setError('');
                    return;
                }
                delay = Math.min(delay * 2, 10000);
                timer = setTimeout(check, delay);
            }
            catch {
                if (!controller.signal.aborted)
                    setError('No pudimos consultar el archivo. Podés volver a consultar la revisión.');
            }
        };
        timer = setTimeout(check, delay);
        return () => { controller.abort(); clearTimeout(timer); };
    }, [api, active, busy, editing, kind, pendingFile]);
    const discardUpload = () => { clearUpload(); setUploadExpanded(false); setError(''); if (presentation === 'upload')
        onUploadClose?.(); };
    const closeUpload = () => {
        if (busy)
            return;
        if (uploadPublished)
            discardUpload();
        else if (confirmDiscard)
            setConfirmDiscard(false);
        else if (uploadDirty || file || written)
            setConfirmDiscard(true);
        else
            discardUpload();
    };
    const uploadDialog = writable && active && uploadExpanded ? <Dialog className={styles.dialog} title={uploadPublished ? 'Material publicado' : confirmDiscard ? 'Descartar el material sin publicar' : kind === 'TEXT' ? 'Escribir un apunte' : 'Subir archivo'} onClose={closeUpload}>
      {uploadPublished ? <div className={styles.upload}>
        <p role="status">El material ya está publicado en el aula.</p>
        {error ? <Notice error>{error}</Notice> : busy ? <p role="status">Actualizando el Plan…</p> : null}
        <footer className="p5-form-footer"><button type="button" disabled={busy} onClick={discardUpload}>Cerrar</button>
          <button type="button" disabled={busy} onClick={() => void run(async () => { await Promise.all([reload(), refresh?.()]); discardUpload(); })}>Actualizar Plan y cerrar</button></footer>
      </div> : confirmDiscard ? <div className={styles.upload}>
        <p>Los cambios de este formulario se perderán si salís. El material todavía no se publicó.</p>
        <footer className="p5-form-footer">
          <button type="button" autoFocus onClick={() => setConfirmDiscard(false)}>Seguir editando</button>
          <button type="button" onClick={discardUpload}>Descartar material</button>
        </footer>
      </div> : <div className={styles.upload}>
      {error ? <Notice error>{error}</Notice> : null}
      <ol className={styles.steps} aria-label="Pasos de carga"><li aria-current={uploadStep === 'details' ? 'step' : undefined}>{kind === 'TEXT' ? '1. Apunte y detalles' : '1. Archivo y detalles'}</li><li aria-current={uploadStep === 'organization' ? 'step' : undefined}>2. Organización</li></ol>
      {uploadStep === 'details' ? <fieldset className="material-kind-choice" disabled={busy}><legend>¿Qué querés compartir?</legend>
        {([['FILE', 'upload', 'Subir un archivo', 'PDF, Word, PowerPoint, imágenes, Excel o ZIP.'], ['TEXT', 'edit', 'Escribir un apunte', 'Un texto breve que tu grupo lee en la app.']] as const).map(([value, icon, label, detail]) =>
          <label key={value}><input type="radio" name="material-kind" value={value} checked={kind === value} onChange={() => { setKind(value); setError(''); }}/><FoxmindIcon name={icon}/><span><b>{label}</b><small>{detail}</small></span></label>)}
      </fieldset> : null}
      {kind === 'FILE' && uploadStep === 'details' ? <div className={styles.drop} onDragOver={event => {
                    if (event.dataTransfer.types.includes('Files'))
                        event.preventDefault();
                }} onDrop={event => {
                    if (!event.dataTransfer.files.length)
                        return;
                    event.preventDefault();
                    if (busy)
                        return;
                    if (event.dataTransfer.files.length !== 1) {
                        setError('Elegí un solo archivo por vez.');
                        return;
                    }
                    void upload(event.dataTransfer.files[0]);
                }}>
        <span className={styles.uploadIcon}><FoxmindIcon name={file ? 'file' : 'upload'}/></span>
        <strong>{file ? 'Archivo del material' : 'Elegir archivo'}</strong>
        <small>PDF, Word y PowerPoint · hasta 20 MB. Imágenes, Excel y ZIP · hasta 50 MB.</small>
        <label className={styles.picker}>{file ? 'Cambiar archivo' : 'Seleccionar archivo'}
          <input type="file" aria-label="Archivo del material" disabled={busy} accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.jpg,.jpeg,.png,.zip" onChange={event => { const selected = event.target.files?.[0]; event.target.value = ''; void upload(selected); }}/>
        </label>
      </div> : null}
      {busy ? <p className={styles.working} role="status"><span aria-hidden="true"/>Procesando material…</p> : null}
      {activeFile ? fileFeedback(activeFile, busy, () => void run(async () => {
                const updated = await api.fileStatus(activeFile.id);
                if (kind === 'FILE')
                    setFile(updated);
                else if (written)
                    setWritten({ ...written, file: updated });
            })) : null}
      <MaterialForm api={api} key={uploadVersion} room={room} initial={uploadInitial} draft={uploadDrafts[kind] ?? { ...emptyMaterial, ...uploadInitial }} kind={kind} step={uploadStep} onBack={() => setUploadStep('details')} onContinue={metadata => run(async () => {
                const source = kind === 'FILE' ? file : await getWrittenSource(metadata, written, setWritten);
                if (!source?.ready)
                    throw new Error('El archivo debe aprobar la revisión antes de continuar.');
                setUploadStep('organization');
            })} busy={busy || kind === 'FILE' && Boolean(file && !file.ready)} blocked={kind === 'FILE' && !file?.ready} label="Publicar material" onCancel={closeUpload} onDraft={draft => setUploadDrafts(previous => ({ ...previous, [kind]: draft }))} onSave={metadata => run(async () => {
                const source = kind === 'FILE' ? file : await getWrittenSource(metadata, written, setWritten);
                if (!source?.ready)
                    throw new Error('El archivo debe aprobar la revisión antes de publicar el material.');
                const refreshed = await change({ action: 'publish', fileId: source.id, ...metadata, contentKind: kind }, () => {
                    clearUpload();
                    onPublished?.();
                    setUploadExpanded(presentation === 'upload');
                    setPublishedFileId(source.id);
                    setNotice('Material publicado.');
                    setUploadPublished(presentation === 'upload');
                });
                if (refreshed && presentation === 'upload') {
                    setUploadExpanded(false);
                    onUploadClose?.();
                }
            })}/>
    </div>}
    </Dialog> : null;
    const contextDialog = active && pendingUploadContext ? <Dialog title="Cambiar el destino del material" onClose={() => { setPendingUploadContext(null); onUploadContextConsumed?.(); }}>
      <p>Ya tenés un material sin publicar. Podés volver al formulario y conservar sus datos. Si cambiás el destino, se descartan los datos que escribiste en el formulario.</p>
      <button disabled={busy} onClick={() => { setPendingUploadContext(null); onUploadContextConsumed?.(); }}>Conservar el formulario abierto</button>
      <button disabled={busy} onClick={() => {
            const unit = room.units.find(item => item.id === pendingUploadContext.unitId);
            if (!unit?.id)
                return;
            const topic = unit.topics.find(item => item.id === pendingUploadContext.topicIds[0]);
            setUploadInitial({ title: '', unitId: unit.id, topicId: topic?.id ?? null });
            setUploadVersion(value => value + 1);
            setUploadDrafts({});
            setUploadStep('details');
            setUploadExpanded(true);
            setPendingUploadContext(null);
            onUploadContextConsumed?.();
        }}>Descartar datos locales y cambiar destino</button>
    </Dialog> : null;
    if (presentation === 'upload' && !active)
        return null;
    if (presentation === 'upload' && !writable)
        return <Dialog title="No podés publicar material" onClose={discardUpload}><p>No podés publicar material en esta aula con tus permisos actuales.</p><button type="button" onClick={discardUpload}>Cerrar</button></Dialog>;
    return <>
    {children?.({ busy, error, notice, publishedFileId, showError: !uploadExpanded && !editing && !deleting,
            open: () => setUploadExpanded(true), edit: material => { setRevisionSource(undefined); setEditing(material); },
            remove: setDeleting, retry: () => run(async () => { await Promise.all([reload(), refresh?.()]); }),
        })}
    {uploadDialog}
    {active && editing ? <Dialog className={styles.dialog} title="Editar material" onClose={() => !busy && setEditing(null)}>
      <div className={styles.upload}>
        {editing.contentKind === 'TEXT' && editing.linked ? <p>Si cambiás el contenido, las actividades que ya tienen respuestas conservan la versión anterior. La nueva versión estará disponible en Biblioteca.</p> : null}
        {revisionSource && !revisionSource.file.ready ? fileFeedback(revisionSource.file, busy, () => void run(async () => {
                setRevisionSource({ ...revisionSource, file: await api.fileStatus(revisionSource.file.id) });
            })) : null}
        {error ? <Notice error>{error}</Notice> : null}
        <MaterialForm api={api} key={editing.id} room={room} initial={editing} editing kind={editing.contentKind ?? 'FILE'} busy={busy} label="Guardar datos del material" onCancel={() => { setEditing(null); setError(''); }} onSave={metadata => run(async () => {
                const onSaved = () => { setEditing(null); setRevisionSource(undefined); setNotice('Datos del material guardados.'); };
                if (editing.contentKind === 'TEXT' && (metadata.title !== editing.title || metadata.body !== editing.body)) {
                    const source = await getWrittenSource(metadata, revisionSource, setRevisionSource);
                    if (!source.ready)
                        throw new Error('El archivo debe aprobar la revisión antes de guardar el material.');
                    await change({ action: 'revise', id: editing.id, fileId: source.id, ...metadata, contentKind: 'TEXT' }, onSaved);
                }
                else
                    await change({ action: 'edit', id: editing.id, ...metadata, contentKind: editing.contentKind ?? 'FILE' }, onSaved);
            })}/>
      </div>
    </Dialog> : null}
    {contextDialog}
    {active && deleting ? <Dialog title="Eliminar material" onClose={() => !busy && setDeleting(null)}>
      <p>¿Eliminar «{deleting.title}»? Dejará de estar disponible. Solo se elimina si no está vinculado a actividades ni comparte su archivo. El espacio se libera cuando se confirme el borrado del archivo.</p>
      {error ? <Notice error>{error}</Notice> : null}
      <button disabled={busy} onClick={() => void run(async () => {
                await change({ action: 'delete', id: deleting.id, confirm: true }, () => {
                    setDeleting(null);
                    onDeleted?.(deleting.id);
                    setNotice('Material eliminado. El cupo se libera al confirmar el borrado del archivo.');
                });
            })}>Confirmar eliminación del material</button>
      <button disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button>
    </Dialog> : null}
  </>;
}
