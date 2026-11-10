import { useEffect, useState } from 'react';
import type { ActivitySummary } from '../../../../../../src/core/contracts/activities.ts';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import type { Material } from '../../../../../../src/core/contracts/materials.ts';

export function usePlanWorkspace(api: ClassroomClient, room: Detail) {
  const [data, setData] = useState<{ roomId: string; materials: Material[]; activities: ActivitySummary[] }>();
  const [failure, setFailure] = useState<{ roomId: string; message: string }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined); setFailure(undefined);
    void Promise.all([
      api.call<Material[]>(`/${room.id}/library`, 'GET', undefined, controller.signal),
      api.call<{ activities: ActivitySummary[] }>(`/${room.id}/activities`, 'GET', undefined, controller.signal),
    ]).then(([materials, result]) => {
      if (!controller.signal.aborted) setData({ roomId: room.id, materials, activities: result.activities });
    }).catch(error => {
      if (!controller.signal.aborted) { setData(undefined); setFailure({ roomId: room.id, message: (error as Error).message }); }
    });
    return () => controller.abort();
  }, [api, room.id, room.revision, retry]);
  return { data: data?.roomId === room.id ? data : undefined,
    error: failure?.roomId === room.id ? failure.message : '', retry: () => setRetry(value => value + 1) };
}
