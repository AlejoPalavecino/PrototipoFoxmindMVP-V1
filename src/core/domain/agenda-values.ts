import { AgendaError } from './agenda.ts';

const formatters = new Map<string, Intl.DateTimeFormat>();
const formatterLimit = 64;
function formatterFor(zone: string): Intl.DateTimeFormat {
  const cached = formatters.get(zone);
  if (cached) return cached;
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
  } catch { return invalid(); }
  if (formatters.size >= formatterLimit) {
    const oldest = formatters.keys().next().value;
    if (oldest !== undefined) formatters.delete(oldest);
  }
  formatters.set(zone, formatter);
  return formatter;
}

export function invalid(details?: unknown): never { throw new AgendaError('INVALID_INPUT', details); }
export function agendaObject(input: unknown, allowed: string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid();
  if (Object.keys(input).some(key => !allowed.includes(key))) return invalid();
  return input as Record<string, unknown>;
}
export function agendaId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return invalid();
  return value.toLowerCase();
}
export function agendaRevision(value: unknown): string {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,18})$/.test(value)
    || BigInt(value) > 9223372036854775806n) return invalid();
  return value;
}
export function agendaDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return invalid();
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < '0001-01-01') return invalid();
  return value;
}
export function agendaMinute(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return invalid();
  agendaDate(value.slice(0, 10));
  if (Number(value.slice(11, 13)) > 23 || Number(value.slice(14)) > 59) return invalid();
  return value;
}
export function agendaZone(value: unknown): string {
  if (typeof value !== 'string' || !value || /^[+-]/.test(value)) return invalid();
  formatterFor(value);
  return value;
}
export function shiftDate(value: string, days: number): string {
  return new Date(Date.parse(`${value}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
export function localMinuteAt(instant: number, zone: string): string {
  const parts = Object.fromEntries(formatterFor(zone).formatToParts(new Date(instant)).map(part => [part.type, part.value]));
  return `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
