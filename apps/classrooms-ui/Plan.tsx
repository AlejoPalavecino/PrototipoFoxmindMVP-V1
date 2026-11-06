'use client';
import { useRef, useState } from 'react';
import type { ClassroomClient, Detail } from './api.ts';
import { Notice } from './components.tsx';
import { PlanWorkspace } from './PlanWorkspace.tsx';
import type { ClassroomCreationContext } from './classroom-creation-context.ts';

export function Plan({ api, room, reload, onOpenActivity, onOpenMaterial, selectedTopicId, onSelectTopic, onCreateActivity, onAddMaterial }: { api: ClassroomClient; room: Detail; reload: () => Promise<void>; onOpenActivity?: (id: string) => void; onOpenMaterial?: (id:string)=>void;
  selectedTopicId?: string; onSelectTopic?: (id: string) => void; onCreateActivity?: (context: ClassroomCreationContext) => void; onAddMaterial?: (context: ClassroomCreationContext) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [undo, setUndo] = useState<{ id: string; previous: 'PENDING' | 'NEXT' | 'TAUGHT' } | null>(null);
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
    await run(async () => { setUndo(null); await change({ action: 'setTopicState', id, status }); setUndo({ id, previous }); setNotice(status === 'TAUGHT' ? 'Tema marcado como dado.' : 'El tema volvió a pendientes.'); });
  }
  return <section className="folder-plan" aria-label="Plan de estudio">
    <header className="p5-section-head cl-section"><div><h2>Plan de estudio</h2><p>Explorá los temas y sus recursos.</p></div>
      </header>
    {error && <Notice error>{error}</Notice>}
    {notice && <Notice>{notice}</Notice>}
    {undo && writable ? <button className="classroom-plan-undo" disabled={busy} onClick={() => run(async () => { await change({ action: 'setTopicState', id: undo.id, status: undo.previous }); setUndo(null); })}>Deshacer avance</button> : null}
    <PlanWorkspace api={api} room={room} onOpenActivity={onOpenActivity ?? (() => {})} busy={busy}
      selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic} onCreateActivity={onCreateActivity} onAddMaterial={onAddMaterial} onOpenMaterial={onOpenMaterial}
      onTopicState={writable ? setTopicState : undefined} />

  </section>;
}
