'use client';
import { useState } from 'react';
import { EvaluationRubric, EvaluationRubricEditor } from './EvaluationRubric.tsx';
import type { ActivityProposal } from '../../../../../../src/core/domain/index.ts';
import { QuestionEditor } from './ActivityAuthoring.tsx';
import { Dialog } from '../../../../../shared-ui/feedback.tsx';
import styles from './ActivityAuthoring.module.css';
import { generationWarnings, generationSourceTitle, type GenerationSource } from '../model/activity-generation-api.ts';

export function ActivityGenerationProposal({ proposal, update, disabled, sources = [] }: {
  proposal: ActivityProposal; update: (value: ActivityProposal) => void; disabled: boolean;
  sources?: Pick<GenerationSource, 'sourceId' | 'title'>[];
}) {
  const [panel, setPanel] = useState<'preview' | 'sources' | null>(null);
  const [tab, setTab] = useState<'instructions' | 'questions' | 'rubric'>('instructions');
  const [index, setIndex] = useState(0);
  const question = proposal.questions[index];
  const patch = (value: Partial<ActivityProposal>) => update({ ...proposal, ...value });
  return <section aria-label="Revisar propuesta privada">
    <h3>Propuesta de Foxy</h3><p>Editá el contenido y los criterios antes de guardar el borrador.</p>
    {proposal.warnings.map(warning => <p role="status" key={warning}>{generationWarnings[warning]}</p>)}
    <div className={styles.sectionSwitch} role="group" aria-label="Contenido de la propuesta">
      <button type="button" aria-pressed={tab === 'instructions'} onClick={() => setTab('instructions')}>Consigna</button>
      {proposal.questions.length ? <button type="button" aria-pressed={tab === 'questions'} onClick={() => setTab('questions')}>Preguntas <span>{proposal.questions.length}</span></button> : null}
      <button type="button" aria-pressed={tab === 'rubric'} onClick={() => setTab('rubric')}>Rúbrica</button>
    </div>
    <fieldset hidden={tab !== 'instructions'} disabled={disabled} aria-label="Consigna propuesta">
      <label>Título propuesto<input maxLength={200} value={proposal.title} onChange={e => patch({ title: e.target.value })} /></label>
      <label>Objetivo propuesto<textarea maxLength={1000} value={proposal.objective} onChange={e => patch({ objective: e.target.value })} /></label>
      <label>Consignas propuestas<textarea maxLength={5000} value={proposal.instructions} onChange={e => patch({ instructions: e.target.value })} /></label>
      {proposal.assignmentPrompts.map((prompt, index) => <label key={index}>Consigna {index + 1}<textarea maxLength={2000} value={prompt}
        onChange={e => patch({ assignmentPrompts: proposal.assignmentPrompts.map((old, n) => n === index ? e.target.value : old) })} /></label>)}
    </fieldset>
    {tab === 'questions' && question ? <div className={styles.itemWorkspace}>
      <nav className={styles.itemIndex} aria-label="Preguntas de la propuesta">
        {proposal.questions.map((item, position) => <button key={position} type="button" aria-current={index === position ? 'true' : undefined}
          onClick={() => setIndex(position)}><span>{position + 1}</span>{item.prompt || 'Pregunta sin consigna'}</button>)}
      </nav>
      <fieldset disabled={disabled} aria-label="Editar pregunta propuesta">
        <QuestionEditor key={index} question={question} index={index} fixedType
          update={value => patch({ questions: proposal.questions.map((old, n) => n === index ? { ...value, scoringRule: value.scoringRule ?? null,
            options: value.options.map(option => ({ text: option.text, correct: option.correct ?? false })) } : old) })} />
      </fieldset>
    </div> : null}
    {tab === 'rubric' ? <EvaluationRubricEditor criteria={proposal.evaluationRubric ?? []} disabled={disabled} onChange={evaluationRubric => patch({ evaluationRubric })}/> : null}
    <div className={styles.secondaryActions}>
      {proposal.evidence.length ? <button type="button" aria-haspopup="dialog" onClick={() => setPanel('sources')}>Fuentes de cada consigna o pregunta</button> : null}
      <button type="button" aria-haspopup="dialog" onClick={() => setPanel('preview')}>Previsualizar como estudiante</button>
    </div>
    {panel === 'sources' ? <Dialog title="Fuentes de cada consigna o pregunta" onClose={() => setPanel(null)}>
      <ul>{proposal.evidence.map(item => <li key={item.item + item.index}>
        {item.item === 'assignment' ? 'Consigna' : 'Pregunta'} {item.index + 1}: {item.references.map(ref =>
          `${generationSourceTitle(ref.sourceId, sources)}${ref.page === null ? '' : `, página ${ref.page}`}`).join(', ')}
      </li>)}</ul>
    </Dialog> : null}
    {panel === 'preview' ? <Dialog title="Vista estudiante de propuesta" onClose={() => setPanel(null)}><section className="p7-preview" aria-label="Vista estudiante de propuesta"><h4>{proposal.title}</h4><section><h5>Objetivo de aprendizaje</h5><p className="p7-multiline">{proposal.objective}</p></section><p className="p7-multiline">{proposal.instructions}</p>
      <EvaluationRubric criteria={proposal.evaluationRubric}/>
      <ol>{proposal.assignmentPrompts.map((prompt, index) => <li className="p7-multiline" key={index}>{prompt}</li>)}</ol>
      {proposal.questions.map((question, index) => <article key={index}><h5>Pregunta {index + 1} · {question.points} puntos</h5>
        <p className="p7-multiline">{question.prompt}</p><ul>{question.options.map((option, n) => <li key={n}>{option.text}</li>)}</ul></article>)}
    </section></Dialog> : null}
  </section>;
}
