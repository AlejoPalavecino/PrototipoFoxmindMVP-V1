'use client';
import { useEffect, useRef, useState } from 'react';
import type { ActivityData, ActivityDetail, ActivityQuestion, ClassroomClient, DeadlineResolution, Detail, FileState, Material } from './api.ts';
import { ActivityAssignment } from './activity-Assignment.tsx';
import type { ClassroomCreationContext } from './classroom-creation-context.ts';
import { Dialog, Notice } from './components.tsx';
import { ActivityCurriculum } from './ActivityCurriculum.tsx';
import { EvaluationRubric, EvaluationRubricEditor } from './EvaluationRubric.tsx';
import { parseEvaluationRubric } from '../../src/core/domain/evaluation-rubric.ts';

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

export function QuestionEditor({ question, index, update, remove, fixedType = false }: {
  question: ActivityQuestion; index: number; update: (question: ActivityQuestion) => void; remove?: () => void; fixedType?: boolean;
}) {
  return <fieldset className="p7-question"><legend>Pregunta {index + 1}</legend>
    <label>Tipo de pregunta<select aria-label="Tipo de pregunta" disabled={fixedType} value={question.type} onChange={e => {
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
    {remove ? <button type="button" onClick={remove}>Quitar pregunta</button> : null}
  </fieldset>;
}

export function ActivityAuthoring({ api, room, data, materials, onSaved, onClose, creationContext }: {
  api: ClassroomClient; room: Detail; data: ActivityData; materials: Material[]; onSaved: (assigned?: boolean) => Promise<void>; onClose: () => void; creationContext?: ClassroomCreationContext | null;
}) {
  const activity = data.activity;
  const [title, setTitle] = useState(activity.title ?? ''), [unitId, setUnit] = useState(creationContext?.unitId ?? activity.unitId ?? ''), [topicIds, setTopics] = useState(creationContext?.topicIds ?? activity.topicIds ?? (activity.topicId ? [activity.topicId] : []));
  const [instructions, setInstructions] = useState(activity.instructions ?? ''), [attachmentRequired, setRequired] = useState(activity.attachmentRequired);
  const [objective, setObjective] = useState(activity.objective ?? ''), [teacherComment, setTeacherComment] = useState(activity.teacherComment ?? '');
  const [draftType, setDraftType] = useState(activity.type);
  const [aiGradingRubric, setAiGradingRubric] = useState(activity.aiGradingRubric ?? '');
  const [evaluationRubric, setEvaluationRubric] = useState(activity.evaluationRubric ?? []);
  const [questions, setQuestions] = useState(activity.questions), [files, setFiles] = useState(activity.instructionFiles);
  const [materialIds, setMaterialIds] = useState(activity.materials.map(m => m.id));
  const [local, setLocal] = useState(activityMinute(activity.deadlineAt, room.timezone)), [allowLate, setLate] = useState(activity.allowLate);
  const [offset, setOffset] = useState<number | null>(() => activity.deadlineAt ? (Date.parse(`${activityMinute(activity.deadlineAt, room.timezone)}:00Z`) - Date.parse(activity.deadlineAt)) / 60000 : null);
  const [resolution, setResolution] = useState<DeadlineResolution | null>(null), [upload, setUpload] = useState<FileState | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(Boolean(creationContext));
  const persistence = useRef({ id: activity.id, revision: data.revision });
  const [persisted, setPersisted] = useState(Boolean(activity.id));
  const locked = activity.locked || room.archived;
  const [step, setStep] = useState(0);
  const [assigning, setAssigning] = useState(false);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const stages = ['Selección y origen', 'Preparar actividad', 'Revisar y asignar'];
  useEffect(() => { stageHeading.current?.focus(); }, [step]);
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
  async function ensurePersisted() {
    if (!persistence.current.id) {
      const created = await api.call<{ id: string; revision: string }>(`/${room.id}/activities`, 'POST', { revision: persistence.current.revision, operation: { action: 'create', type: draftType } });
      persistence.current = created; setPersisted(true);
    }
    return persistence.current;
  }
  async function change(operation: Record<string, unknown>) {
    const current = await ensurePersisted();
    const result = await api.call<{ revision: string }>(`/${room.id}/activities`, 'POST', { revision: current.revision, operation: { ...operation, id: current.id } });
    persistence.current.revision = result.revision;
    await onSaved(operation.action === 'publish');
  }
  return <section className="p7-authoring br-authoring" aria-label="Editar actividad">
    <header className="p5-section-head aw-title-row"><div><h2>{step === 2 ? 'Revisar la actividad' : activity.status === 'DRAFT' ? 'Crear actividad manualmente' : 'Editar actividad'}</h2><p>{step === 2 ? 'Verificá qué recibirán tus estudiantes antes de asignarla.' : 'Prepará las consignas y definí cómo vas a evaluar las entregas.'}</p></div>
      <button type="button" disabled={busy} onClick={onClose}>Cerrar editor</button></header>
    {activity.locked ? <Notice>Ya comenzó la participación. Solo se pueden corregir el título y la organización, extender una fecha existente o permitir entregas tardías. Las consignas y sus recursos permanecen bloqueados.</Notice> : null}
    {error ? <Notice error>{error} Los cambios no confirmados permanecen en este editor; no se garantiza su recuperación al cerrarlo.</Notice> : null}
    <p role="status">{busy ? 'Guardando o verificando…' : dirty ? 'Cambios sin guardar. Las preguntas incompletas o inválidas no se guardan.' : 'Último estado confirmado cargado.'}</p>
    <ol className="activity-editor-steps aw-steps" aria-label="Etapas de edición">{stages.map((label, index) => <li key={label} className={step === index ? 'current' : index < step ? 'done' : undefined} aria-current={step === index ? 'step' : undefined}><button type="button" disabled={busy} onClick={() => setStep(index)}><b>{index + 1}</b>{label}</button></li>)}</ol>
    <h4 ref={stageHeading} tabIndex={-1}>Paso {step + 1} de 3 · {stages[step]}</h4>
    <form data-authoring-step={step} onSubmit={e => { e.preventDefault(); void run(async () => {
      if (activity.locked) await change({ action: 'metadata', id: activity.id, title, unitId: unitId || null, topicIds });
      else {
        try { parseEvaluationRubric(evaluationRubric); } catch { throw new Error('Revisá la rúbrica pública: criterios únicos y ponderaciones enteras que sumen 100%.'); }
        const value = await deadline();
        if (upload && !upload.ready) throw new Error('El archivo pendiente todavía no está aprobado. Consulta su revisión o descártalo antes de guardar.');
        if ([...objective].length > 1400 || [...teacherComment].length > 5000) throw new Error('Revisá el objetivo (hasta 1.400 caracteres) y el comentario (hasta 5.000).');
        await change({ action: 'save', id: activity.id, payload: { title, objective: objective || null, teacherComment: teacherComment || null, unitId: unitId || null, topicIds, instructions, attachmentRequired, aiGradingRubric, evaluationRubric,
          instructionFileIds: files.map(f => f.id), materialIds, deadline: value, allowLate,
          questions: draftType === 'ASSIGNMENT' ? [] : questions.map(q => ({ type: q.type, prompt: q.prompt, points: q.points, scoringRule: q.scoringRule ?? null,
            options: q.options.map(o => ({ text: o.text, correct: o.correct ?? false })) })) } });
      }
      setDirty(false);
    }); }} onChange={mark}>
      <fieldset hidden={step !== 0} disabled={busy || room.archived}>
        <legend>Organización de la actividad</legend>
        {activity.locked ? <label>Título de la actividad<input maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label> : null}
        <p>Origen: creación manual. Elegí el tipo y la ubicación antes de preparar las consignas.</p>
        <label>Tipo de actividad<select disabled={persisted} value={draftType} onChange={e => { setDraftType(e.target.value as typeof draftType); mark(); }}>{Object.entries(activityTypeLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {persisted ? <small>El tipo de una actividad guardada no se puede cambiar.</small> : null}
        <ActivityAssignment room={room} value={{ unitId, topicIds }} update={value => { setUnit(value.unitId); setTopics(value.topicIds); mark(); }} />
      </fieldset>
      <fieldset hidden={step !== 1} disabled={busy || locked}>
        <legend>Propuesta para los estudiantes</legend>
        <label>Título de la actividad<input maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label>Objetivo de aprendizaje<textarea name="objective" maxLength={1400} rows={2} placeholder="¿Qué querés que puedan hacer al terminar?" value={objective} onChange={e => setObjective(e.target.value)} /></label>
        <label>Consignas<textarea maxLength={5000} rows={5} placeholder="Explicá qué tienen que hacer, en qué orden y qué se espera que entreguen." value={instructions} onChange={e => setInstructions(e.target.value)} /></label>
        <label>Comentario para el aula · Opcional<textarea name="teacherComment" maxLength={5000} rows={2} placeholder="Sumá una aclaración para tus estudiantes." value={teacherComment} onChange={e => setTeacherComment(e.target.value)} /></label>
        <label>Rúbrica opcional para la corrección con IA<textarea maxLength={5000} rows={4} value={aiGradingRubric} onChange={e => setAiGradingRubric(e.target.value)} /></label>
        <small>Solo el docente ve estos criterios. Si los dejás vacíos, se usarán la consigna y los puntajes de la actividad.</small>
        {draftType === 'ASSIGNMENT' ? <>
          <p>Escribe observaciones, adjunta instrucciones PDF/DOCX o utiliza ambas opciones. Al publicar se requiere al menos una.</p>
          <label className="p7-check"><input type="checkbox" checked={attachmentRequired} onChange={e => setRequired(e.target.checked)} />Archivos de entrega obligatorios</label>
          <label>Archivo de instrucciones (PDF o DOCX, hasta 20 MB)<input type="file" accept=".pdf,.docx" onChange={e => {
            const file = e.target.files?.[0]; e.target.value = '';
            if (file) void run(async () => { if (!api.uploadInstruction) throw new Error('Carga no disponible.');
              const current = await ensurePersisted();
              const result = await api.uploadInstruction(room.id, current.id, file); setUpload(result);
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
      {step === 1 ? <EvaluationRubricEditor criteria={evaluationRubric} disabled={busy || locked} onChange={value => { setEvaluationRubric(value); mark(); }}/> : null}
      <fieldset hidden={step !== 1} disabled={busy || room.archived}>
        <legend>Fecha límite · {room.timezone}</legend>
        <label>Fecha y hora del aula<input type="datetime-local" step={60} value={local} onChange={e => { setLocal(e.target.value); setResolution(null); setOffset(null); }} /></label>
        <small>La hora se interpreta exclusivamente en {room.timezone}, no en la zona del dispositivo.</small>
        <button type="button" onClick={() => void run(async () => { await deadline(); })} disabled={!local}>Verificar hora</button>
        {resolution?.reason === 'AMBIGUOUS' ? <label>Ocurrencia de la hora repetida<select aria-label="Ocurrencia de la hora repetida" value={offset ?? ''} onChange={e => setOffset(e.target.value === '' ? null : Number(e.target.value))}>
          <option value="">Selecciona una ocurrencia</option>{resolution.choices.map((choice, i) => <option key={choice.instant} value={choice.offsetMinutes}>{i + 1} · {choice.offset} · {choice.instant}</option>)}</select></label> : null}
        <label className="p7-check"><input type="checkbox" checked={allowLate} onChange={e => setLate(e.target.checked)} />Permitir entregas tardías</label>
        {activity.locked ? <button type="button" onClick={() => void run(async () => { await change({ action: 'deadline', id: activity.id, deadline: await deadline(), allowLate }); setDirty(false); })}>Guardar plazo y recepción</button> : null}
      </fieldset>
      {step === 2 ? <section className="activity-review-summary" aria-label="Revisión del borrador"><h4>Contenido de la actividad</h4><h3>{title || 'Borrador sin título'}</h3><p>{activityTypeLabels[draftType]}</p>{objective ? <div><h4>Objetivo de aprendizaje</h4><p className="p7-multiline">{objective}</p></div> : null}<div><h4>Consignas</h4><p className="p7-multiline">{instructions || 'Sin consignas escritas.'}</p></div>{teacherComment ? <div><h4>Comentario para el aula</h4><p className="p7-multiline">{teacherComment}</p></div> : null}<p>{files.length} archivos de instrucciones · {materialIds.length} materiales vinculados · {questions.length} preguntas</p><p>{local ? `${local.replace('T', ' · ')} · ${room.timezone}` : 'Sin fecha límite'} · {allowLate ? 'Permite entregas tardías' : 'No permite entregas tardías'}</p><p>Guardar confirma el borrador. La publicación se confirma por separado en Actividades.</p></section> : null}
      {step === 2 ? <aside className="br-authoring-destination"><h4>Destino</h4><h3>{room.name} · {room.division}</h3><h4>Tipo de actividad</h4><p>{activityTypeLabels[draftType]}</p><h4>Unidad y temas</h4><p>{room.units.find(unit => unit.id === unitId)?.name || 'Sin unidad'} · {room.units.find(unit => unit.id === unitId)?.topics.filter(topic => topicIds.includes(topic.id!)).map(topic => topic.name).join(' · ') || 'Sin temas'}</p><h4>Materiales</h4><p>{materials.filter(material => materialIds.includes(material.id)).map(material => material.title).join(' · ') || 'Sin materiales vinculados'}</p><h4>Fecha límite</h4><p>{local ? `${local.replace('T',' · ')} · ${room.timezone}` : 'Sin fecha límite'}</p>{draftType === 'ASSIGNMENT' ? <><h4>Entrega</h4><p>{attachmentRequired ? 'Archivo obligatorio' : 'Archivos opcionales'}</p></> : null}</aside> : null}
      {step === 2 && draftType !== 'ASSIGNMENT' ? <section className="br-authoring-question-review"><h4>Preguntas y clave docente</h4><small>Las respuestas correctas solo están visibles para vos.</small><ol>{questions.map((question,index) => <li key={index}><strong>{question.prompt}</strong><p>{question.points} puntos</p><ul>{question.options.map((option,position) => <li key={position}>{option.text}{option.correct ? <b> · Correcta</b> : null}</li>)}</ul></li>)}</ol></section> : null}
      {step === 2 ? <EvaluationRubric criteria={evaluationRubric}/> : null}
      <footer className="p5-form-footer">{step > 0 ? <button type="button" disabled={busy} onClick={() => setStep(step - 1)}>Anterior</button> : null}<button type="button" hidden={step === 2} disabled={busy} onClick={() => setStep(step + 1)}>Continuar</button><button className="primary" disabled={busy || room.archived}>{activity.locked ? 'Guardar organización' : activity.status === 'DRAFT' ? 'Guardar borrador' : 'Guardar actividad'}</button>
        {step === 2 && activity.status === 'DRAFT' ? <button type="button" disabled={busy || dirty || !persisted || locked} onClick={() => setAssigning(true)}>Asignar al aula</button> : null}</footer>
      {step === 2 && (dirty || !persisted) ? <p>Guardá el borrador antes de asignarlo al aula.</p> : null}
    </form>
    {assigning ? <Dialog title="Asignar actividad al aula" onClose={() => !busy && setAssigning(false)}>
      <p>Se publicará el último borrador guardado en {room.name}. Los estudiantes verán sus consignas, materiales y rúbrica pública.</p>
      {error ? <Notice error>{error}</Notice> : null}
      <button type="button" disabled={busy} onClick={() => setAssigning(false)}>Cancelar asignación</button>
      <button type="button" className="primary" disabled={busy || dirty || locked} onClick={() => void run(async () => { await change({ action: 'publish', id: activity.id }); setAssigning(false); onClose(); })}>Confirmar asignación al aula</button>
    </Dialog> : null}
  </section>;
}

/** Read-only preview/consultation is deliberately separate from a future attempt-taking route. */
export function ActivityPreview({ api, activity, teacher, room }: { api: ClassroomClient; activity: ActivityDetail; teacher: boolean; room?: Detail }) {
  return <section className="p7-preview" aria-label={teacher ? 'Vista previa docente' : 'Consulta de actividad'}>
    <p>{activityTypeLabels[activity.type]} · {activityDate(activity.deadlineAt, activity.zone)}</p>
    <ActivityCurriculum room={room} activity={activity} />
    {activity.objective ? <section><h4>Objetivo de aprendizaje</h4><p className="p7-multiline">{activity.objective}</p></section> : null}
    {activity.teacherComment ? <section><h4>Comentario para el aula</h4><p className="p7-multiline">{activity.teacherComment}</p></section> : null}
    <EvaluationRubric criteria={activity.evaluationRubric}/>
    {teacher ? <Notice>Vista previa docente: no inicia un intento ni activa el bloqueo de contenido.</Notice> : <Notice>Consultar la actividad no confirma una entrega.</Notice>}
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
