import { AgendaError, agendaDate, seriesSchedules, type AgendaRange, type EventPayload, type PrivateEventRepository } from '../../../../../../src/core/domain/agenda/index.ts';
import type { AgendaQuery } from '../application/ports.ts';
import { eventColumns, eventValues, fromEventRow, type EventRow } from './event-row.ts';

const details = `${eventColumns},
  (SELECT s.folder_id FROM study_review_sessions s JOIN study_folders f ON f.id=s.folder_id
    WHERE s.agenda_event_id=agenda_events.id AND s.owner_id=agenda_events.owner_id AND f.owner_id=s.owner_id
      AND s.event_revision=agenda_events.revision AND s.cancelled_at IS NULL AND f.status='ACTIVE' ORDER BY s.id LIMIT 1) AS folder_id,
  (SELECT s.exam_id FROM study_review_sessions s JOIN study_folders f ON f.id=s.folder_id
    WHERE s.agenda_event_id=agenda_events.id AND s.owner_id=agenda_events.owner_id AND f.owner_id=s.owner_id
      AND s.event_revision=agenda_events.revision AND s.cancelled_at IS NULL AND f.status='ACTIVE' ORDER BY s.id LIMIT 1) AS exam_id`;

class SqlPrivateEventRepository implements PrivateEventRepository {
  constructor(private readonly tx: AgendaQuery, private readonly owner: string) {}
  async get(id: string) {
    const [row] = await this.tx.query<EventRow>(`SELECT ${details} FROM agenda_events WHERE owner_id=$1::uuid AND id=$2::uuid`, this.owner, id);
    return row ? fromEventRow(row) : null;
  }
  private async verifyRevision(id: string, revision: string): Promise<void> {
    const [row] = await this.tx.query<{ revision: bigint }>(
    'SELECT revision FROM agenda_events WHERE owner_id=$1::uuid AND id=$2::uuid FOR UPDATE', this.owner, id);
    if (!row) throw new AgendaError('FORBIDDEN');
    if (String(row.revision) !== revision) throw new AgendaError('CONFLICT');
  }
  async list(range: AgendaRange) {
    // Local dates can differ by two days across UTC+14 and UTC-12. Exact overlap is resolved in the domain.
    const rows = await this.tx.query<EventRow>(`SELECT ${details} FROM agenda_events WHERE owner_id=$1::uuid
      AND ((start_date < $3::date + 2 AND (COALESCE(repeat_until,start_date) + (end_date_exclusive-start_date)) > $2::date - 2)
        OR jsonb_array_length(exceptions)>0)
      ORDER BY start_date,id`, this.owner, range.startDate, range.endDateExclusive);
    return rows.map(fromEventRow);
  }
  async create(id: string, payload: EventPayload) {
    const rows = await this.tx.query<EventRow>(`INSERT INTO agenda_events
      (owner_id,id,title,description,category,schedule_kind,start_date,end_date_exclusive,start_local,end_local,
       time_zone,start_offset_minutes,end_offset_minutes,start_at,end_at,repeat_kind,repeat_until,color,reminder_minutes,reminder_time_zone)
      VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7::date,$8::date,$9,$10,$11,$12::int,$13::int,$14::timestamptz,$15::timestamptz,$16,$17::date,$18,$19::int,$20)
      ON CONFLICT(id) DO NOTHING RETURNING ${eventColumns}`, this.owner, id, ...eventValues(payload));
    if (!rows[0]) throw new AgendaError('CONFLICT');
    return fromEventRow(rows[0]);
  }
  async replace(id: string, revision: string, payload: EventPayload) {
    await this.verifyRevision(id, revision);
    const current = await this.get(id);
    if (!current) throw new AgendaError('FORBIDDEN');
    const dates = new Set(seriesSchedules(payload).map(schedule => schedule.kind === 'ALL_DAY' ? schedule.startDate : schedule.startLocal.slice(0,10)));
    const exceptions = (current.exceptions ?? []).filter(item => payload.repeat.kind !== 'NONE' && dates.has(item.date));
    const [row] = await this.tx.query<EventRow>(`UPDATE agenda_events SET title=$3,description=$4,category=$5,schedule_kind=$6,
      start_date=$7::date,end_date_exclusive=$8::date,start_local=$9,end_local=$10,time_zone=$11,
      start_offset_minutes=$12::int,end_offset_minutes=$13::int,start_at=$14::timestamptz,end_at=$15::timestamptz,
      repeat_kind=$16,repeat_until=$17::date,color=$18,reminder_minutes=$19::int,reminder_time_zone=$20,exceptions=$22::jsonb,revision=revision+1,updated_at=clock_timestamp()
      WHERE owner_id=$1::uuid AND id=$2::uuid AND revision=$21::bigint RETURNING ${eventColumns}`,
    this.owner, id, ...eventValues(payload), revision, JSON.stringify(exceptions));
    if (!row) throw new AgendaError('CONFLICT');
    return fromEventRow(row);
  }
  async remove(id: string, revision: string) {
    await this.verifyRevision(id, revision);
    await this.tx.query('DELETE FROM agenda_events WHERE owner_id=$1::uuid AND id=$2::uuid AND revision=$3::bigint RETURNING id', this.owner, id, revision);
  }
  async changeOccurrence(id: string, revision: string, date: string, replacement: EventPayload | null) {
    agendaDate(date);
    await this.verifyRevision(id, revision);
    const current = await this.get(id);
    if (!current) throw new AgendaError('FORBIDDEN');
    if (current.repeat.kind === 'NONE' || !seriesSchedules(current).some(schedule =>
      (schedule.kind === 'ALL_DAY' ? schedule.startDate : schedule.startLocal.slice(0,10)) === date)) throw new AgendaError('INVALID_INPUT');
    const exceptions = [...(current.exceptions ?? []).filter(item => item.date !== date), { date, replacement }];
    const [row] = await this.tx.query<EventRow>(`UPDATE agenda_events SET exceptions=$4::jsonb,revision=revision+1,updated_at=clock_timestamp()
      WHERE owner_id=$1::uuid AND id=$2::uuid AND revision=$3::bigint RETURNING ${eventColumns}`,
      this.owner, id, revision, JSON.stringify(exceptions));
    if (!row) throw new AgendaError('CONFLICT');
    return fromEventRow(row);
  }
}
export function createPrivateEventRepository(tx: AgendaQuery, owner: string): PrivateEventRepository {
  return new SqlPrivateEventRepository(tx, owner);
}
