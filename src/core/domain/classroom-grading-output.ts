import { parseRubricMarks } from './rubric-marks.ts';
import { contractDecimal, contractObject, contractRevision } from './classroom-contract-values.ts';
import { parseEvaluationRubric } from './evaluation-rubric.ts';
import type { GradeAttachment, GradeOption, GradeRational, GradingActivity, GradingData, GradingQuestion, GradeCorrectionsData, PublishedResultData } from './classroom-grading-types.ts';
function string(value: unknown): string { if (typeof value !== 'string') throw new Error('INVALID_INPUT'); return value; }
function bool(value: unknown): boolean { if (typeof value !== 'boolean') throw new Error('INVALID_INPUT'); return value; }
function number(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('INVALID_INPUT'); return value; }
function array(value: unknown): unknown[] { if (!Array.isArray(value)) throw new Error('INVALID_INPUT'); return value; }
function nullable(value: unknown): string | null { return value === null ? null : string(value); }
function decimal(value: unknown): string { contractDecimal(value); return string(value); }
function grade(value: unknown): string { if (contractDecimal(value) > 1000n) throw new Error('INVALID_INPUT'); return string(value); }
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  for (const item of choices) if (value === item) return item;
  throw new Error('INVALID_INPUT');
}
const activityTypes = ['ASSIGNMENT', 'QUESTIONNAIRE', 'EVALUATION'] as const;
const questionTypes = ['DEVELOPMENT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE'] as const;
function rational(value: unknown): GradeRational {
  const score = contractObject(value), numerator = string(score.numerator), denominator = string(score.denominator);
  if (!/^\d+$/.test(numerator) || !/^\d+$/.test(denominator) || /^0+$/.test(denominator)) throw new Error('INVALID_INPUT');
  return { numerator, denominator };
}
function attachment(value: unknown): GradeAttachment {
  const file = contractObject(value); return { id: string(file.id), name: string(file.name), ready: bool(file.ready) };
}
function option(value: unknown): GradeOption {
  const item = contractObject(value); return { id: string(item.id), text: string(item.text),
    ...(item.correct === undefined ? {} : { correct: bool(item.correct) }) };
}
function gradingQuestion(value: unknown): GradingQuestion {
  const q = contractObject(value), answer = contractObject(q.answer);
  const scoringRule = q.scoringRule === undefined ? undefined : q.scoringRule === null ? null : choice(q.scoringRule, ['EXACT', 'PARTIAL'] as const);
  return { id: string(q.id), type: choice(q.type, questionTypes), prompt: string(q.prompt), points: decimal(q.points),
    ...(scoringRule === undefined ? {} : { scoringRule }), options: array(q.options).map(option),
    answer: { questionId: string(answer.questionId), text: nullable(answer.text), optionIds: array(answer.optionIds).map(string) },
    manual: bool(q.manual), manualPoints: q.manualPoints === null ? null : decimal(q.manualPoints),
    earned: q.earned === null ? null : rational(q.earned), feedback: nullable(q.feedback) };
}
function activity(value: unknown): GradingActivity {
  const a = contractObject(value);
  return { id: string(a.id), type: choice(a.type, activityTypes), title: nullable(a.title), unitId: nullable(a.unitId), topicId: nullable(a.topicId),
    topicIds: array(a.topicIds).map(string), status: choice(a.status, ['DRAFT', 'PUBLISHED', 'WITHDRAWN'] as const),
    publishedAt: nullable(a.publishedAt), deadlineAt: nullable(a.deadlineAt), allowLate: bool(a.allowLate), locked: bool(a.locked),
    zone: string(a.zone), ...(a.aiGradingRubric === undefined ? {} : { aiGradingRubric: string(a.aiGradingRubric) }),
    ...(a.evaluationRubric === undefined ? {} : { evaluationRubric: parseEvaluationRubric(a.evaluationRubric) }),
    ...(a.objective === undefined ? {} : { objective: nullable(a.objective) }),
    ...(a.teacherComment === undefined ? {} : { teacherComment: nullable(a.teacherComment) }), instructions: nullable(a.instructions), attachmentRequired: bool(a.attachmentRequired),
    instructionFiles: array(a.instructionFiles).map(value => ({ ...attachment(value), extension: string(contractObject(value).extension) })),
    materials: array(a.materials).map(value => { const item = contractObject(value); return { id: string(item.id), title: string(item.title), fileId: string(item.fileId), extension: string(item.extension) }; }),
    questions: array(a.questions).map(gradingQuestion) };
}
export function parseGradingView(value: unknown): GradingData {
  const data = contractObject(value), attempt = contractObject(data.attempt), g = contractObject(data.grade);
  return { revision: contractRevision(data.revision), archived: bool(data.archived), canSave: bool(data.canSave), activity: activity(data.activity),
    attempt: { id: string(attempt.id), number: number(attempt.number), submittedAt: string(attempt.submittedAt), submittedLate: bool(attempt.submittedLate),
      firstName: string(attempt.firstName), lastName: string(attempt.lastName), attachments: array(attempt.attachments).map(attachment) },
    grade: { ...rubricFields(g), id: nullable(g.id), isPublished: bool(g.isPublished), publishedAt: nullable(g.publishedAt),
      finalGrade: g.finalGrade === null ? null : grade(g.finalGrade), overallFeedback: nullable(g.overallFeedback), pending: bool(g.pending) } };
}
function resultQuestion(value: unknown) {
  const q = contractObject(value), answer = contractObject(q.answer);
  return { id: string(q.id), type: choice(q.type, questionTypes), prompt: string(q.prompt), points: decimal(q.points),
    answer: { text: nullable(answer.text), selectedOptions: array(answer.selectedOptions).map(option) }, earned: rational(q.earned), feedback: nullable(q.feedback) };
}
export function parsePublishedGradeResult(value: unknown): PublishedResultData {
  const data = contractObject(value);
  if (data.status === 'pending') return { status: 'pending', attemptId: string(data.attemptId) };
  if (data.status !== 'published') throw new Error('INVALID_INPUT');
  const a = contractObject(data.activity), attempt = contractObject(data.attempt), g = contractObject(data.grade);
  return { status: 'published', activity: { id: string(a.id), title: string(a.title), type: choice(a.type, activityTypes) },
    attempt: { id: string(attempt.id), number: number(attempt.number), submittedAt: string(attempt.submittedAt) },
    grade: { ...rubricFields(g), id: string(g.id), finalGrade: grade(g.finalGrade), publishedAt: string(g.publishedAt), overallFeedback: nullable(g.overallFeedback), isEffective: bool(g.isEffective) },
    questions: array(data.questions).map(resultQuestion), attachments: array(data.attachments).map(attachment) };
}
export function parseGradeCorrectionsView(value: unknown): GradeCorrectionsData {
  const data = contractObject(value), g = contractObject(data.grade);
  return { revision: contractRevision(data.revision), archived: bool(data.archived), canCorrect: bool(data.canCorrect),
    grade: { id: string(g.id), finalGrade: grade(g.finalGrade), publishedAt: string(g.publishedAt) },
    corrections: array(data.corrections).map(value => { const item = contractObject(value), actor = contractObject(item.actor);
      return { id: string(item.id), previousGrade: grade(item.previousGrade), newGrade: grade(item.newGrade), reason: string(item.reason),
        actor: { id: string(actor.id), firstName: string(actor.firstName), lastName: string(actor.lastName) }, correctedAt: string(item.correctedAt) }; }) };
}

function rubricFields(g: Record<string, unknown>) {
  return { ...(g.rubricSnapshot === undefined ? {} : { rubricSnapshot: g.rubricSnapshot === null ? null : parseEvaluationRubric(g.rubricSnapshot) }),
    ...(g.rubricMarks === undefined ? {} : { rubricMarks: parseRubricMarks(g.rubricMarks) }),
    ...(g.suggestedGrade === undefined ? {} : { suggestedGrade: g.suggestedGrade === null ? null : grade(g.suggestedGrade) }),
    ...(g.finalGradeOverride === undefined ? {} : { finalGradeOverride: g.finalGradeOverride === null ? null : grade(g.finalGradeOverride) }),
    ...(g.calculatedGrade === undefined ? {} : { calculatedGrade: g.calculatedGrade === null ? null : grade(g.calculatedGrade) }) };
}
