import { fail, object, text, uuid } from './policy.ts';

export type ActivityType = 'ASSIGNMENT' | 'QUESTIONNAIRE' | 'EVALUATION';
export interface AuthoringQuestion {
  type: 'DEVELOPMENT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  prompt: string; points: string; scoringRule: 'EXACT' | 'PARTIAL' | null;
  options: { text: string; correct: boolean }[];
}
export interface ActivityPayload {
  title: string | null; unitId: string | null; topicId: string | null; instructions: string | null;
  attachmentRequired: boolean; instructionFileIds: string[]; materialIds: string[];
  questions: AuthoringQuestion[]; deadline: unknown; allowLate: boolean;
}
export function activityType(value: unknown): ActivityType {
  if (typeof value !== 'string' || !['ASSIGNMENT', 'QUESTIONNAIRE', 'EVALUATION'].includes(value)) return fail('INVALID_INPUT');
  return value as ActivityType;
}
export function exactActivityObject(input: unknown, keys: string[]) {
  const value = object(input, keys);
  if (keys.some(key => !Object.hasOwn(value, key))) return fail('INVALID_INPUT');
  return value;
}
function multiline(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)
    || [...value].length > max || (required && !value.trim())) return fail('INVALID_INPUT');
  return value;
}
function ids(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every(uuid) || new Set(value).size !== value.length) return fail('INVALID_INPUT');
  return value;
}
export function authoringQuestion(input: unknown): AuthoringQuestion {
  const q = exactActivityObject(input, ['type', 'prompt', 'points', 'scoringRule', 'options']);
  if (!['DEVELOPMENT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(q.type)) return fail('INVALID_INPUT');
  // Numeric input is canonical decimal text: no exponent, infinities or silently rounded precision.
  if (typeof q.points !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(q.points) || !/[1-9]/.test(q.points)) return fail('INVALID_INPUT');
  if (!Array.isArray(q.options)) return fail('INVALID_INPUT');
  const options = q.options.map((item: unknown) => {
    const option = exactActivityObject(item, ['text', 'correct']);
    if (typeof option.correct !== 'boolean') return fail('INVALID_INPUT');
    return { text: multiline(option.text, 20000, true), correct: option.correct };
  });
  const correct = options.filter((o: { correct: boolean }) => o.correct).length;
  if (q.type === 'DEVELOPMENT' ? (q.scoringRule !== null || options.length !== 0)
    : q.type === 'SINGLE_CHOICE' ? (q.scoringRule !== 'EXACT' || options.length < 2 || correct !== 1)
    : (!['EXACT', 'PARTIAL'].includes(q.scoringRule) || options.length < 2 || correct < 2)) return fail('INVALID_INPUT');
  return { type: q.type, prompt: multiline(q.prompt, 20000, true), points: q.points, scoringRule: q.scoringRule, options };
}
export function activityPayload(input: unknown, type: ActivityType, published: boolean): ActivityPayload {
  const p = exactActivityObject(input, ['title', 'unitId', 'topicId', 'instructions', 'attachmentRequired', 'instructionFileIds', 'materialIds', 'questions', 'deadline', 'allowLate']);
  if (typeof p.attachmentRequired !== 'boolean' || typeof p.allowLate !== 'boolean' || !Array.isArray(p.questions)) return fail('INVALID_INPUT');
  const title = text(p.title, 200, published) || null;
  for (const id of [p.unitId, p.topicId]) if (id !== null && !uuid(id)) return fail('INVALID_INPUT');
  if ((p.topicId !== null && p.unitId === null) || (published && (p.unitId === null || p.topicId === null))) return fail('INVALID_INPUT');
  const instructions = multiline(p.instructions, 5000) || null;
  const instructionFileIds = ids(p.instructionFileIds), materialIds = ids(p.materialIds);
  const questions = p.questions.map(authoringQuestion);
  if (type === 'ASSIGNMENT') {
    if (questions.length || (published && !instructions?.trim() && !instructionFileIds.length)) return fail('INVALID_INPUT');
  } else if (instructionFileIds.length || p.attachmentRequired || (published && !questions.length)) return fail('INVALID_INPUT');
  return { title, unitId: p.unitId, topicId: p.topicId, instructions, attachmentRequired: p.attachmentRequired,
    instructionFileIds, materialIds, questions, deadline: p.deadline, allowLate: p.allowLate };
}

export function activityOperation(input: unknown) {
  const op = object(input, ['action', 'id', 'type', 'payload', 'title', 'unitId', 'topicId', 'deadline', 'allowLate']);
  const shapes: Record<string, string[]> = {
    create: ['action', 'type'], save: ['action', 'id', 'payload'], publish: ['action', 'id'], withdraw: ['action', 'id'],
    metadata: ['action', 'id', 'title', 'unitId', 'topicId'], deadline: ['action', 'id', 'deadline', 'allowLate'],
  };
  const shape = typeof op.action === 'string' && Object.hasOwn(shapes, op.action) ? shapes[op.action] : undefined;
  if (!shape) return fail('INVALID_INPUT');
  exactActivityObject(op, shape);
  if (op.action === 'create') activityType(op.type);
  else if (!uuid(op.id)) return fail('INVALID_INPUT');
  return op;
}
