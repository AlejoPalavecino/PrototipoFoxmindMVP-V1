import { fail } from '../../../../../../src/core/domain/classrooms/policy.ts';
export { activityReceptionPolicy as receptionPolicy } from '../../../../../../src/core/domain/participation/activity-reception.ts';
export interface EditorCapability { token: string; epoch: string }
export function editorCapability(token: unknown, epoch: unknown): EditorCapability {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)
    || typeof epoch !== 'string' || !/^(0|[1-9][0-9]{0,18})$/.test(epoch)) return fail('INVALID_INPUT');
  return { token, epoch };
}
