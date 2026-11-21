import { useState } from 'react';
import { resourceBodyWithoutRepeatedTitle } from '../../src/core/domain/documents/resource-markdown.ts';
import { FoxyMarkdown } from './markdown';
import type { DocumentIllustration } from './document-pdf';
import styles from './document-editor.module.css';

export function DocumentReader({ title, markdown, explanation, illustrations }: {
  title?: string;
  markdown: string;
  explanation?: boolean;
  illustrations?: readonly DocumentIllustration[];
}) {
  const [revealed, setRevealed] = useState(false);
  const body = title ? resourceBodyWithoutRepeatedTitle(title, markdown) : markdown;
  const exercise = explanation
    ? /(?:^|\n)#{1,6}[ \t]+Ponete a prueba[ \t]*\n([\s\S]+?)\n#{1,6}[ \t]+Respuesta[ \t]*\n([\s\S]+?)(?=\n#{1,6}[ \t]+|$)/iu.exec(body)
    : null;
  const afterExercise = exercise ? body.slice(exercise.index + exercise[0].length).trim() : '';
  return <>
    <FoxyMarkdown markdown={exercise ? body.slice(0, exercise.index) : body} editorial/>
    {illustrations?.length ? <div className={styles.illustrations}>
      {illustrations.map(({ url, caption }) => <figure key={url}>
        <img src={url} alt={caption} loading="lazy"/>
        {caption && <figcaption>{caption}</figcaption>}
      </figure>)}
    </div> : null}
    {exercise && <section className={styles.challenge} aria-label="Ponete a prueba">
      <strong>Ponete a prueba</strong>
      <FoxyMarkdown markdown={exercise[1]!.trim()}/>
      <button type="button" className="p5-primary" aria-expanded={revealed} onClick={() => setRevealed(!revealed)}>
        {revealed ? 'Ocultar respuesta' : 'Ver respuesta'}
      </button>
      {revealed && <FoxyMarkdown markdown={exercise[2]!.trim()}/>}
    </section>}
    {afterExercise && <FoxyMarkdown markdown={afterExercise} editorial/>}
  </>;
}
