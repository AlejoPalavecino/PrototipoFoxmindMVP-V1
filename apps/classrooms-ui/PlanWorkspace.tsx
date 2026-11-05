import { useState } from 'react';
import { canPreviewMaterial, type ActivitySummary, type ClassroomClient, type Detail, type Material } from './api.ts';
import { usePlanWorkspace } from './use-plan-workspace.ts';
import { activityDate, activityTypeLabels } from './ActivityAuthoring.tsx';
import type { ClassroomCreationContext } from './classroom-creation-context.ts';

function materialRow(api: ClassroomClient, material: Material) {
  return <article className="fm3-plan-resource" key={material.id}>
    <div><small>Material de estudio</small><h4>{material.title}</h4><p>{material.fileName}</p></div>
    <a aria-label={`Abrir material: ${material.title}`} href={api.fileUrl(material.fileId, canPreviewMaterial(material) && material.previewable)} target="_blank" rel="noreferrer">Abrir material</a>
  </article>;
}
function activityRow(activity: ActivitySummary, onOpen: (id: string) => void) {
  return <article className="fm3-plan-resource is-activity" key={activity.id}>
    <div><small>{activityTypeLabels[activity.type]} · {activity.status === 'DRAFT' ? 'Borrador privado' : activity.status === 'WITHDRAWN' ? 'Retirada' : 'Publicada'}</small>
      <h4>{activity.title ?? 'Borrador sin título'}</h4>{activity.zone ? <p>{activityDate(activity.deadlineAt, activity.zone)}</p> : null}</div>
    <button aria-label={`Abrir actividad: ${activity.title ?? 'Borrador sin título'}`} onClick={() => onOpen(activity.id)}>Abrir actividad</button>
  </article>;
}
type Props = {
  api: ClassroomClient; room: Detail; onOpenActivity: (id: string) => void; busy?: boolean;
  onTopicState?: (id: string, status: 'PENDING' | 'NEXT' | 'TAUGHT') => void | Promise<void>;
  selectedTopicId?: string; onSelectTopic?: (id: string) => void;
  onCreateActivity?: (context: ClassroomCreationContext) => void;
  onAddMaterial?: (context: ClassroomCreationContext) => void;
};
export function PlanWorkspace({ api, room, onOpenActivity, onTopicState, busy = false, selectedTopicId, onSelectTopic, onCreateActivity, onAddMaterial }: Props) {
  const topics = room.units.flatMap(unit => unit.topics);
  const first = topics.find(topic => topic.status === 'NEXT') ?? topics.find(topic => topic.status === 'PENDING') ?? topics[0];
  const [localSelectedId, setLocalSelected] = useState(first?.id);
  const topic = topics.find(item => item.id === (selectedTopicId ?? localSelectedId)) ?? first;
  const unit = room.units.find(item => item.topics.includes(topic!));
  const state = usePlanWorkspace(api, room);
  const writable = room.role === 'teacher' && !room.archived;
  const materials = state.data?.materials.filter(item => item.ready && !item.deleted && item.topicId === topic?.id) ?? [];
  const activities = state.data?.activities.filter(item => (item.topicIds ?? [item.topicId]).includes(topic?.id ?? '')) ?? [];
  const selectTopic = (id?: string) => { if (id) { setLocalSelected(id); onSelectTopic?.(id); } };
  const creationContext = unit?.id && topic?.id ? { unitId: unit.id, topicIds: [topic.id] } : null;
  const mark = (id: string, checked: boolean) => { if (writable && !busy) void onTopicState?.(id, checked ? 'TAUGHT' : 'PENDING'); };
  return <div className="fm3-plan-workspace cl-plan">
    {topics.length ? <label className="fm3-plan-mobile-selection">Tema del plan
      <select aria-label="Tema del plan" value={topic?.id ?? ''} onChange={event => selectTopic(event.target.value)}>
        {room.units.map(item => <optgroup key={item.id} label={item.name}>{item.topics.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.status === 'TAUGHT' ? 'Dado' : 'Pendiente'}</option>)}</optgroup>)}
      </select>
    </label> : null}
    <nav aria-label="Unidades del plan" className="fm3-plan-navigation cl-tree">
      {room.units.map((item, index) => <section key={item.id ?? index} className={`cl-unit${item.id === unit?.id ? ' is-selected' : ''}`}>
        <button className="fm3-unit-select cl-unit-head" disabled={!item.topics.length} aria-expanded={item.id === unit?.id} aria-pressed={item.id === unit?.id} onClick={() => selectTopic(item.topics.find(candidate => candidate.status === 'NEXT')?.id ?? item.topics[0]?.id)}>
          <span className="fm3-unit-number cl-unit-no">{String(index + 1).padStart(2,'0')}</span><span className="fm3-unit-body"><strong>{item.name}</strong><small>{item.topics.filter(candidate => candidate.status === 'TAUGHT').length} de {item.topics.length} temas dados</small></span>
        </button>
        <div className="classroom-plan-topics cl-topic-list" hidden={item.id !== unit?.id}>{item.topics.map(candidate => <div className={`classroom-plan-topic cl-topic${candidate.status === 'TAUGHT' ? ' is-taught' : ''}${candidate.id === topic?.id ? ' selected' : ''}`} key={candidate.id}>
          {writable && onTopicState && candidate.id ? <label className="classroom-topic-check"><input type="checkbox" aria-label={`Marcar como dado: ${candidate.name}`} checked={candidate.status === 'TAUGHT'} disabled={busy} onChange={event => mark(candidate.id!, event.target.checked)}/></label>
            : <span className="classroom-topic-indicator" aria-label={candidate.status === 'TAUGHT' ? 'Dado' : 'Pendiente'}>{candidate.status === 'TAUGHT' ? '✓' : '○'}</span>}
          <button aria-current={candidate.id === topic?.id ? 'true' : undefined} onClick={() => selectTopic(candidate.id)}><span>{candidate.name}</span><small>{candidate.status === 'TAUGHT' ? 'Dado' : 'Pendiente'}</small></button>
        </div>)}</div>
      </section>)}
      <p className="classroom-plan-note">{writable ? 'Un tilde marca el tema como dado. Podés destildarlo cuando quieras. ' : ''}El avance del plan no cambia las calificaciones.</p>
    </nav>
    <section className="fm3-plan-context cl-detail" aria-label="Tema seleccionado">
      {!topic ? <p>No hay temas en el plan de esta aula.</p> : <>
        <div className="classroom-plan-context-head"><div><small>{unit?.name} › Tema {unit ? unit.topics.indexOf(topic) + 1 : 1} de {unit?.topics.length ?? 1}</small><h3>{topic.name}</h3></div><span className="p5-tag" data-status={topic.status === 'TAUGHT' ? 'TAUGHT' : 'PENDING'}>{topic.status === 'TAUGHT' ? 'Dado' : 'Pendiente'}</span></div>
        {writable ? <div className="classroom-plan-actions">
          {creationContext && onCreateActivity ? <button className="primary" disabled={busy} aria-label={`Crear actividad para ${topic.name}`} onClick={() => onCreateActivity(creationContext)}>Crear actividad</button> : null}
          {creationContext && onAddMaterial ? <button disabled={busy} aria-label={`Agregar material para ${topic.name}`} onClick={() => onAddMaterial(creationContext)}>Agregar material</button> : null}
          {onTopicState && topic.id ? <label className="classroom-topic-complete"><input type="checkbox" checked={topic.status === 'TAUGHT'} disabled={busy} aria-label="Marcar tema seleccionado como dado" onChange={event => mark(topic.id!, event.target.checked)}/><span>{topic.status === 'TAUGHT' ? 'Tema dado' : 'Marcar como dado'}</span></label> : null}
        </div> : null}
        {state.error ? <div role="alert">{state.error} <button onClick={state.retry}>Reintentar materiales y actividades</button></div> : !state.data ? <p role="status">Cargando materiales y actividades…</p> : <>
          <h4 className="fm3-plan-step">Materiales para este tema <span>{materials.length}</span></h4>{materials.map(item => materialRow(api, item))}
          {!materials.length ? <p className="classroom-inline-empty">Todavía no hay materiales publicados para este tema.</p> : null}
          <h4 className="fm3-plan-step is-green">Actividades del tema <span>{activities.length}</span></h4>{activities.map(item => activityRow(item, onOpenActivity))}
          {!activities.length ? <p className="classroom-inline-empty">{writable ? 'Creá la primera actividad de este tema. La unidad y el tema ya van a estar seleccionados.' : 'Todavía no hay actividades disponibles para este tema.'}</p> : null}
          <p className="classroom-plan-note">Materiales y actividades permanecen vinculados a este tema.</p>
        </>}
      </>}
    </section>
  </div>;
}
