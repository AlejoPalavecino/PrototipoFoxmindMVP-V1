'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ClassroomClient, ClassroomNotification, WallTarget } from './api.ts';
import { Dialog, Notice } from './components.tsx';

const labels = { WALL_NOTICE: 'Nuevo aviso del docente', WALL_QUERY: 'Nueva consulta de estudiante', WALL_REPLY: 'Respuesta a tu publicación' };
export function Notifications({ api, refresh, onOpen }: { api: ClassroomClient; refresh: number; onOpen: (target: WallTarget) => void }) {
  const [items, setItems] = useState<ClassroomNotification[] | null>(null), [open, setOpen] = useState(false);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
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
  return <>
    <button className="p6-notifications-toggle" aria-label={`Notificaciones${unread ? `: ${unread} sin leer` : ''}`} onClick={() => {
      setOpen(true); void run(() => load());
    }}>Notificaciones{unread ? ` (${unread})` : ''}</button>
    {open ? <Dialog title="Notificaciones" onClose={() => { if (!busy) setOpen(false); }}>
      <p>Avisos, consultas y respuestas de tus aulas. El acceso se verifica al abrir cada publicación.</p>
      {error ? <Notice error>{error} El acceso puede haber cambiado; actualiza las notificaciones.</Notice> : null}
      <button disabled={busy} onClick={() => void run(() => load())}>Actualizar notificaciones</button>
      {!items && !error ? <Notice>Cargando notificaciones…</Notice> : null}
      {items?.length === 0 ? <p>No hay notificaciones disponibles.</p> : null}
      <ul className="p6-notifications">{items?.map(item => <li key={item.id} className={item.readAt ? '' : 'unread'}>
        <strong>{labels[item.eventType]}</strong><p>{item.classroomName}</p>
        <small><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('es-AR')}</time> · {item.readAt ? 'Leída' : 'Sin leer'}</small>
        <div className="p5-actions"><button disabled={busy} onClick={() => void run(async () => {
          const target = await api.call<WallTarget>(`/notifications/${item.id}/open`, 'POST', {});
          await load(); setOpen(false); onOpen(target);
        })}>Abrir publicación</button>
        {!item.readAt ? <button disabled={busy} onClick={() => void run(async () => {
          await api.call(`/notifications/${item.id}/read`, 'POST', {}); await load();
        })}>Marcar como leída</button> : null}</div>
      </li>)}</ul>
    </Dialog> : null}
  </>;
}
