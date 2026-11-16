import type { AgendaEventRequest, AgendaViewTarget } from '../../features/agenda/index.ts';

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || value < '0001-01-01' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const instant = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(instant.getTime()) && instant.toISOString().slice(0, 10) === value;
}

export function parseAgendaViewTarget(query: Record<string, unknown>): AgendaViewTarget | null {
  if (Object.keys(query).some(key => !['date', 'view', 'create'].includes(key))) return null;
  if ('date' in query && !validDate(query.date)) return null;
  const date = validDate(query.date) ? query.date : undefined;
  if (query.create === '1' && !('view' in query)) return { create: true, date };
  if (query.view === 'day' && date && !('create' in query)) return { view: 'DAY', date };
  return null;
}

/** This page-local context never broadens the authentication return allowlist. */
export function parseAgendaEventTarget(input: unknown): AgendaEventRequest | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const query = input as Record<string, unknown>;
  if (Object.keys(query).length !== 2 || !('event' in query) || !('date' in query)) return null;
  if (typeof query.event !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(query.event)) return null;
  if (!validDate(query.date)) return null;
  return { eventId: query.event, date: query.date };
}
