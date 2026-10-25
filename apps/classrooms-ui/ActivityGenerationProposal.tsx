'use client';
import { useState } from 'react';
import type { ActivityProposal } from '../../src/core/domain/index.ts';
import { QuestionEditor } from './ActivityAuthoring.tsx';
import { generationWarnings } from './activity-generation-api.ts';

export function ActivityGenerationProposal({ proposal, update, disabled }: {
  proposal: ActivityProposal; update: (value: ActivityProposal) => void; disabled: boolean;
}) {
  const [preview, setPreview] = useState(false);
  const patch = (value: Partial<ActivityProposal>) => update({ ...proposal, ...value });
  return <section aria-label="Revisar propuesta privada">
    <h4>Revisión docente privada</h4><p>Revisa contenido, claves y puntos antes de crear el borrador. Las referencias ayudan a revisar; no certifican la exactitud de la propuesta.</p>
    {proposal.warnings.map(warning => <p role="status" key={warning}>{generationWarnings[warning]}</p>)}
    <fieldset disabled={disabled}><legend>Contenido propuesto editable</legend>
      <label>Título propuesto<input maxLength={200} value={proposal.title} onChange={e => patch({ title: e.target.value })} /></label>
      <label>Objetivo propuesto<textarea maxLength={1000} value={proposal.objective} onChange={e => patch({ objective: e.target.value })} /></label>
      <label>Observaciones propuestas<textarea maxLength={5000} value={proposal.instructions} onChange={e => patch({ instructions: e.target.value })} /></label>
      {proposal.assignmentPrompts.map((prompt, index) => <label key={index}>Consigna {index + 1}<textarea maxLength={2000} value={prompt}
        onChange={e => patch({ assignmentPrompts: proposal.assignmentPrompts.map((old, n) => n === index ? e.target.value : old) })} /></label>)}
      {proposal.questions.map((question, index) => <QuestionEditor key={index} question={question} index={index} fixedType
        update={value => patch({ questions: proposal.questions.map((old, n) => n === index ? { ...value, scoringRule: value.scoringRule ?? null,
          options: value.options.map(option => ({ text: option.text, correct: option.correct ?? false })) } : old) })} />)}
      <p>La cantidad y combinación de preguntas corresponde a lo solicitado. Para cambiarla, prepara una nueva generación.</p>
    </fieldset>
    <details><summary>Fuentes de cada consigna o pregunta</summary><ul>{proposal.evidence.map(item => <li key={item.item + item.index}>
      {item.item === 'assignment' ? 'Consigna' : 'Pregunta'} {item.index + 1}: {item.references.map(ref => `${ref.sourceId === 'teacher-context' ? 'Contexto docente' : ref.sourceId}${ref.page === null ? '' : `, página ${ref.page}`}`).join('; ')}</li>)}</ul></details>
    <button type="button" onClick={() => setPreview(!preview)}>{preview ? 'Cerrar vista estudiante' : 'Previsualizar como estudiante'}</button>
    {preview ? <section className="p7-preview" aria-label="Vista estudiante de propuesta"><h4>{proposal.title}</h4><p className="p7-multiline">{proposal.instructions}</p>
      <ol>{proposal.assignmentPrompts.map((prompt, index) => <li className="p7-multiline" key={index}>{prompt}</li>)}</ol>
      {proposal.questions.map((question, index) => <article key={index}><h5>Pregunta {index + 1} · {question.points} puntos</h5>
        <p className="p7-multiline">{question.prompt}</p><ul>{question.options.map((option, n) => <li key={n}>{option.text}</li>)}</ul></article>)}
    </section> : null}
  </section>;
}
