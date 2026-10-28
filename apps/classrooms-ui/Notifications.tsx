'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ClassroomClient, ClassroomNotification, NotificationTarget } from './api.ts';
import { Dialog, Notice } from './components.tsx';
import { EntryIcon } from '../shared-ui/EntryIcon';

const labels = { WALL_NOTICE: 'Nuevo aviso del docente', WALL_QUERY: 'Nueva consulta de estudiante', WALL_REPLY: 'Respuesta a tu publicación',
  ACTIVITY_PUBLISHED: 'Nueva actividad publicada', ACTIVITY_DEADLINE_CHANGED: 'Cambio de plazo o recepción',
  FIRST_SUBMISSION_ENABLED: 'Primera entrega habilitada', ATTEMPT_REOPENED: 'Nuevo intento habilitado', SUBMISSION_RECEIVED: 'Nueva entrega recibida', GRADE_PUBLISHED: 'Calificación publicada', GRADE_CORRECTED: 'Calificación corregida' };
type Destination = { onOpen: (target: NotificationTarget) => void; onSelect?: never }
  | { onSelect: (notificationId: string) => void; onOpen?: never };
export function Notifications({ api, refresh, onOpen, onSelect }: { api: ClassroomClient; refresh: number } & Destination) {
  const [items, setItems] = useState<ClassroomNotification[] | null>(null), [open, setOpen] = useState(false);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    setItems(await api.call<ClassroomNotification[]>('/notifications', 'GET', undefined, signal));
  }, [api]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [load, refresh]);
  async function run(work: () => Promise<void>) {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const unread = items?.filter(item => !item.readAt).length ?? 0;
  const visible = items?.filter(item => !onlyUnread || !item.readAt);
  return <>
    <button className="p6-notifications-toggle" aria-haspopup="dialog" aria-expanded={open} aria-label={`Notificaciones${unread ? `: ${unread} sin leer` : ''}`} onClick={() => {
      setOpen(true); void run(() => load());
    }}><EntryIcon name="bell" /><span className="entry-sr-only">Notificaciones</span>{unread ? <span className="entry-unread-count">{unread}</span> : null}</button>
    {open ? <Dialog title="Notificaciones" className="entry-notifications" onClose={() => { if (!busy) setOpen(false); }}>
      <p>{unread ? `${unread} ${unread === 1 ? 'novedad sin leer' : 'novedades sin leer'}` : 'Estás al día'} · Avisos y actividad de tus aulas.</p>
      {error ? <Notice error>{error} El acceso puede haber cambiado; actualiza las notificaciones.</Notice> : null}
      <div className="notification-filters"><button aria-pressed={!onlyUnread} onClick={() => setOnlyUnread(false)}>Todas</button>
        <button aria-pressed={onlyUnread} onClick={() => setOnlyUnread(true)}>Sin leer · {unread}</button>
        <button disabled={busy} onClick={() => void run(() => load())}>Actualizar notificaciones</button></div>
      {!items && !error ? <Notice>Cargando notificaciones…</Notice> : null}
      {visible?.length === 0 ? <p className="p5-empty">{onlyUnread ? 'No tenés novedades pendientes de leer.' : 'Cuando haya novedades en tus aulas, aparecerán aquí.'}</p> : null}
      <ul className="p6-notifications">{visible?.map(item => <li key={item.id} className={item.readAt ? '' : 'unread'}>
        <strong>{labels[item.eventType]}</strong><p>{item.classroomName}</p>
        <small><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('es-AR')}</time> · {item.readAt ? 'Leída' : 'Sin leer'}</small>
        <div className="p5-actions"><button disabled={busy} onClick={() => void run(async () => {
          if (onSelect) { setOpen(false); onSelect(item.id); return; }
          const target = await api.call<NotificationTarget>(`/notifications/${item.id}/open`, 'POST', {});
          await load(); setOpen(false); onOpen(target);
        })}>{item.eventType.startsWith('WALL_') ? 'Abrir conversación' : 'Ver actividad'}</button>
        {!item.readAt ? <button disabled={busy} onClick={() => void run(async () => {
          await api.call(`/notifications/${item.id}/read`, 'POST', {}); await load();
        })}>Marcar como leída</button> : null}</div>
      </li>)}</ul>
    </Dialog> : null}
  </>;
}
