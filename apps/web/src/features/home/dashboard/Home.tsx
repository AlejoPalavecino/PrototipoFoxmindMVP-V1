'use client';
import { useState, type ReactNode } from 'react';
import type { HomeTarget, HomeResponse } from '../../../../../../src/core/domain/home/home.ts';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { NotificationTarget } from '../../../../../../src/core/contracts/notifications.ts';
import type { Classroom, Draft, Invitation } from '../../../../../../src/core/contracts/classrooms.ts';
import type { HomeAgendaReader } from '../api/home-api.ts';
import type { HomeClient } from '../api/home-api.ts';
import { HomeReferenceIcon as FoxmindIcon } from '../../../../../shared-ui/HomeReferenceIcon.tsx';
import { useHome } from './use-home.ts';
import { HomeRoomPicker } from './HomeRoomPicker.tsx';
import { HomeMiniagenda } from './HomeMiniagenda.tsx';
import { HomePriorities } from '../queue/HomePriorities.tsx';
import { HomeClassCards } from './HomeClassCards.tsx';
import { homeGreetingDate } from '../model/home-presentation.ts';
import { homeRoute, homeUrgent } from '../model/home-expedition.ts';
export interface HomeProps {
  accountRole: 'teacher' | 'student';
  displayName: string;
  subjectId?: string;
  homeClient?: HomeClient;
  agendaClient?: HomeAgendaReader;
  busy?: boolean;
  onCreate: () => void;
  onJoin: () => void;
  teacherSupport?: ReactNode;
  onClassrooms: () => void;
  onAction: (target: HomeTarget) => void;
  onAgenda?: () => void;
  api?: ClassroomClient;
  data?: { teach: Classroom[]; study: Classroom[]; drafts: Draft[]; invitations: Invitation[] } | null;
  onOpenActivities?: (id: string) => void;
  onEnter?: (id: string) => void;
  onOpenTarget?: (target: NotificationTarget) => void;
}
export function Home(props: HomeProps) {
  const { accountRole, displayName, subjectId, homeClient, busy, onAction, onCreate, onJoin, onClassrooms } = props;
  const home = useHome(homeClient, subjectId),
    [creating, setCreating] = useState(false),
    [tab, setTab] = useState<'review' | 'queries'>('review');
  const data = home.data,
    teacher = accountRole === 'teacher',
    onAgenda = props.onAgenda ?? (() => window.location.assign('/agenda'));
  if (home.loading)
    return (
      <section className="fm-home parity-home" aria-busy="true">
        <h1>Hola, {displayName.split(' ')[0]}.</h1>
        <p role="status">Estamos preparando tus próximos pasos…</p>
        <div className="fm-home-skeleton" />
      </section>
    );
  if (!data)
    return (
      <section className="fm-home parity-home fm-home-global-error">
        <h1>Tu inicio</h1>
        <p role="alert">No pudimos cargar tus actividades. Podés volver a intentarlo.</p>
        <button onClick={() => void home.refresh()}>Reintentar</button>
      </section>
    );
  return (
    <section className="fm-home parity-home" aria-label="Inicio">
      <HomeGreeting
        data={data}
        teacher={teacher}
        displayName={displayName}
        onCreate={() => (data.memberships.teach ? setCreating(true) : onCreate())}
        onAction={onAction}
      />
      {data.participation === 'none' ? (
        <div className="parity-home-empty">
          <h2>{data.memberships.archived ? 'Tu historial sigue acá' : 'Tu próximo paso empieza acá'}</h2>
          <p>
            {data.memberships.archived
              ? 'Volvé a tus aulas anteriores para consultar el recorrido y los materiales.'
              : teacher
                ? 'Creá tu primera aula y dale lugar a una nueva idea.'
                : 'Unite al aula de tu docente para empezar a aprender.'}
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={
              data.memberships.archived
                ? onClassrooms
                : teacher
                  ? onCreate
                  : data.setup.invitations
                    ? onClassrooms
                    : onJoin
            }
          >
            {data.memberships.archived
              ? 'Ver mis aulas'
              : teacher
                ? 'Crear mi primera aula'
                : data.setup.invitations
                  ? 'Ver invitaciones'
                  : 'Unirme con código'}
          </button>
        </div>
      ) : null}
      {teacher ? props.teacherSupport : null}
      <div className="home-grid home-dashboard">
        <HomePriorities
          data={data}
          teacher={teacher}
          tab={tab}
          onTab={setTab}
          order={home.orders[tab]}
          onOrder={value => home.changeOrder(tab, value)}
          loading={Boolean(home.ordering[tab])}
          onAction={onAction}
          onRetry={name => void home.retry(name)}
          onList={() => {
            const room =
              data.modules.classrooms.status === 'ready'
                ? data.modules.classrooms.items.find(
                    item => !item.classroom.archived && item.classroom.role === 'student',
                  )
                : undefined;
            if (room && props.onOpenActivities) props.onOpenActivities(room.classroom.id);
            else onClassrooms();
          }}
          busy={busy}
        />
        <HomeMiniagenda
          agendaClient={props.agendaClient}
          data={data}
          teacher={teacher}
          client={homeClient}
          onAction={onAction}
          onAgenda={onAgenda}
          onRetry={() => void home.retry('agenda')}
          onUnauthorized={() => void home.refresh()}
          busy={busy}
        />
      </div>
      <HomeClassCards
        data={data}
        classrooms={[...(props.data?.teach ?? []), ...(props.data?.study ?? [])]}
        onAction={onAction}
        onClassrooms={onClassrooms}
        onRetry={() => void home.retry('classrooms')}
      />
      {creating ? (
        <HomeRoomPicker
          data={data}
          client={homeClient}
          title="¿En qué aula querés crear la actividad?"
          onClose={() => setCreating(false)}
          onClassrooms={onClassrooms}
          onUnauthorized={() => {
            setCreating(false);
            void home.refresh();
          }}
          onSelect={item => {
            setCreating(false);
            onAction({ kind: 'create-activity', classroomId: item.classroom.id });
          }}
        />
      ) : null}
    </section>
  );
}
export function HomeGreeting({
  data,
  teacher,
  displayName,
  onCreate,
  onAction,
}: {
  data: HomeResponse;
  teacher: boolean;
  displayName: string;
  onCreate: () => void;
  onAction: (target: HomeTarget) => void;
}) {
  const page = teacher ? data.modules.review : data.modules.pending,
    count = page.status === 'ready' ? page.totalItems : null;
  const pending = data.modules.pending.status === 'ready' ? data.modules.pending.items : [];
  const first = pending.find(item => item.reception === 'open') ?? pending[0];
  const firstTarget =
    first?.target.kind === 'activity' && first.reception === 'open'
      ? { ...first.target, mode: 'respond' as const }
      : first?.target;
  const route = homeRoute(data),
    urgent = homeUrgent(data, teacher);
  const summary =
    count === null
      ? 'Un espacio para tus ideas y tus próximos pasos.'
      : teacher
        ? count
          ? `Tenés ${count} ${count === 1 ? 'entrega' : 'entregas'} para revisar. Vamos de a una.`
          : 'Tus entregas están al día. Hay espacio para una nueva idea.'
        : count
          ? `Tenés ${count} ${count === 1 ? 'actividad' : 'actividades'} para seguir aprendiendo.`
          : 'Tus actividades están al día. Seguí explorando a tu ritmo.';
  return (
    <header className={`home-welcome ${teacher ? 'for-teacher' : 'for-student'}`}>
      <div className="home-welcome-copy">
        <p className="home-date">
          <FoxmindIcon name="calendar" />
          <time dateTime={data.generatedAt}>{homeGreetingDate(data.generatedAt, data.timeZone)}</time>
        </p>
        <h1>
          {teacher ? 'Hola' : 'Buen día'}, {displayName.trim().split(/\s+/)[0]}.
        </h1>
        <p className="home-summary">{summary}</p>
        {route.length ? (
          <ol className="home-route" aria-label="Lo que sigue hoy">
            {route.map(stop => (
              <li key={stop.id}>
                <span className="home-route-time">{stop.time}</span>
                <span className="home-route-title">{stop.title}</span>
              </li>
            ))}
          </ol>
        ) : null}
        <div className="home-welcome-actions">
          {teacher ? (
            <>
              <button className="button primary" onClick={onCreate}>
                <FoxmindIcon name="plus" />
                {data.memberships.teach ? 'Crear actividad' : 'Crear aula'}
              </button>
              <a className="button home-secondary" href="/foxy-ai">
                <FoxmindIcon name="spark" />
                Preparar con Foxy
              </a>
            </>
          ) : (
            <>
              {firstTarget ? (
                <button className="button primary" onClick={() => onAction(firstTarget)}>
                  <FoxmindIcon name="play" />
                  {first.reception === 'open' ? 'Continuar actividad' : 'Consultar actividad'}
                </button>
              ) : null}
              <a className="button home-secondary" href="/carpetas-de-estudio">
                <FoxmindIcon name="folder" />
                Mi estudio
              </a>
            </>
          )}
        </div>
      </div>
      {urgent ? (
        <p className="home-bubble">
          <small>{urgent.label}</small>
          {urgent.text}
        </p>
      ) : null}
      <div className="home-illustration" aria-hidden="true">
        <img
          className="home-fox"
          src="/brujula/foxy-bienvenida.webp"
          alt=""
          width="490"
          height="636"
          fetchPriority="high"
        />
      </div>
    </header>
  );
}
