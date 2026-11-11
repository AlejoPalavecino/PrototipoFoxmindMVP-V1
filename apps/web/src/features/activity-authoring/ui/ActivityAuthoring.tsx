'use client';
import { activityDate, activityMinute } from "../../../../../shared-ui/academic-date.ts";
import { useEffect, useId, useRef, useState } from 'react';
import type { ActivityData, ActivityDetail, ActivityQuestion, DeadlineResolution } from '../../../../../../src/core/contracts/activities.ts';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import type { Material } from '../../../../../../src/core/contracts/materials.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { ActivityAssignment } from './activity-Assignment.tsx';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { EvaluationRubric, EvaluationRubricEditor } from './EvaluationRubric.tsx';
import styles from './ActivityAuthoring.module.css';
import { parseEvaluationRubric } from '../../../../../../src/core/domain/grading/evaluation-rubric.ts';

export const activityTypeLabels = { ASSIGNMENT: 'Trabajo práctico', QUESTIONNAIRE: 'Cuestionario', EVALUATION: 'Evaluación' };

export function QuestionEditor({ question, index, update, remove, fixedType = false }: {
  question: ActivityQuestion; index: number; update: (question: ActivityQuestion) => void; remove?: () => void; fixedType?: boolean;
}) {
  const correctGroup = useId();
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
      <label className="p7-check"><input type={question.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'} name={correctGroup} checked={option.correct ?? false} onChange={e => update({ ...question,
        options: question.options.map((o, n) => ({ ...o, correct: n === position ? e.target.checked : question.type === 'SINGLE_CHOICE' && e.target.checked ? false : o.correct })) })} />Correcta</label>
      <button type="button" onClick={() => update({ ...question, options: question.options.filter((_, n) => n !== position) })}>Quitar opción</button>
    </div>)}
    {question.type !== 'DEVELOPMENT' ? <button type="button" onClick={() => update({ ...question, options: [...question.options, { text: '', correct: false }] })}>Agregar opción</button> : null}
    {remove ? <button type="button" onClick={remove}>Quitar pregunta</button> : null}
  </fieldset>;
}

export function ActivityAuthoring({ api, room, data, materials, onSaved, onClose, creationContext, initialReview = false }: {
  api: ClassroomClient; room: Detail; data: ActivityData; materials: Material[]; onSaved: (assigned?: boolean, activityId?: string) => Promise<void>; onClose: () => void; creationContext?: ClassroomCreationContext | null; initialReview?: boolean;
}) {
  const activity = data.activity;
  const [title, setTitle] = useState(activity.title ?? ''), [unitId, setUnit] = useState(creationContext?.unitId ?? activity.unitId ?? ''), [topicIds, setTopics] = useState(creationContext?.topicIds ?? activity.topicIds ?? (activity.topicId ? [activity.topicId] : []));
  const [instructions, setInstructions] = useState(activity.instructions ?? ''), [attachmentRequired, setRequired] = useState(activity.attachmentRequired);
  const [objective, setObjective] = useState(activity.objective ?? ''), [teacherComment, setTeacherComment] = useState(activity.teacherComment ?? '');
  const [draftType, setDraftType] = useState(activity.type);
  const [typeChosen,setTypeChosen]=useState(Boolean(activity.id||activity.title||activity.instructions));
  const [aiGradingRubric] = useState(activity.aiGradingRubric ?? '');
  const [evaluationRubric, setEvaluationRubric] = useState(activity.evaluationRubric ?? []);
  const [questions, setQuestions] = useState(activity.questions), [files] = useState(activity.instructionFiles);
  const [materialIds, setMaterialIds] = useState(activity.materials.map(m => m.id));
  const [local, setLocal] = useState(activityMinute(activity.deadlineAt, room.timezone)), [allowLate, setLate] = useState(activity.allowLate);
  const [offset, setOffset] = useState<number | null>(() => activity.deadlineAt ? (Date.parse(`${activityMinute(activity.deadlineAt, room.timezone)}:00Z`) - Date.parse(activity.deadlineAt)) / 60000 : null);
  const [resolution, setResolution] = useState<DeadlineResolution | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(Boolean(creationContext?.unitId || creationContext?.topicIds.length));
  const persistence = useRef({ id: activity.id, revision: data.revision });
  const [persisted, setPersisted] = useState(Boolean(activity.id));
  const [publicationConfirmed,setPublicationConfirmed]=useState(false);
  const [leaving, setLeaving] = useState(false);
  const [rubricOpen, setRubricOpen] = useState(Boolean(activity.evaluationRubric?.length));
  const locked = activity.locked || room.archived;
  const [step, setStep] = useState(initialReview ? 1 : 0);
  const operationLock=useRef(false);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const errorNotice = useRef<HTMLDivElement>(null);
  const stages = ['Preparar actividad', 'Revisar y asignar'];
  useEffect(() => { stageHeading.current?.focus(); }, [step]);
  useEffect(() => { if (error && !leaving) errorNotice.current?.focus(); }, [error, leaving]);
  const mark = () => setDirty(true);
  async function run(operation: () => Promise<void>) {
    if(operationLock.current)return;operationLock.current=true;
    setBusy(true); setError('');
    try { await operation(); } catch (e) { setError((e as Error).message); } finally { operationLock.current=false;setBusy(false); }
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
  }
  function review() {
    setError('');
    if(!typeChosen){setError('Elegí un tipo de actividad.');setStep(0);return false;}
    const unit=room.units.find(item=>item.id===unitId);
    if(!unit || !topicIds.length || topicIds.some(id=>!unit.topics.some(topic=>topic.id===id))){setError('Elegí una unidad y al menos un tema.');setStep(0);return false;}
    if(!locked){
      if(!objective.trim()){setError('Escribí el objetivo de aprendizaje.');setStep(0);return false;}
      if(!title.trim()||!instructions.trim()){setError('Completá el título y las consignas de la actividad.');setStep(0);return false;}
      if(draftType!=='ASSIGNMENT'&&!questions.length){setError('Agregá al menos una pregunta.');setStep(0);return false;}
      if(!evaluationRubric.length||evaluationRubric.some(row=>!row.name.trim()||!row.description.trim())){setRubricOpen(true);setError('Completá cada criterio de la rúbrica, la evidencia esperada y su peso.');setStep(0);return false;}
      try{parseEvaluationRubric(evaluationRubric);}catch{setRubricOpen(true);setError('Los pesos de la rúbrica deben sumar 100 %.');setStep(0);return false;}
    }
    setStep(1);
    return true;
  }
  async function saveDraft() {
      if(!typeChosen)throw new Error('Elegí un tipo de actividad.');
      if (activity.locked) await change({ action: 'metadata', id: activity.id, title, unitId: unitId || null, topicIds });
      else {
        try { parseEvaluationRubric(evaluationRubric); } catch { setStep(0); setRubricOpen(true); throw new Error('Revisá la rúbrica pública: criterios únicos y ponderaciones enteras que sumen 100%.'); }
        const value = await deadline();
        if ([...objective].length > 1400 || [...teacherComment].length > 5000) throw new Error('Revisá el objetivo (hasta 1.400 caracteres) y el comentario (hasta 5.000).');
        await change({ action: 'save', id: activity.id, payload: { title, objective: objective || null, teacherComment: teacherComment || null, unitId: unitId || null, topicIds, instructions, attachmentRequired, aiGradingRubric, evaluationRubric,
          instructionFileIds: files.map(f => f.id), materialIds, deadline: value, allowLate,
          questions: draftType === 'ASSIGNMENT' ? [] : questions.map(q => ({ type: q.type, prompt: q.prompt, points: q.points, scoringRule: q.scoringRule ?? null,
            options: q.options.map(o => ({ text: o.text, correct: o.correct ?? false })) })) } });
      }
      setDirty(false);

  }
  if(publicationConfirmed)return <section className="p7-authoring br-authoring" aria-label="Actividad asignada"><Notice>{`Actividad asignada a ${room.name}.`}</Notice>{error?<Notice error>No se pudo abrir la ficha. La asignación ya está confirmada.</Notice>:null}<button disabled={busy} onClick={()=>void run(()=>onSaved(true,persistence.current.id))}>Abrir actividad asignada</button><button disabled={busy} onClick={onClose}>Volver a actividades</button></section>;
  return <section className={`p7-authoring br-authoring ${styles.editor}`} aria-label="Editar actividad">
    <button className="brujula-authoring-back" aria-label="Cerrar editor" type="button" disabled={busy} onClick={() => dirty ? setLeaving(true) : onClose()}><FoxmindIcon name="arrow-left"/>Actividades</button>
    <header className="p5-section-head aw-title-row"><div><h2>{step === 1 ? 'Revisar la actividad' : activity.status === 'DRAFT' ? (activity.id ? 'Editar borrador' : 'Crear actividad') : 'Editar actividad'}</h2><p>{step === 1 ? 'Verificá qué recibirán tus estudiantes antes de asignarla.' : 'Prepará las consignas y definí cómo vas a evaluar las entregas.'}</p></div>
      {activity.status === 'DRAFT' ? <span className="brujula-private-badge"><FoxmindIcon name="lock"/>Borrador privado</span> : null}</header>
    {activity.locked ? <Notice>Ya comenzó la participación. Solo se pueden corregir el título y la organización, extender una fecha existente o permitir entregas tardías. Las consignas y sus recursos permanecen bloqueados.</Notice> : null}
    {error ? <div ref={errorNotice} tabIndex={-1}><Notice error>{error}</Notice></div> : null}
    <p className="br-authoring-save-status" role="status">{busy ? 'Guardando o verificando…' : dirty ? 'Cambios sin guardar. Las preguntas incompletas o inválidas no se guardan.' : persisted ? 'Último estado guardado.' : 'Borrador nuevo.'}</p>
    <ol className="activity-editor-steps aw-steps" aria-label="Etapas de edición">{stages.map((label, index) => <li key={label} className={step === index ? 'current' : index < step ? 'done' : undefined} aria-current={step === index ? 'step' : undefined}><button type="button" disabled={busy} onClick={() => index===1?review():setStep(0)}><b>{index + 1}</b>{label}</button></li>)}</ol>
    <h4 className="sr-only" ref={stageHeading} tabIndex={-1}>Paso {step + 1} de 2 · {stages[step]}</h4>
    <form noValidate data-authoring-step={step} onSubmit={e=>{e.preventDefault();void run(async()=>{await saveDraft();await onSaved(false,persistence.current.id);});}} onChange={mark}>
      <fieldset hidden={step !== 0} disabled={busy || room.archived} aria-label="Organización de la actividad">
        <h3 className="brujula-authoring-card-title">Ubicación en el aula</h3>
        {activity.locked ? <label>Título de la actividad<input maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label> : null}
        <ActivityAssignment compact room={room} value={{ unitId, topicIds }} update={value => { setUnit(value.unitId); setTopics(value.topicIds); mark(); }} typeControl={<label>Tipo de actividad<select aria-label="Tipo de actividad" disabled={persisted} value={typeChosen?draftType:''} onChange={e => {setTypeChosen(true);setDraftType(e.target.value as typeof draftType);if(e.target.value==='ASSIGNMENT')setRequired(true);mark();}}><option value="" disabled>Elegí un tipo</option>{Object.entries(activityTypeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}/>
      </fieldset>
      <fieldset hidden={step !== 0} disabled={busy || locked} aria-label="Propuesta para los estudiantes">
        <h3 className="brujula-authoring-card-title">Propuesta para los estudiantes</h3>
        <label>Título<input aria-label="Título de la actividad" placeholder="Ej. Cuaderno de campo" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label>Objetivo de aprendizaje<textarea name="objective" maxLength={1400} rows={2} placeholder="¿Qué querés que puedan hacer al terminar?" value={objective} onChange={e => setObjective(e.target.value)} /></label>
        <label>Consignas<textarea maxLength={5000} rows={5} placeholder="Explicá qué tienen que hacer, en qué orden y qué se espera que entreguen." value={instructions} onChange={e => setInstructions(e.target.value)} /></label>
        {typeChosen&&draftType === 'ASSIGNMENT' ? <label className="p7-check"><input type="checkbox" aria-label="Archivos de entrega obligatorios" checked={attachmentRequired} onChange={e => setRequired(e.target.checked)} />Solicitar un archivo para la entrega</label> : typeChosen?<><h4>Preguntas</h4><p>Una opción correcta para selección única; al menos dos para selección múltiple.</p>
          {questions.map((q, i) => <QuestionEditor key={i} question={q} index={i} update={value => { setQuestions(questions.map((old, n) => n === i ? value : old)); mark(); }} remove={() => { setQuestions(questions.filter((_, n) => n !== i)); mark(); }} />)}
          <button type="button" onClick={() => { setQuestions([...questions, { type: 'DEVELOPMENT', prompt: '', points: '1', scoringRule: null, options: [] }]); mark(); }}>Agregar pregunta</button></>:null}
        <details className={styles.optional} open={teacherComment || materialIds.length ? true : undefined}><summary>Materiales y comentario docente</summary>
        <label>Comentario para el aula · Opcional<textarea name="teacherComment" maxLength={5000} rows={2} placeholder="Sumá una aclaración para tus estudiantes." value={teacherComment} onChange={e => setTeacherComment(e.target.value)} /></label>
        {materials.some(m=>!m.deleted&&m.ready)?<h4>Materiales de consulta</h4>:<p>Esta aula todavía no tiene materiales disponibles.</p>}
        {materials.filter(m => !m.deleted && m.ready && (!m.supersededBy || materialIds.includes(m.id))).map(m => <label className="p7-check" key={m.id}><input type="checkbox" checked={materialIds.includes(m.id)}
          onChange={e => setMaterialIds(e.target.checked ? [...materialIds, m.id] : materialIds.filter(id => id !== m.id))} />{m.title}</label>)}
        </details>
      </fieldset>
      {step === 0 ? <details className={styles.rubric} open={rubricOpen} onToggle={event => setRubricOpen(event.currentTarget.open)}>
        <summary>Rúbrica de evaluación</summary>
        <EvaluationRubricEditor compact criteria={evaluationRubric} disabled={busy || locked} onChange={value => { setEvaluationRubric(value); mark(); }}/>
      </details> : null}
      <fieldset hidden={step !== 0} disabled={busy || room.archived} aria-label="Plazo de entrega">
        <h3 className="brujula-authoring-card-title">Plazo de entrega</h3>
        <label title={`Horario del aula: ${room.timezone}`}>Fecha y hora límite <small>Opcional</small><input aria-label="Fecha y hora del aula" type="datetime-local" step={60} value={local} onChange={e => { setLocal(e.target.value); setResolution(null); setOffset(null); }} /></label>
        {resolution?.reason === 'AMBIGUOUS' ? <label>Ocurrencia de la hora repetida<select aria-label="Ocurrencia de la hora repetida" value={offset ?? ''} onChange={e => setOffset(e.target.value === '' ? null : Number(e.target.value))}>
          <option value="">Selecciona una ocurrencia</option>{resolution.choices.map((choice, i) => <option key={choice.instant} value={choice.offsetMinutes}>{i + 1} · {choice.offset} · {choice.instant}</option>)}</select></label> : null}
        <label className="p7-check"><input type="checkbox" aria-label="Permitir entregas tardías" checked={allowLate} onChange={e => setLate(e.target.checked)} />Aceptar entregas fuera de término</label>
        {activity.locked ? <button type="button" onClick={() => void run(async () => { await change({ action: 'deadline', id: activity.id, deadline: await deadline(), allowLate }); setDirty(false); })}>Guardar plazo y recepción</button> : null}
      </fieldset>
      {step === 1 ? <section className="activity-review-summary" aria-label="Revisión del borrador"><h4>Vista del estudiante</h4><h3>{title || 'Borrador sin título'}</h3>{objective ? <div><h4>Objetivo de aprendizaje</h4><p className="p7-multiline">{objective}</p></div> : null}<div className={styles.instructions}><h4>Qué tenés que hacer</h4><p className="p7-multiline">{instructions || 'Sin consignas escritas.'}</p></div>{teacherComment ? <div><h4>Comentario para el aula</h4><p className="p7-multiline">{teacherComment}</p></div> : null}{draftType !== 'ASSIGNMENT' && questions.length ? <div><h4>Preguntas</h4><ol>{questions.map((question, index) =>
        <li key={question.id ?? index}><p className="p7-multiline">{question.prompt}</p>{question.options.length ? <ul>{question.options.map((option, position) =>
          <li key={option.id ?? position}>{option.text}</li>)}</ul> : null}</li>)}</ol></div> : null}<EvaluationRubric compact criteria={evaluationRubric}/></section> : null}
      {step === 1 ? <aside className="br-authoring-destination"><h4>Destino</h4><h3>{room.name} · {room.division}</h3><h4>Tipo de actividad</h4><p>{activityTypeLabels[draftType]}</p><h4>Unidad</h4><p>{room.units.find(unit => unit.id === unitId)?.name || 'Sin unidad'}</p><h4>Temas</h4><p>{room.units.find(unit => unit.id === unitId)?.topics.filter(topic => topicIds.includes(topic.id!)).map(topic => topic.name).join(' · ') || 'Sin temas'}</p><h4>Materiales</h4><p>{materials.filter(material => materialIds.includes(material.id)).map(material => material.title).join(' · ') || 'Sin materiales vinculados'}</p><h4>Fecha límite</h4><p>{local ? `${local.replace('T',' · ')} · ${room.timezone}` : 'Sin fecha límite'}</p><h4>Fuera de plazo</h4><p>{allowLate ? 'Se aceptan entregas tardías' : 'Plazo estricto'}</p>{draftType === 'ASSIGNMENT' ? <><h4>Entrega</h4><p>{attachmentRequired ? 'Archivo obligatorio' : 'Archivos opcionales'}</p></> : null}</aside> : null}
      {step === 1 && draftType !== 'ASSIGNMENT' ? <details className="br-authoring-question-review"><summary>Preguntas y clave docente</summary><small>Las respuestas correctas solo están visibles para vos.</small><ol>{questions.map((question,index) => <li key={index}><strong>{question.prompt}</strong><p>{question.points} puntos</p><ul>{question.options.map((option,position) => <li key={position}>{option.text}{option.correct ? <b> · Correcta</b> : null}</li>)}</ul></li>)}</ol></details> : null}
      <footer className="p5-form-footer">{step > 0 ? <button type="button" disabled={busy} onClick={() => setStep(step - 1)}>Volver a editar</button> : null}<button disabled={busy || room.archived}>{activity.locked ? 'Guardar organización' : activity.status === 'DRAFT' ? 'Guardar borrador' : 'Guardar actividad'}</button><button type="button" className="primary" hidden={step === 1} disabled={busy} onClick={review}>Continuar a revisión</button>
        {step === 1 && activity.status === 'DRAFT' ? <button type="button" className="primary" disabled={busy || locked} onClick={() => void run(async()=>{if(!review())return;await saveDraft();await change({action:'publish',id:activity.id});setPublicationConfirmed(true);await onSaved(true,persistence.current.id);})}>Asignar al aula</button> : null}</footer>
    </form>
    {leaving ? <Dialog title="Salir del editor" onClose={() => { if (!busy) setLeaving(false); }}>
      <p>Hay cambios sin guardar. Podés seguir editando, guardarlos o salir y descartarlos.</p>
      {error ? <Notice error>{error}</Notice> : null}
      <footer className="p5-form-footer">
        <button type="button" disabled={busy} onClick={() => setLeaving(false)}>Seguir editando</button>
        <button type="button" disabled={busy} onClick={onClose}>Descartar cambios</button>
        {!room.archived ? <button type="button" className="primary" disabled={busy} onClick={() => void run(async () => {
          await saveDraft(); setLeaving(false); await onSaved(false, persistence.current.id);
        })}>Guardar y salir</button> : null}
      </footer>
    </Dialog> : null}
  </section>;
}
