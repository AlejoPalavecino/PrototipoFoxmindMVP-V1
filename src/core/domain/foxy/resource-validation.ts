import { invalidInput, strictObject } from '../curriculum/plan.ts';
import { activityRevision, activityUuid } from '../activities/activity-generation-values.ts';
import type { FoxyAnswer, FoxyReference, EditFoxyResource, PrepareFoxyPublication, PrepareFoxyVisualPublication, ConfirmFoxyPublication, RetryFoxyPublication, DiscardFoxyPublication } from './resource.ts';

function text(value: unknown, max?: number): string {
  if (typeof value !== 'string' || !value.trim() || (max !== undefined && [...value].length > max)
    || /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(value)) return invalidInput();
  return value;
}
function list<T>(value: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) return invalidInput();
  return value.map(parse);
}
function reference(value: unknown): FoxyReference {
  const v = strictObject(value, ['sourceId', 'page']);
  if (typeof v.sourceId !== 'string' || !/^(plan|material|activity):/u.test(v.sourceId)) return invalidInput();
  activityUuid(v.sourceId.slice(v.sourceId.indexOf(':') + 1));
  if (v.page !== null && (typeof v.page !== 'number' || !Number.isSafeInteger(v.page) || v.page < 1)) return invalidInput();
  return { sourceId: v.sourceId, page: v.page as number | null };
}
function nullableUuid(value: unknown): string | null { return value === null ? null : activityUuid(value); }
export function parseFoxyAnswer(value: unknown): FoxyAnswer {
  const v = strictObject(value, ['schemaVersion', 'title', 'markdown', 'references', 'warnings', 'missingInformation']);
  if (v.schemaVersion !== 'foxy-answer-v1') return invalidInput();
  return { schemaVersion: v.schemaVersion, title: text(v.title, 200), markdown: text(v.markdown),
    references: list(v.references, reference), warnings: list(v.warnings, item => text(item)),
    missingInformation: list(v.missingInformation, item => text(item)) };
}
export function parseEditFoxyResource(value: unknown): EditFoxyResource {
  const v = strictObject(value, ['requestId', 'revision', 'title', 'markdown']);
  return { requestId: activityUuid(v.requestId), revision: activityRevision(v.revision),
    title: text(v.title, 200), markdown: text(v.markdown) };
}
export function parsePrepareFoxyPublication(value: unknown): PrepareFoxyPublication {
  const v = strictObject(value, ['requestId', 'resourceRevision', 'classroomId', 'title', 'unitId', 'topicId']);
  const unitId = nullableUuid(v.unitId), topicId = nullableUuid(v.topicId);
  if ((topicId !== null && unitId === null) || (typeof v.title === 'string' && /[\u0009\u000a]/u.test(v.title))) return invalidInput();
  return { requestId: activityUuid(v.requestId), resourceRevision: activityRevision(v.resourceRevision),
    classroomId: activityUuid(v.classroomId), title: text(v.title, 200), unitId, topicId };
}
export function parsePrepareFoxyVisualPublication(value: unknown): PrepareFoxyVisualPublication {
  const v = strictObject(value, ['requestId', 'assetRevision', 'classroomId', 'title', 'unitId', 'topicId']);
  const unitId = nullableUuid(v.unitId), topicId = nullableUuid(v.topicId);
  if ((topicId !== null && unitId === null) || (typeof v.title === 'string' && /[\u0009\u000a]/u.test(v.title))) return invalidInput();
  return { requestId: activityUuid(v.requestId), assetRevision: activityRevision(v.assetRevision),
    classroomId: activityUuid(v.classroomId), title: text(v.title, 200), unitId, topicId };
}
export function parseConfirmFoxyPublication(value: unknown): ConfirmFoxyPublication {
  const v = strictObject(value, ['requestId', 'publicationRevision', 'classroomRevision', 'confirm']);
  if (v.confirm !== true) return invalidInput();
  return { requestId: activityUuid(v.requestId), publicationRevision: activityRevision(v.publicationRevision),
    classroomRevision: activityRevision(v.classroomRevision), confirm: true };
}

export function parseRetryFoxyPublication(value: unknown): RetryFoxyPublication {
  const v = strictObject(value, ['requestId', 'publicationRevision']);
  return { requestId: activityUuid(v.requestId), publicationRevision: activityRevision(v.publicationRevision) };
}
export function parseDiscardFoxyPublication(value: unknown): DiscardFoxyPublication {
  const v = strictObject(value, ['requestId', 'publicationRevision', 'confirm']);
  if (v.confirm !== true) return invalidInput();
  return { requestId: activityUuid(v.requestId), publicationRevision: activityRevision(v.publicationRevision), confirm: true };
}
