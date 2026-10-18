'use client';
import { useState } from 'react';
import type { ActivityData, ActivityDetail, ActivityQuestion, ClassroomClient, DeadlineResolution, Detail, FileState, Material } from './api.ts';
import { Notice } from './components.tsx';

export const activityTypeLabels = { ASSIGNMENT: 'Trabajo práctico', QUESTIONNAIRE: 'Cuestionario', EVALUATION: 'Evaluación' };
export function activityMinute(instant: string | null, zone: string) {
  if (!instant) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant)).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function activityDate(instant: string | null, zone: string) {
  return instant ? `${new Intl.DateTimeFormat('es', { timeZone: zone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instant))} · ${zone}` : `Sin fecha límite · ${zone}`;
}

function QuestionEditor({ question, index, update, remove }: {
  question: ActivityQuestion; index: number; update: (question: ActivityQuestion) => void; remove: () => void;
}) {
  return <fieldset className="p7-question"><legend>Pregunta {index + 1}</legend>
    <label>Tipo de pregunta<select aria-label="Tipo de pregunta" value={question.type} onChange={e => {
      const type = e.target.value as ActivityQuestion['type'];
      update({ ...question, type, scoringRule: type === 'DEVELOPMENT' ? null : 'EXACT', options: type === 'DEVELOPMENT' ? []
        : [{ text: '', correct: true }, { text: '', correct: type === 'MULTIPLE_CHOICE' }] });
    }}><option value="DEVELOPMENT">Desarrollo</option><option value="SINGLE_CHOICE">Una respuesta correcta</option><option value="MULTIPLE_CHOICE">Varias respuestas correctas</option></select></label>
    <label>Consigna de la pregunta<textarea value={question.prompt} onChange={e => update({ ...question, prompt: e.target.value })} /></label>
    <label>Puntos disponibles<input inputMode="decimal" value={question.points} onChange={e => update({ ...question, points: e.target.value.replace(',', '.') })} /></label>
    <small>Valor positivo con hasta dos decimales. No se ejecuta una calificación al guardar.</small>
    {question.type === 'MULTIPLE_CHOICE' ? <label>Regla de puntuación<select aria-label="Regla de puntuación" value={question.scoringRule ?? 'EXACT'} onChange={e => update({ ...question, scoringRule: e.target.value as 'EXACT' | 'PARTIAL' })}>
      <option value="EXACT">Coincidencia exacta</option><option value="PARTIAL">Puntaje parcial sin opciones incorrectas</option>
    </select></label> : null}
    {question.options.map((option, position) => <div className="p7-option" key={position}>
      <label>Opción {position + 1}<input value={option.text} onChange={e => update({ ...question, options: question.options.map((o, n) => n === position ? { ...o, text: e.target.value } : o) })} /></label>
      <label className="p7-check"><input type="checkbox" checked={option.correct ?? false} onChange={e => update({ ...question,
        options: question.options.map((o, n) => ({ ...o, correct: n === position ? e.target.checked : question.type === 'SINGLE_CHOICE' && e.target.checked ? false : o.correct })) })} />Correcta</label>
      <button type="button" onClick={() => update({ ...question, options: question.options.filter((_, n) => n !== position) })}>Quitar opción</button>
    </div>)}
    {question.type !== 'DEVELOPMENT' ? <button type="button" onClick={() => update({ ...question, options: [...question.options, { text: '', correct: false }] })}>Agregar opción</button> : null}
    <button type="button" onClick={remove}>Quitar pregunta</button>
  </fieldset>;
}

export function ActivityAuthoring({ api, room, data, materials, onSaved, onClose }: {
  api: ClassroomClient; room: Detail; data: ActivityData; materials: Material[]; onSaved: () => Promise<void>; onClose: () => void;
}) {
  const activity = data.activity;
  const [title, setTitle] = useState(activity.title ?? ''), [unitId, setUnit] = useState(activity.unitId ?? ''), [topicId, setTopic] = useState(activity.topicId ?? '');
  const [instructions, setInstructions] = useState(activity.instructions ?? ''), [attachmentRequired, setRequired] = useState(activity.attachmentRequired);
  const [questions, setQuestions] = useState(activity.questions), [files, setFiles] = useState(activity.instructionFiles);
  const [materialIds, setMaterialIds] = useState(activity.materials.map(m => m.id));
  const [local, setLocal] = useState(activityMinute(activity.deadlineAt, room.timezone)), [allowLate, setLate] = useState(activity.allowLate);
  const [offset, setOffset] = useState<number | null>(() => activity.deadlineAt ? (Date.parse(`${activityMinute(activity.deadlineAt, room.timezone)}:00Z`) - Date.parse(activity.deadlineAt)) / 60000 : null);
  const [resolution, setResolution] = useState<DeadlineResolution | null>(null), [upload, setUpload] = useState<FileState | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(data.revision);
  const locked = activity.locked || room.archived;
  const topics = room.units.find(u => u.id === unitId)?.topics ?? [];
  const mark = () => setDirty(true);
  async function run(operation: () => Promise<void>) {
    setBusy(true); setError('');
    try { await operation(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function deadline() {
    if (!local) return null;
    const current = await api.call<DeadlineResolution>(`/${room.id}/activities/deadline`, 'POST', { local });
    setResolution(current);
    if (current.reason === 'NONEXISTENT') throw new Error('Esta hora no existe por el cambio de horario. Selecciona otra hora.');
    if (current.reason === 'AMBIGUOUS' && (offset === null || !current.choices.some(c => c.offsetMinutes === offset)))
      throw new Error('Esta hora ocurre dos veces. Selecciona explícitamente una de las dos ocurrencias.');
    return current.reason === 'AMBIGUOUS' ? { local, offsetMinutes: offset } : { local };
  }
  async function change(operation: Record<string, unknown>) {
    const result = await api.call<{ revision: string }>(`/${room.id}/activities`, 'POST', { revision, operation });
    setRevision(result.revision);
    await onSaved();
  }
  return <section className="p7-authoring" aria-label="Editar actividad">
    <header className="p5-section-head"><div><h3>{activityTypeLabels[activity.type]}</h3><p>{activity.status === 'DRAFT' ? 'Borrador privado. Guardar no publica la actividad.' : 'Actividad guardada. La publicación es una acción explícita.'}</p></div>
      <button type="button" disabled={busy} onClick={onClose}>Cerrar editor</button></header>
    {activity.locked ? <Notice>Ya comenzó la participación. Solo se pueden corregir el título y la organización, extender una fecha existente o permitir entregas tardías. Las consignas y sus recursos permanecen bloqueados.</Notice> : null}
    {error ? <Notice error>{error} Los cambios no confirmados permanecen en este editor; no se garantiza su recuperación al cerrarlo.</Notice> : null}
    <p role="status">{busy ? 'Guardando o verificando…' : dirty ? 'Cambios sin guardar. Las preguntas incompletas o inválidas no se guardan.' : 'Último estado confirmado cargado.'}</p>
    <form onSubmit={e => { e.preventDefault(); void run(async () => {
      if (activity.locked) await change({ action: 'metadata', id: activity.id, title, unitId: unitId || null, topicId: topicId || null });
      else {
        const value = await deadline();
        if (upload && !upload.ready) throw new Error('El archivo pendiente todavía no está aprobado. Consulta su revisión o descártalo antes de guardar.');
        await change({ action: 'save', id: activity.id, payload: { title, unitId: unitId || null, topicId: topicId || null, instructions, attachmentRequired,
          instructionFileIds: files.map(f => f.id), materialIds, deadline: value, allowLate,
          questions: questions.map(q => ({ type: q.type, prompt: q.prompt, points: q.points, scoringRule: q.scoringRule ?? null,
            options: q.options.map(o => ({ text: o.text, correct: o.correct ?? false })) })) } });
      }
      setDirty(false);
    }); }} onChange={mark}>
      <fieldset disabled={busy || room.archived}>
        <legend>Organización de la actividad</legend>
        <label>Título de la actividad<input maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <div className="p5-fields"><label>Unidad de la actividad<select aria-label="Unidad de la actividad" value={unitId} onChange={e => { setUnit(e.target.value); setTopic(''); }}>
          <option value="">Selecciona una unidad</option>{room.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
          <label>Tema de la actividad<select aria-label="Tema de la actividad" disabled={!unitId} value={topicId} onChange={e => setTopic(e.target.value)}>
            <option value="">Selecciona un tema</option>{topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label></div>
      </fieldset>
      <fieldset disabled={busy || locked}>
        <legend>Consignas y recursos</legend>
        <label>Observaciones<textarea maxLength={5000} rows={5} value={instructions} onChange={e => setInstructions(e.target.value)} /></label>
        {activity.type === 'ASSIGNMENT' ? <>
          <p>Escribe observaciones, adjunta instrucciones PDF/DOCX o utiliza ambas opciones. Al publicar se requiere al menos una.</p>
          <label className="p7-check"><input type="checkbox" checked={attachmentRequired} onChange={e => setRequired(e.target.checked)} />Archivos de entrega obligatorios</label>
          <label>Archivo de instrucciones (PDF o DOCX, hasta 20 MB)<input type="file" accept=".pdf,.docx" onChange={e => {
            const file = e.target.files?.[0]; e.target.value = '';
            if (file) void run(async () => { if (!api.uploadInstruction) throw new Error('Carga no disponible.');
              const result = await api.uploadInstruction(room.id, activity.id, file); setUpload(result);
              if (result.ready) { setFiles(prev => [...prev, { id: result.id, name: result.name, extension: file.name.split('.').at(-1)!.toLowerCase(), ready: true }]); setUpload(null); }
              mark(); });
          }} /></label>
          {upload ? <div><Notice>{upload.ready ? 'Archivo aprobado.' : upload.rejectionCode ? 'Archivo rechazado. No se adjuntó a las instrucciones.' : 'Carga recibida, pendiente de revisión. Todavía no se adjuntó a las instrucciones.'}</Notice>
            <button type="button" onClick={() => void run(async () => { const result = await api.fileStatus(upload.id); setUpload(result);
              if (result.ready) { setFiles(prev => [...prev, { id: result.id, name: result.name, extension: result.name.split('.').at(-1)!.toLowerCase(), ready: true }]); setUpload(null); mark(); } })}>Consultar revisión de instrucciones</button>
            <button type="button" onClick={() => setUpload(null)}>Descartar selección pendiente</button></div> : null}
          <ul>{files.map(file => <li key={file.id}>{file.name} · {file.ready ? 'Aprobado' : 'No disponible'} <button type="button" onClick={() => { setFiles(files.filter(f => f.id !== file.id)); mark(); }}>Desvincular instrucciones</button></li>)}</ul>
        </> : <><h4>Preguntas</h4><p>Una opción correcta para selección única; al menos dos para selección múltiple.</p>
          {questions.map((q, i) => <QuestionEditor key={i} question={q} index={i} update={value => { setQuestions(questions.map((old, n) => n === i ? value : old)); mark(); }} remove={() => { setQuestions(questions.filter((_, n) => n !== i)); mark(); }} />)}
          <button type="button" onClick={() => { setQuestions([...questions, { type: 'DEVELOPMENT', prompt: '', points: '1', scoringRule: null, options: [] }]); mark(); }}>Agregar pregunta</button></>}
        <h4>Materiales de Biblioteca vinculados</h4>
        {materials.filter(m => !m.deleted && m.ready).map(m => <label className="p7-check" key={m.id}><input type="checkbox" checked={materialIds.includes(m.id)}
          onChange={e => setMaterialIds(e.target.checked ? [...materialIds, m.id] : materialIds.filter(id => id !== m.id))} />{m.title}</label>)}
        {materials.filter(m => !m.deleted && m.ready).length === 0 ? <p>No hay materiales aprobados para vincular.</p> : null}
      </fieldset>
      <fieldset disabled={busy || room.archived}>
        <legend>Fecha límite · {room.timezone}</legend>
        <label>Fecha y hora del aula<input type="datetime-local" step={60} value={local} onChange={e => { setLocal(e.target.value); setResolution(null); setOffset(null); }} /></label>
        <small>La hora se interpreta exclusivamente en {room.timezone}, no en la zona del dispositivo.</small>
        <button type="button" onClick={() => void run(async () => { await deadline(); })} disabled={!local}>Verificar hora</button>
        {resolution?.reason === 'AMBIGUOUS' ? <label>Ocurrencia de la hora repetida<select aria-label="Ocurrencia de la hora repetida" value={offset ?? ''} onChange={e => setOffset(e.target.value === '' ? null : Number(e.target.value))}>
          <option value="">Selecciona una ocurrencia</option>{resolution.choices.map((choice, i) => <option key={choice.instant} value={choice.offsetMinutes}>{i + 1} · {choice.offset} · {choice.instant}</option>)}</select></label> : null}
        <label className="p7-check"><input type="checkbox" checked={allowLate} onChange={e => setLate(e.target.checked)} />Permitir entregas tardías</label>
        {activity.locked ? <button type="button" onClick={() => void run(async () => { await change({ action: 'deadline', id: activity.id, deadline: await deadline(), allowLate }); setDirty(false); })}>Guardar plazo y recepción</button> : null}
      </fieldset>
      <footer className="p5-form-footer"><button className="primary" disabled={busy || room.archived}>{activity.locked ? 'Guardar organización' : 'Guardar actividad'}</button></footer>
    </form>
  </section>;
}

/** Read-only preview/consultation is deliberately separate from a future attempt-taking route. */
export function ActivityPreview({ api, activity, teacher }: { api: ClassroomClient; activity: ActivityDetail; teacher: boolean }) {
  return <section className="p7-preview" aria-label={teacher ? 'Vista previa docente' : 'Consulta de actividad'}>
    <p>{activityTypeLabels[activity.type]} · {activityDate(activity.deadlineAt, activity.zone)}</p>
    {teacher ? <Notice>Vista previa docente: no inicia un intento ni activa el bloqueo de contenido.</Notice> : <Notice>Consulta de actividad. El flujo de intentos y entrega todavía está pendiente; consultar aquí no es una entrega.</Notice>}
    {activity.instructions ? <p className="p7-multiline">{activity.instructions}</p> : null}
    {activity.type === 'ASSIGNMENT' ? <p>{activity.attachmentRequired ? 'La entrega requiere al menos un archivo aprobado.' : 'La entrega permite no adjuntar archivos, con confirmación explícita.'}</p> : null}
    <ul>{activity.instructionFiles.map(f => <li key={f.id}>{f.ready ? <><a href={api.fileUrl(f.id)} target="_blank" rel="noreferrer">Descargar {f.name}</a>
      {f.extension === 'pdf' ? <> · <a href={api.fileUrl(f.id, true)} target="_blank" rel="noreferrer">Vista previa PDF</a></> : null}</> : `${f.name} · No disponible por revisión de seguridad`}</li>)}</ul>
    <ul>{activity.materials.map(m => <li key={m.id}><a href={api.fileUrl(m.fileId)} target="_blank" rel="noreferrer">{m.title}</a></li>)}</ul>
    {activity.questions.map((q, index) => <article key={q.id ?? index}><h4>Pregunta {index + 1} · {q.points} puntos</h4><p className="p7-multiline">{q.prompt}</p>
      <ul>{q.options.map((o, n) => <li key={o.id ?? n}>{o.text}{teacher && o.correct ? ' · Correcta' : ''}</li>)}</ul>
      {teacher && q.scoringRule ? <small>{q.scoringRule === 'PARTIAL' ? 'Puntaje parcial sin opciones incorrectas' : 'Coincidencia exacta'}</small> : null}</article>)}
  </section>;
}
