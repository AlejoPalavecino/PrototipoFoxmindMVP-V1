import { invalidInput, strictObject } from '../curriculum/plan.ts';
import { activityGenerationSchemaVersion, type ActivityProposal, type ActivityProposalConstraints, type ActivityQuestion } from './activity-generation.ts';
import { activityInteger, activityText, activityType, activityWarnings } from './activity-generation-values.ts';
import { parseEvaluationRubric } from '../grading/evaluation-rubric.ts';

function question(value: unknown): ActivityQuestion {
  const q = strictObject(value, ['type', 'prompt', 'points', 'scoringRule', 'options']);
  if (!['DEVELOPMENT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(String(q.type))
    || typeof q.points !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/u.test(q.points)
    || !/[1-9]/u.test(q.points) || q.points.length > 6 || Number(q.points) > 100 || !Array.isArray(q.options) || q.options.length > 6) return invalidInput();
  const options = q.options.map(o => {
    const v = strictObject(o, ['text', 'correct']);
    if (typeof v.correct !== 'boolean') return invalidInput();
    return { text: activityText(v.text, 500, true), correct: v.correct };
  });
  const correct = options.filter(o => o.correct).length;
  if (q.type === 'DEVELOPMENT' ? q.scoringRule !== null || options.length !== 0
    : q.type === 'SINGLE_CHOICE' ? q.scoringRule !== 'EXACT' || options.length < 2 || correct !== 1
      : !['EXACT', 'PARTIAL'].includes(String(q.scoringRule)) || options.length < 2 || correct < 2) return invalidInput();
  return { type: q.type as ActivityQuestion['type'], prompt: activityText(q.prompt, 2000, true), points: q.points,
    scoringRule: q.scoringRule as ActivityQuestion['scoringRule'], options };
}
function evidence(value: unknown, constraints: ActivityProposalConstraints, count: number) {
  if (!Array.isArray(value) || value.length !== count) return invalidInput();
  const seen = new Set<number>();
  return value.map(entry => {
    const v = strictObject(entry, ['item', 'index', 'references']);
    const item = constraints.type === 'ASSIGNMENT' ? 'assignment' as const : 'question' as const;
    const index = activityInteger(v.index, 0, count - 1);
    if (v.item !== item || seen.has(index) || !Array.isArray(v.references) || !v.references.length || v.references.length > 7) return invalidInput();
    seen.add(index);
    const references = v.references.map(ref => {
      const r = strictObject(ref, ['sourceId', 'page']);
      if (typeof r.sourceId !== 'string' || (r.sourceId === 'teacher-context' ? !constraints.context.trim()
        : !constraints.sourceIds.includes(r.sourceId))) return invalidInput();
      const pages = constraints.pdfPageCounts[r.sourceId];
      const page = pages === undefined ? r.page === null ? null : invalidInput() : activityInteger(r.page, 1, pages);
      return { sourceId: r.sourceId, page };
    });
    if (new Set(references.map(r => `${r.sourceId}:${r.page}`)).size !== references.length) return invalidInput();
    return { item, index, references };
  });
}
export function parseActivityProposal(value: unknown, constraints: ActivityProposalConstraints): ActivityProposal {
  const hasRubric = !!value && typeof value === 'object' && 'evaluationRubric' in value;
  const v = strictObject(value, ['schemaVersion', 'type', 'title', 'objective', 'instructions', 'assignmentPrompts', 'questions', 'evidence', 'warnings', ...(hasRubric ? ['evaluationRubric'] : [])]);
  let evaluationRubric;
  try { evaluationRubric = hasRubric ? parseEvaluationRubric(v.evaluationRubric) : undefined; } catch { return invalidInput(); }
  if (v.schemaVersion !== activityGenerationSchemaVersion || activityType(v.type) !== constraints.type
    || !Array.isArray(v.assignmentPrompts) || !Array.isArray(v.questions)) return invalidInput();
  const assignmentPrompts = v.assignmentPrompts.map(p => activityText(p, 2000, true)), questions = v.questions.map(question);
  const c = constraints.counts;
  if (assignmentPrompts.length !== c.assignment || questions.length !== c.development + c.singleChoice + c.multipleChoice
    || questions.filter(q => q.type === 'DEVELOPMENT').length !== c.development
    || questions.filter(q => q.type === 'SINGLE_CHOICE').length !== c.singleChoice
    || questions.filter(q => q.type === 'MULTIPLE_CHOICE').length !== c.multipleChoice) return invalidInput();
  const instructions = activityText(v.instructions, 5000), objective = activityText(v.objective, 1000, true);
  if ([...[`Objetivo: ${objective}`, instructions, ...assignmentPrompts.map((p, i) => `${i + 1}. ${p}`)].join('\n\n')].length > 5000) return invalidInput();
  return { schemaVersion: activityGenerationSchemaVersion, type: constraints.type, title: activityText(v.title, 200, true),
    objective: activityText(v.objective, 1000, true), instructions: activityText(v.instructions, 5000), assignmentPrompts,
    questions, evidence: evidence(v.evidence, constraints, assignmentPrompts.length + questions.length), warnings: activityWarnings(v.warnings),
    ...(evaluationRubric === undefined ? {} : { evaluationRubric }) };
}
