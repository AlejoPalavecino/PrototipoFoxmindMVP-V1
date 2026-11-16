import { invalidInput, strictObject } from '../curriculum/plan.ts';
import type { ApplyActivityGeneration, StartActivityGeneration } from './activity-generation.ts';
import { activityInteger, activityList, activityRevision, activityText, activityType, activityUuid,
  activityWarnings, checkActivityCounts } from './activity-generation-values.ts';

const startKeys = ['revision', 'requestId', 'type', 'unitId', 'topicIds', 'sourceIds', 'objective',
  'groupLevel', 'difficulty', 'durationMinutes', 'context', 'counts', 'acknowledgedWarnings'];

function generationKeys(value: unknown) {
  if (value && typeof value === 'object' && Object.hasOwn(value, 'unitIds')) {
    return [...startKeys.filter(key => !['unitId', 'objective'].includes(key) || Object.hasOwn(value, key)), 'unitIds', 'teacherBrief'];
  }
  return value && typeof value === 'object' && Object.hasOwn(value, 'teacherBrief') ? [...startKeys, 'teacherBrief'] : startKeys;
}

export function parseStartActivityGeneration(value: unknown): StartActivityGeneration {
  const v = strictObject(value, generationKeys(value));
  const c = strictObject(v.counts, ['assignment', 'development', 'singleChoice', 'multipleChoice']);
  const type = activityType(v.type), counts = { assignment: activityInteger(c.assignment, 0, 20),
    development: activityInteger(c.development, 0, 30), singleChoice: activityInteger(c.singleChoice, 0, 30),
    multipleChoice: activityInteger(c.multipleChoice, 0, 30) };
  checkActivityCounts(counts, type);
  const sourceIds = activityList(v.sourceIds, 0, 6, source => {
    if (typeof source !== 'string' || !/^(plan|material):/u.test(source)) return invalidInput();
    activityUuid(source.slice(source.indexOf(':') + 1)); return source;
  });
  const extended = Object.hasOwn(v, 'unitIds');
  const unitIds = extended ? activityList(v.unitIds, 0, 100, activityUuid) : undefined;
  const teacherBrief = Object.hasOwn(v, 'teacherBrief') ? activityText(v.teacherBrief, 1200, true).trim() : undefined;
  const topicIds = activityList(v.topicIds, unitIds?.length ? 0 : 1, 100, activityUuid);
  const context = activityText(v.context, 5000);
  if (!sourceIds.length && !context.trim() && !teacherBrief) return invalidInput();
  if (!['BASIC', 'INTERMEDIATE', 'ADVANCED'].includes(String(v.difficulty))) return invalidInput();
  return { revision: activityRevision(v.revision), requestId: activityUuid(v.requestId), type,
    unitId: extended && v.unitId === undefined ? '' : activityUuid(v.unitId), topicIds, sourceIds,
    ...(extended ? { unitIds } : {}), ...(teacherBrief ? { teacherBrief } : {}),
    objective: extended && v.objective === undefined ? '' : activityText(v.objective, 1000, !extended), groupLevel: activityText(v.groupLevel, 200),
    difficulty: v.difficulty as StartActivityGeneration['difficulty'], durationMinutes: activityInteger(v.durationMinutes, 5, 240),
    context, counts, acknowledgedWarnings: activityWarnings(v.acknowledgedWarnings) };
}

export function parseRegenerateActivityGeneration(value: unknown) {
  const keys = generationKeys(value);
  const raw = strictObject(value, [...keys, 'acknowledgePossibleCharge']);
  if (typeof raw.acknowledgePossibleCharge !== 'boolean') return invalidInput();
  const body = parseStartActivityGeneration(Object.fromEntries(keys.map(key => [key, raw[key]])));
  // Previously accepted request IDs are bound to the raw regeneration payload.
  return { body, raw, acknowledgePossibleCharge: raw.acknowledgePossibleCharge };
}
export function parseApplyActivityGeneration(value: unknown): ApplyActivityGeneration {
  const v = strictObject(value, ['revision', 'requestId', 'proposal']);
  if (!v.proposal || typeof v.proposal !== 'object' || Array.isArray(v.proposal)) return invalidInput();
  return { revision: activityRevision(v.revision), requestId: activityUuid(v.requestId), proposal: v.proposal as ApplyActivityGeneration['proposal'] };
}
