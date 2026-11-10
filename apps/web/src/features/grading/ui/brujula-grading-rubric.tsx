import type { EvaluationRubric } from '../../../../../../src/core/domain/grading/evaluation-rubric.ts';
import type { RubricMark } from '../../../../../../src/core/domain/grading/rubric-marks.ts';
import { rubricSuggestion } from '../../../../../../src/core/domain/grading/rubric-marks.ts';
export const validRubricScore = (value: string) => /^(?:[0-9](?:\.\d{1,2})?|10(?:\.0{1,2})?)$/.test(value);
export function rubricInputs(criteria: EvaluationRubric, marks: Record<number, string>): RubricMark[] {
  return criteria.map((_, criterionIndex) => ({ criterionIndex, score: marks[criterionIndex] || null }));
}
export function liveRubricSuggestion(criteria: EvaluationRubric, marks: Record<number, string>): string | null {
  try { return rubricSuggestion(criteria, rubricInputs(criteria, marks)); } catch { return null; }
}
export function BrujulaRubricScoring({ criteria, marks, disabled, onChange }: {
  criteria: EvaluationRubric; marks: Record<number, string>; disabled: boolean; onChange: (index: number, score: string) => void;
}) {
  const suggested = liveRubricSuggestion(criteria, marks);
  return <fieldset className="brujula-rubric-scoring" disabled={disabled}><legend>Corrección con rúbrica</legend>
    <p>Calificá cada criterio de 0 a 10. La ponderación orienta tu nota final.</p>
    <div className="rr-score-list">{criteria.map((criterion, index) => {
      const value = marks[index] ?? '', invalid = !!value && !validRubricScore(value);
      return <div className="rr-score" key={index}><label htmlFor={`brujula-score-${index}`}><strong>{criterion.name}</strong><b>{criterion.weight}%</b><small>{criterion.description}</small></label>
        <div><input id={`brujula-score-${index}`} aria-label={`Puntaje de ${criterion.name}`} aria-invalid={invalid || undefined} aria-describedby={invalid ? `brujula-score-error-${index}` : undefined}
          inputMode="decimal" placeholder="—" value={value.replace('.', ',')} onChange={event => onChange(index, event.target.value.replace(',', '.'))}/>
          {invalid ? <small id={`brujula-score-error-${index}`} className="brujula-score-error">Ingresá un valor de 0 a 10, con hasta dos decimales.</small> : null}</div>
      </div>;
    })}</div>
    <div className="rr-total"><span>Nota ponderada sugerida</span><strong><output aria-live="polite">{suggested?.replace('.', ',') ?? '—'}</output> / 10</strong></div>
    {suggested === null ? <small>Completá los criterios para obtener la sugerencia. Podés definir la nota final manualmente.</small> : null}
  </fieldset>;
}
export function BrujulaPublishedRubric({ snapshot, marks }: { snapshot?: EvaluationRubric | null; marks?: RubricMark[] }) {
  if (!snapshot?.length) return null;
  return <section className="brujula-published-rubric" aria-label="Evaluación por criterios publicada"><h5>Evaluación por criterios</h5>
    <p>Estos son los criterios guardados con esta devolución.</p><dl>{snapshot.map((criterion, index) => {
      const score = marks?.find(mark => mark.criterionIndex === index)?.score;
      return <div className="rr-score" key={index}><dt><strong>{criterion.name}</strong><b>{criterion.weight}%</b><small>{criterion.description}</small></dt>
        <dd>{score == null ? 'Sin puntaje registrado' : `${score.replace('.', ',')} / 10`}</dd></div>;
    })}</dl>
  </section>;
}
