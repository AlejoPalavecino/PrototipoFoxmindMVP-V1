import { useEffect, useRef, useState } from 'react';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import type { GenerationSource } from '../model/activity-generation-api.ts';
import { ActivityGenerationForm, type GenerationFormValue } from './ActivityGenerationForm.tsx';

const steps = ['Tema y objetivo', 'Material y nivel', 'Revisar y generar'];
export function GenerationSetup({ room, value, update, sources, disabled, generate }: {
  room: Detail; value: GenerationFormValue; update: (value: GenerationFormValue) => void;
  sources: GenerationSource[]; disabled: boolean; generate: (value: GenerationFormValue) => void | Promise<void>;
}) {
  const [step, setStep] = useState(0), [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  return <form className="education-generation-setup" onSubmit={event => {
    event.preventDefault(); if (disabled) return;
    if (step === 0 && !value.topicIds.length) { setError('Seleccioná al menos un tema para continuar.'); return; }
    if (step === 1 && !value.sourceIds.length && !value.context.trim()) { setError('Elegí al menos una fuente o agregá el contexto de tu clase.'); return; }
    setError('');
    if (step < 2) setStep(step + 1); else void generate(value);
  }}>
    <div className="activity-generation-context" aria-label="Asignación curricular de la propuesta"><strong>{room.units.find(unit => unit.id === value.unitId)?.name ?? 'Elegí una unidad'}</strong><p>{room.units.find(unit => unit.id === value.unitId)?.topics.filter(topic => value.topicIds.includes(topic.id!)).map(topic => topic.name).join(' · ') || 'Elegí uno o más temas'}</p>{step > 0 ? <button type="button" disabled={disabled} onClick={() => setStep(0)}>Cambiar unidad o temas</button> : null}</div>
    <ol className="education-steps" aria-label="Preparación de la actividad">{steps.map((label, index) =>
      <li key={label} aria-current={step === index ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
    <h4 ref={heading} tabIndex={-1}>Paso {step + 1} de 3 · {steps[step]}</h4>
    {error ? <p role="alert" className="p5-notice error">{error}</p> : null}
    {step === 2 ? <div className="education-generation-summary"><h4>Esto es lo que vamos a preparar</h4>
      <p><strong>{value.objective}</strong></p><p>{room.units.find(unit => unit.id === value.unitId)?.name} · {room.units.find(unit => unit.id === value.unitId)?.topics.filter(topic => value.topicIds.includes(topic.id!)).map(topic => topic.name).join(' · ')} · {value.durationMinutes} minutos</p>
      <p>{value.sourceIds.length ? `${value.sourceIds.length} ${value.sourceIds.length === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}` : 'Sin archivos seleccionados'}{value.context.trim() ? ' · Incluye tu contexto docente' : ''}. Dificultad: {value.difficulty === 'BASIC' ? 'básica' : value.difficulty === 'ADVANCED' ? 'avanzada' : 'intermedia'}.</p>
      <small>La propuesta será privada. Después podrás editarla y decidir cuándo publicarla.</small></div> : null}
    <ActivityGenerationForm room={room} value={value} update={update} sources={sources} disabled={disabled} step={step} />
    <footer className="p5-form-footer">
      {step > 0 ? <button type="button" disabled={disabled} onClick={() => { setError(''); setStep(step - 1); }}>Atrás</button> : null}
      <button className="primary" disabled={disabled}>{step === 2 ? 'Generar propuesta privada' : 'Continuar'}</button>
    </footer>
    {step === 2 ? <p className="education-form-note">Generar utiliza IA y puede consumir cuota. Revisar estos pasos no genera contenido.</p> : null}
  </form>;
}
