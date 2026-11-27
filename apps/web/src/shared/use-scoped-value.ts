import { useState } from 'react';

const sameScope = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

/**
 * Keeps one instance per scope. A new scope (another account, another subject)
 * creates a fresh instance even when `create` does not read it, so consumers
 * that react to the instance identity start over.
 */
export function useScopedValue<T>(create: () => T, scope: readonly unknown[]): T {
  const [held, setHeld] = useState(() => ({ scope, value: create() }));
  if (sameScope(held.scope, scope)) return held.value;
  const next = { scope, value: create() };
  setHeld(next);
  return next.value;
}
