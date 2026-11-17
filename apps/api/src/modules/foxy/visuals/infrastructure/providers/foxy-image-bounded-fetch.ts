type Fetch = typeof globalThis.fetch;
const cap = 16_777_216;
function unavailable(): Error { return Object.assign(new Error('AI_UNAVAILABLE'), { code: 'AI_UNAVAILABLE' }); }
async function consume(response: Response, signal: AbortSignal): Promise<Response> {
  if (signal.aborted) { void response.body?.cancel().catch(() => {}); throw unavailable(); }
  if (!response.body) return new Response(null, { status: response.status, statusText: response.statusText, headers: response.headers });
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
  let abort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    abort = () => { reject(unavailable()); void reader.cancel().catch(() => {}); };
    signal.addEventListener('abort',abort,{ once: true });
    if (signal.aborted) abort();
  });
  try {
    while (true) {
      const item = await Promise.race([reader.read(),aborted]);
      if (signal.aborted) throw unavailable();
      if (item.done) break;
      if (!(item.value instanceof Uint8Array) || item.value.byteLength > cap - length) throw unavailable();
      length += item.value.byteLength; chunks.push(Uint8Array.from(item.value));
    }
    const body = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { body.set(chunk,offset); offset += chunk.byteLength; }
    if (signal.aborted) throw unavailable();
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  } catch (error) { void reader.cancel().catch(() => {}); throw error; }
  finally { if (abort) signal.removeEventListener('abort',abort); reader.releaseLock(); }
}
export function createFoxyImageBoundedFetch(baseFetch: Fetch): Fetch {
  return async (input, init) => {
    const external = init?.signal ?? (input instanceof Request ? input.signal : undefined), controller = new AbortController();
    if (external?.aborted) throw unavailable();
    const abort = () => controller.abort(); external?.addEventListener('abort',abort,{ once: true });
    if (external?.aborted) controller.abort();
    const timer = setTimeout(abort,15000);
    try {
      if (controller.signal.aborted) throw unavailable();
      const pending = baseFetch(input,{ ...init, signal: controller.signal, redirect: 'error' });
      let onAbort: (() => void) | undefined;
      const aborted = new Promise<never>((_,reject) => { onAbort = () => reject(unavailable()); controller.signal.addEventListener('abort',onAbort,{ once: true }); if (controller.signal.aborted) onAbort(); });
      let response: Response;
      try { response = await Promise.race([pending,aborted]); }
      catch (error) { void pending.then(late => late.body?.cancel()).catch(() => {}); throw error; }
      finally { if (onAbort) controller.signal.removeEventListener('abort',onAbort); }
      return await consume(response,controller.signal);
    } catch { throw unavailable(); }
    finally { clearTimeout(timer); external?.removeEventListener('abort',abort); }
  };
}
