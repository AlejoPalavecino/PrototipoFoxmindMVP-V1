import { normalizeAccessCodeInput } from '../../../../../../../src/core/domain/classrooms/access-code.ts';

/** Código legado de 6 dígitos o código nuevo de 8 caracteres; `undefined` si la forma es inválida. */
export function normalizeClassroomCode(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length === 24 && /^[\w-]{24}$/.test(value)) return value; // legado histórico
  return normalizeAccessCodeInput(value);
}
