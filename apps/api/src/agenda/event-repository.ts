import { AgendaError, type AgendaRange, type EventPayload, type PrivateEventRepository } from '../../../../src/core/domain/index.ts';
import type { AgendaQuery } from './database-types.ts';
import { eventColumns, eventValues, fromEventRow, type EventRow } from './event-row.ts';

class SqlPrivateEventRepository implements PrivateEventRepository {
  constructor(private readonly tx: AgendaQuery, private readonly owner: string) {}
  async get(id: string) {
    const [row] = await this.tx.query<EventRow>(`SELECT ${eventColumns} FROM agenda_events WHERE owner_id=$1::uuid AND id=$2::uuid`, this.owner, id);
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
    const rows = await this.tx.query<EventRow>(`SELECT ${eventColumns} FROM agenda_events WHERE owner_id=$1::uuid
      AND start_date < $3::date + 2 AND (COALESCE(repeat_until,start_date) + (end_date_exclusive-start_date)) > $2::date - 2
      ORDER BY start_date,id`, this.owner, range.startDate, range.endDateExclusive);
    return rows.map(fromEventRow);
  }
  async create(id: string, payload: EventPayload) {
    const rows = await this.tx.query<EventRow>(`INSERT INTO agenda_events
      (owner_id,id,title,description,category,schedule_kind,start_date,end_date_exclusive,start_local,end_local,
       time_zone,start_offset_minutes,end_offset_minutes,start_at,end_at,repeat_kind,repeat_until)
      VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7::date,$8::date,$9,$10,$11,$12::int,$13::int,$14::timestamptz,$15::timestamptz,$16,$17::date)
      ON CONFLICT(id) DO NOTHING RETURNING ${eventColumns}`, this.owner, id, ...eventValues(payload));
    if (!rows[0]) throw new AgendaError('CONFLICT');
    return fromEventRow(rows[0]);
  }
  async replace(id: string, revision: string, payload: EventPayload) {
    await this.verifyRevision(id, revision);
    const [row] = await this.tx.query<EventRow>(`UPDATE agenda_events SET title=$3,description=$4,category=$5,schedule_kind=$6,
      start_date=$7::date,end_date_exclusive=$8::date,start_local=$9,end_local=$10,time_zone=$11,
      start_offset_minutes=$12::int,end_offset_minutes=$13::int,start_at=$14::timestamptz,end_at=$15::timestamptz,
      repeat_kind=$16,repeat_until=$17::date,revision=revision+1,updated_at=clock_timestamp()
      WHERE owner_id=$1::uuid AND id=$2::uuid AND revision=$18::bigint RETURNING ${eventColumns}`,
    this.owner, id, ...eventValues(payload), revision);
    if (!row) throw new AgendaError('CONFLICT');
    return fromEventRow(row);
  }
  async remove(id: string, revision: string) {
    await this.verifyRevision(id, revision);
    await this.tx.query('DELETE FROM agenda_events WHERE owner_id=$1::uuid AND id=$2::uuid AND revision=$3::bigint RETURNING id', this.owner, id, revision);
  }
}
export function createPrivateEventRepository(tx: AgendaQuery, owner: string): PrivateEventRepository {
  return new SqlPrivateEventRepository(tx, owner);
}
