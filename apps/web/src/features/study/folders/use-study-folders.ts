import { useEffect, useRef, useState } from 'react';
import { createStudyClient } from '../api.ts';
import type { StudyCollection, StudyDetail } from '../model/study-contracts.ts';
import { createStudyFolderOperations } from './study-folder-operations.ts';

type Options = { folderId?: string; onAccessError: (error: unknown) => void };

export function useStudyFolders({ folderId, onAccessError }: Options) {
  const [collection, setCollection] = useState<StudyCollection>();
  const [detail, setDetail] = useState<StudyDetail>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [api] = useState(createStudyClient);
  const latest = useRef({ folderId, onAccessError });
  latest.current = { folderId, onAccessError };
  const operations = useRef<ReturnType<typeof createStudyFolderOperations> | null>(null);
  if (!operations.current)
    operations.current = createStudyFolderOperations(api, {
      onDetail: setDetail,
      onBusy: setBusy,
      onError(message, failure) {
        setError(message);
        if (failure) latest.current.onAccessError(failure);
      },
    });
  // Invalidate on route changes before another folder is loaded.
  useEffect(() => {
    operations.current!.invalidate(folderId);
    setDetail(undefined);
  }, [folderId]);
  useEffect(() => () => operations.current!.invalidate(undefined), []);

  async function load(id: string | undefined, active: () => boolean) {
    const catalog = await api.list();
    const value = id ? await api.get(id) : undefined;
    if (!active() || latest.current.folderId !== id) return;
    setCollection(catalog);
    if (value) operations.current!.replace(value);
    setDetail(value);
    return value;
  }
  async function reload() {
    const id = folderId;
    if (!id) return;
    const value = await api.get(id);
    if (latest.current.folderId === id) {
      operations.current!.replace(value);
      setDetail(value);
    }
  }
  return {
    collection,
    detail,
    error,
    busy,
    setError,
    load,
    reload,
    run: operations.current.run,
    cancelGeneration: async (requestId: string) => {
      if (!folderId) throw new Error('No hay una carpeta seleccionada.');
      return (await api.cancel(folderId, requestId)).result.status;
    },
  };
}
