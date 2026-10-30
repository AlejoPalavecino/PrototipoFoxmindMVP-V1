import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClassroomClient } from './api.ts';

type ResourceState<T> = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: T | null;
  error: string;
  key: string;
};

export function useClassroomResource<T>(api: ClassroomClient, path: string, enabled: boolean) {
  const [state, setState] = useState<ResourceState<T>>({ status: 'idle', data: null, error: '', key: path });
  const generation = useRef(0);
  const active = useRef<AbortController | null>(null);
  const currentResource = useRef({ path, enabled });
  currentResource.current = { path, enabled };
  const reloadWithResult = useCallback(async (): Promise<T | null> => {
    if (!currentResource.current.enabled || currentResource.current.path !== path) return null;
    const current = ++generation.current;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setState(previous => ({ status: 'loading', data: previous.key === path ? previous.data : null, error: '', key: path }));
    try {
      const data = await api.call<T>(path, undefined, undefined, controller.signal);
      if (current === generation.current && !controller.signal.aborted) {
        setState({ status: 'ready', data, error: '', key: path });
        return data;
      }
    } catch (error) {
      if (current === generation.current && !controller.signal.aborted) {
        setState(previous => ({ ...previous, status: 'error', error: (error as Error).message }));
      }
    }
    return null;
  }, [api, path]);
  const reload = useCallback(async () => { await reloadWithResult(); }, [reloadWithResult]);
  useEffect(() => {
    setState({ status: 'idle', data: null, error: '', key: path });
    if (enabled) void reload();
    return () => { generation.current++; active.current?.abort(); };
  }, [enabled, reload]);
  return { ...(state.key === path ? state : { status: 'idle' as const, data: null, error: '' }), reload, reloadWithResult };
}
