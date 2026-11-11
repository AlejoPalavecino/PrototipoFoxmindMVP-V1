import type { EvaluationRubric as Rubric } from '../../../../../../src/core/domain/grading/evaluation-rubric.ts';

export function EvaluationRubric({ criteria,compact=false }: { criteria?: Rubric;compact?:boolean }) {
  if (!criteria?.length) return null;
  if(compact)return <section className="evaluation-rubric" aria-label="Rúbrica de evaluación"><h3>Rúbrica de evaluación</h3><ul>{criteria.map((criterion,index)=><li key={index}><header><strong>{criterion.name}</strong><span>{criterion.weight} %</span></header><p>{criterion.description}</p></li>)}</ul></section>;
  return <section className="evaluation-rubric" aria-label="Rúbrica de evaluación"><details open><summary><h3>Rúbrica de evaluación</h3><span>{criteria.length} {criteria.length===1?'criterio':'criterios'}</span></summary>
    <ul>{criteria.map((criterion, index) => <li key={index}><header><strong>{criterion.name}</strong><span>{criterion.weight}%</span></header>{criterion.description ? <p>{criterion.description}</p> : null}</li>)}</ul>
  </details></section>;
}
export function EvaluationRubricEditor({ criteria, onChange, disabled, compact = false }: { criteria: Rubric; onChange: (criteria: Rubric) => void; disabled?: boolean; compact?: boolean }) {
  const total = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const rows=criteria.length?criteria:[{name:'',description:'',weight:0}];
  return <fieldset className="evaluation-rubric-editor" disabled={disabled} aria-label="Rúbrica de evaluación">{!compact ? <h3 className="brujula-authoring-card-title">Rúbrica de evaluación</h3> : null}
    <p>Indicá qué vas a observar y cuánto pesa cada criterio en la calificación.</p>
    <p className="brujula-rubric-total" role="status">Total {total} % {total === 100 ? null : total < 100 ? `· Faltan ${100 - total} puntos porcentuales` : `· Sobran ${total - 100} puntos porcentuales`}</p>
    {rows.map((criterion, index) => <div className="evaluation-rubric-criterion" key={index}>
      <header><strong>Criterio {index+1}</strong>{rows.length>1?<button type="button" aria-label={`Quitar criterio ${index+1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}>×</button>:null}</header>
      <label>Nombre del criterio<input aria-label={`Criterio ${index+1}`} placeholder="Ej. Uso de evidencias" maxLength={120} required value={criterion.name} onChange={event => onChange(rows.map((row, i) => i === index ? { ...row, name: event.target.value } : row))}/></label>
      <label>Peso (%)<input aria-label={`Ponderación del criterio ${index+1} (%)`} type="number" min={1} max={100} step={1} required value={criterion.weight||''} onChange={event => onChange(rows.map((row, i) => i === index ? { ...row, weight: Number(event.target.value) } : row))}/></label>
      <label>Evidencia esperada<textarea aria-label={`Descripción del criterio ${index+1}`} placeholder="¿Qué debería mostrar una buena respuesta?" maxLength={1000} value={criterion.description} onChange={event => onChange(rows.map((row, i) => i === index ? { ...row, description: event.target.value } : row))}/></label>
    </div>)}
    {rows.length > 1 ? <button type="button" disabled={disabled} onClick={() => {
      const base = Math.floor(100 / rows.length), remainder = 100 % rows.length;
      onChange(rows.map((row, index) => ({ ...row, weight: base + (index < remainder ? 1 : 0) })));
    }}>Repartir pesos</button> : null}
    <button type="button" disabled={disabled || rows.length >= 12} onClick={() => onChange([...rows, { name: '', description: '', weight: 0 }])}>Agregar criterio</button>
  </fieldset>;
}
