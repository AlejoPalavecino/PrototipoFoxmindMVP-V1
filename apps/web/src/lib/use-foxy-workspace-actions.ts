import { useEffect, useRef, useState } from 'react';
import { createFoxyWorkspaceActions } from './foxy-workspace-actions';
import type { createFoxyWorkspaceRuntime } from './foxy-workspace-runtime';

type Runtime = ReturnType<typeof createFoxyWorkspaceRuntime>;
type Snapshot = ReturnType<Runtime['getState']>;
type Actions = ReturnType<typeof createFoxyWorkspaceActions>;
type Binding = { runtime: Runtime; subjectId: string; actions: Actions; ui: ReturnType<Actions['getState']> };
function matches(runtime: Runtime | null, state: Snapshot | null, subjectId: string | undefined): boolean {
  if (!runtime || !state || state.closed || !subjectId || state.subjectId !== subjectId) return false;
  const current = runtime.getState();
  return !current.closed && current.subjectId === subjectId;
}
export function useFoxyWorkspaceActions({ runtime, state, onNavigate }: {
  runtime: Runtime | null; state: Snapshot | null; onNavigate: (href: string) => void | Promise<void>;
}) {
  const navigate = useRef(onNavigate); navigate.current = onNavigate;
  const latest = useRef({ runtime, state }); latest.current = { runtime, state };
  const [binding, setBinding] = useState<Binding | null>(null);
  const subjectId = state?.subjectId;
  const coherent = matches(runtime, state, subjectId);
  useEffect(() => {
    if (!runtime || !subjectId || !coherent) { setBinding(null); return; }
    let active = true;
    const current = () => active && latest.current.runtime === runtime && matches(runtime, latest.current.state, subjectId);
    const actions = createFoxyWorkspaceActions({ runtime,
      onChange: ui => { if (current()) setBinding({ runtime, subjectId, actions, ui: structuredClone(ui) }); },
      onNavigate: href => { if (!current()) throw new Error('Stale workspace'); return navigate.current(href); },
    });
    setBinding({ runtime, subjectId, actions, ui: structuredClone(actions.getState()) });
    return () => { active = false; actions.dispose(); };
  }, [runtime, subjectId, coherent]);
  useEffect(() => {
    if (binding && runtime === binding.runtime && matches(runtime, state, binding.subjectId)) binding.actions.sync();
  }, [runtime, state]);
  const valid = !!binding && binding.runtime === runtime && matches(runtime, state, binding.subjectId);
  return { actions: valid ? binding.actions : null, ui: valid ? binding.ui : null };
}
