import { useEffect, useRef, useState } from 'react';
import type { Classroom, Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { EvaluationRubricEditor } from '../../../features/activity-authoring/index.ts';
import type { FoxyActivityPayload } from '../../../../../../src/core/domain/foxy/foxy-activity-draft.ts';
import type { createFoxyWorkspaceRuntime } from '../../../features/foxy/index.ts';
import { classroomHomeHref } from '../../navigation/destinations';
type Runtime = ReturnType<typeof createFoxyWorkspaceRuntime>;
type Props = { initialMode?: 'ACTIVITY' | 'RUBRIC'; runtime: Runtime; state: ReturnType<Runtime['activityHandoff']['getState']>;
  resource: NonNullable<ReturnType<Runtime['getState']>['resource']>; classrooms: Classroom[]; onNavigate: (href: string) => void; locked: boolean };
export function FoxyActivityHandoffPanel({ runtime, state, resource, classrooms, onNavigate, locked, initialMode }: Props) {
  const [mode, setMode] = useState<'ACTIVITY' | 'RUBRIC' | null>(initialMode ?? null), [room, setRoom] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [reviewed, setReviewed] = useState(false);
  const [form, setForm] = useState<FoxyActivityPayload>({ title: resource.resource?.title ?? '', objective: '', instructions: initialMode === 'ACTIVITY' ? resource.resource?.markdown ?? '' : '', teacherComment: '', unitId: '', topicIds: [], evaluationRubric: [{ name: '', description: '', weight: 100 }] });
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const source = resource.resource, clean = !!source && !resource.dirty && !resource.busy && !resource.pending && !resource.conflict;
  const blocked = locked || state.busy || state.pending, editing = !!state.review && !state.receipt;
  function open(next: 'ACTIVITY' | 'RUBRIC') {
    if (!clean || blocked || !source) return;
    runtime.activityHandoff.reset(); setMode(next); setRoom(null); setError(''); setReviewed(false);
    setForm({ title: source.title, objective: '', instructions: next === 'ACTIVITY' ? source.markdown : '', teacherComment: '', unitId: '', topicIds: [], evaluationRubric: [{ name: '', description: '', weight: 100 }] });
  }
  async function selectRoom(id: string) {
    request.current?.abort(); setRoom(null); setForm(value => ({ ...value, unitId: '', topicIds: [] })); if (!id) return;
    const abort = new AbortController(); request.current = abort; setLoading(true); setError('');
    try {
      const detail = await runtime.loadClassroom(id, abort.signal);
      if (!abort.signal.aborted && detail) { if (detail.role !== 'teacher' || detail.archived) throw new Error(); setRoom(detail); }
    } catch { if (!abort.signal.aborted) setError('No pudimos cargar el aula activa. Volvé a elegirla.'); }
    finally { if (!abort.signal.aborted) setLoading(false); }
  }
  const unit = room?.units.find(item => item.id === form.unitId), review = state.review?.input.payload;
  return <section aria-label="Preparar actividad desde Foxy">
    {!initialMode && !state.receipt && <>
      <h3>Continuar en Actividades</h3>
      <p>Revisá el contenido y los criterios. El recurso original se conserva y la actividad se guarda como borrador privado.</p>
      <button type="button" className="p5-action" disabled={!clean || blocked} onClick={() => open('ACTIVITY')}>Preparar en Actividades</button>{' '}
      <button type="button" className="p5-action" disabled={!clean || blocked} onClick={() => open('RUBRIC')}>Usar rúbrica en una actividad</button>
    </>}
    {!clean && <p>Guardá los cambios del recurso antes de continuar.</p>}
    {mode && !state.receipt && <form onSubmit={event => { event.preventDefault(); if (room && runtime.activityHandoff.review(room, form)) setReviewed(false); }}>
      <p>{mode === 'RUBRIC' ? 'Transcribí o ajustá los criterios del recurso en la rúbrica. Completá el objetivo y las consignas de la actividad.' : 'Se preparará un trabajo práctico con consignas de texto. Podés revisar el borrador y asignarlo desde Actividades.'}</p>
      <fieldset disabled={blocked || editing}><legend>Destino y contenido revisado</legend>
        <label>Aula de la actividad<select value={room?.id ?? ''} required onChange={e => void selectRoom(e.currentTarget.value)}><option value="">Elegí un aula activa</option>{classrooms.filter(item => item.role === 'teacher' && !item.archived).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {loading && <p role="status">Cargando destino…</p>}
        <label>Unidad de la actividad<select value={form.unitId} required disabled={!room} onChange={e => setForm({ ...form, unitId: e.currentTarget.value, topicIds: [] })}><option value="">Elegí una unidad</option>{room?.units.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <fieldset><legend>Temas de la actividad</legend>{unit?.topics.map(topic => <label key={topic.id}><input type="checkbox" checked={form.topicIds.includes(topic.id!)} onChange={() => setForm({ ...form, topicIds: form.topicIds.includes(topic.id!) ? form.topicIds.filter(id => id !== topic.id) : [...form.topicIds, topic.id!] })} />{topic.name}</label>)}</fieldset>
        <label>Título de la actividad<input required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.currentTarget.value })} /></label>
        <label>Objetivo de aprendizaje<textarea required maxLength={1400} value={form.objective} onChange={e => setForm({ ...form, objective: e.currentTarget.value })} /></label>
        <label>Consignas de la actividad<textarea required rows={6} maxLength={5000} value={form.instructions} onChange={e => setForm({ ...form, instructions: e.currentTarget.value })} /></label>
        <small>{[...form.instructions].length} / 5000 caracteres. Si el recurso es más largo, revisá y ajustá las consignas.</small>
        <label>Comentario para el aula<textarea maxLength={5000} value={form.teacherComment} onChange={e => setForm({ ...form, teacherComment: e.currentTarget.value })} /></label>
        <EvaluationRubricEditor criteria={form.evaluationRubric} onChange={evaluationRubric => setForm({ ...form, evaluationRubric })} />
        <button className="p5-primary" type="submit" disabled={!room || !clean || loading}>Revisar borrador</button>
      </fieldset>
      {review && <section aria-label="Revisión del borrador"><h4>{review.title}</h4><p>Destino: {room?.name} · {unit?.name}</p><p>Objetivo: {review.objective}</p><p style={{ whiteSpace: 'pre-wrap' }}>{review.instructions}</p>
        {review.teacherComment && <p>{review.teacherComment}</p>}<ul>{review.evaluationRubric.map((criterion, index) => <li key={index}>{criterion.name} · {criterion.weight}% — {criterion.description}</li>)}</ul>
        <p>Se creará un borrador de trabajo práctico. Será visible para estudiantes cuando lo asignes desde Actividades.</p>
        <label><input type="checkbox" checked={reviewed} disabled={blocked} onChange={e => setReviewed(e.currentTarget.checked)} />Revisé el contenido y los criterios</label>
        {state.pending ? <button className="p5-primary" type="button" disabled={state.busy} onClick={() => void runtime.activityHandoff.retry()}>Reintentar creación del borrador</button>
          : <><button type="button" className="p5-action" disabled={blocked} onClick={() => runtime.activityHandoff.reset()}>Volver a editar</button><button className="p5-primary" type="button" disabled={!reviewed || blocked || !clean} onClick={() => void runtime.activityHandoff.confirm()}>Crear borrador privado</button></>}
      </section>}
    </form>}
    {(error || state.error) && <p role="alert">{error || state.error}</p>}
    {state.receipt && <div><p role="status">Borrador privado guardado. Tu recurso original sigue disponible.</p><button className="p5-primary" type="button" onClick={() => onNavigate(classroomHomeHref({ kind: 'activity', classroomId: state.receipt!.classroomId, activityId: state.receipt!.activityId }))}>Abrir borrador en Actividades</button></div>}
  </section>;
}
