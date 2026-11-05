import type { EvaluationRubric as Rubric } from '../../src/core/domain/evaluation-rubric.ts';

export function EvaluationRubric({ criteria }: { criteria?: Rubric }) {
  if (!criteria?.length) return null;
  return <section className="evaluation-rubric" aria-label="Rúbrica de evaluación"><h3>Rúbrica de evaluación</h3>
    <p>Criterios compartidos con la actividad. La calificación y devolución se publican por separado.</p>
    <ul>{criteria.map((criterion, index) => <li key={index}><header><strong>{criterion.name}</strong><span>{criterion.weight}%</span></header>{criterion.description ? <p>{criterion.description}</p> : null}</li>)}</ul>
  </section>;
}
export function EvaluationRubricEditor({ criteria, onChange, disabled }: { criteria: Rubric; onChange: (criteria: Rubric) => void; disabled?: boolean }) {
  const total = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  return <fieldset className="evaluation-rubric-editor" disabled={disabled}><legend>Rúbrica pública de evaluación</legend>
    <p>El alumno verá estos criterios cuando asignes la actividad. Las ponderaciones deben sumar 100%.</p>
    {criteria.map((criterion, index) => <div className="evaluation-rubric-criterion" key={index}>
      <label>Criterio {index + 1}<input maxLength={120} required value={criterion.name} onChange={event => onChange(criteria.map((row, i) => i === index ? { ...row, name: event.target.value } : row))}/></label>
      <label>Descripción del criterio {index + 1}<textarea maxLength={1000} value={criterion.description} onChange={event => onChange(criteria.map((row, i) => i === index ? { ...row, description: event.target.value } : row))}/></label>
      <label>Ponderación del criterio {index + 1} (%)<input type="number" min={1} max={100} step={1} required value={criterion.weight} onChange={event => onChange(criteria.map((row, i) => i === index ? { ...row, weight: Number(event.target.value) } : row))}/></label>
      <button type="button" onClick={() => onChange(criteria.filter((_, i) => i !== index))}>Quitar criterio {index + 1}</button>
    </div>)}
    {criteria.length ? <p role="status">Total: {total}%{total !== 100 ? ' · Ajustá las ponderaciones hasta sumar 100%.' : ' · Ponderaciones completas.'}</p> : <p>Sin rúbrica pública. Podés agregar hasta 12 criterios.</p>}
    <button type="button" disabled={disabled || criteria.length >= 12} onClick={() => onChange([...criteria, { name: '', description: '', weight: Math.max(1, 100 - total) }])}>Agregar criterio</button>
  </fieldset>;
}
