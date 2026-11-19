export function supportPriority(facts: { pendingCount: number; oldestDays: number; recentDelivered: number }) {
  if (facts.pendingCount > 1 || (facts.pendingCount === 1 && facts.oldestDays >= 10)) return 'high';
  if (facts.pendingCount === 1) return 'medium';
  return facts.recentDelivered >= 2 ? 'low' : 'insufficient';
}
