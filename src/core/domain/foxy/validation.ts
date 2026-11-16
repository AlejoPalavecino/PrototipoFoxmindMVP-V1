import { invalidInput, strictObject } from '../curriculum/plan.ts';
import { activityList, activityRevision, activityUuid } from '../activities/activity-generation-values.ts';
import type { CreateFoxyConversation, FoxyContext, FoxyPurpose, FoxySelection, SendFoxyMessage } from './foxy-ai.ts';

function context(value: unknown): FoxyContext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalidInput();
  const kind = (value as Record<string, unknown>).kind;
  if (kind === 'GENERAL') { strictObject(value, ['kind']); return { kind }; }
  if (kind === 'CLASSROOM') {
    const v = strictObject(value, ['kind', 'classroomId']);
    return { kind, classroomId: activityUuid(v.classroomId) };
  }
  return invalidInput();
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || [...value].length > max
    || /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(value)) return invalidInput();
  return value;
}
function sourceId(value: unknown): string {
  if (typeof value !== 'string' || !/^(plan|material|activity):/u.test(value)) return invalidInput();
  activityUuid(value.slice(value.indexOf(':') + 1));
  return value;
}
function selection(value: unknown, scope: FoxyContext): FoxySelection {
  const hasMode = !!value && typeof value === 'object' && Object.hasOwn(value,'mode');
  const v = strictObject(value,hasMode?['mode','topicIds','sourceIds']:['topicIds','sourceIds']);
  const topicIds = activityList(v.topicIds, 0, 100, activityUuid);
  const sourceIds = activityList(v.sourceIds, 0, 20, sourceId);
  if (new Set(topicIds.map(id => id.toLowerCase())).size !== topicIds.length
    || new Set(sourceIds.map(id => id.toLowerCase())).size !== sourceIds.length
    || sourceIds.filter(id => !id.startsWith('activity:')).length > 6
    || (scope.kind === 'GENERAL' && (topicIds.length > 0 || sourceIds.length > 0))) return invalidInput();
  if (hasMode) {
    if (v.mode !== 'ALL_CLASSROOM' || scope.kind !== 'CLASSROOM' || topicIds.length || sourceIds.length) return invalidInput();
    return { mode: v.mode, topicIds, sourceIds };
  }
  return { topicIds, sourceIds };
}
function purpose(value: unknown): FoxyPurpose {
  if (value !== 'CHAT' && value !== 'STUDY_MATERIAL' && value !== 'REVIEW' && value !== 'SUMMARY'
    && value !== 'ACTIVITY_IDEAS' && value !== 'LESSON_PLAN' && value !== 'RUBRIC') return invalidInput();
  return value;
}
export function parseCreateFoxyConversation(value: unknown): CreateFoxyConversation {
  const hasCarry = !!value && typeof value === 'object' && Object.hasOwn(value, 'carryAttachments');
  const v = strictObject(value, hasCarry ? ['requestId', 'title', 'context', 'carryAttachments'] : ['requestId', 'title', 'context']);
  const result: CreateFoxyConversation = { requestId: activityUuid(v.requestId), title: text(v.title, 200), context: context(v.context) };
  if (hasCarry) {
    const carry = strictObject(v.carryAttachments, ['sourceConversationId', 'sourceRevision', 'attachmentIds']);
    const attachmentIds = activityList(carry.attachmentIds, 1, 6, activityUuid).map(id => id.toLowerCase()).sort();
    if (new Set(attachmentIds).size !== attachmentIds.length) return invalidInput();
    result.carryAttachments = { sourceConversationId: activityUuid(carry.sourceConversationId).toLowerCase(),
      sourceRevision: activityRevision(carry.sourceRevision), attachmentIds };
  }
  return result;
}
export function parseSendFoxyMessage(value: unknown, fixedContext: FoxyContext): SendFoxyMessage {
  const v = strictObject(value, ['requestId', 'revision', 'purpose', 'text', 'selection']);
  return { requestId: activityUuid(v.requestId), revision: activityRevision(v.revision), purpose: purpose(v.purpose),
    text: text(v.text, 5000), selection: selection(v.selection, context(fixedContext)) };
}
