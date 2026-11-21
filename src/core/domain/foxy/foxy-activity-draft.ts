import { contractObject, contractRevision, contractUuid } from '../classrooms/contract-values.ts';
import { parseEvaluationRubric, type EvaluationRubric } from '../grading/evaluation-rubric.ts';
export interface FoxyActivityPayload { title: string; objective: string; instructions: string; teacherComment: string;
  unitId: string; topicIds: string[]; evaluationRubric: EvaluationRubric; activityKind?: 'QUESTIONNAIRE' }
export interface FoxyActivityDraftInput { requestId: string; resourceRevision: string; classroomId: string; classroomRevision: string; payload: FoxyActivityPayload }
export interface FoxyActivityDraftReceipt { activityId: string; classroomId: string; revision: string }
function text(value: unknown, max: number, required = true): string {
  if (typeof value !== 'string' || [...value].length > max || (required && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)) throw new Error('INVALID_INPUT');
  return value.trim();
}
export function parseFoxyActivityPayload(input: unknown): FoxyActivityPayload {
  const p = contractObject(input, ['title', 'objective', 'instructions', 'teacherComment', 'unitId', 'topicIds', 'evaluationRubric', 'activityKind']);
  const questionnaire = p.activityKind === 'QUESTIONNAIRE';
  if (Object.keys(p).length !== (questionnaire ? 8 : 7) || (Object.hasOwn(p, 'activityKind') && !questionnaire)
    || !contractUuid(p.unitId) || !Array.isArray(p.topicIds) || !p.topicIds.length || p.topicIds.length > 100
    || !p.topicIds.every(contractUuid) || new Set(p.topicIds).size !== p.topicIds.length) throw new Error('INVALID_INPUT');
  const evaluationRubric = parseEvaluationRubric(p.evaluationRubric);
  if (!questionnaire && !evaluationRubric.length) throw new Error('INVALID_INPUT');
  return { title: text(p.title, 200), objective: text(p.objective, 1400), instructions: text(p.instructions, 5000), teacherComment: text(p.teacherComment, 5000, false),
    unitId: p.unitId, topicIds: p.topicIds as string[], evaluationRubric, ...(questionnaire ? { activityKind: 'QUESTIONNAIRE' } : {}) };
}
export function parseFoxyActivityDraft(input: unknown): FoxyActivityDraftInput {
  const body = contractObject(input, ['requestId', 'resourceRevision', 'classroomId', 'classroomRevision', 'payload']);
  if (Object.keys(body).length !== 5 || !contractUuid(body.requestId) || !contractUuid(body.classroomId)) throw new Error('INVALID_INPUT');
  return { requestId: body.requestId, classroomId: body.classroomId, resourceRevision: contractRevision(body.resourceRevision),
    classroomRevision: contractRevision(body.classroomRevision), payload: parseFoxyActivityPayload(body.payload) };
}
