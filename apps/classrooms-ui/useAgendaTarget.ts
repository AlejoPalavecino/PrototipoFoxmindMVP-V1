import { useEffect, useState } from 'react';
import type { AgendaTarget } from '../../src/core/domain/index.ts';
import type { AgendaClient } from '../agenda-ui/api.ts';

export function useAgendaTarget(api: AgendaClient, destination: string, subjectId: string | undefined) {
  const [state, setState] = useState<{ subjectId: string; destination: string; target?: AgendaTarget; error?: string }>();
  const [retry, setRetry] = useState(0);
  const requested = destination.startsWith('/mis-aulas?aula=');
  useEffect(() => {
    if (!requested || !subjectId) return;
    const controller = new AbortController(), { signal } = controller;
    const query = new URLSearchParams(destination.split('?')[1]);
    setState(undefined);
    void api.open({ classroomId: query.get('aula')!, activityId: query.get('actividad') }, signal)
      .then(target => { if (!signal.aborted) setState({ subjectId, destination, target }); })
      .catch(failure => { if (!signal.aborted) setState({ subjectId, destination, error: (failure as Error).message }); });
    return () => controller.abort();
  }, [api, destination, subjectId, requested, retry]);
  const current = state?.destination === destination && state.subjectId === subjectId ? state : undefined;
  return { requested, target: current?.target, error: current?.error, reload: () => setRetry(value => value + 1) };
}
