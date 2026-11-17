import { useEffect, useState } from 'react';
import { canPreviewMaterial } from '../api/material-preview.ts';
import type { MaterialsOperations } from '../model/materials-operations.ts';
import { type Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { type Material } from '../../../../../../src/core/contracts/materials.ts';
import type { ActivitySummary } from '../../../../../../src/core/contracts/activities.ts';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { Dialog } from '../../../../../shared-ui/feedback.tsx';
import { materialSize } from '../model/material-presentation.ts';
import styles from './reader.module.css';
export function MaterialReader({ api, room, material, onClose }: {
    api: MaterialsOperations;
    room: Detail;
    material: Material;
    writable: boolean;
    busy: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [activities, setActivities] = useState<ActivitySummary[]>([]);
    const [activityError, setActivityError] = useState('');
    const [retry, setRetry] = useState(0);
    const unit = room.units.find(item => item.id === material.unitId);
    const topic = unit?.topics.find(item => item.id === material.topicId);
    const textual = material.contentKind === 'TEXT';
    const description = material.description ?? (textual ? null : material.body);
    useEffect(() => {
        setActivities([]);
        setActivityError('');
        if (!material.activityIds?.length)
            return;
        const controller = new AbortController();
        void api.listActivities(room.id, controller.signal)
            .then(result => { if (!controller.signal.aborted)
            setActivities(result.filter(item => material.activityIds?.includes(item.id))); })
            .catch(() => { if (!controller.signal.aborted)
            setActivityError('No pudimos cargar las actividades vinculadas.'); });
        return () => controller.abort();
    }, [api, room.id, material.id, material.activityIds, retry]);
    return <Dialog className={styles.readerDialog} title={material.title} onClose={onClose}>
    <section className={styles.reader} aria-label={`Lectura de ${material.title}`}>
      <p className={styles.readerClassroom}>{room.name}</p>
      <div className={styles.readerFile}>
        <span className={styles.fileMark} aria-hidden="true"><FoxmindIcon name="file"/><small>{material.extension?.toUpperCase() ?? 'Archivo'}</small></span>
        <div><strong>{material.fileName || material.title}</strong><p>{materialSize(material.sizeBytes) || material.extension?.toUpperCase()}</p></div>
      </div>
      {description ? <p>{description}</p> : null}
      <dl className={styles.readerMetadata}>
        <div><dt>Ubicación</dt><dd>{unit ? `${unit.name}${topic ? ` · ${topic.name}` : ''}` : 'Sin unidad ni tema'}</dd></div>
        {activities.length ? <div><dt>Actividades vinculadas</dt><dd>{activities.map(item => item.title || 'Borrador sin título').join(', ')}</dd></div> : null}
      </dl>
      {activityError ? <p role="alert">{activityError} <button type="button" onClick={() => setRetry(value => value + 1)}>Reintentar</button></p> : null}
      {textual && material.body ? <article className={styles.readerPreview}><h3>Vista previa</h3><p>{material.body}</p></article> : null}
      <footer className={styles.readerActions}>
        {!textual && material.ready && !material.deleted && canPreviewMaterial(material) && material.previewable ? <a href={api.fileUrl(material.fileId, true)} target="_blank" rel="noreferrer">Abrir archivo</a> : null}
        {material.ready && !material.deleted ? <a href={api.fileUrl(material.fileId)} aria-label="Descargar material" target="_blank" rel="noreferrer"><FoxmindIcon name="download"/>Descargar</a> : null}
        <button type="button" onClick={onClose}>Cerrar</button>
      </footer>
    </section>
  </Dialog>;
}
