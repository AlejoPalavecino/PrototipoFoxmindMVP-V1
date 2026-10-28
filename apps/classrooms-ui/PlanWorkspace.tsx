import { useState } from 'react';
import { canPreviewMaterial, type ActivitySummary, type ClassroomClient, type Detail, type Material } from './api.ts';
import { usePlanWorkspace } from './use-plan-workspace.ts';
import { activityDate, activityTypeLabels } from './ActivityAuthoring.tsx';

function materialRow(api: ClassroomClient, material: Material) {
  return <article className="fm3-plan-resource" key={material.id}>
    <div><h4>{material.title}</h4><p>{material.fileName}</p></div>
    <a href={api.fileUrl(material.fileId, canPreviewMaterial(material) && material.previewable)} target="_blank" rel="noreferrer">Abrir material →</a>
  </article>;
}
function activityRow(activity: ActivitySummary, onOpen: (id: string) => void) {
  return <article className="fm3-plan-resource is-activity" key={activity.id}>
    <div><small>{activityTypeLabels[activity.type]} · {activity.status === 'DRAFT' ? 'Borrador privado' : activity.status === 'WITHDRAWN' ? 'Retirada' : 'Publicada'}</small>
      <h4>{activity.title ?? 'Borrador sin título'}</h4>{activity.zone ? <p>{activityDate(activity.deadlineAt, activity.zone)}</p> : null}</div>
    <button className="primary" onClick={() => onOpen(activity.id)}>Abrir actividad · {activity.title ?? 'Borrador sin título'} →</button>
  </article>;
}
export function PlanWorkspace({ api, room, onOpenActivity, onTopicState, busy = false }: {
  api: ClassroomClient; room: Detail; onOpenActivity: (id: string) => void; busy?: boolean;
  onTopicState?: (id: string, status: 'PENDING' | 'NEXT' | 'TAUGHT') => void;
}) {
  const topics = room.units.flatMap(unit => unit.topics);
  const first = topics.find(topic => topic.status === 'NEXT') ?? topics.find(topic => topic.status === 'PENDING') ?? topics[0];
  const [selectedId, setSelected] = useState(first?.id);
  const topic = topics.find(item => item.id === selectedId) ?? first;
  const unit = room.units.find(item => item.topics.includes(topic!));
  const state = usePlanWorkspace(api, room);
  const materials = state.data?.materials.filter(item => item.ready && !item.deleted && item.topicId === topic?.id) ?? [];
  const activities = state.data?.activities.filter(item => (item.topicIds ?? [item.topicId]).includes(topic?.id ?? '')) ?? [];
  return <div className="fm3-plan-workspace">
    {topics.length ? <label className="fm3-plan-mobile-selection">Tema del plan
      <select aria-label="Tema del plan" value={topic?.id ?? ''} onChange={event => setSelected(event.target.value)}>
        {room.units.map(item => <optgroup key={item.id} label={item.name}>{item.topics.map(candidate =>
          <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.status === 'TAUGHT' ? 'Dado' : candidate.status === 'NEXT' ? 'Siguiente' : 'Pendiente'}</option>)}</optgroup>)}
      </select>
    </label> : null}
    <nav aria-label="Unidades del plan" className="fm3-plan-navigation"><h3>Unidades</h3>
      {room.units.map((item, index) => <section key={item.id ?? index}><h4><span>{index + 1}</span>{item.name}</h4>
        <div className="fm3-unit-progress"><progress aria-label={`Temas dados de ${item.name}`} value={item.topics.filter(candidate => candidate.status === 'TAUGHT').length} max={Math.max(1,item.topics.length)} />
          {item.topics.filter(candidate => candidate.status === 'TAUGHT').length} de {item.topics.length} temas dados</div>
        {item.topics.map(candidate => <button key={candidate.id} aria-current={candidate.id === topic?.id ? 'true' : undefined} onClick={() => setSelected(candidate.id)}>
          <span>{candidate.name}</span><small>{candidate.status === 'TAUGHT' ? 'Dado' : candidate.status === 'NEXT' ? 'Siguiente' : 'Pendiente'}</small>
        </button>)}</section>)}
    </nav>
    <section className="fm3-plan-context" aria-label="Tema seleccionado">
      {!topic ? <p>No hay temas en el plan de esta aula.</p> : <><small>{unit?.name} · Tema seleccionado</small><h3>{topic.name}</h3>
        <span className="p5-tag" data-status={topic.status}>{topic.status === 'TAUGHT' ? 'Dado' : topic.status === 'NEXT' ? 'Siguiente' : 'Pendiente'}</span>
        {room.role === 'teacher' && !room.archived && onTopicState ? <label className="fm3-topic-state">Avance de este tema
          <select aria-label={`Avance de ${topic.name}`} value={topic.status} disabled={busy}
            onChange={event => onTopicState(topic.id!, event.target.value as 'PENDING' | 'NEXT' | 'TAUGHT')}>
            <option value="PENDING">Pendiente</option><option value="NEXT">Lo vemos a continuación</option><option value="TAUGHT">Ya lo trabajamos</option>
          </select><small>Indica lo trabajado en clase; no cambia las calificaciones.</small></label> : null}
        {state.error ? <div role="alert">{state.error} <button onClick={state.retry}>Reintentar materiales y actividades</button></div> : !state.data ? <p role="status">Cargando materiales y actividades…</p> : <>
          <h4>1 · Explorá el material</h4>{materials.map(item => materialRow(api, item))}
          {!materials.length ? <p>Todavía no hay materiales publicados para este tema.</p> : null}
          <h4>2 · Poné en práctica</h4>{activities.map(item => activityRow(item, onOpenActivity))}
          {!activities.length ? <p>No hay actividades disponibles para este tema.</p> : null}
        </>}
      </>}
    </section>
  </div>;
}
