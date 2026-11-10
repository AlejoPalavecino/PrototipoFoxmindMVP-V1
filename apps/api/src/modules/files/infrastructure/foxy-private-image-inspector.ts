import { createHash } from 'node:crypto';
import { Worker } from 'node:worker_threads';
type WorkerPort = Pick<Worker, 'postMessage' | 'terminate' | 'once' | 'removeListener'>;
type Options = { workerFactory?: () => WorkerPort; timeoutMs?: number };
type Facts = { mimeType: 'image/png' | 'image/jpeg'; width: number; height: number; sizeBytes: number; digest: string };
function failure(code = 'SERVICE_UNAVAILABLE'): Error { return Object.assign(new Error(code), { code }); }
function createWorker(): WorkerPort {
  const url = new URL(import.meta.url.endsWith('.ts') ? './foxy-private-image-inspector-entry.ts' : './foxy-private-image-inspector-entry.js', import.meta.url);
  const worker = new Worker(url, { execArgv: [], stdout: true, stderr: true,
    resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 } });
  worker.stdout.resume(); worker.stderr.resume(); return worker;
}
function dimensions(bytes: Uint8Array): { mimeType: Facts['mimeType']; width: number; height: number } | null {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (b.length >= 24 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.toString('ascii',12,16) === 'IHDR')
    return { mimeType: 'image/png', width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.length < 4 || b[0] !== 255 || b[1] !== 216) return null;
  let pos = 2;
  while (pos + 4 <= b.length && b[pos] === 255) {
    while (pos < b.length && b[pos] === 255) pos++;
    const marker = b[pos++]!; if (pos + 2 > b.length) return null;
    const size = b.readUInt16BE(pos); if (size < 2 || pos + size > b.length) return null;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      if (size < 8) return null;
      return { mimeType: 'image/jpeg', width: b.readUInt16BE(pos + 5), height: b.readUInt16BE(pos + 3) };
    }
    if (marker === 0xda || marker === 0xd9) return null;
    pos += size;
  }
  return null;
}
function validateResult(value: unknown, bytes: Uint8Array): Facts {
  if (!value || typeof value !== 'object') throw failure();
  const x = value as Facts, header = dimensions(bytes);
  if (!header || x.mimeType !== header.mimeType || x.width !== header.width || x.height !== header.height
    || !Number.isInteger(x.width) || !Number.isInteger(x.height) || x.width < 1 || x.height < 1 || x.width > 4096 || x.height > 4096
    || x.width * x.height > 4_000_000 || x.sizeBytes !== bytes.length || x.digest !== createHash('sha256').update(bytes).digest('hex')) throw failure();
  return { mimeType: x.mimeType, width: x.width, height: x.height, sizeBytes: x.sizeBytes, digest: x.digest };
}
export function createFoxyPrivateImageInspector(options: Options = {}) {
  return { async inspect(input: Uint8Array, signal: AbortSignal): Promise<Facts> {
    if (!(input instanceof Uint8Array) || !input.byteLength || input.byteLength > 10_485_760 || !signal
      || typeof signal.throwIfAborted !== 'function' || typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function' || !Number.isSafeInteger(options.timeoutMs ?? 15000)
      || (options.timeoutMs ?? 15000) < 1 || (options.timeoutMs ?? 15000) > 15000) throw failure('INVALID_INPUT');
    signal.throwIfAborted(); const bytes = Uint8Array.from(input);
    let worker: WorkerPort; try { worker = (options.workerFactory ?? createWorker)(); } catch { throw failure(); }
    let timer: ReturnType<typeof setTimeout> | undefined; let abort: (() => void) | undefined;
    try {
      return await new Promise<Facts>((resolve, reject) => {
        abort = () => reject(failure()); signal.addEventListener('abort', abort, { once: true });
        timer = setTimeout(() => reject(failure()), options.timeoutMs ?? 15000);
        worker.once('message', value => { try {
          if (!value || value.ok !== true) throw failure(value?.code === 'FILE_REJECTED' ? 'FILE_REJECTED' : 'SERVICE_UNAVAILABLE');
          resolve(validateResult(value.result, bytes));
        } catch (error) { reject(error); } });
        worker.once('error', () => reject(failure())); worker.once('exit', () => reject(failure()));
        if (signal.aborted) { abort(); return; }
        try { worker.postMessage({ bytes }); } catch { reject(failure()); }
      });
    } finally {
      if (timer) clearTimeout(timer); if (abort) signal.removeEventListener('abort', abort);
      try { await worker.terminate(); } catch { signal.throwIfAborted(); throw failure(); }
      signal.throwIfAborted();
    }
  } };
}
