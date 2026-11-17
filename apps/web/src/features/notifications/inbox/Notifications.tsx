'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { InboxNotification, InboxNotificationTarget, NotificationKind, NotificationTarget, NotificationPage } from '../../../../../../src/core/contracts/notifications.ts';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { notificationDestination } from './notification-destinations.ts';
import { NotificationCenter } from './NotificationCenter.tsx';

const notificationCountEvent = 'foxmind:notification-count';
const refreshError = 'El cambio quedó guardado. No pudimos actualizar la bandeja.';

type Operation = { generation: number; controller: AbortController };
type ProjectedReview = Extract<InboxNotificationTarget, { kind: 'event' | 'invitation' }>;
type Destination = { onOpen: (target: NotificationTarget) => void; onSelect?: never }
  | { onSelect: (notificationId: string) => void; onOpen?: never };
type Props = { api: ClassroomClient; refresh: number; presentation?: 'preview' | 'center';
  role?: 'student' | 'teacher'; onNavigate?: (href: string) => void;
  onReviewProjected?: (target: ProjectedReview, trigger?: HTMLElement) => void } & Destination;

export function Notifications({ api, refresh, onNavigate, onReviewProjected, presentation = 'preview', role = 'student' }: Props) {
  const [items, setItems] = useState<InboxNotification[] | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const [writing, setWriting] = useState(false), [unavailable, setUnavailable] = useState(false), [hasCounts, setHasCounts] = useState(false);
  const [focusBack, setFocusBack] = useState<{ trigger?: HTMLElement }>();
  const unavailableOrigin = useRef<HTMLElement | undefined>(undefined);
  const lock = useRef(false), depth = useRef(1);
  const [filter, setFilter] = useState<{ unread: boolean; kind: NotificationKind }>({ unread: false, kind: 'all' });
  const [nextCursor, setNextCursor] = useState<string | null>(null), [unread, setUnread] = useState(0), [total, setTotal] = useState(0);
  const state = useRef<{ generation: number; controller: AbortController | null; mounted: boolean }>({ generation: 0, controller: null, mounted: true });

  const publishCount = useCallback((value: number) => {
    setUnread(value);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(notificationCountEvent, { detail: value }));
  }, []);
  const start = useCallback((): Operation => {
    state.current.controller?.abort();
    const controller = new AbortController(), generation = ++state.current.generation;
    state.current.controller = controller;
    return { generation, controller };
  }, []);
  const current = useCallback((op: Operation) => state.current.mounted && state.current.generation === op.generation && !op.controller.signal.aborted, []);
  const load = useCallback(async (op: Operation, append?: string) => {
    const batch: InboxNotification[] = [], visited = new Set<string>();
    let cursor: string | null = append ?? null, page: NotificationPage | undefined, count = 0;
    // Revalidate as many pages as the reader already opened, with fresh cursors for this filter.
    do {
      if (cursor) visited.add(cursor);
      const params = new URLSearchParams({ unread: String(filter.unread) });
      if (filter.kind !== 'all') params.set('kind', filter.kind);
      if (cursor) params.set('cursor', cursor);
      page = await api.call<NotificationPage>(`/notifications/page?${params}`, 'GET', undefined, op.controller.signal);
      if (!current(op)) return;
      batch.push(...page.items);
      count++;
      cursor = page.nextCursor;
      if (cursor && visited.has(cursor)) throw Error('No pudimos cargar toda la bandeja.');
    } while (cursor && !append && count < depth.current);
    setItems(previous => {
      if (!current(op)) return previous;
      const accumulated = append ? [...(previous ?? []), ...batch] : batch;
      return [...new Map(accumulated.map(item => [item.id, item])).values()];
    });
    depth.current = append ? depth.current + count : count;
    setNextCursor(cursor);
    setHasCounts(true); setTotal(page.totalCount ?? batch.length);
    publishCount(page.unreadCount);
  }, [api, filter, current, publishCount]);

  useEffect(() => {
    state.current.mounted = true;
    return () => { state.current.mounted = false; state.current.generation++; state.current.controller?.abort(); };
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = (event: Event) => setUnread((event as CustomEvent<number>).detail);
    window.addEventListener(notificationCountEvent, update);
    return () => window.removeEventListener(notificationCountEvent, update);
  }, []);
  useEffect(() => {
    const op = start(); setBusy(false); setWriting(false);
    void load(op).catch((failure: Error) => { if (current(op)) setError(failure.message); });
    return () => { if (current(op)) op.controller.abort(); };
  }, [load, refresh, start, current]);
  useEffect(() => {
    if (busy || unavailable || !focusBack) return;
    setFocusBack(undefined);
    if (typeof document === 'undefined') return;
    if (focusBack.trigger?.isConnected) focusBack.trigger.focus({ preventScroll: true });
    else document.querySelector<HTMLButtonElement>('.nt-reading-filters button[aria-pressed=true]')?.focus();
  }, [busy, unavailable, focusBack]);
  useEffect(() => {
    if (!status || typeof window === 'undefined') return;
    const timer = window.setTimeout(() => setStatus(''), 4300);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function run(work: (op: Operation) => Promise<void>, options?: { notice?: InboxNotification; write?: boolean; open?: boolean; trigger?: HTMLElement }) {
    if (lock.current) return;
    const op = start(); setBusy(true); setError(''); setStatus('');
    if (options?.write) { lock.current = true; setWriting(true); }
    try { await work(op); }
    catch (failure) {
      if (!current(op)) return;
      if ((failure as { code?: string } | null)?.code === 'FORBIDDEN') {
        const notice = options?.notice;
        if (notice && items?.some(item => item.id === notice.id)) {
          setItems(previous => previous?.filter(item => item.id !== notice.id) ?? null);
          setTotal(value => Math.max(0, value - 1));
          if (!notice.readAt) publishCount(Math.max(0, unread - 1));
        }
        if (options?.open && presentation === 'center') {
          unavailableOrigin.current = options.trigger;
          setUnavailable(true);
        } else {
          setError('Este contenido ya no está disponible. Podés seguir revisando tus otras notificaciones.');
          if (options?.write) setFocusBack({ trigger: options.trigger });
        }
        await load(op).catch(() => {});
      } else {
        setError(failure instanceof Error ? failure.message : 'No pudimos completar la acción. Volvé a intentar.');
        if (options?.write) setFocusBack({ trigger: options.trigger });
      }
    } finally {
      if (options?.write) lock.current = false;
      if (current(op)) { setBusy(false); setWriting(false); }
    }
  }
  function changeFilter(read: boolean, kind: NotificationKind) {
    if (lock.current || read === filter.unread && kind === filter.kind) return;
    start().controller.abort();
    depth.current = 1;
    setError(''); setStatus(''); setItems(null); setNextCursor(null);
    setFilter({ unread: read, kind });
  }
  function reflectRead(item: InboxNotification, read: boolean) {
    if (Boolean(item.readAt) === read) return;
    const readAt = read ? new Date().toISOString() : null;
    setItems(previous => filter.unread && read ? previous?.filter(row => row.id !== item.id) ?? null
      : previous?.map(row => row.id === item.id ? { ...row, readAt } : row) ?? null);
    publishCount(Math.max(0, unread + (read ? -1 : 1)));
  }
  const restoreList = (op: Operation) => load(op).catch(() => { if (current(op)) setError(refreshError); });
  const noticeAction = (item: InboxNotification, action: 'read' | 'unread' | 'open') => `/notifications/${encodeURIComponent(item.id)}/${action}`;
  const openItem = (item: InboxNotification, trigger?: HTMLElement) => void run(async op => {
    const target = await api.call<InboxNotificationTarget>(noticeAction(item, 'open'), 'POST', {}, op.controller.signal);
    if (!current(op)) return;
    reflectRead(item, true);
    if (onReviewProjected && 'kind' in target && (target.kind === 'event' || target.kind === 'invitation')) {
      onReviewProjected(target, trigger);
      await restoreList(op);
      return;
    }
    const href = notificationDestination(target, item.id);
    if (onNavigate) onNavigate(href);
    else window.location.assign(href);
  }, { notice: item, write: true, open: true, trigger });
  const toggleItem = (item: InboxNotification, trigger?: HTMLElement) => void run(async op => {
    const read = !item.readAt;
    await api.call(noticeAction(item, read ? 'read' : 'unread'), 'POST', {}, op.controller.signal);
    if (!current(op)) return;
    reflectRead(item, read);
    setStatus(read ? 'Marcaste la notificación como leída.' : 'Marcaste la notificación como no leída.');
    setFocusBack({ trigger });
    await restoreList(op);
  }, { notice: item, write: true, trigger });
  const markAll = () => void run(async op => {
    const result = await api.call<{ read: true; updatedCount?: number }>('/notifications/read-all', 'POST', {}, op.controller.signal);
    if (!current(op)) return;
    const at = new Date().toISOString();
    setItems(previous => filter.unread ? [] : previous?.map(row => row.readAt ? row : { ...row, readAt: at }) ?? null);
    publishCount(Math.max(0, unread - (result?.updatedCount ?? unread)));
    setStatus('Todas tus notificaciones están leídas.');
    setFocusBack({});
    await restoreList(op);
  }, { write: true });
  if (presentation === 'center') return <NotificationCenter role={role} items={items} unread={unread} total={total} hasCounts={hasCounts}
    onlyUnread={filter.unread} kind={filter.kind} error={error} status={status} busy={busy} writing={writing} more={!!nextCursor}
    unavailable={unavailable} onDismissUnavailable={() => { setUnavailable(false); setFocusBack({ trigger: unavailableOrigin.current }); unavailableOrigin.current = undefined; }}
    onFilter={changeFilter} onReadAll={markAll} onToggle={toggleItem} onOpen={openItem} onReload={() => void run(load)}
    onMore={() => { if (nextCursor) void run(op => load(op, nextCursor)); }} />;
  return <a className="p6-notifications-toggle nt-nav-link" href="/notificaciones"
    aria-label={`Notificaciones${unread ? `: ${unread} sin leer` : ''}`}>
    <FoxmindIcon name="bell" /><span className="entry-sr-only">Notificaciones</span>
    {unread ? <span className="entry-unread-count">{unread}</span> : null}
  </a>;
}
