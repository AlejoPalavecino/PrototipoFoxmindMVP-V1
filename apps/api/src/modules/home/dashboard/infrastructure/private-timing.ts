import { HomeError, type AgendaItem } from '../../../../../../../src/core/domain/home/home.ts';
import { localMinuteAt } from '../../../../../../../src/core/domain/agenda/values.ts';
import { scheduleInstants } from '../../../../../../../src/core/domain/agenda/time.ts';
import { seriesSchedules } from '../../../../../../../src/core/domain/agenda/series.ts';
import { type EventSchedule, type EventRepeat } from '../../../../../../../src/core/domain/agenda/types.ts';
export interface PrivateTiming { schedule: EventSchedule; repeat: EventRepeat }
/** SQL finds bounded candidates; the same Agenda domain resolves the actual local schedule and DST policy. */
export function projectPrivateTiming(item: AgendaItem, timing: PrivateTiming | null, timeZone: string): AgendaItem {
  if (timing === null) return item;
  if (item.target.kind !== 'private-event') throw new HomeError('SERVICE_UNAVAILABLE');
  const date = item.target.date;
  const schedule = seriesSchedules({title:item.title,description:'',category:'CLASS',...timing})
    .find(value => (value.kind === 'TIMED' ? value.startLocal.slice(0,10) : value.startDate) === date);
  if (!schedule) throw new HomeError('SERVICE_UNAVAILABLE');
  if (schedule.kind === 'ALL_DAY') return item;
  const startAt = scheduleInstants(schedule).startAt;
  const viewDate = localMinuteAt(Date.parse(startAt), timeZone).slice(0, 10);
  return {...item,startAt,timeZone:schedule.timeZone,date:viewDate,target:{...item.target,date:viewDate}};
}
