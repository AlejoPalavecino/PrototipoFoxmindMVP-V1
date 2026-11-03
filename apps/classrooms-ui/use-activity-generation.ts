'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActivityProposal } from '../../src/core/domain/index.ts';
import type { ClassroomClient, Detail } from './api.ts';
import type { GenerationFormValue } from './ActivityGenerationForm.tsx';
import { generationClient, generationErrors, type GenerationSource, type GenerationView } from './activity-generation-api.ts';

export function useActivityGeneration(api: ClassroomClient, room: Detail, onApplied: (id: string, signal: AbortSignal) => Promise<void>) {
  const client = generationClient(api, room.id);
  const [sources, setSources] = useState<GenerationSource[]>([]), [jobs, setJobs] = useState<GenerationView[]>([]);
  const [view, setView] = useState<GenerationView | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const accept = useCallback((next: GenerationView) => {
    setView(next);
    setJobs(old => old.some(job => job.id === next.id)
      ? old.map(job => job.id === next.id ? next : job) : [next, ...old]);
  }, []);
  const requests = useRef(new Map<string, string>());
  const active = useRef<AbortController | null>(null);
  const scope = useRef<AbortController | null>(null);
  const intent = useRef(0);
  const catalogIntent = useRef(0);
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
    scope.current = controller;
    requests.current.clear();
    setSources([]); setJobs([]); setView(null); setBusy(false); setError('');
    const started = intent.current;
    const catalogStarted = catalogIntent.current;
    void Promise.all([client.sources(controller.signal), client.list(controller.signal)]).then(([catalog, list]) => {
      if (!controller.signal.aborted && catalogStarted === catalogIntent.current) {
        setSources(catalog.sources);
        setJobs(current => [...current, ...list.jobs.filter(job => !current.some(existing => existing.id === job.id))]);
        const latest = list.jobs[0];
        if (latest?.state === 'FAILED' && latest.error === 'PROVIDER_OUTCOME_UNKNOWN')
          setView(current => current ?? latest);
      }
    }).catch(e => { if (!controller.signal.aborted && started === intent.current) report(e); });
    return () => { controller.abort(); active.current?.abort(); active.current = null; scope.current = null; };
  }, [api, room.id, report, accept]);
  useEffect(() => {
    if (busy || !view || !['QUEUED', 'RUNNING'].includes(view.state)) return;
    const client = generationClient(api, room.id), controller = new AbortController();
    const started = intent.current;
    const timer = setTimeout(() => { void client.get(view.id, controller.signal).then(next => {
      if (!controller.signal.aborted && started === intent.current) accept(next);
    }).catch(e => { if (!controller.signal.aborted && started === intent.current) report(e); }); }, 1500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [api, room.id, view, busy, report, accept]);
  async function run(operation: (signal: AbortSignal) => Promise<void>) {
    if (!scope.current || scope.current.signal.aborted) return;
    active.current?.abort();
    const controller = new AbortController(), { signal } = controller;
    active.current = controller;
    intent.current++;
    setBusy(true); setError('');
    try { await operation(signal); }
    catch (e) { if (!signal.aborted) report(e); }
    finally {
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  }
  async function generate(value: GenerationFormValue, predecessor?: GenerationView, acknowledge = false) {
    await run(async signal => {
      const total = value.counts.development + value.counts.singleChoice + value.counts.multipleChoice;
      if (value.type !== 'ASSIGNMENT' && (!Number.isInteger(total) || total < 1 || total > 30))
        throw new Error('Seleccioná entre 1 y 30 preguntas en total, sumando los tres tipos.');
      const body = { ...value, revision: room.revision };
      const input = { ...body, requestId: requestId(JSON.stringify([predecessor?.id ?? 'start', body])) };
      const next = predecessor ? await client.regenerate(predecessor.id, input, acknowledge, signal) : await client.start(input, signal);
      if (!signal.aborted) accept(next);
    });
  }
  async function apply(jobId: string, proposal: ActivityProposal) {
    await run(async signal => {
      const id = requestId(JSON.stringify(['apply', jobId, room.revision, proposal]));
      const result = await client.apply(jobId, room.revision, id, proposal, signal);
      if (signal.aborted) return;
      const applied = (job: GenerationView): GenerationView => job.id === jobId
        ? { ...job, state: 'APPLIED', appliedActivityId: result.activityId } : job;
      setView(current => current ? applied(current) : current);
      setJobs(current => current.map(applied));
      await onApplied(result.activityId, signal);
    });
  }
  return { sources, jobs, view, busy, error, generate, apply,
    openApplied: (id: string) => run(signal => onApplied(id, signal)),
    open: (id: string) => run(async signal => {
      const next = await client.get(id, signal); if (!signal.aborted) accept(next);
    }),
    refresh: () => run(async signal => {
      catalogIntent.current++;
      const [catalog, list] = await Promise.all([client.sources(signal), client.list(signal)]);
      if (signal.aborted) return;
      setSources(catalog.sources); setJobs(list.jobs);
      if (view) { const next = await client.get(view.id, signal); if (!signal.aborted) accept(next); }
    }) };
}
