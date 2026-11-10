'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { CurriculumUnit, ExtractionView } from '../../../../../../src/core/domain/index.ts';
import { createExtractionClient, type ExtractionOptions, type PlanExtractionClient } from './extraction-client.ts';
import { extractionMessage } from './extraction-messages.ts';

type Inputs = Omit<ExtractionOptions, 'onView' | 'requestId'> & { readyFileId?: string; draftId: string };
type ViewSetter = (view: ExtractionView | null) => void;
function connect(inputs: RefObject<Inputs>, source: string, onView: ViewSetter, onError: (message: string) => void) {
  let stopped = false, pending = false, timer: ReturnType<typeof setTimeout> | undefined;
  const client = createExtractionClient({
    api: inputs.current.api, save: () => inputs.current.save(), getDraft: () => inputs.current.getDraft(),
    serialize: operation => inputs.current.serialize ? inputs.current.serialize(operation) : operation(),
    onApplied: result => inputs.current.onApplied(result), requestId: () => crypto.randomUUID(),
    onView: view => { pending = ['QUEUED', 'RUNNING'].includes(view.state); onView(view); },
  });
  const schedule = () => {
    if (!stopped && pending) timer = setTimeout(() => { void run(() => client.poll()); }, 2000);
  };
  const run = async (operation: () => Promise<void>) => {
    if (timer) clearTimeout(timer);
    try { await operation(); if (!stopped) { onError(''); schedule(); } }
    catch (error) { if (!stopped) onError(extractionMessage(error)); }
  };
  void run(() => client.start(source));
  return { client, run, stop: () => { stopped = true; clearTimeout(timer); client.cancel(); } };
}
export function usePlanExtraction(options: Inputs) {
  const inputs = useRef(options); inputs.current = options;
  const active = useRef<ReturnType<typeof connect> | null>(null);
  const [view, setView] = useState<ExtractionView | null>(null), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setView(null); setMessage(''); setBusy(false);
    if (!options.readyFileId) return;
    const session = connect(inputs, options.readyFileId, setView, setMessage);
    active.current = session;
    return () => { session.stop(); if (active.current === session) active.current = null; };
  }, [options.api, options.draftId, options.readyFileId]);
  const perform = async (operation: (client: PlanExtractionClient) => Promise<void>) => {
    const session = active.current;
    if (!session || busy) return;
    setBusy(true);
    await session.run(() => operation(session.client));
    if (active.current === session) setBusy(false);
  };
  return { view, message, busy,
    apply: (units: CurriculumUnit[], replaceConfirmed: boolean) => perform(client => client.apply(units, { replaceConfirmed })),
    retry: () => perform(client => client.retry()),
    refresh: () => perform(client => client.poll()),
    cancel: () => { active.current?.stop(); active.current = null; setBusy(false); setView(null);
      setMessage('Podés seguir cargando las unidades manualmente. El análisis ya iniciado puede continuar en segundo plano.'); },
  };
}
export type PlanExtractionState = ReturnType<typeof usePlanExtraction>;
