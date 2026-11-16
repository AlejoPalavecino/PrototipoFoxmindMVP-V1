import type { AgendaQuery } from '../application/ports.ts';
import { agendaEventNotices } from '../../../../../../src/core/domain/agenda/index.ts';
import { eventColumns, fromEventRow, type EventRow } from './event-row.ts';

export async function duePrivateAgendaNotices(tx: AgendaQuery, actor: string, now: string, eventId: string | null = null) {
  const rows = await tx.query<EventRow>(`SELECT ${eventColumns} FROM agenda_events
    WHERE owner_id=$1::uuid AND ($2::uuid IS NULL OR id=$2::uuid)
      AND (reminder_minutes IS NOT NULL OR exceptions @? '$[*].replacement.reminder')`, actor, eventId);
  return rows.flatMap(row => agendaEventNotices(fromEventRow(row), now).map(notice => ({
    id: `event-${row.id}-${notice.occurrenceDate}`, eventId: row.id, ...notice,
  })));
}
