import { useRef, useState } from 'react';
import styles from './plan.module.css';
import { type ActivitySummary } from '../../../../../../src/core/contracts/activities.ts';
import { type ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import { type Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { type Material } from '../../../../../../src/core/contracts/materials.ts';
import { usePlanWorkspace } from './use-plan-workspace.ts';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';
import { Dialog } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';

function fileSize(bytes: string) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '';
  const scale = size >= 1048576 ? 1048576 : size >= 1024 ? 1024 : 1;
  return `${(size / scale).toLocaleString('es-AR', { maximumFractionDigits: 1 })} ${scale === 1048576 ? 'MB' : scale === 1024 ? 'KB' : 'B'}`;
}
function materialRow(canPreviewMaterial: ResourcePresentation['canPreviewMaterial'], api: ClassroomClient, material: Material, onOpen?: (id:string)=>void) {
  return <article className="fm3-plan-resource" key={material.id}>
    <span className="brujula-resource-disc"><FoxmindIcon name="file"/><small>{material.extension?.toUpperCase() ?? 'Archivo'}</small></span><div><h4>{material.title}</h4><p>{[material.extension?.toUpperCase() ?? 'Archivo', material.topicId ? 'Del tema' : 'De la unidad', fileSize(material.sizeBytes)].filter(Boolean).join(' · ')}</p></div>
    {onOpen ? <button aria-label={`Abrir material: ${material.title}`} onClick={()=>onOpen(material.id)}><FoxmindIcon name="book"/>Abrir</button> : <a aria-label={`Abrir material: ${material.title}`} href={api.fileUrl(material.fileId, canPreviewMaterial(material) && material.previewable)} target="_blank" rel="noreferrer"><FoxmindIcon name="book"/>Abrir</a>}
  </article>;
}
function activityRow(activityTypeLabels: ResourcePresentation['activityTypeLabels'], activity: ActivitySummary, onOpen: (id: string) => void) {
  return <article className="fm3-plan-resource is-activity" key={activity.id}>
    <span className="brujula-resource-disc"><FoxmindIcon name="edit"/></span><div><h4>{activity.title ?? 'Borrador sin título'}</h4><p>{activityTypeLabels[activity.type]}{activity.deadlineAt ? ` · ${new Date(activity.deadlineAt).toLocaleDateString('es-AR', { timeZone: activity.zone, day: 'numeric', month: 'short' })}` : ''}{activity.status==='DRAFT'?' · Borrador':activity.status==='WITHDRAWN'?' · Retirada':''}</p></div>
    <button aria-label={`Abrir actividad: ${activity.title ?? 'Borrador sin título'}`} onClick={() => onOpen(activity.id)}><FoxmindIcon name="arrow-right"/>Ver actividad</button>
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
export function PlanWorkspace({ api, room, onOpenActivity, onTopicState, busy = false, selectedTopicId, onSelectTopic, onAddMaterial, onOpenMaterial, canPreviewMaterial, activityTypeLabels, recentTopicId }: Props) {
  const topics = room.units.flatMap(unit => unit.topics);
  const [localSelectedId, setLocalSelected] = useState<string>();
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const detailsRef = useRef<HTMLElement>(null);
  const topic = topics.find(item => item.id === (selectedTopicId ?? localSelectedId)) ?? topics[0];
  const unit = room.units.find(item => topic && item.topics.includes(topic));
  const state = usePlanWorkspace(api, room);
  const writable = room.role === 'teacher' && !room.archived;
  const materials = state.data?.materials.filter(item => item.ready && !item.deleted && !item.supersededBy && (item.topicId === topic?.id || !item.topicId && item.unitId === unit?.id)) ?? [];
  const activities = state.data?.activities.filter(item => (item.topicIds ?? [item.topicId]).includes(topic?.id ?? '')) ?? [];
  const selectTopic = (id?: string) => {
    if (!id) return;
    setLocalSelected(id); onSelectTopic?.(id);
  };
  const creationContext = unit?.id && topic?.id ? { unitId: unit.id, topicIds: [topic.id] } : null;
  const navigation = (dialog: boolean) => room.units.map((item, index) => <section key={item.id ?? index} className={styles.unit}>
    <header><strong>{item.name}</strong><small>{item.topics.filter(candidate => candidate.status === 'TAUGHT').length} de {item.topics.length} dados</small></header>
    <div className={styles.topicList}>{item.topics.map((candidate, topicIndex) => <div className={styles.topic} data-current={candidate === topic} data-completed={candidate.id === recentTopicId && candidate.status === 'TAUGHT'} key={candidate.id ?? topicIndex}>
      <button type="button" data-topic-choice={candidate.id} aria-current={candidate === topic ? 'true' : undefined} onClick={() => { selectTopic(candidate.id); if (dialog) setTopicPickerOpen(false); }}>
        <span className={styles.topicState} data-taught={candidate.status === 'TAUGHT'} aria-hidden="true"><FoxmindIcon name={candidate.status === 'TAUGHT' ? 'check' : 'book'}/></span>
        <span>{candidate.name}<small>{topicLabel(candidate.status)}</small></span><FoxmindIcon name="chevron-right"/>
      </button>
    </div>)}</div>
    {!item.topics.length ? <p className="classroom-inline-empty">Todavía no hay temas en esta unidad.</p> : null}
  </section>);
  return <>
    <div className={styles.workspace}>
      {topic ? <button className={styles.topicPicker} type="button" aria-haspopup="dialog" onClick={() => setTopicPickerOpen(true)}><FoxmindIcon name="layers"/><span><small>Elegir tema</small><strong>{topic.name}</strong></span><FoxmindIcon name="chevron-right"/></button> : null}
      {topic ? <nav aria-label="Unidades del plan" className={styles.navigation}>{navigation(false)}</nav> : null}
      {!topic ? <div className={styles.empty}><h3>El aula todavía no tiene temas</h3><p>Cuando se agreguen unidades y temas, vas a verlos acá.</p></div> : null}
      {topic ? <section ref={detailsRef} tabIndex={-1} className={styles.detail} aria-label="Tema seleccionado">
        <header className={styles.detailHeading}><div><small>{unit?.name}</small><h3>{topic.name}</h3><span className={styles.badge} data-taught={topic.status === 'TAUGHT'}><FoxmindIcon name={topic.status === 'TAUGHT' ? 'check' : 'clock'}/>{topicLabel(topic.status)}</span></div>
          {writable && onTopicState && topic.id ? <button className={styles.markTopic} disabled={busy} aria-pressed={topic.status === 'TAUGHT'} onClick={() => void onTopicState(topic.id!, topic.status === 'TAUGHT' ? 'PENDING' : 'TAUGHT')}><FoxmindIcon name={topic.status === 'TAUGHT' ? 'clock' : 'check'}/><span>{topic.status === 'TAUGHT' ? 'Marcar como pendiente' : 'Marcar como dado'}</span></button> : null}
        </header>
        <div className={styles.related}>
          {state.error ? <div role="alert">{state.error} <button onClick={state.retry}>Reintentar materiales y actividades</button></div> : !state.data ? <p role="status">Cargando materiales y actividades…</p> : <>
            <section><header className="brujula-topic-resources-head"><h4>Materiales</h4>{writable && creationContext && onAddMaterial ? <button disabled={busy} aria-label={`Subir archivo para ${topic.name}`} onClick={() => onAddMaterial(creationContext)}><FoxmindIcon name="plus"/>Subir archivo</button> : null}</header>
              {materials.map(item => materialRow(canPreviewMaterial, api, item, onOpenMaterial))}
              {!materials.length ? <p className="classroom-inline-empty">Todavía no hay materiales vinculados a este tema o unidad.</p> : null}
            </section>
            <section><header className="brujula-topic-resources-head"><h4>Actividades</h4></header>
              {activities.map(item => activityRow(activityTypeLabels, item, onOpenActivity))}
              {!activities.length ? <p className="classroom-inline-empty">Todavía no hay actividades vinculadas a este tema.</p> : null}
            </section>
          </>}
        </div>
      </section> : null}
    </div>
    {topicPickerOpen ? <Dialog className={styles.pickerDialog} title="Elegir tema" onClose={() => setTopicPickerOpen(false)}><p>{room.name}</p><nav className={styles.topicDialog} aria-label="Unidades y temas">{navigation(true)}</nav><footer className={styles.pickerFooter}><button type="button" onClick={() => setTopicPickerOpen(false)}>Cerrar</button></footer></Dialog> : null}
  </>;
}
function topicLabel(status?: string) { return status === 'TAUGHT' ? 'Dado' : 'Pendiente'; }
