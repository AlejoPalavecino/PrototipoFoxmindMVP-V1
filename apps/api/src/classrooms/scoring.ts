import { fail } from './policy.ts';

export interface Rational { numerator: bigint; denominator: bigint }
export interface ScoringQuestion {
  id: string; type: string; points: string; scoringRule?: string | null;
  options: { id: string; correct: boolean }[];
}
export interface ScoringAnswer { text: string | null; optionIds: string[] }

/** Canonical decimal input, never coerced through binary floating point. */
export function hundredths(value: unknown): bigint {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) return fail('INVALID_INPUT');
  const [whole, decimals = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(decimals.padEnd(2, '0'));
}
export function rational(numerator: bigint, denominator = 1n): Rational {
  if (numerator < 0n || denominator <= 0n) return fail('INVALID_INPUT');
  let a = numerator, b = denominator;
  while (b) { const remainder = a % b; a = b; b = remainder; }
  return { numerator: numerator / a, denominator: denominator / a };
}
export function addScores(a: Rational, b: Rational): Rational {
  return rational(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
}
export function decimalScore(value: string): Rational { return rational(hundredths(value), 100n); }
export function scoreJson(score: Rational | null) {
  return score === null ? null : { numerator: score.numerator.toString(), denominator: score.denominator.toString() };
}
export function fixedHundredths(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
}
export function roundHalfUp(score: Rational): string {
  const scaled = score.numerator * 100n;
  return fixedHundredths(scaled / score.denominator + (scaled % score.denominator * 2n >= score.denominator ? 1n : 0n));
}
export function finalGrade(scores: (Rational | null)[], available: string[]): string | null {
  if (!scores.length || scores.some(score => score === null)) return null;
  const total = available.reduce((sum, value) => addScores(sum, decimalScore(value)), rational(0n));
  if (total.numerator === 0n) return fail('INVALID_INPUT');
  const earned = (scores as Rational[]).reduce(addScores, rational(0n));
  return roundHalfUp(rational(10n * earned.numerator * total.denominator, earned.denominator * total.numerator));
}
export function questionScore(question: ScoringQuestion, answer: ScoringAnswer | undefined, manual: string | null): Rational | null {
  const available = hundredths(question.points);
  if (available === 0n) return fail('INVALID_INPUT');
  if (question.type === 'DEVELOPMENT') {
    // SUBMITTED is checked by the caller: a blank is an explicitly confirmed incomplete answer.
    if (!answer?.text?.trim()) return rational(0n);
    if (manual === null) return null;
    const earned = hundredths(manual);
    if (earned > available) return fail('INVALID_INPUT');
    return rational(earned, 100n);
  }
  const selected = new Set(answer?.optionIds ?? []), correct = question.options.filter(option => option.correct);
  if (question.options.some(option => selected.has(option.id) && !option.correct)) return rational(0n);
  if ([...selected].some(id => !question.options.some(option => option.id === id))) return fail('INVALID_INPUT');
  const count = correct.filter(option => selected.has(option.id)).length;
  if (question.scoringRule === 'PARTIAL') return rational(available * BigInt(count), 100n * BigInt(correct.length));
  return rational(count === correct.length && selected.size === correct.length ? available : 0n, 100n);
}
