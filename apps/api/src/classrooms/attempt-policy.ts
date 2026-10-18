import { timingSafeEqual } from 'node:crypto';
import { digest, fail } from './policy.ts';

/** Use only server receipt time observed after the relevant transaction locks. */
export function receptionPolicy(general: Date | null, individual: Date | null, allowLate: boolean, now: Date) {
  const deadline = individual && (!general || individual > general) ? individual : general;
  const late = deadline !== null && now.getTime() >= deadline.getTime();
  return { deadline, open: !late || allowLate, late };
}

export interface EditorCapability { token: string; epoch: string }
export function editorCapability(token: unknown, epoch: unknown): EditorCapability {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)
    || typeof epoch !== 'string' || !/^(0|[1-9][0-9]{0,18})$/.test(epoch)) return fail('INVALID_INPUT');
  return { token, epoch };
}
export function matchesEditor(hash: string | null, epoch: bigint, capability: EditorCapability) {
  if (!hash || epoch.toString() !== capability.epoch) return false;
  const supplied = Buffer.from(digest(capability.token)), stored = Buffer.from(hash);
  return supplied.length === stored.length && timingSafeEqual(supplied, stored);
}
