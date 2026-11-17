'use client';
import { useRef, useState } from 'react';
import styles from './plan.module.css';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { Notice } from '../../../../../shared-ui/feedback.tsx';
import { PlanWorkspace, type ResourcePresentation } from './PlanWorkspace.tsx';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';

export function Plan({ api, room, reload, onOpenActivity, onOpenMaterial, selectedTopicId, onSelectTopic, onCreateActivity, onAddMaterial, canPreviewMaterial, activityTypeLabels }: ResourcePresentation & { api: ClassroomClient; room: Detail; reload: () => Promise<void>; onOpenActivity?: (id: string) => void; onOpenMaterial?: (id:string)=>void;
  selectedTopicId?: string; onSelectTopic?: (id: string) => void; onCreateActivity?: (context: ClassroomCreationContext) => void; onAddMaterial?: (context: ClassroomCreationContext) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [undo, setUndo] = useState<{ id: string; name: string; previous: 'PENDING' | 'NEXT' | 'TAUGHT' } | null>(null);
  const operationLock = useRef(false);
  const [reloadNeeded, setReloadNeeded] = useState(false);
  const writable = room.role === 'teacher' && !room.archived;
  async function run(task: () => Promise<void>) {
    if (operationLock.current) return;
    operationLock.current = true;
    setBusy(true); setError(''); setNotice('');
    try { await task(); } catch (e) { setError((e as Error).message); } finally { operationLock.current = false; setBusy(false); }
  }
  async function change(operation: Record<string, unknown>) {
    await api.call(`/${room.id}/plan`, 'POST', { revision: room.revision, operation });
    try { await reload(); setReloadNeeded(false); setNotice('Plan actualizado.'); }
    catch { setReloadNeeded(true); throw new Error('El avance se guardó. No pudimos actualizar el Plan; reintentá la actualización.'); }
  }
  async function setTopicState(id: string, status: 'PENDING' | 'NEXT' | 'TAUGHT') {
    if (!writable || reloadNeeded) return;
    const topic = room.units.flatMap(unit => unit.topics).find(item => item.id === id);
    if (!topic) return;
    const previous = topic.status === 'NEXT' ? 'NEXT' : topic.status === 'TAUGHT' ? 'TAUGHT' : 'PENDING';
    await run(async () => { setUndo(null); await change({ action: 'setTopicState', id, status }); setUndo({ id, name: topic.name, previous }); setNotice(status === 'TAUGHT' ? 'Tema marcado como dado.' : 'El tema volvió a pendientes.'); });
  }
  return <section className={`folder-plan ${styles.plan}`} aria-label="Plan de estudio">
    <header className="p5-section-head cl-section"><div><h2>Plan de estudio</h2><p>Elegí un tema para consultar sus materiales y actividades.</p></div>
      <span className={`parity-plan-summary ${styles.summary}`}><FoxmindIcon name="check"/>{room.units.flatMap(unit => unit.topics).filter(topic => topic.status === 'TAUGHT').length} de {room.units.flatMap(unit => unit.topics).length} temas dados</span></header>
    {room.role === 'student' && room.units.some(unit => unit.topics.length > 0) && (
      <a className={styles.studyEntry} href={`/carpetas-de-estudio?crear=1&aula=${encodeURIComponent(room.id)}`}>
        <FoxmindIcon name="book"/> Crear carpeta de estudio
      </a>
    )}
    {error && <Notice error>{error}{reloadNeeded ? <button type="button" disabled={busy} onClick={() => void run(async () => { await reload(); setReloadNeeded(false); setNotice('Plan actualizado.'); })}>Actualizar Plan</button> : null}</Notice>}
    {busy ? <p role="status">Guardando avance…</p> : null}
    {notice || undo && writable ? <div className={styles.feedback}>
      {notice ? <div role="status"><span>{notice}</span>{undo ? <strong>{undo.name}</strong> : null}</div> : null}
      {undo && writable ? <button type="button" className="classroom-plan-undo" disabled={busy}
        onClick={() => run(async () => { await change({ action: 'setTopicState', id: undo.id, status: undo.previous }); setUndo(null); setNotice('Cambio deshecho.'); })}>Deshacer avance</button> : null}
    </div> : null}
    <PlanWorkspace canPreviewMaterial={canPreviewMaterial} activityTypeLabels={activityTypeLabels} recentTopicId={undo?.id} api={api} room={room} onOpenActivity={onOpenActivity ?? (() => {})} busy={busy || reloadNeeded}
      selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic} onCreateActivity={onCreateActivity} onAddMaterial={onAddMaterial} onOpenMaterial={onOpenMaterial}
      onTopicState={writable ? setTopicState : undefined} />

  </section>;
}
