import { zoneChoices } from '../agenda-ui/index.ts';

/** Keep the complete city catalog and any inherited zone, with common cities first. */
export function classroomZones(current: string) {
  const common = zoneChoices(current);
  const seen = new Set(common.map(zone => {
    try { return new Intl.DateTimeFormat('es', { timeZone: zone.value }).resolvedOptions().timeZone; }
    catch { return zone.value; }
  }));
  const remaining = Intl.supportedValuesOf('timeZone').filter(value => !seen.has(value)).map(value => ({
    value, label: `${value.split('/').at(-1)!.replaceAll('_', ' ')} · ${value.split('/')[0]}`,
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  return [...common, ...remaining];
}
