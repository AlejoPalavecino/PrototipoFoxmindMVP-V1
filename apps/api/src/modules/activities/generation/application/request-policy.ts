import { fail } from '../../../classrooms/public.ts';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

/** Preserve the persisted request hash format, including recursive property order. */
export function requestPayload(operation: string, classroomId: string, id: string | null, body: unknown): string {
  return JSON.stringify(canonical({ operation, classroomId, id, body }));
}

export function replayedGeneration(row: { input_hash: string; generation_id: string } | undefined, hash: string): string | null {
  if (!row) return null;
  if (row.input_hash !== hash) return fail('CONFLICT');
  return row.generation_id;
}
