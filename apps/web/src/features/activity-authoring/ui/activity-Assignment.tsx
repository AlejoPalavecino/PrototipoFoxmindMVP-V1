'use client';
import { useState } from 'react';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { selectedActivityTopics, type ActivityScope } from '../model/activity-scope.ts';
import styles from './ActivityAuthoring.module.css';

export function ActivityAssignment({ room, value, update, disabled = false }: {
  room: Detail; value: ActivityScope; update: (value: ActivityScope) => void; disabled?: boolean;
}) {
  const [mode, setMode] = useState<'topics' | 'units'>(value.unitIds.length ? 'units' : 'topics');
  const groups = selectedActivityTopics(room.units, value);
  const selected = groups.flatMap(unit => unit.topics);
  const toggle = (ids: string[], id: string) => ids.includes(id) ? ids.filter(current => current !== id) : [...ids, id];
  return <fieldset className={`${styles.scope} parity-compose-scope`} disabled={disabled} aria-label="Alcance de la actividad">
    <h3>¿Qué va a trabajar tu grupo?</h3>
    <div className={`${styles.scopeToggle} parity-compose-toggle`} role="group" aria-label="Modo de selección">
      <button type="button" aria-pressed={mode === 'topics'} onClick={() => setMode('topics')}>Temas</button>
      <button type="button" aria-pressed={mode === 'units'} onClick={() => setMode('units')}>Unidades completas</button>
    </div>
    <p className={`${styles.scopeSummary} parity-compose-summary`} role="status"><FoxmindIcon name="list-checks"/>
      {selected.length ? `${selected.length} ${selected.length === 1 ? 'tema' : 'temas'} en ${groups.length} ${groups.length === 1 ? 'unidad' : 'unidades'}` : 'Elegí qué querés trabajar'}
    </p>
    <div className={styles.unitList}>{room.units.map(unit => {
      const unitId = unit.id;
      if (!unitId) return null;
      const topics = unit.topics.filter(topic => !!topic.id);
      const whole = value.unitIds.includes(unitId);
      return <fieldset className={styles.scopeUnit} key={unitId}>
        <legend>{unit.name}</legend>
        {mode === 'units' ? <label className={`${styles.scopeOption} parity-compose-option`}><input type="checkbox" checked={whole} disabled={!topics.length}
          onChange={() => update({ ...value, unitIds: toggle(value.unitIds, unitId) })} />
          <span>Unidad completa <small>{topics.length} {topics.length === 1 ? 'tema' : 'temas'}</small></span>
        </label> : <div className={styles.topicOptions}>{topics.map(topic => <label className={`${styles.scopeOption} parity-compose-option`} key={topic.id}>
          <input type="checkbox" checked={whole || value.topicIds.includes(topic.id!)} disabled={whole}
            onChange={() => update({ ...value, topicIds: toggle(value.topicIds, topic.id!) })} />{topic.name}
        </label>)}</div>}
        {!topics.length ? <p>Sin temas en el plan.</p> : null}
        {mode === 'topics' && whole ? <small>Unidad completa seleccionada. Podés cambiarla en «Unidades completas».</small> : null}
      </fieldset>;
    })}</div>

  </fieldset>;
}

const activityTypes = [
  { id: 'ASSIGNMENT', label: 'Trabajo práctico', summary: 'Una consigna con respuesta o archivos.', icon: 'file' },
  { id: 'QUESTIONNAIRE', label: 'Cuestionario', summary: 'Preguntas para practicar y repasar.', icon: 'list-checks' },
  { id: 'EVALUATION', label: 'Evaluación', summary: 'Preguntas con puntaje y devolución.', icon: 'clipboard' },
] as const;

export type AuthoringType = (typeof activityTypes)[number]['id'];

export function ActivityTypeChoice({ value, update, disabled }: {
  value: AuthoringType | ''; update: (value: AuthoringType) => void; disabled?: boolean;
}) {
  return <fieldset className={`${styles.typeCard} parity-compose-type`} disabled={disabled}>
    <legend>Tipo de actividad</legend>
    {activityTypes.map(type => <label key={type.id} className={`${styles.typeChoice} parity-compose-choice`}>
      <input type="radio" name="activity-authoring-type" value={type.id} checked={value === type.id} onChange={() => update(type.id)}/>
      <span className={styles.typeIcon}><FoxmindIcon name={type.icon}/></span>
      <span><strong>{type.label}</strong><small>{type.summary}</small></span>
    </label>)}
  </fieldset>;
}
