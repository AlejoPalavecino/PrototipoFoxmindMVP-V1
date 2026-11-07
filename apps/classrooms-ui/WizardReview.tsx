import type { FileState, Payload } from './api.ts';
import { Cover, coverOptions } from './components.tsx';

export function WizardCover({ payload, onUpdate }: { payload: Payload; onUpdate: (key: keyof Payload, value: unknown) => void }) {
  return <fieldset className="wizard-cover-picker"><legend>Portada del aula</legend>
    <div className="p5-covers">{coverOptions(payload.coverKey).map(cover => <label key={cover.key} className={payload.coverKey === cover.key ? 'selected' : ''}>
      <Cover kind={cover.key} /><span><input type="radio" name="coverKey" value={cover.key} checked={payload.coverKey === cover.key}
        onChange={() => onUpdate('coverKey', cover.key)} />{cover.label}</span>
    </label>)}</div>
  </fieldset>;
}

export function WizardReview({ payload, file, edit }: { payload: Payload; file: FileState | null; edit: (step: number) => void }) {
  return <section className="wizard-review" aria-label="Resumen del aula">
    <p>Revisá los datos y el plan. El aula se creará cuando confirmes.</p>
    <Cover kind={payload.coverKey} />
    <div className="p5-section-head"><h4>Datos del aula</h4><button type="button" onClick={() => edit(0)}>Editar datos y portada</button></div>
    <dl><dt>Nombre</dt><dd>{payload.name}</dd><dt>Materia</dt><dd>{payload.subject}</dd>
      <dt>Ciclo lectivo</dt><dd>{payload.academicYear}</dd><dt>División</dt><dd>{payload.division}</dd>
      <dt>Zona horaria</dt><dd>{payload.timezone}</dd><dt>Portada</dt><dd>{coverOptions(payload.coverKey).find(cover => cover.key === payload.coverKey)?.label}</dd>
      <dt>Archivo del plan</dt><dd>{file?.name}</dd></dl>
    <div className="p5-section-head"><h4>Unidades y temas</h4><button type="button" onClick={() => edit(2)}>Editar unidades y temas</button></div>
    <p>Este mismo contenido se mostrará en el tab Plan del aula.</p>
    <ol className="wizard-review-units">{payload.units?.map((unit, index) => <li key={index}><strong>{unit.name}</strong>
      <ul>{unit.topics.map((topic, topicIndex) => <li key={topicIndex}>{topic.name}</li>)}</ul>
    </li>)}</ol>
  </section>;
}
