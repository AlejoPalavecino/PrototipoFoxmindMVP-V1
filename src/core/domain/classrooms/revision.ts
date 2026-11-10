import { fail } from './policy.ts';
export function revision(value: unknown): string {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,17})$/.test(value)) return fail('INVALID_INPUT');
  return value;
}
