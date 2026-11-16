'use client';
import type { StartActivityGeneration } from '../../../../../../src/core/domain/index.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { ActivityAssignment, ActivityTypeChoice } from './activity-Assignment.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import styles from './ActivityAuthoring.module.css';

export const teacherBriefLimit = 1200;
const examples = [
  ['Aplicar lo aprendido', 'Quiero que expliquen un concepto con un ejemplo de su vida cotidiana y justifiquen por qué funciona.'],
  ['Comparar ideas', 'Quiero que comparen dos explicaciones posibles y usen evidencias de clase para elegir entre ellas.'],
  ['Resolver un caso', 'Quiero que resuelvan un caso cercano, describan su decisión y revisen qué cambiarían.'],
] as const;
import { generationWarnings, type GenerationSource } from '../model/activity-generation-api.ts';

export type GenerationFormValue = Omit<StartActivityGeneration, 'revision' | 'requestId' | 'unitId' | 'unitIds' | 'teacherBrief'> & { unitIds: string[]; teacherBrief: string };
export function defaultGenerationCounts(type: GenerationFormValue['type']) {
  return type === 'ASSIGNMENT' ? { assignment: 3, development: 0, singleChoice: 0, multipleChoice: 0 }
    : { assignment: 0, development: 2, singleChoice: 2, multipleChoice: 0 };
}
export function defaultGenerationForm(): GenerationFormValue {
  return { type: 'ASSIGNMENT', unitIds: [], topicIds: [], teacherBrief: '', sourceIds: [], objective: '', groupLevel: '',
    difficulty: 'INTERMEDIATE', durationMinutes: 40, context: '',
    counts: defaultGenerationCounts('ASSIGNMENT'), acknowledgedWarnings: [] };
}
export function ActivityGenerationForm({ room, value, update, sources, disabled, step, settingsOnly = false }: {
  room: Detail; value: GenerationFormValue; update: (value: GenerationFormValue) => void; sources: GenerationSource[]; disabled: boolean; step?: number; settingsOnly?: boolean;
}) {
  const patch = (change: Partial<GenerationFormValue>) => update({ ...value, ...change });
  const docx = sources.some(source => value.sourceIds.includes(source.sourceId) && source.extension === 'docx');
  const inactive = (index: number) => settingsOnly ? index === 0 : step !== undefined && step !== index;
  return <fieldset disabled={disabled} className={styles.generationFields}>
    <div className={styles.scopeGrid} data-generation-step={0} hidden={inactive(0)}>
      <ActivityAssignment room={room} value={value} update={patch} disabled={disabled || inactive(0)}/>
      <div className={styles.scopeStack}>
        <ActivityTypeChoice value={value.type} disabled={disabled || inactive(0)} update={type => patch({
          type, counts: defaultGenerationCounts(type),
        })}/>
        <section className={styles.aiBrief} aria-labelledby="activity-idea-heading">
          <h3 id="activity-idea-heading"><FoxmindIcon name="spark"/>Tu idea para Foxy</h3>
          <p id="activity-idea-help">Contale qué querés que hagan o cómo querés trabajarlo. Esta idea es privada.</p>
          <label>Idea de la actividad <textarea aria-describedby="activity-idea-help activity-idea-length" rows={4} maxLength={teacherBriefLimit}
            disabled={inactive(0)} value={value.teacherBrief} onChange={event => patch({ teacherBrief: event.target.value })}
            placeholder="Ej. Que comparen dos explicaciones y justifiquen la que les parece más convincente."/></label>
          <small id="activity-idea-length">{[...value.teacherBrief].length}/{teacherBriefLimit}</small>
          <div className={styles.scopeToggle} role="group" aria-label="Ideas de ejemplo">{examples.map(([label, example]) =>
            <button key={label} type="button" disabled={inactive(0)} onClick={() => patch({ teacherBrief: example })}>{label}</button>)}</div>
        </section>
      </div>
    </div>
    <fieldset data-generation-step={1} hidden={inactive(1)} disabled={disabled || inactive(1)}><legend>Material y nivel</legend>
    <label>Objetivo de aprendizaje · Opcional<textarea maxLength={1000} rows={2} placeholder="¿Qué querés que puedan hacer al terminar?" value={value.objective} onChange={event => patch({ objective: event.target.value })}/></label>
    <div className="p5-fields"><label>Nivel del grupo<input maxLength={200} value={value.groupLevel} onChange={e => patch({ groupLevel: e.target.value })} /></label>
      <label>Dificultad<select value={value.difficulty} onChange={e => patch({ difficulty: e.target.value as GenerationFormValue['difficulty'] })}>
        <option value="BASIC">Básica</option><option value="INTERMEDIATE">Intermedia</option><option value="ADVANCED">Avanzada</option></select></label>
      <label>Duración aproximada (minutos)<input type="number" min={5} max={240} required value={value.durationMinutes}
        onChange={e => patch({ durationMinutes: Number(e.target.value) })} /></label></div>
    <label>¿Qué trabajaron en clase?<textarea maxLength={5000} rows={4} placeholder="Incluí conceptos, ejemplos y lo que esperás que practiquen. También podés seleccionar un material debajo."
      value={value.context} onChange={e => patch({ context: e.target.value })} /></label>
    <p>Contexto docente: la IA usará tus explicaciones y los materiales que elijas. Cuanto más claro sea el contenido, más útil será la propuesta.</p>
    <fieldset><legend>Fuentes seleccionadas explícitamente · hasta 6 archivos</legend>
      <p>PDF, Word y PowerPoint: hasta 20 MB en total. PDF: hasta 100 páginas; Word y PowerPoint: hasta 200.000 caracteres de texto. Podés elegir materiales de otra unidad de esta aula.</p>
      {sources.map(source => <label className="p7-check" key={source.sourceId}><input type="checkbox" disabled={!source.available}
        checked={value.sourceIds.includes(source.sourceId)} onChange={e => patch({ sourceIds: e.target.checked ? [...value.sourceIds, source.sourceId]
          : value.sourceIds.filter(id => id !== source.sourceId) })} />{source.title} · {source.extension.toUpperCase()}
        {source.unitId && value.unitIds.includes(source.unitId) ? ' · Asociado a una unidad elegida' : ''}
        {!source.available ? ` · ${source.reason === 'UNSUPPORTED_FORMAT' ? 'Formato no compatible con IA' : source.reason === 'AI_INPUT_LIMIT' ? 'Supera el límite de lectura' : 'Archivo no aprobado'}` : ''}</label>)}
      {!sources.length ? <p>No hay fuentes disponibles. Podés aportar contenido en Contexto docente.</p> : null}
      {docx ? <label className="p7-check"><input type="checkbox" checked={value.acknowledgedWarnings.includes('DOCX_IMAGES_OMITTED')}
        onChange={e => patch({ acknowledgedWarnings: e.target.checked ? ['DOCX_IMAGES_OMITTED'] : [] })} />Entiendo: {generationWarnings.DOCX_IMAGES_OMITTED}</label> : null}
    </fieldset>
    </fieldset>
    <fieldset data-generation-step={2} hidden={inactive(2)} disabled={disabled || inactive(2)}><legend>Extensión</legend>
    <fieldset><legend>Extensión de la propuesta</legend><div className="p5-fields">
      {(value.type === 'ASSIGNMENT' ? [['assignment', 'Consignas', 20]] : [['development', 'Desarrollo', 30], ['singleChoice', 'Selección única', 30], ['multipleChoice', 'Selección múltiple', 30]]).map(([key, label, max]) =>
        <label key={String(key)}>{label}<input type="number" min={value.type === 'ASSIGNMENT' ? 1 : 0} max={max} required
          value={value.counts[key as keyof typeof value.counts]} onChange={e => patch({ counts: { ...value.counts, [key]: Number(e.target.value) } })} /></label>)}
    </div>{value.type !== 'ASSIGNMENT' ? <p role="status">{value.counts.development + value.counts.singleChoice + value.counts.multipleChoice} de 30 preguntas en total.</p> : null}</fieldset>
    </fieldset>
  </fieldset>;
}
