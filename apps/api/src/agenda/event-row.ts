import { scheduleInstants, type EventPayload, type PrivateEvent } from '../../../../src/core/domain/index.ts';

export interface EventRow {
  id: string; title: string; description: string; category: EventPayload['category'];
  schedule_kind: 'TIMED' | 'ALL_DAY'; start_date: string; end_date_exclusive: string;
  start_local: string | null; end_local: string | null; time_zone: string | null;
  start_offset_minutes: number | null; end_offset_minutes: number | null;
  repeat_kind: EventPayload['repeat']['kind']; repeat_until: string | null;
  revision: bigint; created_at: Date; updated_at: Date;
  color: EventPayload['color'] | null;
  exceptions?: PrivateEvent['exceptions'];
}
export const eventColumns = `id,title,description,category,schedule_kind,start_date::text,end_date_exclusive::text,
  start_local,end_local,time_zone,start_offset_minutes,end_offset_minutes,repeat_kind,repeat_until::text,
  revision,created_at,updated_at,color,exceptions`;
export function fromEventRow(row: EventRow): PrivateEvent {
  const schedule: EventPayload['schedule'] = row.schedule_kind === 'ALL_DAY'
    ? { kind: 'ALL_DAY', startDate: row.start_date, endDateExclusive: row.end_date_exclusive }
    : { kind: 'TIMED', timeZone: row.time_zone!, startLocal: row.start_local!, endLocal: row.end_local!,
        ...(row.start_offset_minutes === null ? {} : { startOffsetMinutes: row.start_offset_minutes }),
        ...(row.end_offset_minutes === null ? {} : { endOffsetMinutes: row.end_offset_minutes }) };
  return { id: row.id, title: row.title, description: row.description, category: row.category, schedule,
    repeat: row.repeat_kind === 'NONE' ? { kind: 'NONE' } : { kind: row.repeat_kind, untilDate: row.repeat_until! },
    revision: String(row.revision), createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
    ...(row.color === null ? {} : { color: row.color }),
    ...(row.exceptions?.length ? { exceptions: row.exceptions } : {}) };
}
export function eventValues(payload: EventPayload): unknown[] {
  const schedule = payload.schedule;
  const timed = schedule.kind === 'TIMED' ? schedule : null;
  const instants = timed ? scheduleInstants(timed) : null;
  const start = timed ? timed.startLocal.slice(0, 10) : schedule.kind === 'ALL_DAY' ? schedule.startDate : '';
  const end = timed ? new Date(Date.parse(`${timed.endLocal.slice(0, 10)}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)
    : schedule.kind === 'ALL_DAY' ? schedule.endDateExclusive : '';
  return [payload.title, payload.description, payload.category, schedule.kind, start, end,
    timed?.startLocal ?? null, timed?.endLocal ?? null, timed?.timeZone ?? null,
    timed?.startOffsetMinutes ?? null, timed?.endOffsetMinutes ?? null,
    instants?.startAt ?? null, instants?.endAt ?? null, payload.repeat.kind,
    payload.repeat.kind !== 'NONE' ? payload.repeat.untilDate : null, payload.color ?? null];
}
