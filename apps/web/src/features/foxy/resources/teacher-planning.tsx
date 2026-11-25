import { useId, useState } from 'react';
import { FoxyMarkdown } from '../../../../../shared-ui/markdown';
import { DocumentEditor } from '../../../../../shared-ui/document-editor';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { readTeacherLessonPhase, readTeacherLessonTime, readTeacherRubric, teacherTextSections, writeTeacherRubric, type TeacherRubric } from './teacher-planning-model';
import styles from './teacher-planning.module.css';

export function TeacherPlanningReader({ purpose, markdown }: { purpose: string; markdown: string }) {
  if (purpose === 'RUBRIC') {
    const rubric = readTeacherRubric(markdown);
    if (!rubric) return <FoxyMarkdown editorial markdown={markdown} />;
    return <div className={styles.reader}>
      {rubric.introduction && <FoxyMarkdown markdown={rubric.introduction} />}
      {rubric.criteria.map((criterion, index) => <section key={index} className={styles.criterion}>
        <FoxyMarkdown markdown={`## ${criterion.title}`} />
        <dl className={styles.levels}>
          {criterion.levels.map((level, levelIndex) => <div className={styles.level} key={levelIndex}>
            <dt>{level.label}</dt>
            <dd><FoxyMarkdown markdown={level.description} /></dd>
          </div>)}
        </dl>
      </section>)}
    </div>;
  }
  const sections = teacherTextSections(markdown);
  if (!sections.some(section => section.heading)) return <FoxyMarkdown editorial markdown={markdown} />;
  return <div className={styles.reader}>
    {sections.map(({ heading, body }, index) => {
      if (!heading) return body ? <FoxyMarkdown key={index} markdown={body} /> : null;
      const phase = readTeacherLessonPhase(heading);
      return <section className={phase ? styles.phase : styles.section} key={index}>
        {phase ? <header><FoxyMarkdown markdown={`## ${phase.title}`} />
          <span className={styles.minutes}><FoxmindIcon name="calendar" />{phase.minutes}</span></header>
          : <FoxyMarkdown markdown={`## ${heading}`} />}
        {body && <FoxyMarkdown markdown={body} />}
      </section>;
    })}
  </div>;
}

export function TeacherRubricEditor({ value, onChange, disabled }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState(() => ({ value, rubric: readTeacherRubric(value) }));
  const rubric = draft.value === value ? draft.rubric : readTeacherRubric(value);
  function update(next: TeacherRubric) {
    const markdown = writeTeacherRubric(next);
    setDraft({ value: markdown, rubric: next });
    onChange(markdown);
  }
  if (!rubric) return <DocumentEditor id={id} value={value} onChange={onChange} disabled={disabled} />;
  return <div className={styles.editor}>
    {rubric.introduction && <DocumentEditor id={id} value={rubric.introduction} disabled={disabled}
      onChange={introduction => update({ ...rubric, introduction })} />}
    {rubric.criteria.map((criterion, index) => <fieldset key={index} disabled={disabled} className={styles.criterion}>
      <legend>Criterio {index + 1}</legend>
      <label>Nombre del criterio
        <input value={criterion.title} onChange={event => {
          const title = event.currentTarget.value;
          update({ ...rubric, criteria: rubric.criteria.map((item, i) => i === index ? { ...item, title } : item) });
        }} />
      </label>
      <div className={styles.levels}>
        {criterion.levels.map((level, levelIndex) => <fieldset key={levelIndex} className={styles.level}>
          <legend>Nivel {levelIndex + 1}</legend>
          <label>Nombre del nivel
            <input value={level.label} onChange={event => {
              const label = event.currentTarget.value.replace(/:/gu, '');
              update({ ...rubric, criteria: rubric.criteria.map((item, i) => i === index
                ? { ...item, levels: item.levels.map((entry, j) => j === levelIndex ? { ...entry, label } : entry) } : item) });
            }} />
          </label>
          <label>Descripción
            <textarea rows={3} value={level.description} onChange={event => {
              const description = event.currentTarget.value;
              update({ ...rubric, criteria: rubric.criteria.map((item, i) => i === index
                ? { ...item, levels: item.levels.map((entry, j) => j === levelIndex ? { ...entry, description } : entry) } : item) });
            }} />
          </label>
        </fieldset>)}
      </div>
    </fieldset>)}
  </div>;
}

/** Proportional bar of the lesson phases. It only renders when the plan states its minutes. */
export function TeacherLessonTimeBar({ markdown }: { markdown: string }) {
  const time = readTeacherLessonTime(markdown);
  if (!time) return null;
  return <div className={styles.timeBar}>
    <div className={styles.timeTitle}>Tiempo de la clase · {time.total} min</div>
    <ol className={styles.timeTrack} aria-label="Minutos por momento de la clase">
      {time.segments.map((segment, index) => <li key={index} style={{ flexGrow: segment.minutes }} data-phase={index % 4}>{segment.label} {segment.minutes}'</li>)}
    </ol>
  </div>;
}
