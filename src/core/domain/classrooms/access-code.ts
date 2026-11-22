/** Alfabeto sin caracteres ambiguos (0/O, 1/I/L, U) para los códigos de aula nuevos. */
export const CLASSROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CLASSROOM_CODE_LENGTH = 8;

const modern = new RegExp(`^[${CLASSROOM_CODE_ALPHABET}]{${CLASSROOM_CODE_LENGTH}}$`);

/**
 * Normaliza lo que escribe una persona: recorta, pasa a mayúsculas y quita espacios y guiones.
 * Acepta un código nuevo de 8 caracteres o un código anterior de 6 dígitos; el resto es inválido.
 */
export function normalizeAccessCodeInput(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 48) return;
  const compact = value.trim().replace(/[\s-]/g, '').toUpperCase();
  if (/^[0-9]{6}$/.test(compact) || modern.test(compact)) return compact;
}

/** Presentación agrupada: ABCD-EFGH. Los códigos anteriores de 6 dígitos se muestran como 123 456. */
export function formatAccessCode(code: string): string {
  if (modern.test(code)) return `${code.slice(0, 4)}-${code.slice(4)}`;
  if (/^[0-9]{6}$/.test(code)) return `${code.slice(0, 3)} ${code.slice(3)}`;
  return code;
}
