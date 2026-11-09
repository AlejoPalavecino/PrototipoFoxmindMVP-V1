'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClassroomClient, ClassroomNotification, NotificationTarget, NotificationPage } from './api.ts';
import { Dialog, Notice } from './components.tsx';
import { FoxmindIcon } from '../shared-ui/FoxmindIcon';
import {useStudyReminders,StudyReminderList} from './study-reminders';

const labels = { WALL_NOTICE: 'Nuevo aviso del docente', WALL_QUERY: 'Nueva consulta de estudiante', WALL_REPLY: 'Respuesta a tu publicación',
  ACTIVITY_PUBLISHED: 'Nueva actividad publicada', ACTIVITY_DEADLINE_CHANGED: 'Cambio de plazo o recepción',
  FIRST_SUBMISSION_ENABLED: 'Primera entrega habilitada', ATTEMPT_REOPENED: 'Nuevo intento habilitado', SUBMISSION_RECEIVED: 'Nueva entrega recibida', GRADE_PUBLISHED: 'Calificación publicada', GRADE_CORRECTED: 'Calificación corregida' };
type Operation = { generation: number; controller: AbortController };
type Destination = { onOpen: (target: NotificationTarget) => void; onSelect?: never }
  | { onSelect: (notificationId: string) => void; onOpen?: never };
const groups={all:'Todos los tipos',deliveries:'Entregas',talk:'Muro',work:'Actividades',grades:'Resultados',dates:'Fechas e intentos'};
function notificationGroup(type:ClassroomNotification['eventType']):keyof typeof groups{return type.startsWith('WALL_')?'talk':type.startsWith('GRADE_')?'grades':type==='SUBMISSION_RECEIVED'?'deliveries':type==='ACTIVITY_PUBLISHED'?'work':'dates';}
function notificationTitle(item:ClassroomNotification){return item.actorName&&item.eventType==='SUBMISSION_RECEIVED'?`Entrega de ${item.actorName}`:item.actorName&&item.eventType==='WALL_QUERY'?`Consulta de ${item.actorName}`:item.actorName&&item.eventType==='WALL_REPLY'?`Respuesta de ${item.actorName}`:labels[item.eventType];}
export function Notifications({ api, refresh, onOpen, onSelect,presentation='preview',includeStudyReminders=false }: { api: ClassroomClient; refresh: number;presentation?:'preview'|'center';includeStudyReminders?:boolean } & Destination) {
  const reminders=useStudyReminders(includeStudyReminders);
  const [items, setItems] = useState<ClassroomNotification[] | null>(null), [open, setOpen] = useState(false);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false), [nextCursor, setNextCursor] = useState<string | null>(null), [unread, setUnread] = useState(0);
  const [group,setGroup]=useState<keyof typeof groups>('all');
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
  async function markAll(op:Operation){
    await api.call('/notifications/read-all','POST',{},op.controller.signal);
    if(current(op))await load(op);
  }
  const filtered=items?.filter(item=>group==='all'||notificationGroup(item.eventType)===group);
  const visible = presentation==='preview'?filtered?.slice(0,3):filtered;
  const totalUnread=unread+reminders.data.unreadCount;
  const content=<>
      {includeStudyReminders?<StudyReminderList reminders={reminders} onlyUnread={onlyUnread}/>:null}
      <div className={`notifications-summary${presentation==='center'?' sr-only':''}`}><span className="notifications-total">{error || !items ? 'Tus notificaciones' : totalUnread ? `${totalUnread} ${totalUnread === 1 ? 'novedad sin leer' : 'novedades sin leer'}` : 'Estás al día'}</span><p>{includeStudyReminders?'Avisos de tus aulas y repasos privados.':'Avisos y actividad de tus aulas.'}</p></div>
      {error ? <Notice error>{error} El acceso puede haber cambiado; actualiza las notificaciones.</Notice> : null}
      <div className="notifications-toolbar"><div className="notification-filters" role="group" aria-label="Filtrar notificaciones"><button aria-pressed={!onlyUnread} onClick={() => filter(false)}>Todas</button>
        <button aria-pressed={onlyUnread} onClick={() => filter(true)}>Sin leer <span>{totalUnread}</span></button></div>
        {presentation==='preview'||error?<button className="notifications-refresh" aria-label="Actualizar notificaciones" disabled={busy} onClick={() => void run(load)}><FoxmindIcon name="refresh" />Actualizar</button>:null}</div>
      {presentation==='center'?<><div className="notification-types" role="group" aria-label="Tipo de notificación">{Object.entries(groups).filter(([key])=>key==='all'||items?.some(item=>notificationGroup(item.eventType)===key)).map(([key,label])=><button key={key} aria-pressed={group===key} onClick={()=>setGroup(key as keyof typeof groups)}>{label}</button>)}</div>{unread>0?<button className="notification-mark-all" disabled={busy} onClick={()=>void run(markAll)}>Marcar todas como leídas</button>:null}</>:null}
      {!items && !error ? <Notice>Cargando notificaciones…</Notice> : null}
      {visible?.length === 0 ? <p className="p5-empty">{onlyUnread ? 'No tenés novedades pendientes de leer.' : 'Cuando haya novedades en tus aulas, aparecerán aquí.'}</p> : null}
      <ul className="p6-notifications" aria-label="Novedades de tus aulas" aria-busy={busy}>{visible?.map(item => <li key={item.id} data-notification-group={notificationGroup(item.eventType)} className={item.readAt ? '' : 'unread'}>
        <div className="notification-heading"><FoxmindIcon name={item.eventType.startsWith('WALL_') ? 'chat' : item.eventType.startsWith('GRADE_') ? 'check' : 'clipboard'} /><h3>{notificationTitle(item)}</h3>{notificationTitle(item)!==labels[item.eventType]?<span className="sr-only">{labels[item.eventType]}</span>:null}<span className={`notification-state${item.readAt ? ' is-read' : ''}`}>{item.readAt ? 'Leída' : 'Sin leer'}</span></div>
        <p className="notification-classroom">{item.classroomName}{item.classroomDivision?` · ${item.classroomDivision}`:''}</p>
        {'activityTitle' in item ? <p className="notification-activity">{item.activityTitle}</p> : item.message?<p className="notification-activity">{item.message}</p>:null}
        <time className="notification-time" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('es-AR', { hourCycle: 'h23', dateStyle: 'medium', timeStyle: 'short' })}</time>
        <div className="p5-actions notification-actions"><button className="notification-open" disabled={busy} onClick={() => void run(async op => {
          if (onSelect) { if (current(op)) { setOpen(false); onSelect(item.id); } return; }
          const target = await api.call<NotificationTarget>(`/notifications/${item.id}/open`, 'POST', {}, op.controller.signal);
          if (!current(op)) return;
          await load(op); if (current(op)) { setOpen(false); onOpen(target); }
        })}>{item.eventType.startsWith('WALL_') ? 'Abrir conversación' : item.eventType.startsWith('GRADE_') ? 'Ver devolución' : 'Ver actividad'}</button>
        {!item.readAt ? <button className="notification-read" disabled={busy} onClick={() => void run(async op => {
          await api.call(`/notifications/${item.id}/read`, 'POST', {}, op.controller.signal); if (current(op)) await load(op);
        })}><span className="sr-only">Marcar como leída</span><FoxmindIcon name="check"/></button> : null}</div>
      </li>)}</ul>
      {nextCursor && presentation==='center' ? <button disabled={busy} onClick={() => void run(loadMore)}>Cargar más notificaciones</button> : null}
      {presentation==='preview'?<a className="p5-primary" href="/notificaciones">Ver todas las notificaciones <FoxmindIcon name="arrow-right"/></a>:null}
    </>;
  if(presentation==='center')return <section className="entry-notifications fm-brujula-inbox" aria-label="Centro de notificaciones">{content}</section>;
  return <><button className="p6-notifications-toggle" aria-haspopup="dialog" aria-expanded={open} aria-label={`Notificaciones${totalUnread ? `: ${totalUnread} sin leer` : ''}`} onClick={() => {
      setOpen(true); void run(load); if(includeStudyReminders)void reminders.load();
    }}><FoxmindIcon name="bell" /><span className="entry-sr-only">Notificaciones</span>{totalUnread ? <span className="entry-unread-count">{totalUnread}</span> : null}</button>
    {open?<Dialog title="Notificaciones" className="entry-notifications" onClose={()=>setOpen(false)}>{content}</Dialog>:null}</>;
}
