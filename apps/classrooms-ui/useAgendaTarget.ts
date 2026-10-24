import { useEffect, useState } from 'react';
import type { AgendaTarget } from '../../src/core/domain/index.ts';
import type { AgendaClient } from '../agenda-ui/api.ts';

export function useAgendaTarget(api: AgendaClient, destination: string, authenticated: boolean) {
  const [state, setState] = useState<{ destination: string; target?: AgendaTarget; error?: string }>();
  const [retry, setRetry] = useState(0);
  const requested = destination.startsWith('/mis-aulas?aula=');
  useEffect(() => {
    if (!requested || !authenticated) return;
    let active = true;
    const query = new URLSearchParams(destination.split('?')[1]);
    setState(undefined);
    void api.open({ classroomId: query.get('aula')!, activityId: query.get('actividad') })
      .then(target => { if (active) setState({ destination, target }); })
      .catch(failure => { if (active) setState({ destination, error: (failure as Error).message }); });
    return () => { active = false; };
  }, [api, destination, authenticated, requested, retry]);
  const current = state?.destination === destination ? state : undefined;
  return { requested, target: current?.target, error: current?.error, reload: () => setRetry(value => value + 1) };
}
