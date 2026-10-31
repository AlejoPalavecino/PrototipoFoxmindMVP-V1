import { useEffect, useState } from 'react';
import type { Classroom } from '../../../classrooms-ui/api';
import { createWebClassroomClient } from '../lib/classroom-client';
import { createWebFoxyClient } from '../lib/foxy-client';
import { createFoxyChatController } from '../lib/foxy-chat-controller';
import { FoxyWorkspace } from './foxy-workspace';

type Controller = ReturnType<typeof createFoxyChatController>;
export function FoxyWorkspaceSession({ onIdentityRequired }: { onIdentityRequired: (code: string) => void }) {
  const [controller, setController] = useState<Controller>(), [state, setState] = useState<ReturnType<Controller['getState']>>();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]), [error, setError] = useState('');
  useEffect(() => {
    let active = true; const abort = new AbortController();
    let current: Controller;
    const identityRequired = (code: string) => {
      if (!active) return;
      active = false; abort.abort(); current.dispose();
      setController(undefined); setState(undefined); setClassrooms([]); setError('');
      onIdentityRequired(code);
    };
    current = createFoxyChatController({ client: createWebFoxyClient(fetch, identityRequired), onChange: next => { if (active) setState(next); } });
    setController(current); setState(current.getState()); void current.init();
    void createWebClassroomClient(fetch, identityRequired).call<{ teach: Classroom[] }>('', undefined, undefined, abort.signal)
      .then(result => { if (active) setClassrooms(result.teach.filter(room => !room.archived)); })
      .catch(() => { if (active) setError('No pudimos cargar tus aulas. Podés usar el contexto general.'); });
    return () => { if (active) { active = false; abort.abort(); current.dispose(); } };
  }, []);
  return <>{error ? <p role="alert">{error}</p> : null}{controller && state ? <FoxyWorkspace controller={controller} state={state} classrooms={classrooms} /> : <p>Cargando Foxy AI…</p>}</>;
}
