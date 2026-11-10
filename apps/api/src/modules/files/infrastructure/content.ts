import { Worker } from 'node:worker_threads';
import { FileError } from '../domain/errors.ts';

/** Untrusted parsers run with bounded V8 heap and wall time; their output contains no raw input/errors. */
export async function inspectContent(bytes: Buffer, extension: string): Promise<string> {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > 50_000_000) throw new FileError('FILE_REJECTED');
  const url = new URL(import.meta.url.endsWith('.ts') ? './content-worker.ts' : './content-worker.js', import.meta.url);
  const worker = new Worker(url, { workerData: { bytes, extension }, execArgv: [],
    resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 }, stdout: true, stderr: true });
  worker.stdout.resume(); worker.stderr.resume();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<string>((resolve, reject) => {
      timer = setTimeout(() => reject(new FileError('SERVICE_UNAVAILABLE')), 15000);
      worker.once('message', result => {
        if (result?.ok === true && typeof result.mime === 'string') resolve(result.mime);
        else reject(new FileError('FILE_REJECTED'));
      });
      worker.once('error', () => reject(new FileError('SERVICE_UNAVAILABLE')));
      worker.once('exit', () => reject(new FileError('SERVICE_UNAVAILABLE')));
    });
  } finally { clearTimeout(timer); await worker.terminate(); }
}
