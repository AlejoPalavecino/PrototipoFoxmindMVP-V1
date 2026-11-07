import type { RefObject, DragEvent } from 'react';
import type { FileState } from './api.ts';
import { FoxmindIcon } from '../shared-ui/index.ts';
import type { CurriculumUnit } from '../../src/core/domain/index.ts';

interface Props {
  units?: CurriculumUnit[];
  onUnits?: (units: CurriculumUnit[]) => void;
  sourceOnly?: boolean;
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
    {props.onUnits ? <WizardCurriculum units={props.units ?? []} onUnits={props.onUnits} /> : null}
    <details><summary>Editar el plan como texto</summary>
    <label>Unidades y temas<textarea aria-label="Unidades y temas" rows={7} value={props.planText} disabled={disabled} placeholder={'Unidad 1 · Ecosistemas\nFlujo de energía\nRedes tróficas'} onChange={event => props.onPlanText(event.target.value)} /></label>
    <small>Escribí “Unidad: nombre” y agregá cada tema con “- tema”, uno por línea. El aula necesita al menos una unidad con un tema.</small>
    <button className="brujula-wizard-extract" type="button" disabled={disabled} onClick={props.onExtractText}><FoxmindIcon name="spark" />Extraer unidades de un texto</button>
    </details>
  </div>;
}
export function WizardCurriculum({ units, onUnits }: { units: CurriculumUnit[]; onUnits: (units: CurriculumUnit[]) => void }) {
  const change = (index: number, unit: CurriculumUnit) => onUnits(units.map((item, i) => i === index ? unit : item));
  return <div className="wizard-curriculum" onKeyDown={event => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault(); }}>
    <p>Agregá las unidades y sus temas en el orden en que los vas a enseñar.</p>
    {!units.length ? <p>Todavía no agregaste unidades. Empezá por la primera.</p> : null}
    {units.map((unit, index) => <section key={index} className="p5-unit">
      <div className="p5-section-head"><h4>Unidad {index + 1}</h4><button type="button" aria-label={`Quitar unidad ${index + 1}`} onClick={() => onUnits(units.filter((_, i) => i !== index))}>Quitar unidad</button></div>
      <label>Nombre de la unidad {index + 1}<input maxLength={120} value={unit.name} onChange={event => change(index, { ...unit, name: event.target.value })} /></label>
      {unit.topics.map((topic, topicIndex) => <div className="p5-topic" key={topicIndex}>
        <label>Tema {topicIndex + 1} de unidad {index + 1}<input maxLength={120} value={topic.name} onChange={event => change(index, { ...unit, topics: unit.topics.map((item, i) => i === topicIndex ? { name: event.target.value } : item) })} /></label>
        <button type="button" aria-label={`Quitar tema ${topicIndex + 1} de unidad ${index + 1}`} onClick={() => change(index, { ...unit, topics: unit.topics.filter((_, i) => i !== topicIndex) })}>Quitar</button>
      </div>)}
      <button type="button" disabled={unit.topics.length >= 100 || units.reduce((sum, item) => sum + item.topics.length, 0) >= 500} onClick={() => change(index, { ...unit, topics: [...unit.topics, { name: '' }] })}>Agregar tema a unidad {index + 1}</button>
    </section>)}
    <button type="button" disabled={units.length >= 100 || units.reduce((sum, item) => sum + item.topics.length, 0) >= 500} onClick={() => onUnits([...units, { name: '', topics: [{ name: '' }] }])}>Agregar unidad</button>
  </div>;
}
export function WizardPlanSource(props:Props){
 const { file, uploading, disabled, inputRef, fileUrl, onFile, onRefresh } = props;
 return <details className="brujula-wizard-file" open={props.sourceOnly || undefined}><summary>{props.sourceOnly ? 'Archivo del plan de estudio' : 'Analizar un archivo con IA'}</summary><p>{props.sourceOnly ? 'Subí el plan en PDF o DOCX. En el siguiente paso elegís si querés analizarlo con IA o cargar las unidades manualmente.' : 'Subí un PDF o DOCX y revisá la propuesta antes de aplicarla al plan escrito.'}</p>
    <div className="wizard-plan-layout">
    <div className="wizard-plan-upload">
      <h3>Subí tu archivo</h3>
      <div className="p5-drop" onDrop={event => handleDrop(event, props)}
        onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}>
        <FoxmindIcon name="upload" />
        <strong>{uploading ? 'Subiendo y revisando el archivo…' : 'Arrastrá tu archivo acá'}</strong>
        <label className="wizard-file-picker">o <span>elegí un archivo</span>
          <input ref={inputRef} type="file" accept=".pdf,.docx" disabled={disabled}
            onChange={event => { const target = event.target; void onFile(target.files?.[0]).finally(() => { target.value = ''; }); }} />
        </label>
        <small>PDF o DOCX · Hasta 20 MB</small>
      </div>
      {file ? <div className="p5-file"><FoxmindIcon name="file" /><div>
        <strong>{file.name}</strong><span>{file.ready ? 'Aprobado para usar'
          : `Carga: ${file.upload} · Validación: ${file.validation} · Análisis: ${file.scan}`}</span>
        {file.ready ? <a href={fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar plan</a>
          : <button type="button" disabled={disabled} onClick={onRefresh}>Consultar estado</button>}
      </div><button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <FoxmindIcon name="refresh" />Reemplazar archivo</button></div>
        : <p className="wizard-plan-security"><FoxmindIcon name="shield" />El plan estará disponible cuando supere la validación y el análisis de seguridad.</p>}
    </div>
    </div>
    {file ? <button type="button" disabled={disabled} onClick={props.onRemoveFile}>Retirar archivo del borrador</button> : null}
    </details>;
}
