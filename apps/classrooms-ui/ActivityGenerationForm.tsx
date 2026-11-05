'use client';
import type { StartActivityGeneration } from '../../src/core/domain/index.ts';
import type { Detail } from './api.ts';
import { ActivityAssignment } from './activity-Assignment.tsx';
import { activityTypeLabels } from './ActivityAuthoring.tsx';
import { generationWarnings, type GenerationSource } from './activity-generation-api.ts';

export type GenerationFormValue = Omit<StartActivityGeneration, 'revision' | 'requestId'>;
export function defaultGenerationForm(): GenerationFormValue {
  return { type: 'ASSIGNMENT', unitId: '', topicIds: [], sourceIds: [], objective: '', groupLevel: '',
    difficulty: 'INTERMEDIATE', durationMinutes: 40, context: '',
    counts: { assignment: 3, development: 0, singleChoice: 0, multipleChoice: 0 }, acknowledgedWarnings: [] };
}
export function ActivityGenerationForm({ room, value, update, sources, disabled, step }: {
  room: Detail; value: GenerationFormValue; update: (value: GenerationFormValue) => void; sources: GenerationSource[]; disabled: boolean; step?: number;
}) {
  const patch = (change: Partial<GenerationFormValue>) => update({ ...value, ...change });
  const docx = sources.some(source => value.sourceIds.includes(source.sourceId) && source.extension === 'docx');
  const inactive = (index: number) => step !== undefined && step !== index;
  return <fieldset disabled={disabled} className="p7-generation-fields"><legend>Preparar la generación</legend>
    <fieldset data-generation-step={0} hidden={inactive(0)} disabled={disabled || inactive(0)}><legend>Tema y objetivo</legend>
    <div className="p5-fields"><label>Tipo de actividad<select value={value.type} onChange={e => patch({ type: e.target.value as GenerationFormValue['type'],
      counts: e.target.value === 'ASSIGNMENT' ? { assignment: 3, development: 0, singleChoice: 0, multipleChoice: 0 }
        : { assignment: 0, development: 2, singleChoice: 2, multipleChoice: 0 } })}>
      {Object.entries(activityTypeLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      </div>
    <ActivityAssignment room={room} value={{ unitId: value.unitId, topicIds: value.topicIds }} update={patch} />
    <label>Objetivo<textarea required maxLength={1000} rows={3} placeholder="Por ejemplo: comparar fracciones en situaciones cotidianas" value={value.objective} onChange={e => patch({ objective: e.target.value })} /></label>
    </fieldset>
    <fieldset data-generation-step={1} hidden={inactive(1)} disabled={disabled || inactive(1)}><legend>Material y nivel</legend>
    <div className="p5-fields"><label>Nivel del grupo<input maxLength={200} value={value.groupLevel} onChange={e => patch({ groupLevel: e.target.value })} /></label>
      <label>Dificultad<select value={value.difficulty} onChange={e => patch({ difficulty: e.target.value as GenerationFormValue['difficulty'] })}>
        <option value="BASIC">Básica</option><option value="INTERMEDIATE">Intermedia</option><option value="ADVANCED">Avanzada</option></select></label>
      <label>Duración aproximada (minutos)<input type="number" min={5} max={240} required value={value.durationMinutes}
        onChange={e => patch({ durationMinutes: Number(e.target.value) })} /></label></div>
    <label>¿Qué trabajaron en clase?<textarea maxLength={5000} rows={4} placeholder="Incluí conceptos, ejemplos y lo que esperás que practiquen. También podés seleccionar un material debajo."
      value={value.context} onChange={e => patch({ context: e.target.value })} /></label>
    <p>Contexto docente: la IA usará tus explicaciones y los materiales que elijas. Cuanto más claro sea el contenido, más útil será la propuesta.</p>
    <fieldset><legend>Fuentes seleccionadas explícitamente · hasta 6 archivos</legend>
      <p>PDF/DOCX: hasta 20 MB en total, 100 páginas PDF o 200.000 caracteres Word. Puedes elegir materiales de otra unidad de esta aula.</p>
      {sources.map(source => <label className="p7-check" key={source.sourceId}><input type="checkbox" disabled={!source.available}
        checked={value.sourceIds.includes(source.sourceId)} onChange={e => patch({ sourceIds: e.target.checked ? [...value.sourceIds, source.sourceId]
          : value.sourceIds.filter(id => id !== source.sourceId) })} />{source.title} · {source.extension.toUpperCase()}
        {source.unitId === value.unitId && value.unitId ? ' · Asociado a esta unidad' : ''}
        {!source.available ? ` · ${source.reason === 'UNSUPPORTED_FORMAT' ? 'Formato no compatible con IA' : source.reason === 'AI_INPUT_LIMIT' ? 'Supera el límite de lectura' : 'Archivo no aprobado'}` : ''}</label>)}
      {!sources.length ? <p>No hay fuentes disponibles. Puedes aportar contenido en Contexto docente.</p> : null}
      {docx ? <label className="p7-check"><input type="checkbox" checked={value.acknowledgedWarnings.includes('DOCX_IMAGES_OMITTED')}
        onChange={e => patch({ acknowledgedWarnings: e.target.checked ? ['DOCX_IMAGES_OMITTED'] : [] })} />Entiendo: {generationWarnings.DOCX_IMAGES_OMITTED}</label> : null}
    </fieldset>
    </fieldset>
    <fieldset data-generation-step={2} hidden={inactive(2)} disabled={disabled || inactive(2)}><legend>Revisar y generar</legend>
    <fieldset><legend>Extensión de la propuesta</legend><div className="p5-fields">
      {(value.type === 'ASSIGNMENT' ? [['assignment', 'Consignas', 20]] : [['development', 'Desarrollo', 30], ['singleChoice', 'Selección única', 30], ['multipleChoice', 'Selección múltiple', 30]]).map(([key, label, max]) =>
        <label key={String(key)}>{label}<input type="number" min={value.type === 'ASSIGNMENT' ? 1 : 0} max={max} required
          value={value.counts[key as keyof typeof value.counts]} onChange={e => patch({ counts: { ...value.counts, [key]: Number(e.target.value) } })} /></label>)}
    </div>{value.type !== 'ASSIGNMENT' ? <p role="status">{value.counts.development + value.counts.singleChoice + value.counts.multipleChoice} de 30 preguntas en total.</p> : null}</fieldset>
    </fieldset>
  </fieldset>;
}
