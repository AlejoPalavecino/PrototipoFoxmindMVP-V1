import type { Payload, FileState } from './api.ts';
import { Cover, coverOptions, Notice } from './components.tsx';
import { FoxmindIcon } from '../shared-ui/index.ts';

export function WizardReview({ payload, file, zones, onEdit }: {
  payload: Payload; file: FileState | null; zones: { value: string; label: string }[]; onEdit: (step: number) => void;
}) {
  const units = payload.units ?? [];
  const timezone = zones.find(zone => zone.value === payload.timezone)?.label ?? payload.timezone;
  const facts = [['Nombre del aula', payload.name || 'Aula sin nombre'], ['Materia', payload.subject],
    ['División', payload.division], ['Ciclo lectivo', payload.academicYear], ['Ciudad y horario del aula', timezone]];
  return <div className="wizard-review-blocks">
    <section><header><h3><FoxmindIcon name="book" />Datos generales</h3>
      <button type="button" onClick={() => onEdit(0)}><FoxmindIcon name="edit" />Editar datos</button></header>
      <dl className="wizard-review-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>
    <section><header><h3><FoxmindIcon name="file" />Plan de estudio</h3>
      <button type="button" onClick={() => onEdit(1)}><FoxmindIcon name="refresh" />Cambiar archivo</button></header>
      <p className="wizard-review-file"><FoxmindIcon name="file" />{file?.name ?? 'Falta un plan aprobado'}
        <span className={file?.ready ? 'wizard-approved' : ''}>{file?.ready ? 'Aprobado para usar' : 'Pendiente de aprobación'}</span></p>
    </section>
    <section><header><h3><FoxmindIcon name="clipboard" />Unidades y temas</h3>
      <button type="button" onClick={() => onEdit(2)}><FoxmindIcon name="edit" />Editar unidades</button></header>
      <p>{units.length} unidades · {units.reduce((total, unit) => total + unit.topics.length, 0)} temas en total</p>
      <div className="wizard-review-units">{units.map((unit, index) => <details key={index}>
        <summary><span className="wizard-unit-number">{index + 1}</span>{unit.name}<small>{unit.topics.length} temas</small></summary>
        <ul>{unit.topics.map((topic, position) => <li key={position}>{topic.name}</li>)}</ul>
      </details>)}</div>
    </section>
    <section><header><h3><FoxmindIcon name="folder" />Portada elegida</h3></header>
      <div className="wizard-review-cover"><Cover kind={payload.coverKey} priority />
        <strong>{coverOptions(payload.coverKey).find(cover => cover.key === payload.coverKey)?.label ?? 'General'}</strong></div>
    </section>
    <Notice>Después de crear el aula, podrás invitar estudiantes por correo o compartir un código. El horario del aula quedará fijo.</Notice>
  </div>;
}
