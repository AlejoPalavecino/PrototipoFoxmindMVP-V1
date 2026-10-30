'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClassroomClient, ClassroomNotification, NotificationTarget, NotificationPage } from './api.ts';
import { Dialog, Notice } from './components.tsx';
import { EntryIcon } from '../shared-ui/EntryIcon';

const labels = { WALL_NOTICE: 'Nuevo aviso del docente', WALL_QUERY: 'Nueva consulta de estudiante', WALL_REPLY: 'Respuesta a tu publicación',
  ACTIVITY_PUBLISHED: 'Nueva actividad publicada', ACTIVITY_DEADLINE_CHANGED: 'Cambio de plazo o recepción',
  FIRST_SUBMISSION_ENABLED: 'Primera entrega habilitada', ATTEMPT_REOPENED: 'Nuevo intento habilitado', SUBMISSION_RECEIVED: 'Nueva entrega recibida', GRADE_PUBLISHED: 'Calificación publicada', GRADE_CORRECTED: 'Calificación corregida' };
type Operation = { generation: number; controller: AbortController };
type Destination = { onOpen: (target: NotificationTarget) => void; onSelect?: never }
  | { onSelect: (notificationId: string) => void; onOpen?: never };
export function Notifications({ api, refresh, onOpen, onSelect }: { api: ClassroomClient; refresh: number } & Destination) {
  const [items, setItems] = useState<ClassroomNotification[] | null>(null), [open, setOpen] = useState(false);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false), [nextCursor, setNextCursor] = useState<string | null>(null), [unread, setUnread] = useState(0);
  const state = useRef<{ generation: number; controller: AbortController | null; mounted: boolean }>({ generation: 0, controller: null, mounted: true });
  const start = useCallback((): Operation => {
    state.current.controller?.abort();
    const controller = new AbortController(), generation = ++state.current.generation;
    state.current.controller = controller;
    return { generation, controller };
  }, []);
  const current = useCallback((op: Operation) => state.current.mounted && state.current.generation === op.generation && !op.controller.signal.aborted, []);
  const load = useCallback(async (op: Operation) => {
    const page = await api.call<NotificationPage>(`/notifications/page?unread=${onlyUnread}`, 'GET', undefined, op.controller.signal);
    if (!current(op)) return;
    setItems(page.items); setNextCursor(page.nextCursor); setUnread(page.unreadCount);
  }, [api, onlyUnread, current]);
  useEffect(() => {
    state.current.mounted = true;
    return () => { state.current.mounted = false; state.current.generation++; state.current.controller?.abort(); };
  }, []);
  useEffect(() => {
    const op = start(); setBusy(false);
    void load(op).catch(e => { if (current(op)) setError(e.message); });
    return () => { if (current(op)) op.controller.abort(); };
  }, [load, refresh, start, current]);
  async function run(work: (op: Operation) => Promise<void>) {
    const op = start(); setBusy(true); setError('');
    try { await work(op); } catch (e) { if (current(op)) setError((e as Error).message); }
    finally { if (current(op)) setBusy(false); }
  }
  function filter(unreadOnly: boolean) {
    if (unreadOnly === onlyUnread) return;
    start().controller.abort(); setBusy(false); setError(''); setItems(null); setNextCursor(null); setOnlyUnread(unreadOnly);
  }
  async function loadMore(op: Operation) {
    if (!nextCursor) return;
    const page = await api.call<NotificationPage>(`/notifications/page?unread=${onlyUnread}&cursor=${encodeURIComponent(nextCursor)}`, 'GET', undefined, op.controller.signal);
    if (!current(op)) return;
    setItems(previous => current(op) ? [...(previous ?? []), ...page.items.filter(item => !previous?.some(existing => existing.id === item.id))] : previous);
    setNextCursor(page.nextCursor); setUnread(page.unreadCount);
  }
  const visible = items;
  return <>
    <button className="p6-notifications-toggle" aria-haspopup="dialog" aria-expanded={open} aria-label={`Notificaciones${unread ? `: ${unread} sin leer` : ''}`} onClick={() => {
      setOpen(true); void run(load);
    }}><EntryIcon name="bell" /><span className="entry-sr-only">Notificaciones</span>{unread ? <span className="entry-unread-count">{unread}</span> : null}</button>
    {open ? <Dialog title="Notificaciones" className="entry-notifications" onClose={() => { if (!busy) setOpen(false); }}>
      <p>{unread ? `${unread} ${unread === 1 ? 'novedad sin leer' : 'novedades sin leer'}` : 'Estás al día'} · Avisos y actividad de tus aulas.</p>
      {error ? <Notice error>{error} El acceso puede haber cambiado; actualiza las notificaciones.</Notice> : null}
      <div className="notification-filters"><button aria-pressed={!onlyUnread} onClick={() => filter(false)}>Todas</button>
        <button aria-pressed={onlyUnread} onClick={() => filter(true)}>Sin leer · {unread}</button>
        <button disabled={busy} onClick={() => void run(load)}>Actualizar notificaciones</button></div>
      {!items && !error ? <Notice>Cargando notificaciones…</Notice> : null}
      {visible?.length === 0 ? <p className="p5-empty">{onlyUnread ? 'No tenés novedades pendientes de leer.' : 'Cuando haya novedades en tus aulas, aparecerán aquí.'}</p> : null}
      <ul className="p6-notifications">{visible?.map(item => <li key={item.id} className={item.readAt ? '' : 'unread'}>
        <strong>{labels[item.eventType]}</strong><p>{item.classroomName}</p>
        <small><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('es-AR', { hourCycle: 'h23', dateStyle: 'short', timeStyle: 'short' })}</time> · {item.readAt ? 'Leída' : 'Sin leer'}</small>
        <div className="p5-actions"><button disabled={busy} onClick={() => void run(async op => {
          if (onSelect) { if (current(op)) { setOpen(false); onSelect(item.id); } return; }
          const target = await api.call<NotificationTarget>(`/notifications/${item.id}/open`, 'POST', {}, op.controller.signal);
          if (!current(op)) return;
          await load(op); if (current(op)) { setOpen(false); onOpen(target); }
        })}>{item.eventType.startsWith('WALL_') ? 'Abrir conversación' : item.eventType.startsWith('GRADE_') ? 'Ver devolución' : 'Ver actividad'}</button>
        {!item.readAt ? <button disabled={busy} onClick={() => void run(async op => {
          await api.call(`/notifications/${item.id}/read`, 'POST', {}, op.controller.signal); if (current(op)) await load(op);
        })}>Marcar como leída</button> : null}</div>
      </li>)}</ul>
      {nextCursor ? <button disabled={busy} onClick={() => void run(loadMore)}>Cargar más notificaciones</button> : null}
    </Dialog> : null}
  </>;
}
