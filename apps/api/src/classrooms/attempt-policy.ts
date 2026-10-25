import { timingSafeEqual } from 'node:crypto';
import { digest, fail } from './policy.ts';

export { activityReceptionPolicy as receptionPolicy } from '../../../../src/core/domain/index.ts';

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
