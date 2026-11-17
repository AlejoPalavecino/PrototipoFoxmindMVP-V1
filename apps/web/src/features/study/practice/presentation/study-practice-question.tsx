import type { RefObject } from 'react';
import type { StudyPractice } from '../../model/study-contracts.ts';

import { studyAnswerValue } from '../../model/study-transitions.ts';
export function renderStudyPracticeQuestion({ question, index, total, busy, heading, answers, change }: {
  question: StudyPractice['questions'][number];
  index: number;
  total: number;
  busy: boolean;
  heading: RefObject<HTMLElement | null>;
  answers: Record<string, string | string[]>;
  change: (id: string, value: string | string[]) => void;
}) {
  return (<section className="study-exact-practice-question">
    <p>
      Pregunta {index + 1} de {total}
    </p>
    <fieldset disabled={busy}>
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
      </label>) : (question.options?.map((option) => (<label className="study-exact-question-option" key={option.id}>
        <input
          type={question.type === 'MULTIPLE' ? 'checkbox' : 'radio'}
          name={question.id}
          checked={Array.isArray(answers[question.id])
            ? (answers[question.id] as string[]).includes(option.id)
            : answers[question.id] === option.id}
          onChange={(event) => change(question.id, studyAnswerValue(question.type, answers[question.id], option.id, event.target.checked))} />
        <span>{option.text}</span>
      </label>)))}
    </fieldset>
  </section>);

}
