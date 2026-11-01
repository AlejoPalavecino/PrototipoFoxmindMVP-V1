import { useEffect, useRef, useState } from 'react';
import { createWebFoxyClient } from './foxy-client';
import { createWebClassroomClient } from './classroom-client';
import { createFoxyWorkspaceRuntime } from './foxy-workspace-runtime';

type Runtime = ReturnType<typeof createFoxyWorkspaceRuntime>;
type View = { runtime: Runtime; state: ReturnType<Runtime['getState']>; initializing: boolean };
export function useFoxyWorkspace({ subjectId, onIdentityRequired }: { subjectId: string; onIdentityRequired: (code: string) => void }) {
  const callback = useRef(onIdentityRequired); callback.current = onIdentityRequired;
  const subject = useRef(subjectId); subject.current = subjectId;
  const [view, setView] = useState<View | null>(null);
  useEffect(() => {
    let active = true, initializing = true;
    const currentSubject = subjectId;
    const runtime = createFoxyWorkspaceRuntime({ subjectId: currentSubject,
      createFoxyClient: notify => createWebFoxyClient(fetch, notify),
      createClassroomClient: notify => createWebClassroomClient(fetch, notify),
      onChange: state => { if (active && subject.current === currentSubject && !state.closed) setView({ runtime, state, initializing }); },
      onIdentityRequired: code => { if (active && subject.current === currentSubject) { active = false; setView(null); callback.current(code); } },
    });
    const onPageHide = () => { if (active) { active = false; setView(null); runtime.dispose(); } };
    if (typeof window !== 'undefined') window.addEventListener('pagehide', onPageHide);
    setView({ runtime, state: runtime.getState(), initializing });
    const settled = () => {
      if (active && subject.current === currentSubject) {
        initializing = false; const state = runtime.getState();
        if (!state.closed) setView({ runtime, state, initializing });
      }
    };
    try { void runtime.init().then(settled, settled); } catch { settled(); }
    return () => { if (typeof window !== 'undefined') window.removeEventListener('pagehide', onPageHide); if (active) { active = false; runtime.dispose(); } };
  }, [subjectId]);
  const current = view && view.state.subjectId === subjectId && !view.state.closed ? view : null;
  return { state: current?.state ?? null, runtime: current?.runtime ?? null, initializing: current?.initializing ?? true };
}
