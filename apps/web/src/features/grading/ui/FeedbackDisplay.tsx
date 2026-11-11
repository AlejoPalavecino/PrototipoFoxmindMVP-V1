import type { ReactNode } from 'react';
import { feedbackSections, parseFeedback } from './overall-feedback.ts';
import styles from './grading.module.css';

export function FeedbackGrade({ grade, title, children }: {
  grade: string; title: string; children?: ReactNode;
}) {
  return <header className={styles.resultHeading}>
    <div><h4>Tu calificación y devolución</h4>{children}</div>
    <div className={`p8-final-grade ${styles.gradeBadge}`}><span>{title}</span>
      <strong>{grade.replace('.', ',')} <small>/ 10</small></strong></div>
  </header>;
}

export function FeedbackSections({ value }: { value: string | null }) {
  const feedback = parseFeedback(value);
  const sections = feedbackSections.filter(([key]) => feedback[key].trim());
  if (!sections.length) return <p>La nota no incluye comentarios generales.</p>;
  return <div className={styles.feedbackSections}>
    {sections.map(([key, label]) => <section className={styles.feedbackBlock} data-tone={key} key={key}>
      <h5>{label}</h5><p className={styles.multiline}>{feedback[key]}</p>
    </section>)}
  </div>;
}

export function QuestionFeedback({ feedback }: { feedback: string }) {
  return <div className={styles.feedbackBlock}><h6>Para seguir aprendiendo</h6><p className={styles.multiline}>{feedback}</p></div>;
}
