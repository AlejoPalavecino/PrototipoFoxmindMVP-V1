import type { RefObject } from 'react';
import type { StudyPractice } from '../../model/study-contracts.ts';

import { FoxyMarkdown } from '../../../../../../shared-ui/markdown';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { practiceQuestionOutcomes } from './study-practice-results.ts';

function formatModelFeedback(markdown: string): string {
  // Older model output can contain a serialized break or a stray marker on a feedback label.
  // Match structural breaks and labels outside code so examples can keep their literal notation.
  return markdown.split(/(`+[^`]*`+)/u).map((part, index) => index % 2 ? part : part
    .replace(/(?<!\\)(?:(?:\\r)?\\n){2,}[ \t]*/gu, '\n\n')
    .replace(/(?<!\\)(?:\\r)?\\n[ \t]*(?=\**(?:aciertos?|mejoras?(?: prioritarias?)?|próximo paso):)/giu, '\n\n')
    .replace(/(?<!\\)(?:\\r)?\\n[ \t]*(?=#{1,6} |[-+*] |\d+[.)] )/gu, '\n')
    .replace(/^([ \t]*(?:aciertos?|mejoras?(?: prioritarias?)?|próximo paso):)\*(?=[ \t]|$)/gimu, '$1')
  ).join('');
}

function formatResult(value: unknown): string {
  if (value == null)
    return 'La devolución todavía no está disponible.';
  if (typeof value === 'string')
    return value;
  if (Array.isArray(value))
    return value.map(formatResult).join('\n');
  if (typeof value === 'object' && 'markdown' in value)
    return String((value as {
      markdown: unknown;
    }).markdown);
  if (typeof value === 'object' && 'status' in value)
    return (value as {
      status: string;
    }).status === 'PENDING'
      ? 'La devolución orientativa está pendiente.'
      : 'Podés reintentar la devolución.';
  if (typeof value === 'object')
    return Object.entries(value)
      .map(([key, val]) => `${({
        correct: 'Correctas',
        total: 'Total',
        feedback: 'Devolución',
        explanation: 'Explicación',
        score: 'Resultado',
        questionId: 'Pregunta',
        orientative: 'Orientativa'

      } as Record<string, string>)[key] ?? key}: ${formatResult(val)}`)
      .join('\n');
  return String(value);

}
export function renderStudyPracticeFeedback({ practice, attempts, onSelectAttempt, heading, hasDevelopmentAnswers, answerText, feedbackComplete, busy, onRetryFeedback, missedTopics = [], onPracticeMissed, onPlanReview }: {
  practice: StudyPractice;
  attempts: StudyPractice[];
  onSelectAttempt?: (id: string) => void;
  heading: RefObject<HTMLElement | null>;
  hasDevelopmentAnswers: boolean;
  answerText: (id: string) => string;
  feedbackComplete: boolean;
  busy: boolean;
  onRetryFeedback: () => void;
  missedTopics?: string[];
  onPracticeMissed?: (topicIds: string[]) => void;
  onPlanReview?: (topicIds: string[]) => void;
}) {
  const outcomes = practiceQuestionOutcomes(practice.result);
  const correct = [...outcomes.values()].filter((score) => score === 1).length;
  return (<section className="study-exact-practice-review">
    <h2 ref={heading as RefObject<HTMLHeadingElement>} tabIndex={-1}>
      Tu orientación
    </h2>
    <p>{outcomes.size > 0 && <strong>{correct} de {outcomes.size} correctas. </strong>}Revisá el porqué de cada respuesta.</p>
    {onSelectAttempt && attempts.length > 1 && <div className="study-practice-attempts" role="group" aria-label="Intentos completados">
      {attempts.map((attempt) => <button key={attempt.id} type="button" aria-pressed={attempt.id === practice.id}
        disabled={busy} onClick={() => onSelectAttempt(attempt.id)}>Intento {attempt.attemptNumber ?? 1}</button>)}
    </div>}
    {hasDevelopmentAnswers && <div className="study-practice-orientation">
      <FoxyMarkdown markdown={formatModelFeedback(formatResult(practice.feedback))} />
    </div>}
    <ol className="study-practice-outcomes">
      {practice.questions.map((question, index) => {
        const score = outcomes.get(question.id);
        const label = score === 1 ? 'Correcta' : score === undefined ? 'Desarrollo' : score === 0 ? 'Para repasar' : 'Parcialmente correcta';
        const expected = question.options?.filter((option) => question.correctOptionIds?.includes(option.id)).map((option) => option.text);
        return <li key={question.id} className={score === 1 ? 'is-correct' : score === undefined ? 'is-development' : 'needs-review'}>
          <FoxmindIcon name={score === 1 ? 'check' : score === undefined ? 'edit' : 'help'} />
          <div>
            <h3>{question.prompt}</h3>
            <FoxyMarkdown markdown={`**Pregunta ${index + 1}: ${label}**`} />
            <p>Tu respuesta: {answerText(question.id)}</p>
            {score !== 1 && !!expected?.length && <p>Respuesta esperada: {expected.join(' · ')}</p>}
            {question.explanation && <FoxyMarkdown markdown={question.explanation} />}
          </div>
        </li>;
      })}
    </ol>
    {hasDevelopmentAnswers && !feedbackComplete && (<button disabled={busy} onClick={onRetryFeedback}>
      Reintentar devolución
    </button>)}
    {(onPracticeMissed || onPlanReview) && <div className="study-practice-next">
      <h3>¿Y ahora?</h3>
      <p>{missedTopics.length ? 'Volvé sobre lo que falló mientras está fresco, o repartí el repaso hasta tu evaluación.' : 'Respondiste todo bien. Podés repartir el repaso hasta tu evaluación.'}</p>
      <div>
        {onPracticeMissed && missedTopics.length > 0 && <button type="button" className="primary" disabled={busy} onClick={() => onPracticeMissed(missedTopics)}>
          <FoxmindIcon name="refresh" />Practicar lo que falló
        </button>}
        {onPlanReview && <button type="button" disabled={busy} onClick={() => onPlanReview(missedTopics)}>
          <FoxmindIcon name="calendar" />Organizar mi repaso
        </button>}
      </div>
    </div>}
  </section>);

}
