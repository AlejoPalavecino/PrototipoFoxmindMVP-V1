import type { RefObject } from 'react';
import type { Unit } from './api.ts';
import { FoxmindIcon } from '../shared-ui/index.ts';

interface Props {
  units: Unit[];
  collapsed: ReadonlySet<number>;
  containerRef: RefObject<HTMLDivElement | null>;
  onChange: (units: Unit[]) => void;
  onToggle: (index: number) => void;
}

function unitFields(unit: Unit, index: number, collapsed: boolean, onChange: (unit: Unit) => void) {
  return <div id={`wizard-unit-${index}`} className="wizard-unit-fields" hidden={collapsed}>
    <label>Nombre de la unidad<input required={!collapsed} maxLength={120} value={unit.name}
      onChange={event => onChange({ ...unit, name: event.target.value })} /></label>
    {unit.topics.map((topic, topicIndex) => <div className="p5-topic" key={topicIndex}>
      <label>Tema {topicIndex + 1}<input required={!collapsed} maxLength={120} value={topic.name}
        onChange={event => onChange({ ...unit, topics: unit.topics.map((item, position) => position === topicIndex ? { ...item, name: event.target.value } : item) })} /></label>
      <button type="button" aria-label={`Quitar tema ${topicIndex + 1} de unidad ${index + 1}`}
        onClick={() => onChange({ ...unit, topics: unit.topics.filter((_, position) => position !== topicIndex) })}><FoxmindIcon name="trash" /></button>
    </div>)}
    <button type="button" className="wizard-add" onClick={() => onChange({ ...unit, topics: [...unit.topics, { name: '' }] })}>
      <FoxmindIcon name="plus" />Agregar tema</button>
  </div>;
}

export function WizardUnits({ units, collapsed, containerRef, onChange, onToggle }: Props) {
  return <>
    <h3>Tus unidades y temas</h3>
    <div className="p5-units" ref={containerRef}>{units.map((unit, index) => <section className="p5-unit" key={index}>
      <div className="p5-section-head"><h3><span className="wizard-unit-number">{index + 1}</span>Unidad {index + 1}</h3>
        <div className="wizard-unit-actions"><button type="button" className="p5-link"
          onClick={() => onChange(units.filter((_, position) => position !== index))}>
          <FoxmindIcon name="trash" />Quitar unidad {index + 1}</button>
          <button type="button" aria-label={`${collapsed.has(index) ? 'Expandir' : 'Contraer'} unidad ${index + 1}`}
            aria-expanded={!collapsed.has(index)} aria-controls={`wizard-unit-${index}`} onClick={() => onToggle(index)}>
            <FoxmindIcon name="chevron-down" /></button></div>
      </div>
      {unitFields(unit, index, collapsed.has(index), next => onChange(units.map((item, position) => position === index ? next : item)))}
    </section>)}</div>
    <button type="button" className="wizard-add" onClick={() => onChange([...units, { name: '', topics: [{ name: '' }] }])}>
      <FoxmindIcon name="plus" />Agregar unidad</button>
  </>;
}
