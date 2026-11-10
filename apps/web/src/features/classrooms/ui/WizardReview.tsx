import type { FileState } from '../../../../../../src/core/contracts/materials.ts';
import type { Payload } from '../../../../../../src/core/contracts/classrooms.ts';
import { Cover, coverOptions } from '../../../../../shared-ui/academic-cover.tsx';

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
    <p>{payload.units?.length??0} {payload.units?.length===1?'unidad':'unidades'} · {payload.units?.reduce((n,u)=>n+u.topics.length,0)??0} temas</p>
    <ol className="wizard-review-units">{payload.units?.map((unit, index) => <li key={index}><details><summary>{unit.name} · {unit.topics.length} {unit.topics.length===1?'tema':'temas'}</summary>
      <ul>{unit.topics.map((topic, topicIndex) => <li key={topicIndex}>{topic.name}</li>)}</ul></details>
    </li>)}</ol>
  </section>;
}
