'use client';
import { useRef, useState } from 'react';
import styles from './plan.module.css';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { Notice } from '../../../../../shared-ui/feedback.tsx';
import { PlanWorkspace, type ResourcePresentation } from './PlanWorkspace.tsx';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';

export function Plan({ api, room, reload, onOpenActivity, onOpenMaterial, selectedTopicId, onSelectTopic, onCreateActivity, onAddMaterial, canPreviewMaterial, activityTypeLabels }: ResourcePresentation & { api: ClassroomClient; room: Detail; reload: () => Promise<void>; onOpenActivity?: (id: string) => void; onOpenMaterial?: (id:string)=>void;
  selectedTopicId?: string; onSelectTopic?: (id: string) => void; onCreateActivity?: (context: ClassroomCreationContext) => void; onAddMaterial?: (context: ClassroomCreationContext) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [undo, setUndo] = useState<{ id: string; name: string; previous: 'PENDING' | 'NEXT' | 'TAUGHT' } | null>(null);
  const operationLock = useRef(false);
  const writable = room.role === 'teacher' && !room.archived;
  async function run(task: () => Promise<void>) {
    if (operationLock.current) return;
    operationLock.current = true;
    setBusy(true); setError(''); setNotice('');
    try { await task(); } catch (e) { setError((e as Error).message); } finally { operationLock.current = false; setBusy(false); }
  }
  async function change(operation: Record<string, unknown>) {
    await api.call(`/${room.id}/plan`, 'POST', { revision: room.revision, operation });
    await reload(); setNotice('Plan actualizado.');
  }
  async function setTopicState(id: string, status: 'PENDING' | 'NEXT' | 'TAUGHT') {
    if (!writable) return;
    const topic = room.units.flatMap(unit => unit.topics).find(item => item.id === id);
    if (!topic) return;
    const previous = topic.status === 'NEXT' ? 'NEXT' : topic.status === 'TAUGHT' ? 'TAUGHT' : 'PENDING';
    await run(async () => { setUndo(null); await change({ action: 'setTopicState', id, status }); setUndo({ id, name: topic.name, previous }); setNotice(status === 'TAUGHT' ? 'Tema marcado como dado.' : 'El tema volvió a pendientes.'); });
  }
  return <section className="folder-plan" aria-label="Plan de estudio">
    <header className="p5-section-head cl-section"><div><h2>Plan de estudio</h2><p>{writable ? 'Elegí un tema para preparar la clase. Usá el check para registrar lo dado.' : 'Recorré los temas y encontrá los materiales y actividades de tu clase.'}</p></div>
      </header>
    {error && <Notice error>{error}</Notice>}
    {busy ? <p role="status">Guardando avance…</p> : null}
    {notice || undo && writable ? <div className={styles.feedback}>
      {notice ? <div role="status"><span>{notice}</span>{undo ? <strong>{undo.name}</strong> : null}</div> : null}
      {undo && writable ? <button type="button" className="classroom-plan-undo" disabled={busy}
        onClick={() => run(async () => { await change({ action: 'setTopicState', id: undo.id, status: undo.previous }); setUndo(null); setNotice('Cambio deshecho.'); })}>Deshacer avance</button> : null}
    </div> : null}
    <PlanWorkspace canPreviewMaterial={canPreviewMaterial} activityTypeLabels={activityTypeLabels} recentTopicId={undo?.id} api={api} room={room} onOpenActivity={onOpenActivity ?? (() => {})} busy={busy}
      selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic} onCreateActivity={onCreateActivity} onAddMaterial={onAddMaterial} onOpenMaterial={onOpenMaterial}
      onTopicState={writable ? setTopicState : undefined} />

  </section>;
}
