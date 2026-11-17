import { useCallback, useEffect, useRef, useState } from 'react';
import type { GradingAiProposal } from '../../../../../../src/core/domain/grading/grading-ai.ts';
import type { GradingAiReviewOperations, GradingAiJob } from '../model/grading-operations.ts';

export function useGradingAiReview({ operations, revision, onApplied, onBusyChange, disabled }: {
  operations: GradingAiReviewOperations; revision: string; onApplied: (result: unknown) => Promise<void>;
  onBusyChange?: (busy: boolean) => void; disabled: boolean;
}) {
  const [job, setJob] = useState<GradingAiJob | null>(null), [proposal, setProposal] = useState<GradingAiProposal | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(false), [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm] = useState<'apply' | 'discard' | null>(null);
  const requestId = useRef<string | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    const next = await operations.load(signal);
    if (signal?.aborted) return;
    setJob(next); setProposal(next?.state === 'READY' && next.proposal ? structuredClone(next.proposal) : null);
    setError(''); setLoading(false); setConfirm(null); setReviewing(false); requestId.current = null;
  }, [operations]);
  useEffect(() => { const controller = new AbortController(); setLoading(true);
    void load(controller.signal).catch(e => { if (!controller.signal.aborted) { setError(e.message); setLoading(false); } });
    return () => controller.abort(); }, [load]);
  const edit = (change: (value: GradingAiProposal) => GradingAiProposal) => {
    setProposal(previous => previous ? change(previous) : previous); requestId.current = null; setConfirm(null);
  };
  async function run(action: 'apply' | 'discard') {
    if (disabled || !job || !proposal || !job.snapshotHash) return;
    setBusy(true); onBusyChange?.(true); setError('');
    try {
      requestId.current ??= crypto.randomUUID();
      const result = await (action === 'apply'
        ? operations.apply(job.id, { requestId: requestId.current, revision, snapshotHash: job.snapshotHash, proposal })
        : operations.discard(job.id, { requestId: requestId.current, revision }));
      setConfirm(null); setReviewing(false); setProposal(null); setJob({ ...job, state: action === 'apply' ? 'APPLIED' : 'DISCARDED', proposal: null });
      if (action === 'apply') await onApplied(result);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return { job, proposal, loading, busy, error, setError, reviewing, setReviewing, expanded, setExpanded, confirm, setConfirm, load, setLoading, edit, run };
}
