import { useEffect, useRef } from 'react';
import { canPreviewMaterial } from '../api/material-preview.ts';
import { type ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import { type Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { type Material } from '../../../../../../src/core/contracts/materials.ts';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import styles from './library.module.css';

export function MaterialReader({ api, room, material, writable, busy, onClose, onEdit, onDelete }: {
  api: ClassroomClient; room: Detail; material: Material; writable: boolean; busy: boolean;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const unit = room.units.find(item => item.id === material.unitId);
  const topic = unit?.topics.find(item => item.id === material.topicId);
  const textual = material.contentKind === 'TEXT';
  useEffect(() => { heading.current?.focus(); }, [material.id]);
  return <section className={styles.reader} aria-label={`Lectura de ${material.title}`}>
    <button type="button" onClick={onClose} aria-label="Volver a Biblioteca">← Volver a Biblioteca</button>
    <header className="p5-section-head">
      <div><h2 ref={heading} tabIndex={-1}>{material.title}</h2>
        <p>{unit ? `${unit.name}${topic ? ` · ${topic.name}` : ''}` : 'Material extra / recomendado'}</p></div>
      {writable ? <button disabled={busy} onClick={onEdit}><FoxmindIcon name="edit" />Editar datos</button> : null}
    </header>
    <article className={styles.document}>
      <span className={styles.badge}>{textual ? 'Lectura' : material.extension?.toUpperCase() ?? 'Archivo'}</span>
      {material.body ? <p>{material.body}</p> : null}
      <footer>
        {!textual && canPreviewMaterial(material) && material.previewable ? <a href={api.fileUrl(material.fileId, true)} target="_blank" rel="noreferrer">Abrir archivo</a> : null}
        <a href={api.fileUrl(material.fileId)} aria-label="Descargar material" target="_blank" rel="noreferrer"><FoxmindIcon name="download" />Descargar</a>
        {writable ? <button disabled={busy || material.linked} onClick={onDelete}><FoxmindIcon name="trash" />Eliminar material</button> : null}
        {writable && material.linked ? <small>Vinculado a una actividad: no se puede eliminar.</small> : null}
      </footer>
    </article>
  </section>;
}
