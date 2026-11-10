import { activityReceptionPolicy, HomeError } from '../../../../../../src/core/domain/index.ts';
export interface PendingPolicyRow { general: string | null; individual: string | null; allowLate: boolean }
export function projectPendingPolicy(item: unknown, policy: PendingPolicyRow, now: string): unknown {
  if (!item || typeof item !== 'object') throw new HomeError('SERVICE_UNAVAILABLE');
  const result = activityReceptionPolicy(policy.general === null ? null : new Date(policy.general),
    policy.individual === null ? null : new Date(policy.individual), policy.allowLate, new Date(now));
  return { ...item, deadlineAt: result.deadline?.toISOString() ?? null, reception: result.open ? 'open' : 'closed', late: result.late };
}
