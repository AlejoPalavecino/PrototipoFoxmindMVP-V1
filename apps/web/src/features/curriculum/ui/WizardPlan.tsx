import styles from './wizard-plan.module.css';
import { initializePlanDisclosure } from '../../../../../shared-ui/plan-disclosure';
import type { RefObject, DragEvent } from 'react';
import type { FileState } from '../../../../../../src/core/contracts/materials.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import type { CurriculumUnit } from '../../../../../../src/core/domain/index.ts';

interface Props {
  units?: CurriculumUnit[];
  onUnits?: (units: CurriculumUnit[]) => void;
  onRemoveUnits?: (units: CurriculumUnit[]) => void;
  onUndoRemove?: () => void;
  planText: string;
  onPlanText: (value: string) => void;
  onExtractText: () => void;
  onRemoveFile: () => void;
  file: FileState | null;
  uploading: boolean;
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  fileUrl: (id: string) => string;
  onFile: (file: File | undefined) => Promise<void>;
  onError: (message: string) => void;
  onRefresh: () => void;
}

function handleDrop(event: DragEvent, props: Props) {
  if (!event.dataTransfer.files.length) return;
  event.preventDefault();
  event.stopPropagation();
  if (props.disabled) return;
  if (event.dataTransfer.files.length !== 1) { props.onError('Elegí un solo archivo por vez.'); return; }
  void props.onFile(event.dataTransfer.files[0]);
}

export function WizardPlan(props: Props) {
  const { disabled } = props;
  return <div className="brujula-wizard-plan">
    {props.onUnits ? <WizardCurriculum units={props.units ?? []} onUnits={props.onUnits} onRemove={props.onRemoveUnits} onUndo={props.onUndoRemove} /> : null}
    <details><summary>Editar el plan como texto</summary>
    <label>Unidades y temas<textarea aria-label="Unidades y temas" rows={7} value={props.planText} disabled={disabled} placeholder={'Unidad 1 · Ecosistemas\nFlujo de energía\nRedes tróficas'} onChange={event => props.onPlanText(event.target.value)} /></label>
    <small>Escribí “Unidad: nombre” y agregá cada tema con “- tema”, uno por línea. El aula necesita al menos una unidad con un tema.</small>
    <button className="brujula-wizard-extract" type="button" disabled={disabled} onClick={props.onExtractText}><FoxmindIcon name="spark" />Extraer unidades de un texto</button>
    </details>
  </div>;
}
function focusField(root: HTMLElement | null | undefined, selector: string) {
  if (!root) return;
  requestAnimationFrame(() => {
    const field = root.querySelector<HTMLElement>(selector);
    const unit = field?.closest('details');
    if (unit) unit.open = true;
    field?.focus();
  });
}

export function WizardCurriculum({ units, onUnits, onRemove = onUnits, onUndo }: {
  units: CurriculumUnit[];
  onUnits: (units: CurriculumUnit[]) => void;
  onRemove?: (units: CurriculumUnit[]) => void;
  onUndo?: () => void;
}) {
  const change = (index: number, unit: CurriculumUnit) => units.map((item, i) => i === index ? unit : item);
  const total = units.reduce((n, unit) => n + unit.topics.length, 0);
  return <div className={styles.curriculum} data-curriculum-editor onKeyDown={event => {
    if (event.key === 'Enter' && event.target instanceof HTMLTextAreaElement) event.preventDefault();
  }}>
    <div className={styles.toolbar}>
      <div><strong>{units.length} {units.length === 1 ? 'unidad' : 'unidades'} · {total} {total === 1 ? 'tema' : 'temas'}</strong>
        <p>El orden de las unidades será el recorrido de tu aula.</p></div>
      {units.length ? <div className={styles.actions}>{['Expandir todas', 'Contraer'].map((label, index) =>
        <button key={label} type="button" onClick={event => {
          event.currentTarget.closest('[data-curriculum-editor]')?.querySelectorAll<HTMLDetailsElement>('[data-edit-unit]').forEach(node => { node.open = index === 0; });
        }}>{label}</button>)}</div> : null}
    </div>
    {onUndo ? <div className={styles.undo}><span role="status">Se quitó contenido del plan.</span><button type="button" data-curriculum-undo onClick={event => { const root = event.currentTarget.closest<HTMLElement>('[data-curriculum-editor]'); onUndo(); focusField(root, 'summary'); }}>Deshacer</button></div> : null}
    {!units.length ? <p className={styles.empty}>Todavía no agregaste unidades. Empezá por la primera.</p> : null}
    {units.map((unit, index) => <details key={index} className={styles.unit} data-edit-unit
      ref={node => initializePlanDisclosure(node, index === 0 || !unit.name.trim() || !unit.topics.length || unit.topics.some(topic => !topic.name.trim()))}>
      <summary><b>{String(index + 1).padStart(2, '0')}</b><span><strong>{unit.name || 'Unidad sin nombre'}</strong>
        <small>{unit.topics.length} {unit.topics.length === 1 ? 'tema' : 'temas'}</small></span></summary>
      <div className={styles.unitBody}>
        <label>Nombre de la unidad {index + 1}<textarea data-edit-field={`unit-${index}`} rows={1} maxLength={120}
          value={unit.name} onChange={event => onUnits(change(index, { ...unit, name: event.target.value.replace(/[\r\n]+/g, ' ') }))} /></label>
        <div className={styles.topics}>{unit.topics.map((topic, topicIndex) => <div className={styles.topic} key={topicIndex}>
          <span aria-hidden="true">{index + 1}.{topicIndex + 1}</span>
          <label>Tema {topicIndex + 1} de unidad {index + 1}<textarea data-edit-field={`topic-${index}-${topicIndex}`} rows={1} maxLength={120}
            value={topic.name} onChange={event => onUnits(change(index, { ...unit, topics: unit.topics.map((item, i) => i === topicIndex ? { ...item, name: event.target.value.replace(/[\r\n]+/g, ' ') } : item) }))} /></label>
          <button type="button" aria-label={`Quitar tema ${topicIndex + 1} de unidad ${index + 1}`} onClick={event => {
            const root = event.currentTarget.closest<HTMLElement>('[data-curriculum-editor]');
            onRemove(change(index, { ...unit, topics: unit.topics.filter((_, i) => i !== topicIndex) }));
            focusField(root, '[data-curriculum-undo]');
          }}><FoxmindIcon name="trash" /></button>
        </div>)}</div>
        <div className={styles.actions}>
          <button type="button" disabled={unit.topics.length >= 100 || total >= 500} onClick={event => {
            const root = event.currentTarget?.closest<HTMLElement>('[data-curriculum-editor]');
            onUnits(change(index, { ...unit, topics: [...unit.topics, { name: '' }] }));
            focusField(root, `[data-edit-field="topic-${index}-${unit.topics.length}"]`);
          }}>Agregar tema a unidad {index + 1}</button>
          <button type="button" aria-label={`Quitar unidad ${index + 1}`} onClick={event => {
            const root = event.currentTarget.closest<HTMLElement>('[data-curriculum-editor]');
            onRemove(units.filter((_, i) => i !== index));
            focusField(root, '[data-curriculum-undo]');
          }}>Quitar unidad</button>
        </div>
      </div>
    </details>)}
    <button type="button" className={styles.add} disabled={units.length >= 100 || total >= 500} onClick={event => {
      const root = event.currentTarget?.closest<HTMLElement>('[data-curriculum-editor]');
      onUnits([...units, { name: '', topics: [{ name: '' }] }]);
      focusField(root, `[data-edit-field="unit-${units.length}"]`);
    }}><FoxmindIcon name="plus" />Agregar unidad</button>
  </div>;
}

export function WizardPlanSource(props: Props) {
  const { file, uploading, disabled, inputRef, fileUrl, onFile, onRefresh } = props;
  return <section aria-label="Archivo del plan de estudio" className={styles.source} aria-busy={uploading}>
    <div className={styles.drop} data-ready={file?.ready || undefined} onDrop={event => handleDrop(event, props)}
      onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}>
      <span className={styles.uploadIcon}><FoxmindIcon name={file ? 'file' : 'upload'} /></span>
      <strong>{file?.name ?? 'Arrastrá o seleccioná el plan'}</strong>
      <small>{file?.ready ? 'Aprobado para usar' : file ? 'El archivo debe aprobar la revisión antes de continuar.' : 'PDF o DOCX · Hasta 20 MB'}</small>
      <label className={styles.picker}>{file ? 'Reemplazar archivo' : 'Seleccionar archivo'}
        <input ref={inputRef} type="file" aria-label="Archivo del plan de estudio" accept=".pdf,.docx" disabled={disabled}
          onChange={event => { const target = event.target; void onFile(target.files?.[0]).finally(() => { target.value = ''; }); }} />
      </label>
      {file ? <div className={styles.actions}>
        {file.ready ? <a href={fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar plan</a>
          : <button type="button" disabled={disabled} onClick={onRefresh}>Consultar estado</button>}
        <button type="button" disabled={disabled} onClick={props.onRemoveFile}>Retirar archivo del borrador</button>
      </div> : null}
    </div>
  </section>;
}
