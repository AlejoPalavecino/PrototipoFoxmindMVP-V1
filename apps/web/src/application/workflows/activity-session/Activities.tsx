'use client';
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import type { AcademicTarget } from '../../../../../../src/core/contracts/notifications.ts';
import type { ActivityData, ActivitySummary } from '../../../../../../src/core/contracts/activities.ts';
import type { AttemptSessionData } from '../../../../../../src/core/contracts/participation.ts';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import type { ProgressData } from '../../../../../../src/core/contracts/grading.ts';
import type { Material } from '../../../../../../src/core/contracts/materials.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import type { GenerationFormValue } from '../../../features/activity-authoring/index.ts';
import { ActivityAuthoring, activityTypeLabels } from '../../../features/activity-authoring/index.ts';
import { ActivityGeneration } from '../../../features/activity-authoring/index.ts';
import { createActivityAuthoringApi } from '../../../features/activity-authoring/api.ts';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';
import styles from './activity-session.module.css';
import { ActivityCurriculum } from './ActivityCurriculum.tsx';
import { AttemptHistory } from './AttemptHistory.tsx';
import { AttemptSession, FirstSubmissionAuthorization } from './AttemptSession.tsx';
import { openActivitySession } from '../../../features/participation/index.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { localActivityDraft } from '../../../features/activity-authoring/index.ts';
import { consumeActivityResponse } from '../../../features/participation/index.ts';

const teacherViews = [
  { key: 'PUBLISHED', label: 'Compartidas' },
  { key: 'DRAFT', label: 'Borradores privados' },
  { key: 'WITHDRAWN', label: 'Retiradas' },
] as const;
const studentStateLabels = {
  PENDING: 'Para empezar',
  CLOSED: 'Plazo cerrado',
  DRAFT: 'Borrador guardado',
  RESUBMISSION: 'Reentrega habilitada',
  SUBMITTED: 'Entrega recibida',
  REVIEWED: 'Devolución publicada',
  READ_ONLY: 'Solo consulta',
};

export function Activities({
  api,
  room,
  reload,
  target,
  onChanged,
  openAuthoring,
  submissionFilter,
  creationContext,
  onCreationContextConsumed,
  active = true,
}: {
  api: ClassroomClient;
  room: Detail;
  reload: () => Promise<void>;
  target?: AcademicTarget | null;
  onChanged?: () => void;
  openAuthoring?: boolean;
  submissionFilter?: 'unpublished';
  creationContext?: ClassroomCreationContext | null;
  onCreationContextConsumed?: () => void;
  active?: boolean;
}) {
  const authoringApi = useMemo(() => createActivityAuthoringApi(api, room.id), [api, room.id]);
  const [assignment, setAssignment] = useState<ClassroomCreationContext>(
    creationContext ?? { unitId: '', topicIds: [] },
  );
  const [editorContext, setEditorContext] = useState<ClassroomCreationContext | null>(null);
  const [editorReview, setEditorReview] = useState(false);
  const seenCreationContext = useRef<ClassroomCreationContext | null>(null);
  const [pendingCreationContext, setPendingCreationContext] = useState<ClassroomCreationContext | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationStart, setGenerationStart] = useState<GenerationFormValue | null>(null);
  const [editorContent, setEditorContent] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [activities, setActivities] = useState<ActivitySummary[]>([]),
    [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<ActivityData | null>(null),
    [preview, setPreview] = useState<ActivityData | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [consultation, setConsultation] = useState<AttemptSessionData | null>(null);
  const [session, setSession] = useState<AttemptSessionData | null>(null),
    [authorization, setAuthorization] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: 'publish' | 'withdraw'; activity: ActivitySummary } | null>(null);
  const [history, setHistory] = useState<{
    activityId: string;
    attemptId?: string | null;
    filter?: 'unpublished';
    initialView?: 'overview' | 'history';
  } | null>(null);
  const [view, setView] = useState<(typeof teacherViews)[number]['key']>('PUBLISHED');
  const handledTarget = useRef<AcademicTarget | null>(null);
  const responseRequest = useRef<AbortController | null>(null);
  const responseEpoch = useRef(0);
  function cancelResponse() {
    responseRequest.current?.abort();
    responseEpoch.current++;
  }
  function closeResponse() {
    cancelResponse();
    setSession(null);
    setHistory(null);
    setPreview(null);
    setConsultation(null);
  }
  useEffect(
    () => () => {
      responseRequest.current?.abort();
    },
    [active],
  );
  useEffect(() => {
    if (!active) {
      setChoosing(false);
      setConsultation(null);
      setPreview(null);
      setHistory(null);
      setAuthorization(null);
      setConfirm(null);
    }
  }, [active]);
  const teacher = room.role === 'teacher',
    writable = teacher && !room.archived;
  const visibleActivities = teacher ? activities.filter(activity => activity.status === view) : activities;
  const [deliveryCounts, setDeliveryCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!teacher || !loaded) return;
    const controller = new AbortController();
    void api
      .call<ProgressData>(`/${room.id}/progress`, 'GET', undefined, controller.signal)
      .then(progress => {
        if (controller.signal.aborted || progress.scope !== 'classroom') return;
        const counts: Record<string, number> = Object.fromEntries(activities.map(activity => [activity.id, 0]));
        for (const student of progress.students)
          for (const activity of student.activities) {
            if (activity.firstSubmission) counts[activity.id] = (counts[activity.id] ?? 0) + 1;
          }
        setDeliveryCounts(counts);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDeliveryCounts({});
      });
    return () => controller.abort();
  }, [api, room.id, teacher, loaded, activities]);
  const visibility = useRef({ active });
  if (visibility.current.active !== active) visibility.current = { active };
  useEffect(() => {
    if (!creationContext || seenCreationContext.current === creationContext) return;
    seenCreationContext.current = creationContext;
    if (editing || generating) setPendingCreationContext(creationContext);
    else {
      setAssignment({ ...creationContext, topicIds: [...creationContext.topicIds] });
      setChoosing(true);
    }
  }, [creationContext, editing, generating]);
  const libraryDraftContext = useEffectEvent(() => ({ assignment, room, consumed: onCreationContextConsumed }));
  useEffect(() => {
    if (!choosing || !writable || !active) return;
    const controller = new AbortController();
    const { assignment: chosen, room: current, consumed } = libraryDraftContext();
    setError('');
    void api
      .call<Material[]>(`/${room.id}/library`, 'GET', undefined, controller.signal)
      .then(library => {
        if (controller.signal.aborted) return;
        setMaterials(library);
        setEditorContext({ ...chosen, topicIds: [...chosen.topicIds] });
        setEditorReview(false);
        setEditorContent(false);
        setEditing(localActivityDraft(current, 'ASSIGNMENT'));
        setChoosing(false);
        consumed?.();
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setError(error.message);
          setChoosing(false);
        }
      });
    return () => controller.abort();
  }, [choosing, writable, active, api, room.id]);
  useEffect(() => {
    if (active && openAuthoring && writable) setChoosing(true);
  }, [active, openAuthoring, writable]);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const result = await api.call<{ activities: ActivitySummary[] }>(
        `/${room.id}/activities`,
        'GET',
        undefined,
        signal,
      );
      if (signal?.aborted) return;
      setActivities(result.activities);
      setLoaded(true);
    },
    [api, room.id],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch(e => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    if (!target) {
      handledTarget.current = null;
      cancelResponse();
      return;
    }
    if (!active || handledTarget.current === target) return;
    handledTarget.current = target;
    cancelResponse();
    const controller = new AbortController();
    responseRequest.current = controller;
    setSession(null);
    setConsultation(null);
    setPreview(null);
    setHistory(null);
    setError('');
    if (target.kind !== 'activity')
      setHistory({ activityId: target.activityId, attemptId: target.attemptId, filter: submissionFilter });
    else if (teacher)
      void api
        .call<ActivityData>(`/${room.id}/activities/${target.activityId}/preview`, 'GET', undefined, controller.signal)
        .then(async data => {
          if (controller.signal.aborted) return;
          if (data.activity.status === 'DRAFT' && writable) {
            const library = await api.call<Material[]>(`/${room.id}/library`, 'GET', undefined, controller.signal);
            if (!controller.signal.aborted) {
              setEditorReview(false);
              setEditorContext(null);
              setMaterials(library);
              setEditing(data);
            }
          } else {
            setPreview(data);
            setHistory({ activityId: data.activity.id });
          }
        })
        .catch(e => {
          if (!controller.signal.aborted) setError(e.message);
        });
    else if (target.mode === 'respond' && consumeActivityResponse(room.id, target.activityId))
      void openActivitySession(api, room.id, target.activityId, controller.signal)
        .then(data => {
          if (!controller.signal.aborted) setSession(data);
        })
        .catch(e => {
          if (!controller.signal.aborted) setError(e.message);
        });
    else
      void api
        .call<AttemptSessionData>(
          `/${room.id}/activities/${target.activityId}/session`,
          'GET',
          undefined,
          controller.signal,
        )
        .then(data => {
          if (!controller.signal.aborted) {
            setConsultation(data);
            setHistory({ activityId: target.activityId });
          }
        })
        .catch(e => {
          if (!controller.signal.aborted) setError(e.message);
        });
    return () => controller.abort();
  }, [api, room.id, submissionFilter, target, teacher, writable, active]);
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function refresh(signal?: AbortSignal) {
    await Promise.all([reload(), load(signal)]);
    if (!signal?.aborted) onChanged?.();
  }
  async function edit(id: string, signal?: AbortSignal, review = false) {
    const origin = visibility.current;
    const [data, library] = await Promise.all([
      api.call<ActivityData>(`/${room.id}/activities/${id}/preview`, 'GET', undefined, signal),
      api.call<Material[]>(`/${room.id}/library`, 'GET', undefined, signal),
    ]);
    if (signal?.aborted || visibility.current !== origin || !origin.active) return;
    setEditorReview(review);
    setEditorContent(false);
    setMaterials(library);
    setEditing(data);
  }
  async function showPreview(id: string) {
    cancelResponse();
    const controller = new AbortController();
    responseRequest.current = controller;
    const origin = visibility.current;
    const result = await api.call<ActivityData>(
      `/${room.id}/activities/${id}/preview`,
      'GET',
      undefined,
      controller.signal,
    );
    if (controller.signal.aborted || visibility.current !== origin || !origin.active) return;
    setPreview(result);
    setHistory({ activityId: id });
    setSession(null);
    setConsultation(null);
    setEditing(null);
    setEditorContext(null);
  }
  async function openEditor(id: string, review = false) {
    cancelResponse();
    const controller = new AbortController();
    responseRequest.current = controller;
    await edit(id, controller.signal, review);
    if (!controller.signal.aborted) {
      setEditorContext(null);
      setHistory(null);
      setPreview(null);
      setConsultation(null);
    }
  }
  async function prepare(id: string, consultOnly = false) {
    responseRequest.current?.abort();
    const controller = new AbortController();
    responseRequest.current = controller;
    const origin = visibility.current,
      next = await openActivitySession(api, room.id, id, controller.signal);
    if (controller.signal.aborted || visibility.current !== origin || !origin.active) return;
    if (consultOnly) {
      setConsultation(next);
      setHistory({ activityId: id });
      setSession(null);
    } else {
      setSession(next);
      setHistory(null);
    }
    await refresh(controller.signal);
  }
  const detailOpen = Boolean(session || history || preview);
  const editorEpoch = responseEpoch.current,
    editorOrigin = visibility.current;
  return (
    <section
      className={`p7-activities act-page ${styles.activityWorkspace}${editing || generating ? ' education-task-active' : ''}`}
      aria-label="Actividades del aula"
      data-activity-focus={active && (editing || generating || detailOpen) ? '' : undefined}
    >
      {!editing && !generating && !detailOpen ? (
        <header className="p5-section-head fm-desk-activities-heading act-heading">
          <div>
            <h2>{teacher ? 'Ideas que se ponen en práctica' : 'Tu próxima oportunidad de aprender'}</h2>
            <p>
              {teacher
                ? 'Prepará propuestas y acompañá cada entrega.'
                : 'Leé la consigna, probá tus ideas y compartí lo que aprendiste.'}
            </p>
          </div>
          <div className="p5-actions">
            {writable ? (
              <button
                className="primary"
                disabled={busy}
                onClick={() => {
                  cancelResponse();
                  setNotice('');
                  setChoosing(true);
                }}
              >
                <FoxmindIcon name="plus" />
                Crear actividad
              </button>
            ) : null}
          </div>
        </header>
      ) : null}
      {error ? <Notice error>{error} Los cambios no confirmados no se consideran guardados.</Notice> : null}
      {notice && !editing ? <Notice>{notice}</Notice> : null}
      {!loaded && !error ? <Notice>Cargando actividades…</Notice> : null}
      {openAuthoring && !writable ? (
        <Notice>No podés crear actividades en esta aula con tus permisos actuales.</Notice>
      ) : null}
      {active && choosing ? <Notice>Preparando tu espacio de trabajo…</Notice> : null}
      {generating && writable ? (
        <ActivityGeneration
          api={authoringApi.generation}
          room={room}
          creationContext={assignment}
          initialRequest={generationStart ?? undefined}
          onClose={() => {
            setGenerating(false);
            setGenerationStart(null);
          }}
          onApplied={async (id, signal) => {
            await refresh(signal);
            if (signal.aborted) return;
            setEditorContext(null);
            await edit(id, signal);
            if (!signal.aborted) {
              setEditorContent(true);
              setGenerating(false);
              setGenerationStart(null);
            }
          }}
        />
      ) : null}
      {editing ? (
        <ActivityAuthoring
          key={editing.activity.id}
          api={authoringApi}
          room={room}
          data={editing}
          materials={materials}
          creationContext={editorContext}
          initialReview={editorReview}
          initialContent={editorContent}
          onGenerate={value => {
            setGenerationStart(value);
            setEditing(null);
            setGenerating(true);
          }}
          onSaved={async (assigned, id) => {
            if (editorEpoch !== responseEpoch.current || editorOrigin !== visibility.current || !editorOrigin.active)
              return;
            await refresh();
            if (editorEpoch !== responseEpoch.current || editorOrigin !== visibility.current || !editorOrigin.active)
              return;
            setNotice(
              assigned
                ? `Actividad asignada a ${room.name}.`
                : editing.activity.status === 'DRAFT'
                  ? 'Borrador privado guardado.'
                  : 'Cambios guardados.',
            );
            if (id) await showPreview(id);
          }}
          onClose={() => {
            cancelResponse();
            setEditing(current => (current === editing ? null : current));
            setEditorContext(null);
          }}
        />
      ) : null}
      {teacher && loaded && !editing && !generating && !detailOpen ? (
        <div className="fm-desk-activity-filters" role="group" aria-label="Filtrar actividades por estado">
          {teacherViews
            .filter(item => item.key !== 'WITHDRAWN' || activities.some(activity => activity.status === 'WITHDRAWN'))
            .map(({ key, label }) => (
              <button type="button" key={key} aria-pressed={view === key} onClick={() => setView(key)}>
                {label}
                <span>{activities.filter(activity => activity.status === key).length}</span>
              </button>
            ))}
        </div>
      ) : null}
      <div
        className={`p7-activity-list fm-desk-activity-list act-list ${styles.activityList}`}
        hidden={Boolean(editing || generating || detailOpen)}
      >
        {loaded && visibleActivities.length === 0 ? (
          <div className="p5-empty" role="status">
            <h3>
              {teacher && view === 'DRAFT'
                ? 'Tus próximas ideas tienen lugar acá'
                : teacher && view === 'WITHDRAWN'
                  ? 'No hay actividades retiradas'
                  : 'El próximo desafío está por venir'}
            </h3>
            <p>
              {teacher && view === 'DRAFT'
                ? 'Guardá una actividad y retomá sin compartirla todavía.'
                : teacher
                  ? 'Prepará la primera actividad para tu grupo.'
                  : 'Tu docente va a compartir las actividades en este espacio.'}
            </p>
            {writable && view !== 'WITHDRAWN' ? (
              <button className="primary" onClick={() => setChoosing(true)}>
                <FoxmindIcon name="plus" />
                Crear actividad
              </button>
            ) : null}
          </div>
        ) : null}
        {visibleActivities.map(activity => {
          const state = activity.studentState ?? 'PENDING';
          const privateDraft = teacher && activity.status === 'DRAFT';
          const statusLabel = teacher
            ? activity.status === 'DRAFT'
              ? 'Sólo vos · Borrador'
              : activity.status === 'WITHDRAWN'
                ? 'Retirada'
                : 'Compartida'
            : studentStateLabels[state];
          const actionLabel = teacher
            ? activity.status === 'DRAFT' && writable
              ? 'Seguir creando'
              : 'Ver actividad'
            : 'Abrir actividad';
          const tone = teacher
            ? activity.status === 'PUBLISHED'
              ? 'confirmed'
              : activity.status === 'WITHDRAWN'
                ? 'neutral'
                : undefined
            : state === 'REVIEWED'
              ? 'confirmed'
              : state === 'SUBMITTED' || state === 'PENDING'
                ? 'informational'
                : state === 'CLOSED' || state === 'READ_ONLY'
                  ? 'neutral'
                  : undefined;
          return (
            <article
              className={`folder-row act-line parity-activity-card interior-activity-${activity.status.toLowerCase()}${activity.pendingReviewCount ? ' has-pending-review' : ''}`}
              data-student-state={teacher ? undefined : (activity.studentState ?? 'PENDING')}
              key={activity.id}
              aria-label={activity.title ?? 'Borrador sin título'}
            >
              <span className={`interior-activity-icon activity-type-${activity.type.toLowerCase()}`}>
                <FoxmindIcon
                  name={
                    privateDraft
                      ? 'edit'
                      : activity.type === 'ASSIGNMENT'
                        ? 'attach'
                        : activity.type === 'EVALUATION'
                          ? 'clipboard'
                          : 'edit'
                  }
                />
                {!privateDraft ? (
                  <small>
                    {activity.type === 'ASSIGNMENT'
                      ? 'Archivo'
                      : activity.type === 'EVALUATION'
                        ? 'Evaluar'
                        : 'Explorar'}
                  </small>
                ) : null}
              </span>
              <div className="folder-row-content">
                <div className={styles.rowTags}>
                  {!privateDraft ? (
                    <small className="interior-activity-type">{activityTypeLabels[activity.type]}</small>
                  ) : null}
                  <span className={styles.state} data-tone={tone}>
                    {statusLabel}
                  </span>
                </div>
                <h3>{activity.title ?? 'Tu próxima actividad'}</h3>
                {privateDraft ? (
                  <p>{activityTypeLabels[activity.type]} · Propuesta en preparación</p>
                ) : (
                  <ActivityCurriculum room={room} activity={activity} />
                )}
                {!privateDraft ? (
                  <>
                    <p className="classroom-activity-deadline">
                      <FoxmindIcon name="calendar" />
                      {activity.deadlineAt
                        ? new Intl.DateTimeFormat('es-AR', { timeZone: activity.zone, day: 'numeric', month: 'short' })
                            .format(new Date(activity.deadlineAt))
                            .replaceAll('.', '')
                        : 'Sin fecha límite'}
                      {teacher && deliveryCounts[activity.id] !== undefined ? (
                        <span>
                          <FoxmindIcon name="users" />
                          {deliveryCounts[activity.id]} {deliveryCounts[activity.id] === 1 ? 'entrega' : 'entregas'}
                        </span>
                      ) : null}
                    </p>
                  </>
                ) : null}
              </div>
              <div className="p5-actions folder-row-actions">
                <button
                  className="act-open"
                  disabled={busy}
                  aria-label={`Abrir ${activity.title ?? 'borrador sin título'}`}
                  onClick={() =>
                    void run(async () => {
                      if (teacher && writable && activity.status === 'DRAFT') {
                        await openEditor(activity.id);
                        return;
                      }
                      cancelResponse();
                      const controller = new AbortController();
                      responseRequest.current = controller;
                      const epoch = responseEpoch.current,
                        origin = visibility.current;
                      if (teacher) {
                        const result = await api.call<ActivityData>(
                          `/${room.id}/activities/${activity.id}/preview`,
                          'GET',
                          undefined,
                          controller.signal,
                        );
                        if (epoch === responseEpoch.current && visibility.current === origin && origin.active) {
                          setPreview(result);
                          setHistory({ activityId: activity.id, initialView: 'overview' });
                        }
                        return;
                      }
                      const next = await api.call<AttemptSessionData>(
                        `/${room.id}/activities/${activity.id}/session`,
                        'GET',
                        undefined,
                        controller.signal,
                      );
                      if (epoch === responseEpoch.current && visibility.current === origin && origin.active) {
                        setConsultation(next);
                        setHistory({ activityId: activity.id, initialView: 'overview' });
                      }
                    })
                  }
                >
                  <FoxmindIcon name="arrow-right" />
                  {actionLabel}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {active && history ? (
        <AttemptHistory
          key={history.activityId + (history.attemptId ?? '') + (history.filter ?? '')}
          api={api}
          room={room}
          activityId={history.activityId}
          attemptId={history.attemptId}
          filter={teacher ? history.filter : undefined}
          initialView={history.initialView}
          activityPreview={preview?.activity ?? consultation?.activity}
          instructionsLocked={
            !teacher && consultation?.activity.type === 'ASSIGNMENT' && consultation.canStart && !consultation.attempt
          }
          effectiveDeadlineAt={teacher ? undefined : consultation?.reception?.deadlineAt}
          onReview={
            writable && preview?.activity.status === 'DRAFT'
              ? () => void run(() => openEditor(preview.activity.id, true))
              : undefined
          }
          actions={
            !teacher && consultation && (consultation.canStart || consultation.canTransfer) ? (
              <div className="brujula-activity-options">
                {consultation.activity.type === 'ASSIGNMENT' && !consultation.attempt ? (
                  <button disabled={busy} onClick={() => void run(() => prepare(consultation.activity.id, true))}>
                    Ver consigna
                  </button>
                ) : null}
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (consultation.editor && consultation.attempt) {
                        setSession(consultation);
                        setHistory(null);
                      } else await prepare(consultation.activity.id);
                    })
                  }
                >
                  {consultation.attempt
                    ? 'Continuar borrador'
                    : consultation.activity.type === 'ASSIGNMENT'
                      ? 'Preparar entrega'
                      : 'Empezar actividad'}
                </button>
              </div>
            ) : writable && preview ? (
              <div className="brujula-activity-options">
                <button disabled={busy} onClick={() => void run(() => openEditor(preview.activity.id))}>
                  {preview.activity.status === 'DRAFT' ? 'Editar borrador' : 'Editar actividad'}
                </button>
                {preview.activity.status !== 'DRAFT' ? (
                  <>
                    <button disabled={busy} onClick={() => setAuthorization(preview.activity.id)}>
                      Habilitar primera entrega
                    </button>
                    {!preview.activity.locked ? (
                      <button
                        disabled={busy}
                        onClick={() =>
                          setConfirm({
                            activity: preview.activity,
                            action: preview.activity.status === 'PUBLISHED' ? 'withdraw' : 'publish',
                          })
                        }
                      >
                        {preview.activity.status === 'PUBLISHED' ? 'Retirar actividad' : 'Publicar'}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null
          }
          onClose={closeResponse}
          onChanged={refresh}
          onResume={setSession}
        />
      ) : null}
      {session ? (
        <div hidden={!active}>
          <AttemptSession
            active={active}
            key={session.activity.id}
            api={api}
            room={room}
            initial={session}
            onClose={closeResponse}
            onChanged={refresh}
            onViewResult={attemptId => {
              setHistory({ activityId: session.activity.id, attemptId });
              setSession(null);
            }}
          />
        </div>
      ) : null}
      {active && authorization ? (
        <FirstSubmissionAuthorization
          api={api}
          room={room}
          activityId={authorization}
          onClose={() => setAuthorization(null)}
          onChanged={refresh}
        />
      ) : null}
      {active && pendingCreationContext ? (
        <Dialog
          title="Preparar otra actividad"
          onClose={() => {
            setPendingCreationContext(null);
            onCreationContextConsumed?.();
          }}
        >
          <p>
            Ya tenés una actividad abierta. Para conservar sus cambios locales, volvé y guardalos antes de preparar
            otra. Los borradores ya guardados y las generaciones iniciadas se conservan.
          </p>
          <button
            disabled={busy}
            onClick={() => {
              setPendingCreationContext(null);
              onCreationContextConsumed?.();
            }}
          >
            Volver a la actividad abierta
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setEditing(null);
              setGenerating(false);
              setChoosing(true);
              setEditorContext(null);
              setAssignment(pendingCreationContext);
              setPendingCreationContext(null);
              setPreview(null);
              setHistory(null);
              onCreationContextConsumed?.();
            }}
          >
            Descartar cambios locales y continuar
          </button>
        </Dialog>
      ) : null}
      {active && confirm ? (
        <Dialog
          title={confirm.action === 'publish' ? 'Publicar actividad' : 'Retirar actividad'}
          onClose={() => !busy && setConfirm(null)}
        >
          <p>
            {confirm.action === 'publish'
              ? 'La actividad guardada será visible para los estudiantes. Los cambios que no hayas guardado en el editor no se publicarán.'
              : 'La actividad dejará de estar visible para estudiantes. Solo se permite antes de la primera participación.'}
          </p>
          {error ? <Notice error>{error}</Notice> : null}
          <footer className="p5-form-footer">
            <button disabled={busy} onClick={() => setConfirm(null)}>
              Cancelar
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await api.call(`/${room.id}/activities`, 'POST', {
                    revision: room.revision,
                    operation: { action: confirm.action, id: confirm.activity.id },
                  });
                  setEditing(null);
                  setConfirm(null);
                  await refresh();
                  setNotice('Estado de publicación confirmado.');
                })
              }
            >
              {confirm.action === 'publish' ? 'Confirmar publicación' : 'Confirmar retiro'}
            </button>
          </footer>
        </Dialog>
      ) : null}
    </section>
  );
}
