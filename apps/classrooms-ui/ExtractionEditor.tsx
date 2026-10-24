'use client';
import { useState } from 'react';
import { parseExtractedCurriculum, type CurriculumUnit, type ExtractedCurriculum } from '../../src/core/domain/index.ts';

type UnitEditorProps = { unit: CurriculumUnit; index: number; change: (unit: CurriculumUnit) => void; remove: () => void };
function UnitEditor({ unit, index, change, remove }: UnitEditorProps) {
  return <section className="p5-unit p5-extraction-unit">
    <div className="p5-section-head"><h4>Unidad propuesta {index + 1}</h4>
      <button type="button" onClick={remove} aria-label={`Quitar unidad propuesta ${index + 1}`}>Quitar unidad</button></div>
    <label>Nombre de la unidad propuesta {index + 1}<input maxLength={120} value={unit.name}
      onChange={event => change({ ...unit, name: event.target.value })} /></label>
    {unit.topics.map((topic, topicIndex) => <div className="p5-topic" key={topicIndex}>
      <label>Tema propuesto {topicIndex + 1} de unidad {index + 1}<input maxLength={120} value={topic.name}
        onChange={event => change({ ...unit, topics: unit.topics.map((item, i) => i === topicIndex ? { name: event.target.value } : item) })} /></label>
      <button type="button" aria-label={`Quitar tema propuesto ${topicIndex + 1} de unidad ${index + 1}`}
        onClick={() => change({ ...unit, topics: unit.topics.filter((_, i) => i !== topicIndex) })}>×</button>
    </div>)}
    <button type="button" disabled={unit.topics.length >= 100}
      onClick={() => change({ ...unit, topics: [...unit.topics, { name: '' }] })}>Agregar tema a la propuesta</button>
  </section>;
}
function validUnits(units: CurriculumUnit[]) {
  try { parseExtractedCurriculum({ units, warnings: [] }); return true; } catch { return false; }
}
interface EditorProps { proposal: ExtractedCurriculum; hasUnits: boolean; busy: boolean;
  apply: (units: CurriculumUnit[], confirmed: boolean) => Promise<void> }
export function ExtractionEditor({ proposal, hasUnits, busy, apply }: EditorProps) {
  const [units, setUnits] = useState(() => structuredClone(proposal.units));
  const [confirmed, setConfirmed] = useState(false), valid = validUnits(units);
  return <div className="p5-extraction-editor" onKeyDown={event => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault();
  }}>
    <p>Revisá los nombres y completá o quitá lo que haga falta antes de incorporarlos al aula.</p>
    {proposal.warnings.includes('PARTIAL_STRUCTURE') && <p role="status">Encontramos una estructura parcial. Compará la propuesta con tu plan.</p>}
    {proposal.warnings.includes('DOCX_IMAGES_OMITTED') && <p role="status">No se leen las imágenes dentro de documentos Word. Revisá si falta contenido.</p>}
    <fieldset disabled={busy}>
      {units.map((unit, index) => <UnitEditor key={index} unit={unit} index={index}
        change={next => { setConfirmed(false); setUnits(units.map((item, i) => i === index ? next : item)); }}
        remove={() => { setConfirmed(false); setUnits(units.filter((_, i) => i !== index)); }} />)}
      <button type="button" disabled={units.length >= 100}
        onClick={() => { setConfirmed(false); setUnits([...units, { name: '', topics: [{ name: '' }] }]); }}>Agregar unidad a la propuesta</button>
      {hasUnits && <label className="p5-extraction-confirm"><input type="checkbox" checked={confirmed}
        onChange={event => setConfirmed(event.target.checked)} />Confirmo reemplazar las unidades y temas actuales por esta propuesta revisada.</label>}
      {!valid && <p>Completá al menos una unidad con sus temas. Se admiten hasta 100 unidades y 500 temas en total.</p>}
      <button type="button" className="primary" disabled={!valid || (hasUnits && !confirmed)}
        onClick={() => void apply(units, confirmed)}>{busy ? 'Guardando unidades…' : 'Usar unidades revisadas'}</button>
    </fieldset>
  </div>;
}
