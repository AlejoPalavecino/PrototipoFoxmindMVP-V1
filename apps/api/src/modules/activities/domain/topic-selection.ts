import { fail, uuid } from '../../../../../../src/core/domain/classrooms/policy.ts';
export interface ActivityTopicSelection { unitId: string | null; unitIds?: string[]; topicIds: string[] }
export interface ResolvedActivityScope { unitId: string | null; topics: { id: string; name: string; unit_id: string }[] }
export function activityTopics(input: Record<string, unknown>, required: boolean) {
  if (Object.hasOwn(input, 'unitIds')) {
    const { unitIds, topicIds } = input;
    if (!Array.isArray(unitIds) || unitIds.length > 100 || !unitIds.every(uuid) || new Set(unitIds).size !== unitIds.length
      || !Array.isArray(topicIds) || topicIds.length > 100 || !topicIds.every(uuid) || new Set(topicIds).size !== topicIds.length
      || (required && !unitIds.length && !topicIds.length)
      || (input.unitId !== undefined && input.unitId !== null && !uuid(input.unitId))
      || (Object.hasOwn(input, 'topicId') && input.topicId !== (topicIds[0] ?? null))) return fail('INVALID_INPUT');
    return { unitIds: unitIds as string[], unitId: null, topicIds: topicIds as string[], topicId: topicIds[0] as string | undefined ?? null };
  }
  const hasList = Object.hasOwn(input, 'topicIds'), hasLegacy = Object.hasOwn(input, 'topicId');
  if (!hasList && !hasLegacy) return fail('INVALID_INPUT');
  const topicIds: unknown = hasList ? input.topicIds : input.topicId === null ? [] : [input.topicId];
  if (!Array.isArray(topicIds) || topicIds.length > 100 || !topicIds.every(uuid)
    || new Set(topicIds).size !== topicIds.length) return fail('INVALID_INPUT');
  const topicId = topicIds[0] ?? null;
  if (hasLegacy && input.topicId !== topicId) return fail('INVALID_INPUT');
  if ((input.unitId !== null && !uuid(input.unitId)) || (topicIds.length > 0 && input.unitId === null)
    || (required && (input.unitId === null || topicIds.length === 0))) return fail('INVALID_INPUT');
  return { unitId: input.unitId as string | null, topicId: topicId as string | null, topicIds: topicIds as string[] };
}
