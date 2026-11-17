'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Material } from '../../../../../../src/core/contracts/materials.ts';
import { Notice } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { MaterialReader } from '../reader/MaterialReader.tsx';
import { materialSize } from '../model/material-presentation.ts';
import { MaterialPublishing } from '../publishing/MaterialPublishing.tsx';
import type { LibraryProps } from '../model/library-props.ts';
import styles from './catalog.module.css';
const useLabels = { STUDY: 'Material de estudio', RECOMMENDED: 'Recomendado', COMPLEMENTARY: 'Material complementario' };
export function MaterialCatalog({ api, room, reload, targetMaterialId, openUpload, uploadContext, onUploadContextConsumed, active = true }: LibraryProps) {
    const root = useRef<HTMLElement>(null);
    const targetFocusPending = useRef(false);
    const restoreReaderFocus = useRef<string>(null);
    const [materials, setMaterials] = useState<Material[]>([]), [loaded, setLoaded] = useState(false);
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('all');
    const [reading, setReading] = useState<Material | null>(null);
    const [error, setError] = useState('');
    const writable = room.role === 'teacher' && !room.archived;
    useEffect(() => {
        if (!active || openUpload || uploadContext)
            setReading(null);
    }, [active, openUpload, uploadContext]);
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
        targetFocusPending.current = Boolean(targetMaterialId && active);
        if (targetMaterialId && active) {
            setQuery('');
            setLocation('all');
        }
    }, [targetMaterialId, active]);
    useEffect(() => {
        if (!targetFocusPending.current || !targetMaterialId || !loaded || query.trim())
            return;
        const selected = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-material-id]') ?? []).find(item => item.dataset.materialId === targetMaterialId);
        selected?.focus();
        const material = materials.find(item => item.id === targetMaterialId);
        if (material?.ready && !material.deleted)
            setReading(material);
        targetFocusPending.current = false;
    }, [targetMaterialId, loaded, materials, query]);
    useEffect(() => {
        const id = restoreReaderFocus.current;
        if (reading || !id)
            return;
        restoreReaderFocus.current = null;
        const item = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-material-id]') ?? []).find(row => row.dataset.materialId === id);
        (item?.querySelector<HTMLButtonElement>('button') ?? root.current?.querySelector<HTMLInputElement>('input[type=search]'))?.focus();
    }, [reading]);
    const load = useCallback(async (signal?: AbortSignal) => {
        const result = await api.list(room.id, signal);
        if (signal?.aborted)
            return;
        setMaterials(result);
        setLoaded(true);
        setError('');
        setReading(current => { if (!current)
            return null; const previous = result.find(item => item.id === current.id), latest = previous?.supersededBy ? result.find(item => item.id === previous.supersededBy) : previous; return latest && !latest.deleted ? latest : null; });
    }, [api, room.id]);
    useEffect(() => {
        const controller = new AbortController();
        void load(controller.signal).catch(e => { if (!controller.signal.aborted)
            setError(e.message); });
        return () => controller.abort();
    }, [load]);
    return <MaterialPublishing api={api} room={room} reload={reload} refresh={load} active={active} openUpload={openUpload} uploadContext={uploadContext} onUploadContextConsumed={onUploadContextConsumed} onPublished={() => setQuery('')} onDeleted={id => setReading(current => current?.id === id ? null : current)}>
    {controls => {
            const { busy, notice } = controls;
            const published = currentMaterials.find(material => material.fileId === controls.publishedFileId && material.ready && !material.deleted);
            const visibleError = error || (controls.showError ? controls.error : '');
            return <section ref={root} aria-label="Biblioteca del aula" className={styles.library}>
    <header className="p5-section-head cl-section"><div><h2>Biblioteca</h2><p>Archivos y apuntes compartidos con el aula.</p></div>
      <div className="p5-actions">{writable ? <button className="primary" disabled={busy} onClick={() => { setReading(null); controls.open(); }}><FoxmindIcon name="upload"/>Subir archivo</button> : null}</div>
    </header>
     {visibleError ? <Notice error>{visibleError}{' '}
      <button disabled={busy} onClick={() => { setError(''); void controls.retry(); }}>Actualizar Biblioteca</button></Notice> : null}
    {notice ? <Notice><span>{notice}</span>{published && !reading ? <button type="button" onClick={() => setReading(published)}>Ver material publicado</button> : null}</Notice> : null}
    {!loaded && !error ? <Notice>Cargando materiales…</Notice> : null}
    {loaded && targetMaterialId && !materials.some(item => item.id === targetMaterialId) ? <Notice>El material ya no está disponible para tu cuenta.</Notice> : null}
    {openUpload && !writable ? <Notice>No podés publicar material en esta aula con tus permisos actuales.</Notice> : null}
    <div className={styles.toolbar}>
      <label className={styles.search}><span>Buscar material</span><div><FoxmindIcon name="search"/><input type="search" aria-label="Buscar material o tema" placeholder="Título o archivo" value={query} onChange={event => setQuery(event.target.value)}/></div></label>
      <label className={styles.location}><span>Unidad o tema</span><select value={location} onChange={event => setLocation(event.target.value)}><option value="all">Todos los materiales</option><option value="none">Sin unidad ni tema</option>{room.units.map(unit => <optgroup key={unit.id} label={unit.name}><option value={unit.id}>{unit.name}</option>{unit.topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</optgroup>)}</select></label>
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
    {active && reading ? <MaterialReader api={api} room={room} material={reading} writable={writable} busy={busy} onClose={() => { restoreReaderFocus.current = reading.id; setReading(null); }} onEdit={() => { controls.edit(reading); }} onDelete={() => controls.remove(reading)}/> : null}
      </section>;
        }}
  </MaterialPublishing>;
}
