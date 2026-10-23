'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Classroom, ClassroomClient, ClassroomNotification, Draft, Invitation, NotificationTarget } from './api.ts';
import { Cover, Notice } from './components.tsx';
import { EntryIcon } from '../shared-ui/EntryIcon';

interface HomeData {
  teach: Classroom[];
  study: Classroom[];
  drafts: Draft[];
  invitations: Invitation[];
}

const newsLabels: Record<ClassroomNotification['eventType'], string> = {
  WALL_NOTICE: 'Nuevo aviso del docente', WALL_QUERY: 'Nueva consulta de estudiante', WALL_REPLY: 'Respuesta a tu publicación',
  ACTIVITY_PUBLISHED: 'Nueva actividad publicada', ACTIVITY_DEADLINE_CHANGED: 'Cambio de plazo o recepción',
  FIRST_SUBMISSION_ENABLED: 'Primera entrega habilitada', ATTEMPT_REOPENED: 'Nuevo intento habilitado',
  SUBMISSION_RECEIVED: 'Nueva entrega recibida', GRADE_PUBLISHED: 'Calificación publicada', GRADE_CORRECTED: 'Calificación corregida',
};

/** Home is a view of current authorized data, never a second role or membership source. */
export function Home({ displayName, data, busy, onCreate, onJoin, onClassrooms, onEnter, api, onOpenTarget }: {
  displayName: string;
  data: HomeData | null;
  busy: boolean;
  onCreate: () => void;
  onJoin: () => void;
  onClassrooms: () => void;
  onEnter: (id: string) => void;
  api: ClassroomClient;
  onOpenTarget: (target: NotificationTarget) => void;
}) {
  const [news, setNews] = useState<ClassroomNotification[] | null>(null);
  const [error, setError] = useState(''), [newsBusy, setNewsBusy] = useState(false);
  const loadNews = useCallback(async (signal?: AbortSignal) => {
    const items = await api.call<ClassroomNotification[]>('/notifications', 'GET', undefined, signal);
    setNews(items); setError('');
  }, [api]);
  useEffect(() => {
    const controller = new AbortController();
    void loadNews(controller.signal).catch(failure => {
      if (!controller.signal.aborted) { setNews(null); setError(failure.message); }
    });
    return () => controller.abort();
  }, [loadNews]);
  async function run(work: () => Promise<void>) {
    if (newsBusy) return;
    setNewsBusy(true); setError('');
    try { await work(); }
    catch (failure) { setNews(null); setError((failure as Error).message); }
    finally { setNewsBusy(false); }
  }
  return <section className="p9-home" aria-label="Inicio">
    <header className="entry-home-greeting folder-home-greeting">
      <div>
        <h1>Hola, {displayName}</h1>
        <p className="entry-home-lead">Continúa con tus aulas.</p>
        {data ? <small>{data.teach.length} {data.teach.length === 1 ? 'aula en Enseño' : 'aulas en Enseño'} y {data.study.length} {data.study.length === 1 ? 'aula en Estudio' : 'aulas en Estudio'}.</small> : null}
      </div>
      <img className="folder-home-foxy" src="/folders/foxy-reading.png" alt="" width="240" height="240" />
    </header>
    {data ? <>
      <section className="entry-classrooms" aria-label="Tus aulas">
      <div className="p5-section-head"><h2>Tus aulas</h2><div className="p5-actions">
        <button disabled={busy} onClick={onCreate}><EntryIcon name="plus-circle-fill" />Crear aula</button>
        <button disabled={busy} onClick={onJoin}><EntryIcon name="people-fill" />Unirse con código</button>
      </div></div>
      {data.teach.length + data.study.length === 0 ? <p className="entry-empty">Aún no tienes aulas. Crea una para enseñar o únete con un código para empezar a aprender.</p> : null}
      <div className="folder-columns">{(['study', 'teach'] as const).map(kind => <section className={`p5-classroom-group folder-panel tone-${kind === 'teach' ? 'coral' : 'mint'}`} key={kind} aria-label={kind === 'teach' ? 'Enseño' : 'Estudio'}>
        <h2 className="folder-tab"><EntryIcon name={kind === 'teach' ? 'people-fill' : 'book'} />{kind === 'teach' ? 'Enseño' : 'Estudio'}</h2>
        {data[kind].length ? <div className="folder-rows">{data[kind].map(room => <article className="folder-row" key={room.id}>
          <Cover kind={room.coverKey} />
          <div>
            <h3>{room.name}</h3>
            {room.archived ? <span className="p5-tag">Archivada · Solo lectura</span> : null}
            <p>{room.subject}</p><p>{room.division} · Ciclo lectivo {room.academicYear}</p>
            <p>Docente: {room.teacher}</p>
            <button className="primary" disabled={busy} onClick={() => onEnter(room.id)}><EntryIcon name="book" />Entrar al aula<EntryIcon name="arrow-right" /></button>
          </div>
        </article>)}</div> : data.teach.length + data.study.length > 0 ? <p className="p5-empty">{kind === 'teach' ? 'Aún no creaste un aula. Comparte lo que sabes creando la primera.' : 'Aún no estudias en un aula. Usa un código o acepta una invitación desde Mis Aulas.'}</p> : null}
      </section>)}</div>
      </section>
      {(data.drafts.length > 0 || data.invitations.length > 0) ? <section className="p9-home-pending folder-panel tone-yellow" aria-label="Pendientes">
        <h2 className="folder-tab">Pendientes</h2>
        <p>{data.drafts.length} {data.drafts.length === 1 ? 'borrador privado' : 'borradores privados'} · {data.invitations.length} {data.invitations.length === 1 ? 'invitación pendiente' : 'invitaciones pendientes'}</p>
        <button disabled={busy} onClick={onClassrooms}>Ver borradores e invitaciones</button>
      </section> : null}
    </> : null}
    <section id="novedades" className="p9-home-news folder-panel tone-yellow" aria-label="Novedades" aria-busy={newsBusy}>
      <h2 className="folder-tab">Novedades</h2>
      <div className="p5-section-head"><button disabled={newsBusy} onClick={() => void run(() => loadNews())}>Actualizar novedades</button></div>
      <p>Avisos, actividades y resultados de tus aulas. El acceso se comprueba al abrir cada novedad.</p>
      {error ? <Notice error>{error} <button disabled={newsBusy} onClick={() => void run(() => loadNews())}>Reintentar novedades</button></Notice> : null}
      {!news && !error ? <Notice>Cargando novedades…</Notice> : null}
      {news?.length === 0 ? <p>No hay novedades disponibles.</p> : null}
      <ul>{news?.slice(0, 5).map(item => <li key={item.id} className={item.readAt ? '' : 'entry-news-unread'}>
        <div><h3>{newsLabels[item.eventType]}</h3><p>{item.classroomName}</p>
          <small><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('es-AR')}</time> · {item.readAt ? 'Leída' : 'Sin leer'}</small>
        </div>
        <button disabled={newsBusy} onClick={() => void run(async () => {
          const target = await api.call<NotificationTarget>(`/notifications/${item.id}/open`, 'POST', {});
          onOpenTarget(target);
        })}>Abrir novedad</button>
      </li>)}</ul>
    </section>
  </section>;
}
