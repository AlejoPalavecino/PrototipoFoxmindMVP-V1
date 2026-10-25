'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActivityProposal } from '../../src/core/domain/index.ts';
import type { ClassroomClient, Detail } from './api.ts';
import type { GenerationFormValue } from './ActivityGenerationForm.tsx';
import { generationClient, generationErrors, type GenerationSource, type GenerationView } from './activity-generation-api.ts';

export function useActivityGeneration(api: ClassroomClient, room: Detail, onApplied: (id: string) => Promise<void>) {
  const client = generationClient(api, room.id);
  const [sources, setSources] = useState<GenerationSource[]>([]), [jobs, setJobs] = useState<GenerationView[]>([]);
  const [view, setView] = useState<GenerationView | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const accept = useCallback((next: GenerationView) => {
    setView(next);
    setJobs(old => old.some(job => job.id === next.id)
      ? old.map(job => job.id === next.id ? next : job) : [next, ...old]);
  }, []);
  const requests = useRef(new Map<string, string>());
  const requestId = (key: string) => {
    if (!requests.current.has(key)) requests.current.set(key, crypto.randomUUID());
    return requests.current.get(key)!;
  };
  const report = useCallback((e: unknown) => {
    const failure = e as Error & { code?: string };
    setError(generationErrors[failure.code ?? ''] ?? failure.message ?? 'No se pudo completar la acción.');
  }, []);
  useEffect(() => {
    const client = generationClient(api, room.id), controller = new AbortController();
    void Promise.all([client.sources(controller.signal), client.list(controller.signal)]).then(([catalog, list]) => {
      if (!controller.signal.aborted) {
        setSources(catalog.sources); setJobs(list.jobs);
        const latest = list.jobs[0];
        if (latest?.state === 'FAILED' && latest.error === 'PROVIDER_OUTCOME_UNKNOWN') accept(latest);
      }
    }).catch(e => { if (!controller.signal.aborted) report(e); });
    return () => controller.abort();
  }, [api, room.id, report, accept]);
  useEffect(() => {
    if (!view || !['QUEUED', 'RUNNING'].includes(view.state)) return;
    const client = generationClient(api, room.id), controller = new AbortController();
    const timer = setTimeout(() => { void client.get(view.id, controller.signal).then(next => {
      if (!controller.signal.aborted) accept(next);
    }).catch(e => { if (!controller.signal.aborted) report(e); }); }, 1500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [api, room.id, view, report, accept]);
  async function run(operation: () => Promise<void>) {
    setBusy(true); setError('');
    try { await operation(); } catch (e) { report(e); } finally { setBusy(false); }
  }
  async function generate(value: GenerationFormValue, predecessor?: GenerationView, acknowledge = false) {
    await run(async () => {
      const total = value.counts.development + value.counts.singleChoice + value.counts.multipleChoice;
      if (value.type !== 'ASSIGNMENT' && (!Number.isInteger(total) || total < 1 || total > 30))
        throw new Error('Seleccioná entre 1 y 30 preguntas en total, sumando los tres tipos.');
      const body = { ...value, revision: room.revision };
      const input = { ...body, requestId: requestId(JSON.stringify([predecessor?.id ?? 'start', body])) };
      const next = predecessor ? await client.regenerate(predecessor.id, input, acknowledge) : await client.start(input);
      accept(next);
    });
  }
  async function apply(jobId: string, proposal: ActivityProposal) {
    await run(async () => {
      const id = requestId(JSON.stringify(['apply', jobId, room.revision, proposal]));
      const result = await client.apply(jobId, room.revision, id, proposal);
      const applied = (job: GenerationView): GenerationView => job.id === jobId
        ? { ...job, state: 'APPLIED', appliedActivityId: result.activityId } : job;
      setView(current => current ? applied(current) : current);
      setJobs(current => current.map(applied));
      await onApplied(result.activityId);
    });
  }
  return { sources, jobs, view, busy, error, generate, apply,
    open: (id: string) => run(async () => { accept(await client.get(id)); }),
    refresh: () => run(async () => { const [catalog, list] = await Promise.all([client.sources(), client.list()]);
      setSources(catalog.sources); setJobs(list.jobs); if (view) accept(await client.get(view.id)); }) };
}
