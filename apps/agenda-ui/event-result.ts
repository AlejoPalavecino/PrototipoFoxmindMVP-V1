import { scheduleInstants, type PrivateEvent } from '../../src/core/domain/index.ts';
import { dateAt } from './calendar.ts';

export function eventFocusDay(event: PrivateEvent, viewZone: string): string {
  if (event.schedule.kind === 'ALL_DAY') return event.schedule.startDate;
  return dateAt(scheduleInstants(event.schedule).startAt, viewZone);
}
