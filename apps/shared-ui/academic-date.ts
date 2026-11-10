

export function activityMinute(instant: string | null, zone: string) {
  if (!instant) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant)).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function activityDate(instant: string | null, zone: string) {
  return instant ? `${new Intl.DateTimeFormat('es', { timeZone: zone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instant))} · ${zone}` : `Sin fecha límite · ${zone}`;
}
