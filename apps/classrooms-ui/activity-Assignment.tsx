'use client';
import type { Detail } from './api.ts';
import type { ClassroomCreationContext } from './classroom-creation-context.ts';

/** Curriculum selection is local UI state; choosing a topic never creates or saves an activity. */
export function ActivityAssignment({ room, value, update, disabled = false }: {
  room: Detail; value: ClassroomCreationContext; update: (value: ClassroomCreationContext) => void; disabled?: boolean;
}) {
  const topics = room.units.find(unit => unit.id === value.unitId)?.topics ?? [];
  return <fieldset className="activity-assignment" disabled={disabled}>
    <legend>¿Dónde va esta actividad?</legend>
    <p>La unidad y los temas se asociarán al guardar el borrador. Podés cambiarlos.</p>
    <div className="activity-assignment-controls"><label>Unidad de la actividad<select aria-label="Unidad de la actividad" value={value.unitId}
      onChange={event => update({ unitId: event.target.value, topicIds: [] })}>
      <option value="">Elegí una unidad</option>{room.units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
      <fieldset disabled={!value.unitId}><legend>Temas de esta unidad · elegí uno o más</legend><div className="activity-topic-chips">
        {topics.map(topic => <label className={value.topicIds.includes(topic.id!) ? 'is-selected' : ''} key={topic.id}>
          <input type="checkbox" checked={value.topicIds.includes(topic.id!)} onChange={event => update({ ...value,
            topicIds: event.target.checked ? [...value.topicIds, topic.id!] : value.topicIds.filter(id => id !== topic.id) })} />{topic.name}</label>)}
      </div>{!topics.length ? <p>Elegí una unidad para ver sus temas.</p> : null}</fieldset></div>
    {!value.topicIds.length ? <small>Elegí al menos un tema antes de publicar.</small> : <small>{value.topicIds.length} {value.topicIds.length === 1 ? 'tema seleccionado' : 'temas seleccionados'}</small>}
  </fieldset>;
}
