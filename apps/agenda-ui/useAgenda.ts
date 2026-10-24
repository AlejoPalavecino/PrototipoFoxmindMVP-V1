import { useCallback, useEffect, useRef, useState } from 'react';
import type { AcademicDeadline, AgendaRange } from '../../src/core/domain/index.ts';
import type { AgendaClient } from './api.ts';
import type { AgendaItem } from './calendar.ts';

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
export function useAgenda(api: AgendaClient, range: AgendaRange) {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [upcoming, setUpcoming] = useState<AcademicDeadline[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null), generation = useRef(0);
  const { startDate, endDateExclusive, timeZone } = range;
  const reload = useCallback(async () => {
    controller.current?.abort(); const active = new AbortController(); controller.current = active;
    const version = ++generation.current;
    setLoading(true); setError(''); setItems([]); setUpcoming([]);
    try {
      const [events, deadlines] = await Promise.all([allItems(api, { startDate, endDateExclusive, timeZone }, active.signal), api.upcoming(5, active.signal)]);
      if (version !== generation.current || active.signal.aborted) return false;
      setItems(events); setUpcoming(deadlines.items); return true;
    } catch (failure) {
      if (version === generation.current && !active.signal.aborted) setError((failure as Error).message);
      return false;
    } finally { if (version === generation.current && !active.signal.aborted) setLoading(false); }
  }, [api, startDate, endDateExclusive, timeZone]);
  useEffect(() => { void reload(); return () => { controller.current?.abort(); generation.current++; }; }, [reload]);
  useEffect(() => { const refresh = () => { void reload(); }; window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [reload]);
  return { items, upcoming, loading, error, reload };
}
