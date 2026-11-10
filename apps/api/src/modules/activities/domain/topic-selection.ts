import { fail, uuid } from '../../../../../../src/core/domain/classrooms/policy.ts';
export function activityTopics(input: Record<string, unknown>, required: boolean) {
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
