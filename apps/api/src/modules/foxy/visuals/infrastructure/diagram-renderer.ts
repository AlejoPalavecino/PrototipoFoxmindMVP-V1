import { createHash } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { parseFoxyDiagram } from '../../../../../../../src/core/domain/foxy/visual-validation.ts';
import { type FoxyAspectRatio, type FoxyDiagram } from '../../../../../../../src/core/domain/foxy/visual.ts';

type WorkerPort = Pick<Worker, 'postMessage' | 'terminate' | 'once' | 'removeListener'>;
type Options = { workerFactory?: () => WorkerPort; timeoutMs?: number };
type Result = { bytes: Uint8Array; mimeType: 'image/png'; width: number; height: number; digest: string; rendererVersion: 'foxy-diagram-png-v1' };
const dimensions: Record<FoxyAspectRatio, readonly [number, number]> = { '1:1': [1600, 1600], '4:3': [1600, 1200], '3:4': [1200, 1600], '16:9': [1920, 1080] };
function failure(code = 'SERVICE_UNAVAILABLE'): Error { return Object.assign(new Error(code), { code }); }
function createWorker(): WorkerPort {
  const url = new URL(import.meta.url.endsWith('.ts') ? './diagram-renderer-entry.ts' : './diagram-renderer-entry.js', import.meta.url);
  const worker = new Worker(url, { execArgv: [], stdout: true, stderr: true,
    resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 } });
  worker.stdout.resume(); worker.stderr.resume(); return worker;
}
function resultOf(value: unknown, width: number, height: number): Result {
  if (!value || typeof value !== 'object') throw failure();
  const result = value as Result;
  if (!(result.bytes instanceof Uint8Array) || result.bytes.byteLength < 33 || result.bytes.byteLength > 10 * 1024 * 1024
    || result.width !== width || result.height !== height || result.mimeType !== 'image/png'
    || result.rendererVersion !== 'foxy-diagram-png-v1' || !/^[a-f0-9]{64}$/u.test(result.digest)) throw failure();
  const bytes = Uint8Array.from(result.bytes), view = new DataView(bytes.buffer);
  if (![137,80,78,71,13,10,26,10].every((byte, i) => bytes[i] === byte) || view.getUint32(16) !== width
    || view.getUint32(20) !== height || createHash('sha256').update(bytes).digest('hex') !== result.digest) throw failure();
  return { bytes, width, height, mimeType: 'image/png', digest: result.digest, rendererVersion: 'foxy-diagram-png-v1' };
}
export function createFoxyDiagramRenderer(options: Options = {}) {
  return { async render(input: { diagram: FoxyDiagram; aspectRatio: FoxyAspectRatio; signal: AbortSignal }): Promise<Result> {
    const signal = input?.signal; if (!signal || typeof signal.throwIfAborted !== 'function') throw failure('INVALID_INPUT');
    signal.throwIfAborted();
    const diagram = parseFoxyDiagram(input.diagram);
    if (!diagram.nodes.length || !Object.hasOwn(dimensions, input.aspectRatio)) throw failure('INVALID_INPUT');
    const [width, height] = dimensions[input.aspectRatio];
    let worker: WorkerPort;
    try { worker = (options.workerFactory ?? createWorker)(); } catch { throw failure(); }
    let timer: ReturnType<typeof setTimeout> | undefined; let abort: (() => void) | undefined;
    try {
      return await new Promise<Result>((resolve, reject) => {
        abort = () => reject(failure()); signal.addEventListener('abort', abort, { once: true });
        timer = setTimeout(() => reject(failure()), options.timeoutMs ?? 3000);
        worker.once('message', value => {
          try {
            if (!value || value.ok !== true) throw failure(value?.code === 'AI_INPUT_LIMIT' ? 'AI_INPUT_LIMIT' : 'SERVICE_UNAVAILABLE');
            resolve(resultOf(value.result, width, height));
          } catch (error) { reject(error); }
        });
        worker.once('error', () => reject(failure())); worker.once('exit', () => reject(failure()));
        if (signal.aborted) { abort(); return; }
        try { worker.postMessage({ diagram, width, height }); } catch { reject(failure()); }
      });
    } finally {
      if (timer) clearTimeout(timer); if (abort) signal.removeEventListener('abort', abort);
      try { await worker.terminate(); } catch { throw failure(); }
      signal.throwIfAborted();
    }
  } };
}
