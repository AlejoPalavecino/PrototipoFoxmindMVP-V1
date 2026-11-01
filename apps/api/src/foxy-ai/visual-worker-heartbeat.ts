import type { FoxyVisualLease, VisualOptions } from './visual-worker-types.ts';
export function createVisualHeartbeat(queue: VisualOptions['queue'], lease: FoxyVisualLease, abort: () => void) {
  let stopped = false, timer: ReturnType<typeof setTimeout> | undefined, pending: Promise<void> | undefined;
  function schedule() { timer = setTimeout(() => {
    pending = Promise.resolve().then(() => queue.renew(lease)).then(ok => { if (!ok) abort(); },abort)
      .finally(() => { if (!stopped) schedule(); });
  },30000); timer.unref?.(); }
  schedule();
  return { async stop() { stopped = true; clearTimeout(timer); await pending; } };
}
