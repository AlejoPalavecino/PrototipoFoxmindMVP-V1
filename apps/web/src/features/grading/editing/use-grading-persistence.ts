import { useCallback, useEffect, useRef, useState } from 'react';
import type { GradingData } from '../../../../../../src/core/contracts/grading.ts';
import type { GradingEditingOperations } from '../model/grading-operations.ts';

/** Transport lifecycle and write serialization; draft restoration stays with the caller. */
export function useGradingPersistence(operations: GradingEditingOperations, restore: (next: GradingData) => void, clear: () => void) {
  const operation = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    const next = await operations.load(signal);
    if (!signal?.aborted) restore(next);
  }, [operations, restore]);
  useEffect(() => {
    const controller = new AbortController(); clear(); setSaved(false); setError('');
    void load(controller.signal).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [load, clear]);
  async function run(work: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true; setBusy(true); setError(''); setSaved(false);
    try { await work(); } catch (error) { setError((error as Error).message); }
    finally { operation.current = false; setBusy(false); }
  }
  return { load, run, busy, error, saved, setSaved };
}
