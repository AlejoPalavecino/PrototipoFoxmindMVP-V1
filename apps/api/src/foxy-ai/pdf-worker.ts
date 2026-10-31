import { createHash } from 'node:crypto';
import { Worker } from 'node:worker_threads';

type Result = { bytes: Uint8Array; digest: string; pageCount: number; rendererVersion: string };
type WorkerPort = Pick<Worker, 'postMessage' | 'terminate' | 'once' | 'removeListener'>;
type Options = { workerFactory?: () => WorkerPort; timeoutMs?: number };
function failure(code = 'SERVICE_UNAVAILABLE'): Error { return Object.assign(new Error(code), { code }); }
function createWorker(): WorkerPort {
  const url = new URL(import.meta.url.endsWith('.ts') ? './pdf-worker-entry.ts' : './pdf-worker-entry.js', import.meta.url);
  const worker = new Worker(url, { execArgv: [], stdout: true, stderr: true,
    resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 } });
  worker.stdout.resume(); worker.stderr.resume(); return worker;
}
function resultOf(value: unknown): Result {
  if (!value || typeof value !== 'object') throw failure();
  const result = value as Result;
  if (!(result.bytes instanceof Uint8Array) || result.bytes.byteLength < 1 || result.bytes.byteLength > 10 * 1024 * 1024
    || typeof result.digest !== 'string' || !/^[a-f0-9]{64}$/u.test(result.digest)
    || !Number.isSafeInteger(result.pageCount) || result.pageCount < 1 || result.pageCount > 100
    || result.rendererVersion !== 'foxy-pdf-v1') throw failure();
  const bytes = Uint8Array.from(result.bytes);
  if (createHash('sha256').update(bytes).digest('hex') !== result.digest) throw failure();
  return { bytes, digest: result.digest, pageCount: result.pageCount, rendererVersion: result.rendererVersion };
}
export function createFoxyPdfRenderer(options: Options = {}) {
  return { async render(input: { title: string; markdown: string }, signal: AbortSignal): Promise<Result> {
    signal.throwIfAborted();
    const snapshot = { title: input?.title, markdown: input?.markdown };
    if (typeof snapshot.title !== 'string' || typeof snapshot.markdown !== 'string' || !snapshot.title.trim()
      || !snapshot.markdown.trim() || snapshot.title.length > 200 || snapshot.markdown.length > 50000
      || /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u.test(snapshot.title + snapshot.markdown)) throw failure('INVALID_INPUT');
    const worker = (options.workerFactory ?? createWorker)();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: (() => void) | undefined;
    try {
      return await new Promise<Result>((resolve, reject) => {
        abort = () => reject(failure());
        signal.addEventListener('abort', abort, { once: true });
        timer = setTimeout(() => reject(failure()), options.timeoutMs ?? 3000);
        worker.once('message', value => {
          try {
            if (!value || value.ok !== true) throw failure(value?.code === 'AI_INPUT_LIMIT' ? 'AI_INPUT_LIMIT' : 'SERVICE_UNAVAILABLE');
            resolve(resultOf(value.result));
          } catch (error) { reject(error); }
        });
        worker.once('error', () => reject(failure()));
        worker.once('exit', () => reject(failure()));
        if (signal.aborted) { abort(); return; }
        worker.postMessage(snapshot);
      });
    } finally {
      if (timer) clearTimeout(timer); if (abort) signal.removeEventListener('abort', abort);
      await worker.terminate();
      signal.throwIfAborted();
    }
  } };
}
