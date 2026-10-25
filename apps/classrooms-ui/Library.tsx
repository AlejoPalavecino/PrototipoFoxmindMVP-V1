'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { canPreviewMaterial, type ClassroomClient, type Detail, type FileState, type Material } from './api.ts';
import { Dialog, Notice } from './components.tsx';

interface Metadata { title: string; unitId: string | null; topicId: string | null }
function MaterialForm({ room, initial, busy, label, onSave }: {
  room: Detail; initial?: Metadata; busy: boolean; label: string; onSave: (metadata: Metadata) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [unitId, setUnit] = useState(initial?.unitId ?? ''), [topicId, setTopic] = useState(initial?.topicId ?? '');
  const topics = room.units.find(unit => unit.id === unitId)?.topics ?? [];
  return <form onSubmit={event => { event.preventDefault(); void onSave({ title, unitId: unitId || null, topicId: topicId || null }); }}>
    <fieldset disabled={busy}>
      <legend>{label}</legend>
      <label>Nombre del material<input required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>Unidad del material<select aria-label="Unidad del material" value={unitId} onChange={event => { setUnit(event.target.value); setTopic(''); }}>
        <option value="">Material extra / recomendado</option>
        {room.units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
      </select></label>
      <label>Tema del material<select aria-label="Tema del material" value={topicId} disabled={!unitId} onChange={event => setTopic(event.target.value)}>
        <option value="">Sin tema específico</option>
        {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
      </select></label>
      <button className="primary">{label}</button>
    </fieldset>
  </form>;
}

export function Library({ api, room, reload, targetMaterialId, openUpload }: { api: ClassroomClient; room: Detail; reload: () => Promise<void>; targetMaterialId?: string; openUpload?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const [materials, setMaterials] = useState<Material[]>([]), [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [file, setFile] = useState<FileState | null>(null), [editing, setEditing] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState<Material | null>(null);
  const writable = room.role === 'teacher' && !room.archived;
  useEffect(() => {
    if (!targetMaterialId || !loaded) return;
    const selected = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-material-id]') ?? []).find(item => item.dataset.materialId === targetMaterialId);
    selected?.focus();
  }, [targetMaterialId, loaded, materials]);
  const load = useCallback(async (signal?: AbortSignal) => {
    const result = await api.call<Material[]>(`/${room.id}/library`, 'GET', undefined, signal);
    setMaterials(result); setLoaded(true);
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
    <header className="p5-section-head"><div><h2>Biblioteca</h2><p>Materiales de consulta del aula, incluidas las lecturas extra.</p></div>
      <button disabled={busy} onClick={() => void run(async () => { await Promise.all([reload(), load()]); })}>Actualizar Biblioteca</button>
    </header>
    {error ? <Notice error>{error} Actualiza la Biblioteca y vuelve a intentar.</Notice> : null}
    {notice ? <Notice>{notice}</Notice> : null}
    {!loaded && !error ? <Notice>Cargando materiales…</Notice> : null}
    {writable ? <div className="p6-library-upload">
      <details className="folder-disclosure" open={openUpload || undefined}><summary>Publicar material</summary>
      <p>PDF, DOCX, PPTX, XLSX, JPG, JPEG, PNG o ZIP · hasta 50 MB por archivo.</p>
      <label>Archivo del material<input type="file" disabled={busy} accept=".pdf,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.zip" onChange={event => {
        const selected = event.target.files?.[0]; event.target.value = '';
        if (selected) void run(async () => {
          setFile(null);
          if (!api.uploadClassroom) throw new Error('La carga de archivos no está disponible.');
          setFile(await api.uploadClassroom(room.id, selected, 'material'));
        });
      }} /></label>
      </details>
      {file ? <>
        <Notice>{file.ready ? `Archivo aprobado: ${file.name}. Completa los datos para publicarlo.` : file.rejectionCode || ['ERROR', 'REJECTED'].includes(file.scan)
          ? 'El archivo no está aprobado. No se publicará ni podrá descargarse; elige otro archivo o consulta nuevamente la revisión.'
          : 'Archivo pendiente de revisión. Todavía no está publicado ni disponible para descargar.'}</Notice>
        {!file.ready ? <button disabled={busy} onClick={() => void run(async () => setFile(await api.fileStatus(file.id)))}>Consultar revisión del material</button> : null}
        {file.ready ? <MaterialForm room={room} busy={busy} label="Publicar material" onSave={metadata => run(async () => {
          await change({ action: 'publish', fileId: file.id, ...metadata }); setFile(null); setNotice('Material publicado.');
        })} /> : null}
      </> : null}
    </div> : null}
    {loaded && materials.length === 0 ? <p className="p5-empty">Todavía no hay materiales disponibles.</p> : null}
    {loaded && targetMaterialId && !materials.some(item => item.id === targetMaterialId) ? <Notice>El material ya no está disponible para tu cuenta.</Notice> : null}
    {openUpload && !writable ? <Notice>No podés publicar material en esta aula con tus permisos actuales.</Notice> : null}
    <div className="p6-library-list">{materials.map(material => {
      const unit = room.units.find(item => item.id === material.unitId), topic = unit?.topics.find(item => item.id === material.topicId);
      return <article className={`folder-row${material.id === targetMaterialId ? ' fm3-target-selected' : ''}`} key={material.id} aria-label={material.title} data-material-id={material.id} tabIndex={material.id === targetMaterialId ? -1 : undefined}>
        <div className="folder-row-content"><h3>{material.title}</h3><p>{unit ? `${unit.name}${topic ? ` · ${topic.name}` : ''}` : 'Material extra / recomendado'}</p>
          <small>{material.fileName} · {Number(material.sizeBytes).toLocaleString()} bytes</small></div>
        <div className="folder-row-actions">
        {material.deleted ? <Notice>{material.deletionPending ? 'Material eliminado. El borrado del archivo está pendiente; su espacio sigue reservado hasta confirmarlo.' : 'Material y archivo eliminados. El espacio fue liberado.'}</Notice>
          : material.ready ? <div className="p5-actions">
            {canPreviewMaterial(material) && material.previewable ? <a href={api.fileUrl(material.fileId, true)} target="_blank" rel="noreferrer">Vista previa</a> : null}
            <a href={api.fileUrl(material.fileId)} target="_blank" rel="noreferrer">Descargar material</a>
          </div> : <Notice>Archivo no disponible: la revisión de seguridad no permite descargarlo.</Notice>}
        {writable && !material.deleted ? <div className="p5-actions">
          <button disabled={busy} onClick={() => setEditing(material)}>Editar datos</button>
          <button disabled={busy || material.linked} onClick={() => setDeleting(material)}>Eliminar material</button>
          {material.linked ? <small>Vinculado a una actividad: no se puede eliminar.</small> : null}
        </div> : null}
        </div>
      </article>;
    })}</div>
    {editing ? <Dialog title="Editar material" onClose={() => !busy && setEditing(null)}>
      <p>Se conservan el archivo publicado y la identidad del material. Para corregir el archivo, publica un material nuevo.</p>
      <MaterialForm key={editing.id} room={room} initial={editing} busy={busy} label="Guardar datos del material" onSave={metadata => run(async () => {
        await change({ action: 'edit', id: editing.id, ...metadata }); setEditing(null); setNotice('Datos del material guardados.');
      })} />
    </Dialog> : null}
    {deleting ? <Dialog title="Eliminar material" onClose={() => !busy && setDeleting(null)}>
      <p>¿Eliminar «{deleting.title}»? Dejará de estar disponible. Solo se elimina si no está vinculado a actividades ni comparte su archivo. El espacio se libera cuando se confirme el borrado del archivo.</p>
      <button disabled={busy} onClick={() => void run(async () => {
        await change({ action: 'delete', id: deleting.id, confirm: true }); setDeleting(null);
        setNotice('Material eliminado. El borrado del archivo puede seguir pendiente; actualiza para consultar su estado.');
      })}>Confirmar eliminación del material</button>
      <button disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button>
    </Dialog> : null}
  </section>;
}
