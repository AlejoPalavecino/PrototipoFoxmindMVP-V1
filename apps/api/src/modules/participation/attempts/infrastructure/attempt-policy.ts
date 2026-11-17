import { timingSafeEqual } from 'node:crypto';
import { digest } from '../../../../platform/crypto/digest.ts';

export { activityReceptionPolicy as receptionPolicy } from '../../../../../../../src/core/domain/participation/activity-reception.ts';

export { editorCapability, type EditorCapability } from '../../domain/attempt-policy.ts';
import type { EditorCapability } from '../../domain/attempt-policy.ts';
export function matchesEditor(hash: string | null, epoch: bigint, capability: EditorCapability) {
  if (!hash || epoch.toString() !== capability.epoch) return false;
  const supplied = Buffer.from(digest(capability.token)), stored = Buffer.from(hash);
  return supplied.length === stored.length && timingSafeEqual(supplied, stored);
}
