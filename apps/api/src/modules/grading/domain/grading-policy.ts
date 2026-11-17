import { fail } from '../../../../../../src/core/domain/classrooms/policy.ts';
import { contractFeedback } from '../../../../../../src/core/domain/classrooms/contract-values.ts';
import { privateGradingInput as parsePrivateGrading } from '../../../../../../src/core/domain/grading/grading.ts';
export type { PrivateQuestionInput, PrivateGradingInput } from '../../../../../../src/core/domain/grading/grading.ts';
import type { PrivateGradingInput } from '../../../../../../src/core/domain/grading/grading.ts';

export function gradingFeedback(value: unknown): string | null {
  try { return contractFeedback(value); } catch { return fail('INVALID_INPUT'); }
}
export function privateGradingInput(input: unknown): PrivateGradingInput {
  try { return parsePrivateGrading(input); } catch { return fail('INVALID_INPUT'); }
}
