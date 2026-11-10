export function contractObject(value: unknown, keys?: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_INPUT');
  const object = value as Record<string, unknown>;
  if (keys && Object.keys(object).some(key => !keys.includes(key))) throw new Error('INVALID_INPUT');
  return object;
}
export function contractRevision(value: unknown): string {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,17})$/.test(value)) throw new Error('INVALID_INPUT');
  return value;
}
export function contractUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
}
export function contractDecimal(value: unknown): bigint {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) throw new Error('INVALID_INPUT');
  const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}
export function contractFeedback(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string' || [...value].length > 5000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)) throw new Error('INVALID_INPUT');
  return value || null;
}
