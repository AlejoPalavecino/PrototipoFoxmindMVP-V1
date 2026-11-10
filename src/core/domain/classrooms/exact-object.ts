import { object, fail } from './policy.ts';

export function exactActivityObject(input: unknown, keys: string[]) {
  const value = object(input, keys);
  if (keys.some(key => !Object.hasOwn(value, key))) return fail('INVALID_INPUT');
  return value;
}
export { exactActivityObject as exactObject };
