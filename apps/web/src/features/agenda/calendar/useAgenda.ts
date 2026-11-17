import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgendaRange } from '../../../../../../src/core/domain/agenda/index.ts';
import type { AgendaClient } from '../api/api.ts';
import type { AgendaItem } from '../model/calendar.ts';
import { shiftDay } from '../model/calendar.ts';

async function allItems(api: AgendaClient, range: AgendaRange, signal: AbortSignal) {
  const items: AgendaItem[] = [], cursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const page = await api.list(range, cursor, signal);
    if (signal.aborted) throw new Error('Aborted');
    items.push(...page.items); cursor = page.nextCursor;
    if (cursor && cursors.has(cursor)) throw new Error('No pudimos cargar toda la agenda. Volvé a intentar.');
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return items;
}
function useAgendaQuery<T>(read: (signal: AbortSignal) => Promise<T[]>, enabled = true) {
  const [state, setState] = useState<{ read: typeof read; items: T[]; loading: boolean; error: string }>();
  const controller = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    if (!enabled) return false;
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setState({ read, items: [], loading: true, error: '' });
    try {
      const items = await read(active.signal);
      if (active.signal.aborted) return false;
      setState({ read, items, loading: false, error: '' });
      return true;
    } catch (failure) {
      if (active.signal.aborted) return false;
      const error = failure instanceof Error ? failure.message : '';
      const unavailable = failure instanceof Error && 'code' in failure && failure.code === 'SERVICE_UNAVAILABLE';
      setState({ read, items: [], loading: false, error: unavailable || !error ? 'No pudimos cargar la agenda.' : error });
      return false;
    }
  }, [read, enabled]);
  useEffect(() => { void reload(); return () => controller.current?.abort(); }, [reload]);
  return { ...(state?.read === read ? state : { items: [] as T[], loading: true, error: '' }), reload };
}

export function useAgenda(api: AgendaClient, range: AgendaRange, calendarReady: boolean, selectedDay?: string, calendarOnly = false) {
  const { startDate, endDateExclusive, timeZone } = range;
  const calendar = useAgendaQuery(useCallback((signal: AbortSignal) =>
    allItems(api, { startDate, endDateExclusive, timeZone }, signal), [api, startDate, endDateExclusive, timeZone]), calendarReady);
  const upcoming = useAgendaQuery(useCallback(async (signal: AbortSignal) =>
    (await api.upcoming(5, signal)).items, [api]), !calendarOnly && !selectedDay);
  const afterStart = shiftDay(selectedDay ?? startDate, 1), afterEnd = shiftDay(selectedDay ?? startDate, 32);
  const afterDay = useAgendaQuery(useCallback((signal: AbortSignal) =>
    allItems(api, { startDate: afterStart, endDateExclusive: afterEnd, timeZone }, signal), [api, afterStart, afterEnd, timeZone]), !calendarOnly && calendarReady && Boolean(selectedDay));
  const reload = useCallback(async () => {
    if (calendarOnly) return calendar.reload();
    const results = await Promise.all([calendar.reload(), selectedDay ? afterDay.reload() : upcoming.reload()]);
    return results.every(Boolean);
  }, [calendar.reload, upcoming.reload, afterDay.reload, selectedDay, calendarOnly]);
  useEffect(() => { const refresh = () => { void reload(); }; window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [reload]);
  return { calendar, upcoming, afterDay, reload };
}
