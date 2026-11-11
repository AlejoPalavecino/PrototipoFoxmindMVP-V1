import { useEffect, useRef, useState } from 'react';
import styles from './plan.module.css';
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
  recentTopicId?: string;
};
export function PlanWorkspace({ api, room, onOpenActivity, onTopicState, busy = false, selectedTopicId, onSelectTopic, onCreateActivity, onAddMaterial, onOpenMaterial, canPreviewMaterial, activityTypeLabels, recentTopicId }: Props) {
  const topics = room.units.flatMap(unit => unit.topics);
  const [localSelectedId, setLocalSelected] = useState<string>();
  const [filter, setFilter] = useState<'all' | 'pending' | 'taught'>('all');
  const detailsRef = useRef<HTMLElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const changedControl = useRef<HTMLElement>(null);
  const taught = topics.filter(item => item.status === 'TAUGHT').length;
  const matching = (status?: string) => filter === 'all' || (filter === 'taught') === (status === 'TAUGHT');
  const units = room.units.map((unit, index) => ({ unit, index, topics: unit.topics.filter(item => matching(item.status)) }))
    .filter(item => item.topics.length);
  const visible = units.flatMap(item => item.topics);
  const topic = visible.find(item => item.id === (selectedTopicId ?? localSelectedId))
    ?? visible.find(item => item.status === 'NEXT') ?? visible.find(item => item.status === 'PENDING') ?? visible[0];
  const unit = room.units.find(item => topic && item.topics.includes(topic));
  const position = topic ? visible.indexOf(topic) : -1;
  const state = usePlanWorkspace(api, room);
  const writable = room.role === 'teacher' && !room.archived;
  const materials = state.data?.materials.filter(item => item.ready && !item.deleted && !item.supersededBy && item.topicId === topic?.id) ?? [];
  const activities = state.data?.activities.filter(item => (item.topicIds ?? [item.topicId]).includes(topic?.id ?? '')) ?? [];
  const selectTopic = (id?: string, jump = false) => {
    if (!id) return;
    setLocalSelected(id); onSelectTopic?.(id);
    if (jump && typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches) requestAnimationFrame(() => detailsRef.current?.focus());
  };
  const creationContext = unit?.id && topic?.id ? { unitId: unit.id, topicIds: [topic.id] } : null;
  const mark = (id: string, checked: boolean, source?: HTMLElement) => {
    if (!writable || busy) return;
    changedControl.current = source ?? null;
    void onTopicState?.(id, checked ? 'TAUGHT' : 'PENDING');
  };
  useEffect(() => {
    if (busy || !changedControl.current) return;
    if (!changedControl.current.isConnected) filtersRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    changedControl.current = null;
  }, [busy]);
  const focusTopic = () => {
    const target = Array.from(navigationRef.current?.querySelectorAll<HTMLButtonElement>('[data-topic-choice]') ?? [])
      .find(button => button.dataset.topicChoice === topic?.id);
    const disclosure = target?.closest('details');
    if (disclosure) disclosure.open = true;
    (target ?? filtersRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]'))?.focus();
  };
  return <>
    {topics.length ? <div className={styles.progress}>
      <div><strong>{taught} de {topics.length} temas dados</strong><small>{writable ? 'Tu recorrido de enseñanza' : 'Avance del plan de estudio'}</small></div>
      <progress max={topics.length} value={taught} aria-label="Temas dados" /><b>{Math.round(taught / topics.length * 100)}%</b>
    </div> : null}
    <div className={styles.workspace}>
    <nav ref={navigationRef} aria-label="Unidades del plan" className={styles.navigation}>
      {topics.length ? <div ref={filtersRef} className={styles.filters} role="group" aria-label="Filtrar temas">
        {([['all', 'Todos', topics.length], ['pending', 'Por dar', topics.length - taught], ['taught', 'Dados', taught]] as const).map(([value, label, count]) =>
          <button key={value} type="button" aria-label={`${label} (${count})`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span aria-hidden="true">{count}</span></button>)}
      </div> : null}
      {topic ? <label className={styles.mobile}>Tema del plan
        <select aria-label="Tema del plan" value={topic.id ?? ''} onChange={event => selectTopic(event.target.value)}>
          {units.map(item => <optgroup key={item.unit.id ?? item.index} label={item.unit.name}>
            {item.topics.map((candidate, index) => <option key={candidate.id ?? index} value={candidate.id}>{candidate.name} · {topicLabel(candidate.status)}</option>)}
          </optgroup>)}
        </select>
      </label> : null}
      {units.map(({ unit: item, index, topics: available }) => {
        const completed = item.topics.filter(candidate => candidate.status === 'TAUGHT').length;
        return <details key={item.id ?? index} className={styles.unit}
          ref={node => { if (node && !node.dataset.initialized) { node.open = true; node.dataset.initialized = 'true'; } }}>
          <summary><span className={styles.unitNumber}>{String(index + 1).padStart(2, '0')}</span><span><strong>{item.name}</strong><small>{completed} de {item.topics.length} dados</small></span></summary>
          <progress max={item.topics.length} value={completed} aria-label={`Temas dados en ${item.name}`} />
          <div className={styles.topicList}>{available.map((candidate, topicIndex) =>
            <div className={styles.topic} data-current={candidate === topic} data-completed={Boolean(candidate.id && candidate.id === recentTopicId && candidate.status === 'TAUGHT')} key={candidate.id ?? topicIndex}>
              {writable && onTopicState && candidate.id ? <label className={styles.check}>
                <input type="checkbox" aria-label={`Marcar como dado: ${candidate.name}`} title={candidate.status === 'TAUGHT' ? 'Volver a marcar como pendiente' : 'Marcar como dado'} checked={candidate.status === 'TAUGHT'} disabled={busy} onChange={event => mark(candidate.id!, event.target.checked, event.currentTarget)}/>
              </label> : <span aria-hidden="true">{candidate.status === 'TAUGHT' ? '✓' : '○'}</span>}
              <button data-topic-choice={candidate.id} aria-current={candidate === topic ? 'true' : undefined} onClick={() => selectTopic(candidate.id, true)}>
                <span>{candidate.name}</span><small>{topicLabel(candidate.status)}</small>
              </button>
            </div>)}</div>
        </details>;
      })}
      {!topic ? <p className="classroom-inline-empty">{topics.length ? 'No hay temas en este estado.' : 'No hay temas en el plan de esta aula.'}</p> : null}
    </nav>
    {topic ? <section ref={detailsRef} tabIndex={-1} className={styles.detail} aria-label="Tema seleccionado">
        <button className={styles.mobile} type="button" onClick={focusTopic}>↑ Unidades y temas</button>
        <header className={styles.detailHeading}><div><small>{unit?.name} · Tema {unit ? unit.topics.indexOf(topic) + 1 : 1}</small><h3>{topic.name}</h3></div><span className={styles.badge} data-taught={topic.status === 'TAUGHT'}>{topicLabel(topic.status)}</span></header>
        <div className={styles.completion} data-taught={topic.status === 'TAUGHT'}>
          <div><strong>{topic.status === 'TAUGHT' ? 'Este tema ya fue dado' : writable ? '¿Trabajaste este tema en clase?' : 'Todavía no se trabajó en clase'}</strong>
            <p>{writable ? topic.status === 'TAUGHT' ? 'Podés volver a marcarlo como pendiente.' : 'Registralo para actualizar el avance del aula.' : 'Consultá los recursos disponibles para este tema.'}</p></div>
          {writable && onTopicState && topic.id ? <button className={topic.status === 'TAUGHT' ? '' : 'primary'} disabled={busy} aria-pressed={topic.status === 'TAUGHT'}
            onClick={event => mark(topic.id!, topic.status !== 'TAUGHT', event.currentTarget)}><FoxmindIcon name="check" /><span>{topic.status === 'TAUGHT' ? 'Tema dado' : 'Marcar como dado'}</span></button> : null}
        </div>
        {state.error ? <div role="alert">{state.error} <button onClick={state.retry}>Reintentar materiales y actividades</button></div> : !state.data ? <p role="status">Cargando materiales y actividades…</p> : <>
          <header className="brujula-topic-resources-head"><h4 className="fm3-plan-step">Materiales <span className={styles.badge}>{materials.length}</span></h4>{writable && creationContext && onAddMaterial ? <button className="brujula-text-action" disabled={busy} aria-label={`Agregar material para ${topic.name}`} onClick={() => onAddMaterial(creationContext)}><FoxmindIcon name="plus"/>Agregar material</button> : null}</header>{materials.map(item => materialRow(canPreviewMaterial, api, item, onOpenMaterial))}
          {!materials.length ? <p className="classroom-inline-empty">Todavía no hay materiales asociados.</p> : null}
          <header className="brujula-topic-resources-head"><h4 className="fm3-plan-step">Actividades <span className={styles.badge}>{activities.length}</span></h4>{writable && creationContext && onCreateActivity ? <button className="brujula-text-action" disabled={busy} aria-label={`Crear actividad para ${topic.name}`} onClick={() => onCreateActivity(creationContext)}>Crear actividad<FoxmindIcon name="arrow-right"/></button> : null}</header>{activities.map(item => activityRow(activityTypeLabels, item, onOpenActivity))}
          {!activities.length ? <p className="classroom-inline-empty">Todavía no hay actividades asociadas.</p> : null}
        </>}
      <footer className={styles.pagination}>
        <small>Tema {position + 1} de {visible.length}</small>
        <div>{position > 0 ? <button type="button" onClick={() => selectTopic(visible[position - 1]?.id)}>← Anterior</button> : null}
          {position + 1 < visible.length ? <button type="button" onClick={() => selectTopic(visible[position + 1]?.id)}>Siguiente →</button> : null}</div>
      </footer>
    </section> : null}
  </div></>;
}

function topicLabel(status?: string) {
  return status === 'TAUGHT' ? 'Dado' : status === 'NEXT' ? 'Siguiente' : 'Por dar';
}
