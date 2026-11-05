'use client';
import { useRef, useState } from 'react';
import type { ClassroomClient, Detail, FileState } from './api.ts';
import { Dialog, Notice } from './components.tsx';
import { PlanWorkspace } from './PlanWorkspace.tsx';
import type { ClassroomCreationContext } from './classroom-creation-context.ts';

export function Plan({ api, room, reload, onOpenActivity, selectedTopicId, onSelectTopic, onCreateActivity, onAddMaterial }: { api: ClassroomClient; room: Detail; reload: () => Promise<void>; onOpenActivity?: (id: string) => void;
  selectedTopicId?: string; onSelectTopic?: (id: string) => void; onCreateActivity?: (context: ClassroomCreationContext) => void; onAddMaterial?: (context: ClassroomCreationContext) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [unitName, setUnitName] = useState(''), [file, setFile] = useState<FileState | null>(null);
  const [confirm, setConfirm] = useState<Record<string, unknown> | null>(null);
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
  const move = (ids: string[], index: number, direction: number) => {
    const result = [...ids];
    [result[index], result[index + direction]] = [result[index + direction], result[index]];
    return result;
  };
  async function setTopicState(id: string, status: 'PENDING' | 'NEXT' | 'TAUGHT') {
    if (!writable) return;
    const topic = room.units.flatMap(unit => unit.topics).find(item => item.id === id);
    if (!topic) return;
    const previous = topic.status === 'NEXT' ? 'NEXT' : topic.status === 'TAUGHT' ? 'TAUGHT' : 'PENDING';
    await run(async () => { setUndo(null); await change({ action: 'setTopicState', id, status }); setUndo({ id, previous }); setNotice(status === 'TAUGHT' ? 'Tema marcado como dado.' : 'El tema volvió a pendientes.'); });
  }
  return <section className="folder-plan" aria-label="Plan de estudio">
    <header className="p5-section-head cl-section"><div><h2>Plan de estudio</h2><p>Explorá los temas y sus recursos.</p></div>
      <button disabled={busy} onClick={() => void run(reload)}>Actualizar Plan</button></header>
    {error && <Notice error>{error}</Notice>}
    {notice && <Notice>{notice}</Notice>}
    {undo && writable ? <button className="classroom-plan-undo" disabled={busy} onClick={() => run(async () => { await change({ action: 'setTopicState', id: undo.id, status: undo.previous }); setUndo(null); })}>Deshacer avance</button> : null}
    <PlanWorkspace api={api} room={room} onOpenActivity={onOpenActivity ?? (() => {})} busy={busy}
      selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic} onCreateActivity={onCreateActivity} onAddMaterial={onAddMaterial}
      onTopicState={writable ? setTopicState : undefined} />
    {room.plans.map(plan => <p className="folder-plan-file" key={plan.id}><a href={api.fileUrl(plan.fileId)} target="_blank" rel="noreferrer">Descargar plan · Versión {plan.version}</a></p>)}
    {writable && <details className="fm-plan-management"><summary>Administrar plan <span>Unidades, temas y versiones del archivo</span></summary>
    <fieldset disabled={busy}>
      <legend>Nueva versión del archivo</legend>
      <label>Archivo del plan (PDF o DOCX)<input type="file" accept=".pdf,.docx" onChange={event => {
        const selected = event.target.files?.[0]; event.target.value = '';
        if (selected) void run(async () => {
          if (!api.uploadClassroom) throw new Error('La carga de archivos no está disponible.');
          setFile(await api.uploadClassroom(room.id, selected, 'plan'));
        });
      }} /></label>
      {file && <>
        <Notice>{file.ready ? 'Archivo aprobado. Confirma para publicar la nueva versión.' : file.rejectionCode ? 'Archivo no aprobado. Selecciona otro archivo.' : 'Archivo pendiente de revisión.'}</Notice>
        {!file.ready && <button onClick={() => void run(async () => setFile(await api.fileStatus(file.id)))}>Consultar revisión</button>}
        <button disabled={!file.ready} onClick={() => void run(async () => {
          await change({ action: 'appendVersion', fileId: file.id }); setFile(null);
        })}>Publicar nueva versión</button>
      </>}
    </fieldset>
    {writable && room.units.map((unit, index) => <section className="p5-unit" key={unit.id}>
      <h3>Unidad {index + 1} · {unit.name}</h3>
      {writable && <details className="folder-disclosure"><summary>Administrar unidad · {unit.name}</summary><fieldset disabled={busy}>
        <legend>Administrar {unit.name}</legend>
        <form onSubmit={event => {
          event.preventDefault(); const form = new FormData(event.currentTarget);
          void run(() => change({ action: 'renameUnit', id: unit.id, name: form.get('name') }));
        }}><label>Nombre de la unidad<input name="name" key={`${unit.id}-${unit.name}`} defaultValue={unit.name} required maxLength={120} /></label><button>Renombrar unidad</button></form>
        <button disabled={index === 0} onClick={() => void run(() => change({ action: 'reorderUnits', ids: move(room.units.map(item => item.id!), index, -1) }))}>Subir unidad</button>
        <button disabled={index === room.units.length - 1} onClick={() => void run(() => change({ action: 'reorderUnits', ids: move(room.units.map(item => item.id!), index, 1) }))}>Bajar unidad</button>
        <button onClick={() => setConfirm({ action: 'deleteUnit', id: unit.id, confirm: true })}>Eliminar unidad</button>
      </fieldset></details>}
      <ul>{unit.topics.map((topic, topicIndex) => <li className="folder-topic-row" key={topic.id}>
        <div className="folder-row-content"><span>{topic.name}</span><span className="p5-tag" data-status={topic.status}>{topic.status === 'TAUGHT' ? 'Dado' : topic.status === 'NEXT' ? 'Siguiente' : 'Pendiente'}</span></div>
        {writable && <label>Estado de {topic.name}<select disabled={busy} value={topic.status} onChange={event => void run(() => change({ action: 'setTopicState', id: topic.id, status: event.target.value }))}>
          <option value="PENDING">Pendiente</option><option value="NEXT">Siguiente</option><option value="TAUGHT">Dado</option>
        </select></label>}
        {writable && <details className="folder-disclosure"><summary>Administrar tema · {topic.name}</summary><fieldset disabled={busy}>
          <legend>Administrar {topic.name}</legend>
          <form onSubmit={event => {
            event.preventDefault(); const form = new FormData(event.currentTarget);
            void run(() => change({ action: 'renameTopic', id: topic.id, name: form.get('name') }));
          }}><label>Nombre del tema<input name="name" key={`${topic.id}-${topic.name}`} defaultValue={topic.name} required maxLength={120} /></label><button>Renombrar tema</button></form>
          <button disabled={topicIndex === 0} onClick={() => void run(() => change({ action: 'reorderTopics', unitId: unit.id, ids: move(unit.topics.map(item => item.id!), topicIndex, -1) }))}>Subir tema</button>
          <button disabled={topicIndex === unit.topics.length - 1} onClick={() => void run(() => change({ action: 'reorderTopics', unitId: unit.id, ids: move(unit.topics.map(item => item.id!), topicIndex, 1) }))}>Bajar tema</button>
          <button onClick={() => setConfirm({ action: 'deleteTopic', id: topic.id, confirm: true })}>Eliminar tema</button>
        </fieldset></details>}
      </li>)}</ul>
      {writable && <details className="folder-disclosure"><summary>Agregar tema a {unit.name}</summary><form onSubmit={event => {
        event.preventDefault(); const target = event.currentTarget, name = new FormData(target).get('name');
        void run(async () => { await change({ action: 'addTopic', unitId: unit.id, name }); target.reset(); });
      }}><fieldset disabled={busy}><legend>Agregar tema a {unit.name}</legend><label>Nuevo tema<input name="name" required maxLength={120} /></label><button>Agregar tema</button></fieldset></form></details>}
    </section>)}
    {writable && <form onSubmit={event => { event.preventDefault(); void run(async () => { await change({ action: 'addUnit', name: unitName }); setUnitName(''); }); }}>
      <fieldset disabled={busy}><legend>Agregar unidad</legend><label>Nueva unidad<input required maxLength={120} value={unitName} onChange={event => setUnitName(event.target.value)} /></label><button>Agregar unidad</button></fieldset>
    </form>}
    </details>}
    {confirm && <Dialog title="Confirmar eliminación" onClose={() => !busy && setConfirm(null)}>
      <p>Solo se puede eliminar un tema pendiente sin vínculos o una unidad vacía sin vínculos. No se eliminarán registros relacionados.</p>
      <button disabled={busy} onClick={() => void run(async () => { await change(confirm); setConfirm(null); })}>Confirmar eliminación</button>
      <button disabled={busy} onClick={() => setConfirm(null)}>Cancelar</button>
    </Dialog>}
  </section>;
}
