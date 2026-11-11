import type { FileState } from '../../../../../../src/core/contracts/materials.ts';
import type { Payload } from '../../../../../../src/core/contracts/classrooms.ts';
import { Cover } from '../../../../../shared-ui/academic-cover.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import styles from './wizard-review.module.css';

export function WizardReview({ payload, file, edit }: { payload: Payload; file: FileState | null; edit: (step: number) => void }) {
  const units = payload.units ?? [];
  const topics = units.reduce((total, unit) => total + unit.topics.length, 0);
  return <section className={styles.review} aria-label="Resumen del aula">
    <div className={styles.card}>
      <Cover kind={payload.coverKey} />
      <div>
        <h4>{payload.name}</h4>
        <p>{payload.subject} · {payload.division} · {payload.academicYear}</p>
        <p>{payload.timezone}</p>
        <button type="button" onClick={() => edit(0)}>Editar datos y portada</button>
      </div>
    </div>
    <div className={styles.row}>
      <div><strong><FoxmindIcon name="file" />Archivo del plan</strong><p>{file?.name}</p></div>
      <button type="button" onClick={() => edit(1)}>Editar carga del plan</button>
    </div>
    <div className={styles.row}>
      <div><h4>Unidades y temas</h4><p>{units.length} {units.length === 1 ? 'unidad' : 'unidades'} · {topics} {topics === 1 ? 'tema' : 'temas'}</p></div>
      <button type="button" onClick={() => edit(2)}>Editar unidades y temas</button>
    </div>
    <ol className={styles.units}>{units.map((unit, index) => <li key={index}>
      <details><summary><strong>{unit.name}</strong><small>{unit.topics.length} {unit.topics.length === 1 ? 'tema' : 'temas'}</small></summary>
        <ul>{unit.topics.map((topic, topicIndex) => <li key={topicIndex}>{topic.name}</li>)}</ul>
      </details>
    </li>)}</ol>
  </section>;
}
