export interface GradingAiQuestionSpec { ref: string; maxPoints: string; manual: boolean }
export interface GradingAiSpec {
  type: 'ASSIGNMENT' | 'QUESTIONNAIRE' | 'EVALUATION';
  questions: GradingAiQuestionSpec[];
}
export interface GradingAiProposal {
  schemaVersion: 'grading-proposal-v1';
  overallGrade: string | null;
  overallFeedback: string;
  questions: { ref: string; points: string | null; feedback: string }[];
  warnings: string[];
}

const invalid = (): never => { throw new Error('INVALID_AI_OUTPUT'); };
function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const object = value as Record<string, unknown>;
  if (Object.keys(object).length !== keys.length || !keys.every(key => Object.hasOwn(object, key))) return invalid();
  return object;
}
function text(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.length <= limit;
}
function hundredths(value: unknown): bigint {
  if (typeof value !== 'string' || value.length > 20 || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) return invalid();
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
}
function validateQuestions(value: unknown, spec: GradingAiSpec): void {
  if (!Array.isArray(value) || value.length !== spec.questions.length || value.length > 500) return invalid();
  const expected = new Map(spec.questions.map(question => [question.ref, question]));
  if (expected.size !== spec.questions.length) return invalid();
  const seen = new Set<string>();
  for (const item of value) {
    const question = record(item, ['ref', 'points', 'feedback']);
    if (typeof question.ref !== 'string' || seen.has(question.ref) || !text(question.feedback, 5000)) return invalid();
    const rule = expected.get(question.ref);
    if (!rule) return invalid();
    seen.add(question.ref);
    if (rule.manual ? hundredths(question.points) > hundredths(rule.maxPoints) : question.points !== null) return invalid();
  }
}

/** Validates untrusted provider output without changing deterministic objective scoring. */
export function validateGradingAiProposal(value: unknown, spec: GradingAiSpec): GradingAiProposal {
  const proposal = record(value, ['schemaVersion', 'overallGrade', 'overallFeedback', 'questions', 'warnings']);
  if (proposal.schemaVersion !== 'grading-proposal-v1' || !text(proposal.overallFeedback, 5000)
    || !Array.isArray(proposal.warnings) || proposal.warnings.length > 20
    || !proposal.warnings.every(warning => text(warning, 1000) && warning.trim().length > 0)) return invalid();
  if (!spec || !Array.isArray(spec.questions) || !['ASSIGNMENT', 'QUESTIONNAIRE', 'EVALUATION'].includes(spec.type)) return invalid();
  if (spec.type === 'ASSIGNMENT') {
    if (spec.questions.length !== 0 || hundredths(proposal.overallGrade) > 1000n) return invalid();
  } else if (proposal.overallGrade !== null) return invalid();
  validateQuestions(proposal.questions, spec);
  return value as GradingAiProposal;
}
