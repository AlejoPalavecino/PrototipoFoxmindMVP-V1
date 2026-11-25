import type { RefObject } from 'react';
import type { StudyPractice } from '../../model/study-contracts.ts';

import { studyAnswerValue } from '../../model/study-transitions.ts';
import { FoxyMarkdown } from '../../../../../../shared-ui/markdown';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
export function renderStudyPracticeQuestion({ question, index, total, busy, checked, heading, answers, change }: {
  question: StudyPractice['questions'][number];
  index: number;
  total: number;
  busy: boolean;
  checked: boolean;
  heading: RefObject<HTMLElement | null>;
  answers: Record<string, string | string[]>;
  change: (id: string, value: string | string[]) => void;
}) {
  const given = answers[question.id];
  const isCorrect = checked && Array.isArray(given) && given.length === question.correctOptionIds?.length
    && given.every(id => question.correctOptionIds?.includes(id));
  const selectedFeedback = Array.isArray(given)
    ? question.optionFeedback?.filter(item => given.includes(item.optionId)).map(item => item.text).join('\n\n')
    : undefined;
  return (<section className="study-exact-practice-question">
    <p>
      Pregunta {index + 1} de {total}
    </p>
    <fieldset disabled={busy || checked}>
      <legend ref={heading as RefObject<HTMLLegendElement>} tabIndex={-1}>
        {question.prompt}
      </legend>
      {question.type === 'DEVELOPMENT' ? (<label>
        Tu respuesta
        <textarea
          rows={5}
          maxLength={20000}
          value={String(answers[question.id] ?? '')}
          onChange={(event) => change(question.id, event.target.value)} />
      </label>) : (question.options?.map((option, optionIndex) => (<label className="study-exact-question-option" key={option.id}>
        <input
          type={question.type === 'MULTIPLE' ? 'checkbox' : 'radio'}
          name={question.id}
          checked={Array.isArray(answers[question.id])
            ? (answers[question.id] as string[]).includes(option.id)
            : answers[question.id] === option.id}
          onChange={(event) => change(question.id, studyAnswerValue(question.type, answers[question.id], option.id, event.target.checked))} />
        <span className="study-option-letter" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
        <span className="study-option-text">{option.text}</span>
        {checked && question.correctOptionIds?.includes(option.id) && <strong className="study-practice-option-key">Correcta</strong>}
      </label>)))}
    </fieldset>
    {checked && <div className={`study-practice-inline-feedback ${isCorrect ? 'is-correct' : 'needs-review'}`} role="status">
      <FoxmindIcon name={isCorrect ? 'check' : 'chat'} />
      <div>
        <strong>{isCorrect ? 'Correcto' : 'Revisemos la respuesta'}</strong>
        {(selectedFeedback || question.explanation) && <FoxyMarkdown markdown={selectedFeedback || question.explanation || ''} />}
      </div>
    </div>}
  </section>);

}
