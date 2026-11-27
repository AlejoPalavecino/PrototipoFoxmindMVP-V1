import { useCallback, useEffect, useState } from 'react';
import type { ActivitySummary } from '../../../../../../src/core/contracts/activities.ts';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { ProgressData } from '../../../../../../src/core/contracts/grading.ts';

/** The classroom's activities, read on mount and whenever `load` is called again. */
export function useActivityList(api: ClassroomClient, roomId: string, onError: (message: string) => void) {
  const [activities, setActivities] = useState<ActivitySummary[]>([]),
    [loaded, setLoaded] = useState(false);
  const read = useCallback(
    async (signal?: AbortSignal) =>
      (await api.call<{ activities: ActivitySummary[] }>(`/${roomId}/activities`, 'GET', undefined, signal)).activities,
    [api, roomId],
  );
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const items = await read(signal);
      if (signal?.aborted) return;
      setActivities(items);
      setLoaded(true);
    },
    [read],
  );
  useEffect(() => {
    const controller = new AbortController();
    read(controller.signal)
      .then(items => {
        if (controller.signal.aborted) return;
        setActivities(items);
        setLoaded(true);
      })
      .catch(e => {
        if (!controller.signal.aborted) onError(e.message);
      });
    return () => controller.abort();
  }, [read, onError]);
  return { activities, loaded, load };
}

/** First submissions per activity, which only the teacher sees once the list is loaded. */
export function useDeliveryCounts(
  api: ClassroomClient,
  roomId: string,
  enabled: boolean,
  activities: ActivitySummary[],
) {
  const [deliveryCounts, setDeliveryCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void api
      .call<ProgressData>(`/${roomId}/progress`, 'GET', undefined, controller.signal)
      .then(progress => {
        if (controller.signal.aborted || progress.scope !== 'classroom') return;
        const counts: Record<string, number> = Object.fromEntries(activities.map(activity => [activity.id, 0]));
        for (const student of progress.students)
          for (const activity of student.activities) {
            if (activity.firstSubmission) counts[activity.id] = (counts[activity.id] ?? 0) + 1;
          }
        setDeliveryCounts(counts);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDeliveryCounts({});
      });
    return () => controller.abort();
  }, [api, roomId, enabled, activities]);
  return deliveryCounts;
}
