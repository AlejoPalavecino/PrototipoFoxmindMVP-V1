import type { AgendaEventRequest } from '../../features/agenda/index.ts';

/** This page-local context never broadens the authentication return allowlist. */
export function parseAgendaEventTarget(input: unknown): AgendaEventRequest | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const query = input as Record<string, unknown>;
  if (Object.keys(query).length !== 2 || !('event' in query) || !('date' in query)) return null;
  if (typeof query.event !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(query.event)) return null;
  if (typeof query.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(query.date)) return null;
  const instant = new Date(`${query.date}T12:00:00Z`);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString().slice(0, 10) !== query.date) return null;
  return { eventId: query.event, date: query.date };
}
