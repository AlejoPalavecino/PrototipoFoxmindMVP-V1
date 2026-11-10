import type { IncomingMessage, ServerResponse } from 'node:http';
import { performance } from 'node:perf_hooks';

/** Discard only the remaining input, without retaining chunks or renewing metadata time. */
export function discardRejectedBody(request: IncomingMessage, response: ServerResponse,
  budget: number, deadline: number): Promise<boolean> {
  return new Promise(resolve => {
    let received = 0, settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = (complete: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      request.off('data', data); request.off('end', end); request.off('error', abort);
      request.off('aborted', abort); request.off('close', abort); response.off('close', abort);
      if (!complete) { request.pause(); request.destroy(); response.destroy(); }
      resolve(complete);
    };
    const data = (chunk: Buffer) => { received += chunk.length; if (received > budget) done(false); };
    const end = () => done(true), abort = () => done(false);
    if (request.destroyed || request.aborted || response.destroyed) { done(false); return; }
    if (request.readableEnded) { done(true); return; }
    const remaining = deadline - performance.now();
    if (remaining <= 0) { done(false); return; }
    timer = setTimeout(abort, remaining);
    request.on('data', data); request.once('end', end); request.once('error', abort);
    request.once('aborted', abort); request.once('close', abort); response.once('close', abort);
    request.resume();
  });
}
