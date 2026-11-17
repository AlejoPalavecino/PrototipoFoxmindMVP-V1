import { useEffect, useId, useState } from 'react';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import type { ActivitySummary } from '../../../../../../src/core/contracts/activities.ts';
import type { MaterialMetadata as Metadata, MaterialsOperations } from '../model/materials-operations.ts';
import { Notice } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import styles from './publishing.module.css';
import { emptyMaterial, type MaterialKind } from './material-draft.ts';
export function MaterialForm({ api, room, initial, draft, kind, busy, editing = false, blocked = false, label, onSave, onCancel, onDraft, step = 'all', onContinue, onBack }: {
    api: MaterialsOperations;
    room: Detail;
    initial?: Metadata;
    draft?: Metadata;
    kind: MaterialKind;
    busy: boolean;
    editing?: boolean;
    blocked?: boolean;
    label: string;
    step?: 'all' | 'details' | 'organization';
    onContinue?: (metadata: Metadata) => Promise<void>;
    onBack?: () => void;
    onSave: (metadata: Metadata) => Promise<void>;
    onCancel: () => void;
    onDraft?: (metadata: Metadata) => void;
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
        void api.listActivities(room.id, controller.signal)
            .then(result => { if (!controller.signal.aborted)
            setActivities(result); })
            .catch(() => { if (!controller.signal.aborted)
            setActivityError('No pudimos cargar las actividades. Los vínculos actuales se conservan.'); });
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
            if (busy || blocked || invalidDescription || !title.trim() || kind === 'TEXT' && !body.trim())
                return;
            void (step === 'details' && onContinue ? onContinue : onSave)({ title: title.trim(), unitId: unitId || null, topicId: topicId || null, ...(kind === 'TEXT' ? { body } : {}), ...(unchangedDescription ? {} : { description: description.trim() || null }), activityIds: value.activityIds, resourceUse });
        }}>
    <fieldset disabled={busy}>
      <legend className="sr-only">{label}</legend>
      <div hidden={step === 'organization'} className={styles.detailsFields}>
      <label>Título<input aria-label="Nombre del material" required maxLength={200} value={title} onChange={event => update({ title: event.target.value })}/></label>
      {kind === 'TEXT' ? <label>Contenido<textarea aria-label="Contenido" required rows={6} maxLength={20000} value={body} onChange={event => update({ body: event.target.value })}/></label> : null}
      <label>Descripción (opcional)<textarea aria-label="Descripción (opcional)" rows={3} value={description} aria-invalid={invalidDescription} aria-describedby={descriptionTooLong ? descriptionHelpId : undefined} onChange={event => update({ description: event.target.value })}/></label>
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
          {activities.map(activity => <label key={activity.id}><input type="checkbox" checked={value.activityIds?.includes(activity.id) ?? false} disabled={activity.locked || activity.status === 'WITHDRAWN' && !value.activityIds?.includes(activity.id)} onChange={event => update({ activityIds: event.target.checked ? [...(value.activityIds ?? []), activity.id] : (value.activityIds ?? []).filter(id => id !== activity.id) })}/><span>{activity.title || 'Borrador sin título'}<small>{activity.locked ? 'Ya tiene respuestas · vínculo protegido' : activity.status === 'DRAFT' ? 'Borrador privado' : activity.status === 'WITHDRAWN' ? 'Retirada del aula' : 'Compartida con el aula'}</small></span></label>)}
        </div>
      </section>
      <footer className="p5-form-footer"><button type="button" onClick={onCancel}>Cancelar</button>
        {step === 'organization' && onBack ? <button type="button" onClick={onBack}>Volver</button> : null}
        <button className="primary" aria-label={step === 'details' ? 'Preparar y continuar' : label} disabled={blocked || invalidDescription || !title.trim() || kind === 'TEXT' && !body.trim()}>{busy ? 'Guardando…' : step === 'details' ? 'Preparar y continuar' : label === 'Guardar datos del material' ? 'Guardar cambios' : label}</button>
      </footer>
    </fieldset>
  </form>;
}
