import { invalidInput, strictObject } from './study-plan.ts';
import type { ApplyActivityGeneration, StartActivityGeneration } from './activity-generation.ts';
import { activityInteger, activityList, activityRevision, activityText, activityType, activityUuid,
  activityWarnings, checkActivityCounts } from './activity-generation-values.ts';

export function parseStartActivityGeneration(value: unknown): StartActivityGeneration {
  const v = strictObject(value, ['revision', 'requestId', 'type', 'unitId', 'topicIds', 'sourceIds', 'objective',
    'groupLevel', 'difficulty', 'durationMinutes', 'context', 'counts', 'acknowledgedWarnings']);
  const c = strictObject(v.counts, ['assignment', 'development', 'singleChoice', 'multipleChoice']);
  const type = activityType(v.type), counts = { assignment: activityInteger(c.assignment, 0, 20),
    development: activityInteger(c.development, 0, 30), singleChoice: activityInteger(c.singleChoice, 0, 30),
    multipleChoice: activityInteger(c.multipleChoice, 0, 30) };
  checkActivityCounts(counts, type);
  const sourceIds = activityList(v.sourceIds, 0, 6, source => {
    if (typeof source !== 'string' || !/^(plan|material):/u.test(source)) return invalidInput();
    activityUuid(source.slice(source.indexOf(':') + 1)); return source;
  });
  const context = activityText(v.context, 5000);
  if (!sourceIds.length && !context.trim()) return invalidInput();
  if (!['BASIC', 'INTERMEDIATE', 'ADVANCED'].includes(String(v.difficulty))) return invalidInput();
  return { revision: activityRevision(v.revision), requestId: activityUuid(v.requestId), type,
    unitId: activityUuid(v.unitId), topicIds: activityList(v.topicIds, 1, 100, activityUuid), sourceIds,
    objective: activityText(v.objective, 1000, true), groupLevel: activityText(v.groupLevel, 200),
    difficulty: v.difficulty as StartActivityGeneration['difficulty'], durationMinutes: activityInteger(v.durationMinutes, 5, 240),
    context, counts, acknowledgedWarnings: activityWarnings(v.acknowledgedWarnings) };
}
export function parseApplyActivityGeneration(value: unknown): ApplyActivityGeneration {
  const v = strictObject(value, ['revision', 'requestId', 'proposal']);
  if (!v.proposal || typeof v.proposal !== 'object' || Array.isArray(v.proposal)) return invalidInput();
  return { revision: activityRevision(v.revision), requestId: activityUuid(v.requestId), proposal: v.proposal as ApplyActivityGeneration['proposal'] };
}
