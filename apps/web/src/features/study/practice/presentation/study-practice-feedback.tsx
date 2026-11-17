import type { RefObject } from 'react';
import type { StudyPractice } from '../../model/study-contracts.ts';

import { FoxyMarkdown } from '../../../../../../shared-ui/markdown';
import { studyPracticeFeedback } from '../../model/study-discovery';
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
export function renderStudyPracticeFeedback({ practice, heading, hasDevelopmentAnswers, answerText, feedbackComplete, busy, onRetryFeedback }: {
  practice: StudyPractice;
  heading: RefObject<HTMLElement | null>;
  hasDevelopmentAnswers: boolean;
  answerText: (id: string) => string;
  feedbackComplete: boolean;
  busy: boolean;
  onRetryFeedback: () => void;
}) {
  return (<section className="study-exact-practice-review">
    <h2 ref={heading as RefObject<HTMLHeadingElement>} tabIndex={-1}>
      Tu orientación
    </h2>
    <p>Revisá el porqué de cada respuesta. La devolución es orientativa.</p>
    <FoxyMarkdown markdown={studyPracticeFeedback(practice.result, practice.questions, practice.feedback)} />
    {hasDevelopmentAnswers && <FoxyMarkdown markdown={formatResult(practice.feedback)} />}
    <ol>
      {practice.questions.map((q) => (<li key={q.id}>
        <div>
          <h3>{q.prompt}</h3>
          <p>Tu respuesta: {answerText(q.id)}</p>
          {q.explanation && <FoxyMarkdown markdown={q.explanation} />}
        </div>
      </li>))}
    </ol>
    {hasDevelopmentAnswers && !feedbackComplete && (<button disabled={busy} onClick={onRetryFeedback}>
      Reintentar devolución
    </button>)}
  </section>);

}
