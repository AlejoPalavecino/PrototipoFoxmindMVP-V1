export interface ZoneChoice { value: string; label: string }

const cities: Readonly<Record<string, string>> = {
  'America/Argentina/Buenos_Aires': 'Buenos Aires, Argentina',
  'America/Montevideo': 'Montevideo, Uruguay',
  'America/New_York': 'Nueva York, Estados Unidos', 'America/Mexico_City': 'Ciudad de México, México',
  'America/Santiago': 'Santiago, Chile', 'America/Bogota': 'Bogotá, Colombia',
  'Europe/Madrid': 'Madrid, España', 'Europe/London': 'Londres, Reino Unido',
  'Asia/Tokyo': 'Tokyo (Tokio), Japón', 'UTC': 'Hora universal',
};
function readableZone(zone: string): string {
  return cities[zone] ?? zone.split('/').at(-1)!.replaceAll('_', ' ');
}
export function zoneLabel(zone: string): string {
  return zone === 'UTC' ? 'Hora universal' : `Hora de ${readableZone(zone).split(',')[0]}`;
}
function canonicalZone(zone: string): string {
  try { return new Intl.DateTimeFormat('es-AR', { timeZone: zone }).resolvedOptions().timeZone; }
  catch { return zone; }
}
export function zoneChoices(currentZone: string): readonly ZoneChoice[] {
  const current = canonicalZone(currentZone);
  const suggestions = Object.keys(cities).filter(value => canonicalZone(value) !== current);
  return [...suggestions, currentZone].map(value => ({ value, label: readableZone(value) }));
}
