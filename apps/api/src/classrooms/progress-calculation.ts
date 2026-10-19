import { addScores, decimalScore, rational, roundHalfUp, type Rational } from './scoring.ts';

export const noExpectedActivities = 'Sin actividades pendientes de seguimiento';

/** Keep averages exact until the presentation boundary, including the mean of individual means. */
export function meanScore(values: Rational[]): Rational | null {
  if (!values.length) return null;
  const sum = values.reduce(addScores, rational(0n));
  return rational(sum.numerator, sum.denominator * BigInt(values.length));
}
export function gradeMean(grades: string[]): Rational | null { return meanScore(grades.map(decimalScore)); }
export function performance(grades: string[]) {
  const mean = gradeMean(grades);
  return { graded: grades.length, average: mean === null ? null : roundHalfUp(mean) };
}
export function completion(expected: number, delivered: number, onTime: number, late: number, pendingResubmissions: number) {
  return { expected, delivered, pending: expected - delivered, onTime, late, pendingResubmissions,
    percentage: expected === 0 ? null : roundHalfUp(rational(BigInt(delivered) * 100n, BigInt(expected))),
    emptyLabel: expected === 0 ? noExpectedActivities : null };
}
export function taughtProgress(total: number, taught: number) {
  return { total, taught, percentage: total === 0 ? null : roundHalfUp(rational(BigInt(taught) * 100n, BigInt(total))) };
}
