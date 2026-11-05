import { contractDecimal, contractFeedback, contractObject, contractRevision, contractUuid } from './classroom-contract-values.ts';
import { parseRubricMarks, type RubricMark } from './rubric-marks.ts';
export interface PrivateQuestionInput { questionId: string; points: string | null; feedback: string | null }
export interface PrivateGradingInput { revision: string; overallGrade: string | null; overallFeedback: string | null; questions: PrivateQuestionInput[]; rubricMarks?: RubricMark[]; finalGradeOverride?: string | null }
export function privateGradingInput(input: unknown): PrivateGradingInput {
  const value = contractObject(input, ['revision', 'overallGrade', 'overallFeedback', 'questions', 'rubricMarks', 'finalGradeOverride']);
  if (!['revision', 'overallGrade', 'questions'].every(key => Object.hasOwn(value, key)) || !Array.isArray(value.questions)) throw new Error('INVALID_INPUT');
  if (value.overallGrade !== null && contractDecimal(value.overallGrade) > 1000n) throw new Error('INVALID_INPUT');
  if (Object.hasOwn(value, 'finalGradeOverride') && value.finalGradeOverride !== null && contractDecimal(value.finalGradeOverride) > 1000n) throw new Error('INVALID_INPUT');
  const questions = value.questions.map((input: unknown) => {
    const row = contractObject(input, ['questionId', 'points', 'feedback']);
    if (!contractUuid(row.questionId) || !Object.hasOwn(row, 'points')) throw new Error('INVALID_INPUT');
    if (row.points !== null) contractDecimal(row.points);
    return { questionId: row.questionId, points: row.points as string | null, feedback: contractFeedback(row.feedback) };
  });
  if (new Set(questions.map(row => row.questionId)).size !== questions.length) throw new Error('INVALID_INPUT');
  return { revision: contractRevision(value.revision), overallGrade: value.overallGrade as string | null, overallFeedback: contractFeedback(value.overallFeedback), questions,
    ...(Object.hasOwn(value, 'rubricMarks') ? { rubricMarks: parseRubricMarks(value.rubricMarks) } : {}),
    ...(Object.hasOwn(value, 'finalGradeOverride') ? { finalGradeOverride: value.finalGradeOverride as string | null } : {}) };
}
export function gradeCorrectionInput(input: unknown) {
  const body = contractObject(input, ['revision', 'newGrade', 'reason', 'confirm']);
  if (Object.keys(body).length !== 4 || body.confirm !== true || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 5000) throw new Error('INVALID_INPUT');
  const grade = contractDecimal(body.newGrade); if (grade > 1000n) throw new Error('INVALID_INPUT');
  return { revision: contractRevision(body.revision), newGrade: `${grade / 100n}.${String(grade % 100n).padStart(2, '0')}`, reason: body.reason.trim(), confirm: true as const };
}
export function gradePublicationInput(input: unknown) {
  const body = contractObject(input, ['revision', 'confirm']);
  if (Object.keys(body).length !== 2 || body.confirm !== true) throw new Error('INVALID_INPUT');
  return { revision: contractRevision(body.revision), confirm: true as const };
}
export { parseGradingView, parsePublishedGradeResult, parseGradeCorrectionsView } from './classroom-grading-output.ts';
