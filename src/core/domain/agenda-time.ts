import type { EventSchedule } from './agenda.ts';
import { agendaMinute, agendaZone, invalid, localMinuteAt } from './agenda-values.ts';

export function resolveAgendaMinute(local: string, zone: string, offset?: number): string {
  agendaMinute(local);
  agendaZone(zone);
  const wall = Date.parse(`${local}:00Z`);
  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = wall + hours * 3600000;
    offsets.add((Date.parse(`${localMinuteAt(sample, zone)}:00Z`) - sample) / 60000);
  }
  const choices = [...offsets].map(offsetMinutes => ({ offsetMinutes,
    instant: wall - offsetMinutes * 60000 })).filter(choice => localMinuteAt(choice.instant, zone) === local);
  if (offset !== undefined && !Number.isInteger(offset)) return invalid();
  const choice = offset === undefined
    ? choices.length === 1 ? choices[0] : undefined
    : choices.find(item => item.offsetMinutes === offset);
  if (!choice) return invalid({ local, timeZone: zone, choices: choices.map(item => ({
    offsetMinutes: item.offsetMinutes, instant: new Date(item.instant).toISOString(),
  })) });
  return new Date(choice.instant).toISOString();
}
export function scheduleInstants(schedule: Extract<EventSchedule, { kind: 'TIMED' }>) {
  const startAt = resolveAgendaMinute(schedule.startLocal, schedule.timeZone, schedule.startOffsetMinutes);
  const endAt = resolveAgendaMinute(schedule.endLocal, schedule.timeZone, schedule.endOffsetMinutes);
  if (endAt <= startAt) return invalid();
  return { startAt, endAt };
}
