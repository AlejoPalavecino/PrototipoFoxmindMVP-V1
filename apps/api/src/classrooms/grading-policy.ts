import { fail } from './policy.ts';
import { contractFeedback, privateGradingInput as parsePrivateGrading } from '../../../../src/core/domain/index.ts';
export type { PrivateQuestionInput, PrivateGradingInput } from '../../../../src/core/domain/index.ts';
import type { PrivateGradingInput } from '../../../../src/core/domain/index.ts';

export function gradingFeedback(value: unknown): string | null {
  try { return contractFeedback(value); } catch { return fail('INVALID_INPUT'); }
}
export function privateGradingInput(input: unknown): PrivateGradingInput {
  try { return parsePrivateGrading(input); } catch { return fail('INVALID_INPUT'); }
}
