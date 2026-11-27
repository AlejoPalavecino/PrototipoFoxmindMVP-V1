import { useState } from 'react';

const unseen: readonly unknown[] = [];
const sameKeys = (a: readonly unknown[], b: readonly unknown[]) =>
  a !== unseen && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

/**
 * Adjusts state while rendering when `keys` change: React's pattern for state
 * that follows a prop. Unlike an effect, the stale state is never painted.
 * `reset` may only set state of the calling component. With `onMount`, it also
 * runs on the first render, as an effect with the same keys would.
 */
export function useResetOnChange(keys: readonly unknown[], reset: () => void, onMount = false): void {
  const [seen, setSeen] = useState<readonly unknown[]>(onMount ? unseen : keys);
  if (sameKeys(seen, keys)) return;
  setSeen(keys);
  reset();
}
