import { useEffect, useRef, useState } from 'react';
import { requestChatAttachment, type ChatAttachment } from './chat-attachments';

export function useChatAttachments(path: string | undefined) {
  const [list, setList] = useState<{ path: string; items: ChatAttachment[] }>();
  const [error, setError] = useState<{ path: string; message: string }>();
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const mutation = useRef<AbortController | null>(null);
  const readVersion = useRef(0);
  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    const version = ++readVersion.current;
    void requestChatAttachment<{ items: ChatAttachment[] }>(path, 'GET', controller.signal).then(result => {
      if (!controller.signal.aborted && version === readVersion.current) { setList({ path, items: result.items }); setError(undefined); }
    }).catch(failure => {
      if (!controller.signal.aborted && version === readVersion.current) setError({ path, message: failure.message });
    });
    return () => controller.abort();
  }, [path, refresh]);

  async function upload(resolvePath: () => Promise<string>, id: string, file: File, copy: boolean) {
    if (mutation.current) return;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true);
    try {
      const target = await resolvePath();
      const query = new URLSearchParams({ name: file.name });
      if (copy) query.set('copy', '1');
      const result = await requestChatAttachment<{ attachment: ChatAttachment }>(`${target}/${id}?${query}`, 'PUT', controller.signal, file);
      readVersion.current++;
      if (!controller.signal.aborted) setList(value => ({ path: target,
        items: [...(value?.path === target ? value.items.filter(item => item.id !== result.attachment.id) : []), result.attachment] }));
      setRefresh(value => value + 1);
    } finally {
      mutation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!path || mutation.current) return;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true);
    setError(undefined);
    try {
      await requestChatAttachment(`${path}/${id}`, 'DELETE', controller.signal);
      readVersion.current++;
      setList(value => value?.path === path ? { path, items: value.items.filter(item => item.id !== id) } : value);
      setRefresh(value => value + 1);
    } catch (failure) {
      if (!controller.signal.aborted) setError({ path, message: failure instanceof Error ? failure.message : 'No se pudo quitar el archivo.' });
    } finally {
      mutation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return { items: path && list?.path === path ? list.items : [], busy, ready: !path || list?.path === path,
    error: path && error?.path === path ? error.message : undefined, upload, remove };
}
