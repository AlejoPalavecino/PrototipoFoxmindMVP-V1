// Some test budgets are tight enough that a slower developer machine misses them even when the
// code is fine (for example, the API compile takes 20-38 s on a Windows laptop against a 30 s cap).
// FOXMIND_TEST_TIMEOUT_SCALE stretches only those budgets. It is unset in CI, so CI keeps its
// exact limits, and it can never shrink or disable one.
export function testTimeoutScale(env = process.env) {
  const raw = env.FOXMIND_TEST_TIMEOUT_SCALE;
  if (raw === undefined || raw === '') return 1;
  const scale = Number(raw);
  if (!Number.isFinite(scale) || scale < 1 || scale > 10) {
    throw new Error('FOXMIND_TEST_TIMEOUT_SCALE must be a number from 1 to 10');
  }
  return scale;
}

export function scaledMs(ms, env = process.env) {
  return Math.round(ms * testTimeoutScale(env));
}
