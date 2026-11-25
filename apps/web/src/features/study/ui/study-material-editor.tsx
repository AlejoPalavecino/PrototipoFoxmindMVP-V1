import { useEffect, useRef, useState } from 'react';
import { Dialog, Notice } from '../../../../../shared-ui/feedback';
import type { StudyFolder, StudyUnit } from '../model/study-contracts';
import { StudyConfirmation } from './study-confirmation';
import s from './study.module.css';

export function StudyMaterialEditor({ material, units, busy, modal, onClose, onSave, onDirtyChange }: {
  material: NonNullable<StudyFolder['materials']>[number];
  units: StudyUnit[];
  busy: boolean;
  modal?: boolean;
  onClose: () => void;
  onSave: (title: string, topicIds: string[]) => Promise<unknown>;
  onDirtyChange?: (value: boolean) => void;
}) {
  const [title, setTitle] = useState(material.title);
  const [topicIds, setTopicIds] = useState(material.topicIds);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [discard, setDiscard] = useState(false);
  const locked = useRef(false);
  const dirty = title !== material.title || JSON.stringify(topicIds) !== JSON.stringify(material.topicIds);
  const disabled = busy || saving;

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  function close() {
    onDirtyChange?.(false);
    onClose();
  }

  function requestClose() {
    if (locked.current) return;
    if (dirty) setDiscard(true);
    else close();
  }

  async function save() {
    const normalized = title.trim();
    if (locked.current || disabled || !dirty) return;
    if (!normalized || [...normalized].length > 120) {
      setError('Escribí un título de entre 1 y 120 caracteres.');
      return;
    }
    locked.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave(normalized, topicIds);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No pudimos guardar los cambios.');
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }

  const fields = <form className={modal ? 'study-exact-material-editor' : s.unit} onSubmit={event => {
    event.preventDefault();
    void save();
  }}>
    {!modal && <h3>Editar material propio</h3>}
    <label>Título del material<input disabled={disabled} value={title} onChange={event => setTitle(event.target.value)} /></label>
    <fieldset disabled={disabled} className="study-exact-choice-group">
      <legend>Temas relacionados</legend>
      <div>{units.flatMap(unit => unit.topics).map(topic => (
        <label className={s.check} key={topic.id}>
          <input type="checkbox" aria-label={topic.title} checked={topicIds.includes(topic.id)} onChange={event => {
            const selected = event.target.checked;
            setTopicIds(ids => selected ? [...ids, topic.id] : ids.filter(id => id !== topic.id));
          }} />
          {topic.title}
        </label>
      ))}</div>
    </fieldset>
    {error && <Notice error>{error}</Notice>}
    <footer className={modal ? 'study-exact-dialog-footer' : s.actions}>
      <button type="button" disabled={disabled} onClick={requestClose}>Cancelar</button>
      <button type="submit" className="primary" disabled={disabled || !dirty}>Guardar material</button>
    </footer>
    {discard && <StudyConfirmation title="¿Descartás los cambios del material?"
      description="El material conservará el título y los temas guardados."
      confirmLabel="Descartar cambios" busy={disabled} onClose={() => setDiscard(false)} onConfirm={async () => close()} />}
  </form>;

  return modal
    ? <Dialog title="Editar material" onClose={requestClose}>{fields}</Dialog>
    : fields;
}
