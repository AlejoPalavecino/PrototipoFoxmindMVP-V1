import { fail } from '../../../classrooms/public.ts';

/** Positional serialization is persisted; changing order would invalidate request receipts. */
export function requestPayload(operation: string, draftId: string, id: string, input: unknown): string {
  return JSON.stringify([operation, draftId, id, input]);
}

export function replayedExtraction(row: { input_hash: string; extraction_id: string } | undefined, hash: string): string | null {
  if (row && row.input_hash !== hash) return fail('CONFLICT');
  return row?.extraction_id ?? null;
}
