import { fail, object } from '../../../../../../src/core/domain/classrooms/policy.ts';

export interface DeadlineInput { local: string; offsetMinutes?: number }
export interface DeadlineChoice { instant: string; offsetMinutes: number; offset: string }

/** Parse a wall-clock minute without using either the browser or server local zone. */
function wallMinute(value: unknown): { local: string; instant: number } {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return fail('INVALID_INPUT');
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59) return fail('INVALID_INPUT');
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day); date.setUTCHours(hour, minute, 0, 0);
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return fail('INVALID_INPUT');
  return { local: value, instant: date.getTime() };
}

export function deadlineChoices(zone: string, value: unknown) {
  const wall = wallMinute(value);
  let formatter: Intl.DateTimeFormat;
  try {
    if (!zone || /^[+-]/.test(zone)) return fail('INVALID_INPUT');
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  } catch { return fail('INVALID_INPUT'); }
  const localAt = (instant: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(p => [p.type, p.value]));
    return `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  };
  // Discover actual zone offsets around this date, then verify each candidate by round trip.
  // This handles non-hour transitions and does not assume a country's current fixed offset.
  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = wall.instant + hours * 3_600_000;
    offsets.add((wallMinute(localAt(sample)).instant - sample) / 60_000);
  }
  const choices: DeadlineChoice[] = [];
  for (const offsetMinutes of offsets) {
    const candidate = wall.instant - offsetMinutes * 60_000;
    if (localAt(candidate) !== wall.local) continue;
    const absolute = Math.abs(offsetMinutes);
    choices.push({ instant: new Date(candidate).toISOString(), offsetMinutes,
      offset: `UTC${offsetMinutes < 0 ? '-' : '+'}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}` });
  }
  choices.sort((a, b) => a.instant.localeCompare(b.instant));
  return { zone, local: wall.local, reason: choices.length === 0 ? 'NONEXISTENT' : choices.length > 1 ? 'AMBIGUOUS' : null, choices };
}

export function resolveDeadline(zone: string, input: unknown): Date | null {
  if (input === null) return null;
  const source = object(input, ['local', 'offsetMinutes']);
  const result = deadlineChoices(zone, source.local);
  if (source.offsetMinutes !== undefined && !Number.isInteger(source.offsetMinutes)) return fail('INVALID_INPUT');
  if (!result.choices.length || (result.choices.length > 1 && source.offsetMinutes === undefined)) return fail('INVALID_INPUT');
  const choice = source.offsetMinutes === undefined ? result.choices[0] : result.choices.find(c => c.offsetMinutes === source.offsetMinutes);
  if (!choice) return fail('INVALID_INPUT');
  return new Date(choice.instant);
}
