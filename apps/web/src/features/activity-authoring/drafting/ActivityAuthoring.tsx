'use client';
import type { GenerationSource } from '../generation/generation-feedback.ts';
import { activityDate, activityMinute } from '../../../../../shared-ui/academic-date.ts';
import { useEffect, useRef, useState } from 'react';
import type { ActivityData, DeadlineResolution } from '../../../../../../src/core/contracts/activities.ts';
import type { ActivityAuthoringOperations } from '../model/authoring-operations.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import type { Material } from '../../../../../../src/core/contracts/materials.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { ActivityAssignment, ActivityTypeChoice } from './activity-Assignment.tsx';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { EvaluationRubric, EvaluationRubricEditor } from './EvaluationRubric.tsx';
import { selectedActivityTopics, type ActivityScope } from '../model/activity-scope.ts';
import styles from './ActivityAuthoring.module.css';
import {
  ActivityGenerationForm,
  defaultGenerationCounts,
  defaultGenerationForm,
  teacherBriefLimit,
  type GenerationFormValue,
} from '../generation/ActivityGenerationForm.tsx';
import { activityReviewProblem, assertDraftRubric, buildActivityDraftPayload } from './draft-rules.ts';
import { createAuthoringPersistence } from '../publication/authoring-persistence.ts';
import { selectAuthoringDeadline } from '../publication/authoring-deadline.ts';

export const activityTypeLabels = {
  ASSIGNMENT: 'Trabajo práctico',
  QUESTIONNAIRE: 'Cuestionario',
  EVALUATION: 'Evaluación',
};

export { QuestionEditor } from './QuestionEditor.tsx';
import { QuestionEditor } from './QuestionEditor.tsx';

export function ActivityAuthoring({
  api,
  room,
  data,
  materials,
  onSaved,
  onClose,
  creationContext,
  initialReview = false,
  initialContent = false,
  onGenerate,
}: {
  api: ActivityAuthoringOperations;
  room: Detail;
  data: ActivityData;
  materials: Material[];
  onSaved: (assigned?: boolean, activityId?: string) => Promise<void>;
  onClose: () => void;
  creationContext?: ClassroomCreationContext | null;
  initialReview?: boolean;
  initialContent?: boolean;
  onGenerate?: (value: GenerationFormValue) => void;
}) {
  const activity = data.activity;
  const [title, setTitle] = useState(activity.title ?? '');
  const [scope, setScope] = useState<ActivityScope>(() => ({
    unitIds: [],
    topicIds: creationContext?.topicIds ?? activity.topicIds ?? (activity.topicId ? [activity.topicId] : []),
  }));
  const selectedUnits = selectedActivityTopics(room.units, scope);
  const [instructions, setInstructions] = useState(activity.instructions ?? ''),
    [attachmentRequired, setRequired] = useState(activity.attachmentRequired);
  const [objective, setObjective] = useState(activity.objective ?? ''),
    [teacherComment, setTeacherComment] = useState(activity.teacherComment ?? '');
  const [draftType, setDraftType] = useState(activity.type);
  const [typeChosen, setTypeChosen] = useState(Boolean(activity.id || activity.title || activity.instructions));
  const [aiGradingRubric] = useState(activity.aiGradingRubric ?? '');
  const [evaluationRubric, setEvaluationRubric] = useState(activity.evaluationRubric ?? []);
  const [questions, setQuestions] = useState(activity.questions),
    [files] = useState(activity.instructionFiles);
  const [materialIds, setMaterialIds] = useState(activity.materials.map(m => m.id));
  const [local, setLocal] = useState(activityMinute(activity.deadlineAt, room.timezone)),
    [allowLate, setLate] = useState(activity.allowLate);
  const [offset, setOffset] = useState<number | null>(() =>
    activity.deadlineAt
      ? (Date.parse(`${activityMinute(activity.deadlineAt, room.timezone)}:00Z`) - Date.parse(activity.deadlineAt)) /
        60000
      : null,
  );
  const [resolution, setResolution] = useState<DeadlineResolution | null>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(Boolean(creationContext?.unitId || creationContext?.topicIds.length));
  const persistence = useRef(createAuthoringPersistence(api, { id: activity.id, revision: data.revision }));
  const [persisted, setPersisted] = useState(Boolean(activity.id));
  const [publicationConfirmed, setPublicationConfirmed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const locked = activity.locked || room.archived;
  const [step, setStep] = useState(initialReview ? 2 : initialContent ? 1 : 0);
  const [method, setMethod] = useState<'manual' | 'ai' | null>(
    activity.id || activity.title || !onGenerate ? 'manual' : null,
  );
  const [generationOptions, setGenerationOptions] = useState(defaultGenerationForm);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [generationSources, setGenerationSources] = useState<GenerationSource[]>([]);
  const [sourcesError, setSourcesError] = useState('');
  useEffect(() => {
    if (!optionsOpen) return;
    const controller = new AbortController();
    void api.generation
      .sources(controller.signal)
      .then(result => {
        if (!controller.signal.aborted) {
          setGenerationSources(result.sources);
          setSourcesError('');
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) setSourcesError(error.message);
      });
    return () => controller.abort();
  }, [optionsOpen, api, room.id]);
  const [teacherBrief, setTeacherBrief] = useState(activity.teacherBrief ?? '');
  const [contentTab, setContentTab] = useState<'instructions' | 'questions' | 'rubric'>('instructions');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [publishDialog, setPublishDialog] = useState(false);
  const [reference, setReference] = useState<'idea' | 'answers' | null>(null);
  const selectedQuestion = questions[questionIndex];
  const operationLock = useRef(false);
  const generationRequested = useRef(false);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const errorNotice = useRef<HTMLDivElement>(null);
  const stages = ['Alcance', 'Contenido', 'Revisión'];
  useEffect(() => {
    stageHeading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (error && !leaving) errorNotice.current?.focus();
  }, [error, leaving]);
  const mark = () => setDirty(true);
  async function run(operation: () => Promise<void>) {
    if (operationLock.current) return;
    operationLock.current = true;
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      operationLock.current = false;
      setBusy(false);
    }
  }
  async function deadline() {
    if (!local) return null;
    const current = await api.resolveDeadline(local);
    setResolution(current);
    return selectAuthoringDeadline(current, offset, local);
  }
  const draft = {
    title,
    objective,
    teacherComment,
    scope,
    instructions,
    type: draftType,
    attachmentRequired,
    aiGradingRubric,
    evaluationRubric,
    files,
    materialIds,
    allowLate,
    questions,
  };
  function validateScope() {
    if (!typeChosen || !selectedUnits.length) {
      setError(typeChosen ? 'Elegí al menos un tema o una unidad con temas.' : 'Elegí un tipo de actividad.');
      setStep(0);
      return false;
    }
    if (!method) {
      setError('Elegí si querés prepararla a mano o con Foxy.');
      return false;
    }
    if (method === 'ai' && (!teacherBrief.trim() || [...teacherBrief].length > teacherBriefLimit)) {
      setError('Escribí una idea para Foxy de hasta 1.200 caracteres.');
      return false;
    }
    return true;
  }
  function continueScope() {
    if (!validateScope()) return;
    setError('');
    if (method === 'ai' && onGenerate && !activity.id) {
      if (generationRequested.current) return;
      generationRequested.current = true;
      onGenerate({ ...generationOptions, ...scope, type: draftType, teacherBrief });
    } else setStep(1);
  }
  function contentProblem(message: string, tab: typeof contentTab) {
    setError(message);
    setContentTab(tab);
    setStep(1);
    return false;
  }
  function review() {
    setError('');
    if (!validateScope()) return false;
    if (!locked) {
      const problem = activityReviewProblem(draft);
      if (problem) {
        if (problem.questionIndex !== undefined) setQuestionIndex(problem.questionIndex);
        return contentProblem(problem.message, problem.tab);
      }
    }
    setStep(2);
    return true;
  }
  async function saveDraft() {
    if (!typeChosen) throw new Error('Elegí un tipo de actividad.');
    try {
      if (activity.locked) await persistence.current.metadata(draftType, { title, ...scope });
      else {
        try {
          assertDraftRubric(evaluationRubric);
        } catch (error) {
          setStep(1);
          setContentTab('rubric');
          throw error;
        }
        const value = await deadline();
        await persistence.current.save(draftType, buildActivityDraftPayload(draft, value));
      }
      setDirty(false);
    } finally {
      setPersisted(Boolean(persistence.current.snapshot().id));
    }
  }
  if (publicationConfirmed)
    return (
      <section className="p7-authoring br-authoring" aria-label="Actividad asignada">
        <Notice>{`Actividad asignada a ${room.name}.`}</Notice>
        {error ? <Notice error>No se pudo abrir la ficha. La asignación ya está confirmada.</Notice> : null}
        <button disabled={busy} onClick={() => void run(() => onSaved(true, persistence.current.snapshot().id))}>
          Abrir actividad asignada
        </button>
        <button disabled={busy} onClick={onClose}>
          Volver a actividades
        </button>
      </section>
    );
  return (
    <section className={`p7-authoring br-authoring ${styles.editor}`} aria-label="Editar actividad">
      <header className="parity-compose-top">
        <button
          className="brujula-authoring-back"
          aria-label="Cerrar editor"
          type="button"
          disabled={busy}
          onClick={() => (dirty ? setLeaving(true) : onClose())}
        >
          <FoxmindIcon name="arrow-left" />
        </button>
        <div>
          <strong>{activity.id ? 'Editar actividad' : 'Crear actividad'}</strong>
          <small>{room.name}</small>
        </div>
        <span>
          <FoxmindIcon name="lock" />
          Tu espacio de trabajo
        </span>
        <img src="/foxmind/logo.webp" alt="" width={40} height={40} />
      </header>
      <ol className={styles.stageList} aria-label="Etapas de edición">
        {stages.map((label, index) => (
          <li
            key={label}
            className={step === index ? 'current' : index < step ? 'done' : undefined}
            aria-current={step === index ? 'step' : undefined}
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (index === 2) review();
                else if (index === 0) setStep(0);
                else continueScope();
              }}
            >
              <b>{index + 1}</b>
              {label}
            </button>
          </li>
        ))}
      </ol>
      <header className="p5-section-head aw-title-row">
        <div>
          <h2>
            {step === 2
              ? 'Revisá antes de publicar'
              : step === 1
                ? 'Armá el contenido'
                : activity.id
                  ? 'Editar actividad'
                  : 'Prepará una actividad'}
          </h2>
          <p>
            {step === 2
              ? 'Verificá qué recibirán tus estudiantes antes de asignarla.'
              : step === 1
                ? 'Completá las consignas y los criterios de evaluación.'
                : 'Elegí el alcance, el tipo de actividad y cómo querés prepararla.'}
          </p>
        </div>
      </header>
      {activity.locked ? (
        <Notice>
          Ya comenzó la participación. Solo se pueden corregir el título y la organización, extender una fecha existente
          o permitir entregas tardías. Las consignas y sus recursos permanecen bloqueados.
        </Notice>
      ) : null}
      {error ? (
        <div ref={errorNotice} tabIndex={-1}>
          <Notice error>{error}</Notice>
        </div>
      ) : null}
      <p className="br-authoring-save-status" role="status">
        {busy
          ? 'Guardando o verificando…'
          : dirty
            ? 'Cambios sin guardar. Las preguntas incompletas o inválidas no se guardan.'
            : persisted
              ? 'Último estado guardado.'
              : 'Borrador nuevo.'}
      </p>
      <h4 className="sr-only" ref={stageHeading} tabIndex={-1}>
        Paso {step + 1} de 3 · {stages[step]}
      </h4>
      <form
        noValidate
        data-authoring-step={step}
        onSubmit={e => {
          e.preventDefault();
          void run(async () => {
            await saveDraft();
            await onSaved(false, persistence.current.snapshot().id);
          });
        }}
        onChange={mark}
      >
        <div className={styles.scopeGrid} hidden={step !== 0}>
          <ActivityAssignment
            room={room}
            value={scope}
            update={value => {
              setScope(value);
              mark();
            }}
            disabled={busy || room.archived}
          />
          <div className={styles.scopeStack}>
            <ActivityTypeChoice
              value={typeChosen ? draftType : ''}
              disabled={persisted || busy || room.archived}
              update={type => {
                setTypeChosen(true);
                setDraftType(type);
                setGenerationOptions(previous => ({ ...previous, type, counts: defaultGenerationCounts(type) }));
                if (type === 'ASSIGNMENT') setRequired(true);
                mark();
              }}
            />
            {onGenerate && !activity.id ? (
              <fieldset className={`${styles.typeCard} parity-compose-type`}>
                <legend>¿Cómo la querés preparar?</legend>
                {(
                  [
                    {
                      value: 'manual',
                      label: 'Manualmente',
                      description: 'Escribís la consigna y los criterios desde cero.',
                      icon: 'edit',
                    },
                    {
                      value: 'ai',
                      label: 'Con ayuda de Foxy',
                      description: 'Recibís una propuesta de actividad y una rúbrica que podés editar.',
                      icon: 'spark',
                    },
                  ] as const
                ).map(option => (
                  <label className={`${styles.typeChoice} parity-compose-choice`} key={option.value}>
                    <input
                      type="radio"
                      name="activity-method"
                      checked={method === option.value}
                      onChange={() => {
                        setMethod(option.value);
                        mark();
                      }}
                    />
                    <span className={styles.typeIcon}>
                      <FoxmindIcon name={option.icon} />
                    </span>
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                  </label>
                ))}
                {method === 'ai' ? (
                  <>
                    <label className={styles.methodBrief}>
                      Tu idea para Foxy
                      <textarea
                        rows={4}
                        maxLength={teacherBriefLimit}
                        value={teacherBrief}
                        onChange={event => {
                          setTeacherBrief(event.target.value);
                          mark();
                        }}
                        placeholder="Contale qué querés que haga tu grupo…"
                      />
                      <small>Esta idea es privada. Generar utiliza IA y puede consumir cuota.</small>
                    </label>
                    <button type="button" aria-haspopup="dialog" onClick={() => setOptionsOpen(true)}>
                      Ajustes y fuentes (opcional)
                    </button>
                  </>
                ) : null}
              </fieldset>
            ) : null}
          </div>
        </div>
        <div hidden={step !== 1} className={styles.contentCard}>
          <div className={styles.sectionSwitch} role="group" aria-label="Secciones del contenido">
            <button
              type="button"
              aria-pressed={contentTab === 'instructions'}
              onClick={() => setContentTab('instructions')}
            >
              <FoxmindIcon name="edit" />
              Consigna
            </button>
            {draftType !== 'ASSIGNMENT' ? (
              <button
                type="button"
                aria-pressed={contentTab === 'questions'}
                onClick={() => setContentTab('questions')}
              >
                <FoxmindIcon name="list-checks" />
                Preguntas <span>{questions.length}</span>
              </button>
            ) : null}
            <button type="button" aria-pressed={contentTab === 'rubric'} onClick={() => setContentTab('rubric')}>
              <FoxmindIcon name="progress" />
              Rúbrica <span>{evaluationRubric.reduce((sum, item) => sum + item.weight, 0)} %</span>
            </button>
          </div>
          <div className={styles.instructionsLayout} hidden={contentTab !== 'instructions'}>
            <fieldset disabled={busy || room.archived} aria-label="Consigna">
              <h3>Consigna de la actividad</h3>
              <label>
                Título
                <input
                  aria-label="Título de la actividad"
                  placeholder="Ej. Cuaderno de campo"
                  maxLength={200}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </label>
              <label>
                Objetivo de aprendizaje
                <textarea
                  name="objective"
                  disabled={locked}
                  maxLength={1400}
                  rows={2}
                  placeholder="¿Qué querés que puedan hacer al terminar?"
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                />
              </label>
              <label>
                Consignas
                <textarea
                  disabled={locked}
                  maxLength={5000}
                  rows={5}
                  placeholder="Explicá qué tienen que hacer y qué esperás que entreguen."
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                />
              </label>
              {draftType === 'ASSIGNMENT' ? (
                <label className="p7-check">
                  <input
                    type="checkbox"
                    aria-label="Archivos de entrega obligatorios"
                    checked={attachmentRequired}
                    disabled={locked}
                    onChange={e => setRequired(e.target.checked)}
                  />
                  Solicitar un archivo para la entrega
                </label>
              ) : null}
              {activity.teacherBrief ? (
                <button type="button" aria-haspopup="dialog" onClick={() => setReference('idea')}>
                  Consultar idea privada para Foxy
                </button>
              ) : null}
              <section className={styles.optional} aria-labelledby="activity-materials-heading">
                <h4 id="activity-materials-heading">Materiales y comentario docente</h4>
                <label>
                  Comentario para el aula · Opcional
                  <textarea
                    disabled={locked}
                    name="teacherComment"
                    maxLength={5000}
                    rows={2}
                    placeholder="Sumá una aclaración para tus estudiantes."
                    value={teacherComment}
                    onChange={e => setTeacherComment(e.target.value)}
                  />
                </label>
                {materials.some(m => !m.deleted && m.ready) ? (
                  <h4>Materiales de consulta</h4>
                ) : (
                  <p>Esta aula todavía no tiene materiales disponibles.</p>
                )}
                {materials
                  .filter(m => !m.deleted && m.ready && (!m.supersededBy || materialIds.includes(m.id)))
                  .map(m => (
                    <label className="p7-check" key={m.id}>
                      <input
                        type="checkbox"
                        disabled={locked}
                        checked={materialIds.includes(m.id)}
                        onChange={e =>
                          setMaterialIds(
                            e.target.checked ? [...materialIds, m.id] : materialIds.filter(id => id !== m.id),
                          )
                        }
                      />
                      {m.title}
                    </label>
                  ))}
              </section>
            </fieldset>
            <fieldset className={styles.deadlineCard} disabled={busy || room.archived} aria-label="Plazo de entrega">
              <h3 className="brujula-authoring-card-title">Plazo de entrega</h3>
              <label title={`Horario del aula: ${room.timezone}`}>
                Fecha y hora límite <small>Opcional</small>
                <input
                  aria-label="Fecha y hora del aula"
                  type="datetime-local"
                  step={60}
                  value={local}
                  onChange={e => {
                    setLocal(e.target.value);
                    setResolution(null);
                    setOffset(null);
                  }}
                />
              </label>
              {resolution?.reason === 'AMBIGUOUS' ? (
                <label>
                  Ocurrencia de la hora repetida
                  <select
                    aria-label="Ocurrencia de la hora repetida"
                    value={offset ?? ''}
                    onChange={e => setOffset(e.target.value === '' ? null : Number(e.target.value))}
                  >
                    <option value="">Selecciona una ocurrencia</option>
                    {resolution.choices.map((choice, i) => (
                      <option key={choice.instant} value={choice.offsetMinutes}>
                        {i + 1} · {choice.offset} · {choice.instant}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="p7-check">
                <input
                  type="checkbox"
                  aria-label="Permitir entregas tardías"
                  checked={allowLate}
                  onChange={e => setLate(e.target.checked)}
                />
                Aceptar entregas fuera de término
              </label>
              {activity.locked ? (
                <button
                  type="button"
                  onClick={() =>
                    void run(async () => {
                      await persistence.current.deadline(draftType, await deadline(), allowLate);
                      setDirty(false);
                    })
                  }
                >
                  Guardar plazo y recepción
                </button>
              ) : null}
            </fieldset>
          </div>
          {draftType !== 'ASSIGNMENT' ? (
            <fieldset
              className={styles.itemWorkspace}
              hidden={contentTab !== 'questions'}
              disabled={busy || locked}
              aria-label="Preguntas"
            >
              <nav className={styles.itemIndex} aria-label="Preguntas de la actividad">
                {questions.map((question, index) => (
                  <button
                    key={question.id ?? index}
                    type="button"
                    aria-current={questionIndex === index ? 'true' : undefined}
                    onClick={() => setQuestionIndex(index)}
                  >
                    <span>{index + 1}</span>
                    {question.prompt.trim() || 'Pregunta sin consigna'}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={questions.length >= 30}
                  onClick={() => {
                    setQuestionIndex(questions.length);
                    setQuestions([
                      ...questions,
                      { type: 'DEVELOPMENT', prompt: '', points: '1', scoringRule: null, options: [] },
                    ]);
                    mark();
                  }}
                >
                  Agregar pregunta
                </button>
              </nav>
              {selectedQuestion ? (
                <QuestionEditor
                  key={questionIndex}
                  question={selectedQuestion}
                  index={questionIndex}
                  update={value => {
                    setQuestions(questions.map((old, index) => (index === questionIndex ? value : old)));
                    mark();
                  }}
                  remove={() => {
                    setQuestions(questions.filter((_, index) => index !== questionIndex));
                    setQuestionIndex(Math.max(0, questionIndex - 1));
                    mark();
                  }}
                />
              ) : (
                <p>Agregá la primera pregunta para empezar.</p>
              )}
            </fieldset>
          ) : null}
          <div className={styles.rubric} hidden={contentTab !== 'rubric'}>
            <EvaluationRubricEditor
              compact
              criteria={evaluationRubric}
              disabled={busy || locked}
              onChange={value => {
                setEvaluationRubric(value);
                mark();
              }}
            />
          </div>
        </div>
        {step === 2 ? (
          <section className="activity-review-summary" aria-label="Revisión del borrador">
            <h4>Vista del estudiante</h4>
            <h3>{title || 'Borrador sin título'}</h3>
            {objective ? (
              <div>
                <h4>Objetivo de aprendizaje</h4>
                <p className="p7-multiline">{objective}</p>
              </div>
            ) : null}
            <div className={styles.instructions}>
              <h4>Qué tenés que hacer</h4>
              <p className="p7-multiline">{instructions || 'Sin consignas escritas.'}</p>
            </div>
            {teacherComment ? (
              <div>
                <h4>Comentario para el aula</h4>
                <p className="p7-multiline">{teacherComment}</p>
              </div>
            ) : null}
            {draftType !== 'ASSIGNMENT' && questions.length ? (
              <div>
                <h4>Preguntas</h4>
                <ol>
                  {questions.map((question, index) => (
                    <li key={question.id ?? index}>
                      <p className="p7-multiline">{question.prompt}</p>
                      {question.options.length ? (
                        <ul>
                          {question.options.map((option, position) => (
                            <li key={option.id ?? position}>{option.text}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <EvaluationRubric criteria={evaluationRubric} />
          </section>
        ) : null}
        {step === 2 ? (
          <aside className="br-authoring-destination">
            <h4>Destino</h4>
            <h3>
              {room.name} · {room.division}
            </h3>
            <h4>Tipo de actividad</h4>
            <p>{activityTypeLabels[draftType]}</p>
            <h4>Alcance en el plan</h4>
            <ul>
              {selectedUnits.map(unit => (
                <li key={unit.id}>
                  <strong>{unit.name}</strong> · {unit.topics.map(topic => topic.name).join(' · ')}
                </li>
              ))}
            </ul>
            <h4>Materiales</h4>
            <p>
              {materials
                .filter(material => materialIds.includes(material.id))
                .map(material => material.title)
                .join(' · ') || 'Sin materiales vinculados'}
            </p>
            <h4>Fecha límite</h4>
            <p>{local ? `${local.replace('T', ' · ')} · ${room.timezone}` : 'Sin fecha límite'}</p>
            <h4>Fuera de plazo</h4>
            <p>{allowLate ? 'Se aceptan entregas tardías' : 'Plazo estricto'}</p>
            {draftType === 'ASSIGNMENT' ? (
              <>
                <h4>Entrega</h4>
                <p>{attachmentRequired ? 'Archivo obligatorio' : 'Archivos opcionales'}</p>
              </>
            ) : null}
          </aside>
        ) : null}
        {step === 2 && draftType !== 'ASSIGNMENT' ? (
          <div className="br-authoring-question-review">
            <button type="button" aria-haspopup="dialog" onClick={() => setReference('answers')}>
              Preguntas y clave docente
            </button>
          </div>
        ) : null}
        <footer className="p5-form-footer">
          {step > 0 ? (
            <button type="button" disabled={busy} onClick={() => setStep(step - 1)}>
              {step === 2 ? 'Volver a editar' : 'Atrás'}
            </button>
          ) : null}
          <button disabled={busy || room.archived}>
            {activity.locked
              ? 'Guardar organización'
              : activity.status === 'DRAFT'
                ? 'Guardar borrador'
                : 'Guardar actividad'}
          </button>
          {step < 2 ? (
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => {
                if (step === 1) review();
                else continueScope();
              }}
            >
              {step === 0 ? (method === 'ai' ? 'Generar propuesta' : 'Continuar') : 'Continuar a revisión'}
            </button>
          ) : null}
          {step === 2 && activity.status === 'DRAFT' ? (
            <button
              type="button"
              className="primary"
              disabled={busy || locked}
              onClick={() => {
                if (review()) setPublishDialog(true);
              }}
            >
              Publicar actividad
            </button>
          ) : null}
        </footer>
      </form>
      {reference === 'idea' && activity.teacherBrief ? (
        <Dialog title="Idea privada para Foxy" onClose={() => setReference(null)}>
          <p className="p7-multiline">{activity.teacherBrief}</p>
        </Dialog>
      ) : null}
      {reference === 'answers' ? (
        <Dialog title="Preguntas y clave docente" onClose={() => setReference(null)}>
          <small>Las respuestas correctas solo están visibles para vos.</small>
          <ol>
            {questions.map((question, index) => (
              <li key={index}>
                <strong>{question.prompt}</strong>
                <p>{question.points} puntos</p>
                <ul>
                  {question.options.map((option, position) => (
                    <li key={position}>
                      {option.text}
                      {option.correct ? <b> · Correcta</b> : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </Dialog>
      ) : null}
      {publishDialog ? (
        <Dialog
          title="Confirmá la publicación"
          onClose={() => {
            if (!busy) setPublishDialog(false);
          }}
        >
          <p>
            <strong>{title}</strong> quedará disponible para estudiantes de {room.name}.
          </p>
          {error ? <Notice error>{error}</Notice> : null}
          <footer className="p5-form-footer">
            <button type="button" disabled={busy} onClick={() => setPublishDialog(false)}>
              Volver a revisar
            </button>
            <button
              type="button"
              className="primary"
              disabled={busy || locked}
              onClick={() =>
                void run(async () => {
                  await saveDraft();
                  await persistence.current.publish(draftType);
                  setPublicationConfirmed(true);
                  await onSaved(true, persistence.current.snapshot().id);
                })
              }
            >
              Asignar al aula
            </button>
          </footer>
        </Dialog>
      ) : null}
      {optionsOpen ? (
        <Dialog title="Ajustes y fuentes para Foxy" onClose={() => setOptionsOpen(false)}>
          {sourcesError ? <Notice error>{sourcesError}</Notice> : null}
          <ActivityGenerationForm
            room={room}
            value={{ ...generationOptions, ...scope, type: draftType, teacherBrief }}
            update={value => {
              setGenerationOptions(value);
              mark();
            }}
            sources={generationSources}
            disabled={busy}
            settingsOnly
          />
          <p>Estos ajustes se usan cuando elegís Generar propuesta. Todavía no se genera contenido.</p>
          <button type="button" onClick={() => setOptionsOpen(false)}>
            Listo
          </button>
        </Dialog>
      ) : null}
      {leaving ? (
        <Dialog
          title="Salir del editor"
          onClose={() => {
            if (!busy) setLeaving(false);
          }}
        >
          <p>Hay cambios sin guardar. Podés seguir editando, guardarlos o salir y descartarlos.</p>
          {error ? <Notice error>{error}</Notice> : null}
          <footer className="p5-form-footer">
            <button type="button" disabled={busy} onClick={() => setLeaving(false)}>
              Seguir editando
            </button>
            <button type="button" disabled={busy} onClick={onClose}>
              Descartar cambios
            </button>
            {!room.archived ? (
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await saveDraft();
                    setLeaving(false);
                    await onSaved(false, persistence.current.snapshot().id);
                  })
                }
              >
                Guardar y salir
              </button>
            ) : null}
          </footer>
        </Dialog>
      ) : null}
    </section>
  );
}
