import { parseEvaluationRubric, type EvaluationRubric } from './evaluation-rubric.ts';
import { contractDecimal, contractObject } from './classroom-contract-values.ts';

export interface RubricMark { criterionIndex: number; score: string | null }
export function parseRubricMarks(input: unknown): RubricMark[] {
  if (!Array.isArray(input) || input.length > 12) throw new Error('INVALID_INPUT');
  const seen = new Set<number>();
  return input.map(value => {
    const row = contractObject(value, ['criterionIndex', 'score']);
    if (Object.keys(row).length !== 2 || !Number.isSafeInteger(row.criterionIndex) || Number(row.criterionIndex) < 0
      || Number(row.criterionIndex) >= 12 || seen.has(Number(row.criterionIndex)) || !Object.hasOwn(row, 'score')) throw new Error('INVALID_INPUT');
    if (row.score !== null && contractDecimal(row.score) > 1000n) throw new Error('INVALID_INPUT');
    seen.add(Number(row.criterionIndex));
    return { criterionIndex: Number(row.criterionIndex), score: row.score as string | null };
  });
}
export function rubricSuggestion(snapshot: EvaluationRubric, input: RubricMark[]): string | null {
  const rubric = parseEvaluationRubric(snapshot), marks = parseRubricMarks(input);
  if (marks.some(mark => mark.criterionIndex >= rubric.length)) throw new Error('INVALID_INPUT');
  if (!rubric.length || marks.length !== rubric.length || marks.some(mark => mark.score === null)) return null;
  const total = rubric.reduce((sum, criterion, index) => sum + BigInt(criterion.weight)
    * contractDecimal(marks.find(mark => mark.criterionIndex === index)!.score), 0n);
  const rounded = (total + 50n) / 100n;
  return `${rounded / 100n}.${String(rounded % 100n).padStart(2, '0')}`;
}
