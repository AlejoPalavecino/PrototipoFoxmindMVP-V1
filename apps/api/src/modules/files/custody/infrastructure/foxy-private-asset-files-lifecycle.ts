import type { FoxyPrivateAssetLease } from '../../../foxy/public.ts';

type Options = { renew: (lease: FoxyPrivateAssetLease) => Promise<boolean>; authority: { close(capability: object): void };
  timing?: { renewIntervalMs: number; deadlineMs: number } };
export function createFoxyAssetCustodyLifecycle(options: Options) {
  const interval = options.timing?.renewIntervalMs ?? 30_000, deadline = options.timing?.deadlineMs ?? 120_000;
  if (typeof options.renew !== 'function' || !Number.isSafeInteger(interval) || interval < 1 || interval > 30_000
    || !Number.isSafeInteger(deadline) || deadline < 1 || deadline > 120_000 || interval >= deadline) throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
  let closed = false, active: { abort: () => void; task: Promise<unknown> } | undefined;
  function run<T>(capability: object, signal: AbortSignal, operation: (context: { signal: AbortSignal; start: (lease: FoxyPrivateAssetLease) => Promise<void> }) => Promise<T>): Promise<T> {
    if (closed || active) return Promise.reject(new Error('SERVICE_UNAVAILABLE'));
    if (!signal || typeof signal.addEventListener !== 'function' || typeof signal.throwIfAborted !== 'function') return Promise.reject(new Error('INVALID_INPUT'));
    const controller = new AbortController(); let heartbeat: ReturnType<typeof setTimeout> | undefined;
    let renewal: Promise<void> | undefined, done = false;
    const abort = () => { controller.abort(); options.authority.close(capability); };
    const timeout = setTimeout(abort, deadline); signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    async function start(lease: FoxyPrivateAssetLease): Promise<void> {
      const renew = () => { renewal = Promise.resolve().then(() => options.renew(lease))
        .then(ok => { if (!ok) abort(); }, abort); return renewal; };
      const schedule = () => { heartbeat = setTimeout(() => {
        void renew().finally(() => { if (!done && !controller.signal.aborted) schedule(); });
      }, interval); };
      await renew(); controller.signal.throwIfAborted(); schedule();
    }
    const task = (async () => {
      try { controller.signal.throwIfAborted(); return await operation({ signal: controller.signal, start }); }
      finally { done = true; clearTimeout(timeout); clearTimeout(heartbeat); signal.removeEventListener('abort', abort); await renewal; }
    })();
    active = { abort, task }; void task.then(() => { active = undefined; }, () => { active = undefined; }); return task;
  }
  return { run, async close() { closed = true; const current = active; if (current) { current.abort(); await current.task.catch(() => undefined); } } };
}
