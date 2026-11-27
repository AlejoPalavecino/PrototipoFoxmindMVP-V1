import { useRef, useState } from 'react';

/** Runs one authoring operation at a time, exposing its progress and its last error message. */
export function useAuthoringOperation() {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function run(operation: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { error, setError, busy, run };
}
