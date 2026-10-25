import { HomeError } from './home.ts';
export function homeInvalid(): never { throw new HomeError('INVALID_INPUT'); }
export function homeObject(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return homeInvalid();
  if (Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !(key in value))) return homeInvalid();
  return value as Record<string, unknown>;
}
export function homeString(value: unknown, max = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) return homeInvalid();
  return value;
}
export function homeId(value: unknown): string {
  const id = homeString(value, 36);
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) return homeInvalid();
  return id;
}
export function homeDate(value: unknown): string {
  const text = homeString(value, 10), parsed = new Date(`${text}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) return homeInvalid();
  return text;
}
export function homeInstant(value: unknown): string {
  const text = homeString(value, 24), parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== text) return homeInvalid();
  return text;
}
export function homeZone(value: unknown): string {
  const zone = homeString(value, 100);
  if (/^[+-]/.test(zone)) return homeInvalid();
  try { new Intl.DateTimeFormat('en', { timeZone: zone }); } catch { return homeInvalid(); }
  return zone;
}
export function homeCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return homeInvalid();
  return value;
}
export function homeEnum<T extends string>(value: unknown, options: readonly T[]): T {
  if (typeof value !== 'string' || !options.includes(value as T)) return homeInvalid();
  return value as T;
}
export function homeBool(value: unknown): boolean { if (typeof value !== 'boolean') return homeInvalid(); return value; }
export function homeCursor(value: unknown): string | null {
  if (value === null) return null;
  return homeString(value, 2048);
}
