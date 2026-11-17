import { useEffect, useMemo, useState } from 'react';
import type { AgendaTarget } from '../../../../../src/core/domain/agenda/types.ts';
import type { AgendaClient } from '../../features/agenda/index.ts';

export function useAgendaTarget(api: AgendaClient, destination: string, subjectId: string | undefined) {
  const [state, setState] = useState<{ subjectId: string; destination: string; target?: AgendaTarget; error?: string }>();
  const [retry, setRetry] = useState(0);
  const requested = destination.startsWith('/mis-aulas?aula=');
  const params = requested ? new URLSearchParams(destination.split('?')[1]) : null;
  const classroomId = params?.get('aula') ?? null;
  const activityId = params?.get('actividad') ?? null;
  // ClassroomView loads the authorized classroom detail, including archived classrooms.
  const classroomOnly = useMemo(() => classroomId && !activityId ? { classroomId, activityId: null } : undefined, [classroomId, activityId]);
  useEffect(() => {
    if (!classroomId || !activityId || !subjectId) return;
    const controller = new AbortController(), { signal } = controller;
    setState(undefined);
    void api.open({ classroomId, activityId }, signal)
      .then(target => { if (!signal.aborted) setState({ subjectId, destination, target }); })
      .catch(failure => { if (!signal.aborted) setState({ subjectId, destination, error: (failure as Error).message }); });
    return () => controller.abort();
  }, [api, destination, subjectId, classroomId, activityId, retry]);
  const current = state?.destination === destination && state.subjectId === subjectId ? state : undefined;
  return { requested, target: classroomOnly ?? current?.target, error: current?.error, reload: () => setRetry(value => value + 1) };
}
