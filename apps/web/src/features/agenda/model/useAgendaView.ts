import { useEffect, useState } from 'react';
import { dateAt, monthStep } from './calendar.ts';

export type AgendaViewTarget = { date?: string; view?: 'DAY'; create?: true };

export function useAgendaView() {
  const [ready, setReady] = useState(false);
  const [zone, setZone] = useState('UTC');
  const [day, setDay] = useState(() => dateAt(Date.now(), 'UTC'));
  const [month, setMonth] = useState(() => day.slice(0, 7));
  useEffect(() => {
    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let saved: { month?: string; day?: string; zone?: string } = {};
    try { saved = JSON.parse(sessionStorage.getItem('foxmind-agenda-view') ?? '{}'); } catch { /* Storage is optional. */ }
    try { new Intl.DateTimeFormat('es', { timeZone: saved.zone }); } catch { saved.zone = undefined; }
    const initialZone = saved.zone || localZone, today = dateAt(Date.now(), initialZone);
    setZone(initialZone);
    setReady(true);
    setMonth(saved.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(saved.month) ? saved.month : today.slice(0, 7));
    setDay(saved.day && /^\d{4}-\d{2}-\d{2}$/.test(saved.day) ? saved.day : today);
  }, []);
  const persist = (nextMonth: string, nextDay: string, nextZone: string) => {
    setMonth(nextMonth); setDay(nextDay); setZone(nextZone);
    try { sessionStorage.setItem('foxmind-agenda-view', JSON.stringify({ month: nextMonth, day: nextDay, zone: nextZone })); } catch { /* Storage is optional. */ }
  };
  return { ready, month, day, zone, select: (value: string) => persist(value.slice(0, 7), value, zone),
    move: (direction: number) => {
      const next = monthStep(month, direction);
      const lastDay = new Date(`${monthStep(next, 1)}-01T12:00:00Z`);
      lastDay.setUTCDate(0);
      const number = Math.min(Number(day.slice(-2)), lastDay.getUTCDate());
      persist(next, `${next}-${String(number).padStart(2, '0')}`, zone);
    },
    today: () => { const today = dateAt(Date.now(), zone); persist(today.slice(0, 7), today, zone); },
    changeZone: (value: string) => persist(month, day, value) };
}
