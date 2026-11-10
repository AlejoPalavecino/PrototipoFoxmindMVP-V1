import { useState } from 'react';
import { type ActivitySummary } from '../../../../../../src/core/contracts/activities.ts';
import { type ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import { type Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { type Material } from '../../../../../../src/core/contracts/materials.ts';
import { usePlanWorkspace } from '../model/use-plan-workspace.ts';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';

function materialRow(canPreviewMaterial: ResourcePresentation['canPreviewMaterial'], api: ClassroomClient, material: Material, onOpen?: (id:string)=>void) {
  return <article className="fm3-plan-resource" key={material.id}>
    <span className="brujula-resource-disc"><FoxmindIcon name="file"/></span><div><h4>{material.title}</h4><p>{material.contentKind==='TEXT' ? 'Texto' : material.extension?.toUpperCase() ?? 'Archivo'}</p></div>
    {onOpen ? <button aria-label={`Abrir material: ${material.title}`} onClick={()=>onOpen(material.id)}><FoxmindIcon name="chevron-right"/></button> : <a aria-label={`Abrir material: ${material.title}`} href={api.fileUrl(material.fileId, canPreviewMaterial(material) && material.previewable)} target="_blank" rel="noreferrer"><FoxmindIcon name="chevron-right"/></a>}
  </article>;
}
function activityRow(activityTypeLabels: ResourcePresentation['activityTypeLabels'], activity: ActivitySummary, onOpen: (id: string) => void) {
  return <article className="fm3-plan-resource is-activity" key={activity.id}>
    <span className="brujula-resource-disc"><FoxmindIcon name="clipboard"/></span><div><h4>{activity.title ?? 'Borrador sin título'}</h4><p>{activityTypeLabels[activity.type]}{activity.status==='DRAFT'?' · Borrador':activity.status==='WITHDRAWN'?' · Retirada':''}</p></div>
    <button aria-label={`Abrir actividad: ${activity.title ?? 'Borrador sin título'}`} onClick={() => onOpen(activity.id)}><FoxmindIcon name="chevron-right"/></button>
  </article>;
}
export interface ResourcePresentation {
  canPreviewMaterial: (material: Pick<Material, 'extension' | 'ready' | 'deleted'>) => boolean;
  activityTypeLabels: Record<ActivitySummary['type'], string>;
}
type Props = ResourcePresentation & {
  api: ClassroomClient; room: Detail; onOpenActivity: (id: string) => void; busy?: boolean;
  onTopicState?: (id: string, status: 'PENDING' | 'NEXT' | 'TAUGHT') => void | Promise<void>;
  selectedTopicId?: string; onSelectTopic?: (id: string) => void;
  onCreateActivity?: (context: ClassroomCreationContext) => void;
  onAddMaterial?: (context: ClassroomCreationContext) => void;
  onOpenMaterial?: (id:string)=>void;
};
export function PlanWorkspace({ api, room, onOpenActivity, onTopicState, busy = false, selectedTopicId, onSelectTopic, onCreateActivity, onAddMaterial, onOpenMaterial, canPreviewMaterial, activityTypeLabels }: Props) {
  const topics = room.units.flatMap(unit => unit.topics);
  const first = topics.find(topic => topic.status === 'NEXT') ?? topics.find(topic => topic.status === 'PENDING') ?? topics[0];
  const [localSelectedId, setLocalSelected] = useState(first?.id);
  const topic = topics.find(item => item.id === (selectedTopicId ?? localSelectedId)) ?? first;
  const unit = room.units.find(item => item.topics.includes(topic!));
  const state = usePlanWorkspace(api, room);
  const writable = room.role === 'teacher' && !room.archived;
  const materials = state.data?.materials.filter(item => item.ready && !item.deleted && !item.supersededBy && item.topicId === topic?.id) ?? [];
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
    </nav>
    <section className="fm3-plan-context cl-detail" aria-label="Tema seleccionado">
      {!topic ? <p>No hay temas en el plan de esta aula.</p> : <>
        <div className="classroom-plan-context-head"><div><small>TEMA {String(unit ? unit.topics.indexOf(topic) + 1 : 1).padStart(2,'0')}</small><h3>{topic.name}</h3><p className="brujula-topic-unit">{unit?.name}</p></div><span className="p5-tag" data-status={topic.status === 'TAUGHT' ? 'TAUGHT' : 'PENDING'}>{topic.status === 'TAUGHT' ? 'Dado' : 'Pendiente'}</span></div>
        {writable ? <div className="classroom-plan-actions">
          {onTopicState && topic.id ? <button className="classroom-topic-complete" disabled={busy} aria-pressed={topic.status==='TAUGHT'} aria-label="Marcar tema seleccionado como dado" onClick={()=>mark(topic.id!,topic.status!=='TAUGHT')}><FoxmindIcon name="check"/><span>{topic.status === 'TAUGHT' ? 'Tema dado' : 'Marcar como dado'}</span></button> : null}
        </div> : null}
        {state.error ? <div role="alert">{state.error} <button onClick={state.retry}>Reintentar materiales y actividades</button></div> : !state.data ? <p role="status">Cargando materiales y actividades…</p> : <>
          <header className="brujula-topic-resources-head"><h4 className="fm3-plan-step">Materiales</h4>{writable && creationContext && onAddMaterial ? <button className="brujula-text-action" disabled={busy} aria-label={`Agregar material para ${topic.name}`} onClick={() => onAddMaterial(creationContext)}><FoxmindIcon name="plus"/>Agregar material</button> : null}</header>{materials.map(item => materialRow(canPreviewMaterial, api, item, onOpenMaterial))}
          {!materials.length ? <p className="classroom-inline-empty">Todavía no hay materiales asociados.</p> : null}
          <header className="brujula-topic-resources-head"><h4 className="fm3-plan-step">Actividades</h4>{writable && creationContext && onCreateActivity ? <button className="brujula-text-action" disabled={busy} aria-label={`Crear actividad para ${topic.name}`} onClick={() => onCreateActivity(creationContext)}>Crear actividad<FoxmindIcon name="arrow-right"/></button> : null}</header>{activities.map(item => activityRow(activityTypeLabels, item, onOpenActivity))}
          {!activities.length ? <p className="classroom-inline-empty">Todavía no hay actividades asociadas.</p> : null}
        </>}
      </>}
    </section>
  </div>;
}
