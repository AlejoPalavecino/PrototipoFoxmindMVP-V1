import type { FoxyPublicationLease } from './publication-queue.ts';
import type { createFoxyPublicationAuthority } from './publication-authority.ts';
import type { FoxyPublicationFiles, FoxyPublicationRasterSource } from '../../../files/public.ts';
import type { createFoxyPublicationCompletion } from './publication-completion.ts';
import type { renderFoxyTextPdf } from './resource-pdf.ts';
import { isFoxyPdfVersion, canReplayFoxyPdf } from '../domain/pdf-renderer-version.ts';

type Authority = ReturnType<typeof createFoxyPublicationAuthority>;
type Options = { queue: { claim(): Promise<FoxyPublicationLease | null>; renew(lease: FoxyPublicationLease): Promise<boolean>;
    release(lease: FoxyPublicationLease): Promise<boolean> };
  authority: Pick<Authority, 'open' | 'existingFile' | 'createFileCapability' | 'close'>;
  files: FoxyPublicationFiles;
  renderer: { render: typeof renderFoxyTextPdf };
  rasterSource?: FoxyPublicationRasterSource;
  completion: Pick<ReturnType<typeof createFoxyPublicationCompletion>, 'finish'> };
type Scope = Awaited<ReturnType<Authority['open']>>;
function errorCode(error: unknown): string {
  const value = String((error as { code?: unknown })?.code ?? '');
  return ['AI_INPUT_LIMIT', 'INVALID_INPUT', 'FILE_NOT_READY'].includes(value) ? value : 'FILE_NOT_READY';
}
export function createFoxyPublicationWorker(options: Options) {
  let stopped = false, initialized = false, active: Promise<boolean> | undefined, stopping: Promise<void> | undefined;
  let controller: AbortController | undefined, scheduler: ReturnType<typeof setTimeout> | undefined;
  async function process(lease: FoxyPublicationLease, signal: AbortSignal): Promise<void> {
    let scope: Scope | undefined, finalizing = false;
    try {
      scope = await options.authority.open(lease, signal); signal.throwIfAborted();
      let file = await options.authority.existingFile(scope.capability, signal); signal.throwIfAborted();
      const status = file ? await options.files.inspect(file.capability, signal) : 'RECEIVABLE';
      signal.throwIfAborted();
      if (status === 'BUSY') { await options.queue.release(lease); return; }
      if (status === 'UNAVAILABLE') throw Object.assign(new Error('FILE_NOT_READY'), { code: 'FILE_NOT_READY' });
      if (status !== 'READY') {
        const raster = 'kind' in scope.snapshot && scope.snapshot.kind === 'VISUAL';
        let bytes: Uint8Array; let descriptor: Parameters<Options['files']['ensureFile']>[1];
        if (raster) {
          if (!options.rasterSource) throw Object.assign(new Error('FILE_NOT_READY'), { code:'FILE_NOT_READY' });
          const image = await options.rasterSource.read(scope.capability,signal); bytes=image.bytes; descriptor=image.artifact;
        } else {
          const existing = file?.descriptor;
          const version = existing && !('kind' in existing) ? existing.rendererVersion : null;
          if (version !== null && !canReplayFoxyPdf(version)) throw Object.assign(new Error('FILE_NOT_READY'), {code:'FILE_NOT_READY'});
          const pdf = await options.renderer.render(scope.snapshot as {title:string;markdown:string},signal,version ?? undefined);
          if (!isFoxyPdfVersion(pdf.rendererVersion)
            || (existing && !('kind' in existing) && (pdf.rendererVersion !== existing.rendererVersion
              || pdf.digest !== existing.digest || pdf.bytes.byteLength !== existing.sizeBytes || pdf.pageCount !== existing.pageCount)))
            throw Object.assign(new Error('FILE_NOT_READY'), {code:'FILE_NOT_READY'});
          bytes=pdf.bytes; descriptor={digest:pdf.digest,sizeBytes:pdf.bytes.byteLength,pageCount:pdf.pageCount,rendererVersion:pdf.rendererVersion};
        }
        signal.throwIfAborted();
        if (!file) {
          const allocated = await options.files.ensureFile(scope.capability, descriptor, signal);
          if (!allocated) throw Object.assign(new Error('FILE_NOT_READY'), { code: 'FILE_NOT_READY' });
          signal.throwIfAborted(); file = await options.authority.createFileCapability(scope.capability, signal);
        }
        signal.throwIfAborted(); await options.files.receive(file.capability, bytes, signal); signal.throwIfAborted();
      }
      if (!file) throw Object.assign(new Error('FILE_NOT_READY'), { code: 'FILE_NOT_READY' });
      await options.files.proof(file.capability, signal); signal.throwIfAborted();
      finalizing = true;
      const completed = await options.completion.finish(lease, { state: 'READY' });
      if (!completed && !signal.aborted && !stopped) await options.completion.finish(lease, { state: 'FAILED', errorCode: 'FILE_NOT_READY' });
    } catch (error) {
      const code = (error as { code?: unknown })?.code;
      if (!finalizing && !signal.aborted && !stopped) {
        if (code === 'UPLOAD_CONFLICT') await options.queue.release(lease);
        else await options.completion.finish(lease, { state: 'FAILED', errorCode: errorCode(error) });
      }
    } finally { if (scope) options.authority.close(scope); }
  }
  async function run(): Promise<boolean> {
    const lease = await options.queue.claim(); if (!lease) return false;
    if (stopped) { await options.queue.release(lease); return false; }
    const current = new AbortController(); controller = current;
    let heartbeat: ReturnType<typeof setTimeout> | undefined, pending: Promise<void> | undefined, finished = false;
    const beat = () => { if (finished || current.signal.aborted) return;
      pending = (async () => { try { if (!await options.queue.renew(lease)) current.abort(); } catch { current.abort(); }
        if (!finished && !current.signal.aborted) { heartbeat = setTimeout(beat, 30000); heartbeat.unref?.(); } })(); return pending; };
    heartbeat = setTimeout(beat, 30000); heartbeat.unref?.();
    const deadline = setTimeout(() => current.abort(), 120000); deadline.unref?.();
    try { await process(lease, current.signal); }
    finally { finished = true; clearTimeout(deadline); if (heartbeat) clearTimeout(heartbeat); await pending; controller = undefined; }
    return true;
  }
  function runOnce(): Promise<boolean> {
    if (stopped) return Promise.resolve(false);
    if (!active) active = run().finally(() => { active = undefined; });
    return active;
  }
  function poll(): void {
    if (stopped) return;
    scheduler = setTimeout(() => { scheduler = undefined; void runOnce().catch(() => false).finally(poll); }, 5000); scheduler.unref?.();
  }
  function onModuleInit(): void { if (!initialized && !stopped) { initialized = true; poll(); } }
  function onModuleDestroy(): Promise<void> {
    if (!stopping) { stopped = true; if (scheduler) clearTimeout(scheduler); controller?.abort();
      stopping = (async () => { await active?.catch(() => false); })(); }
    return stopping;
  }
  return { runOnce, onModuleInit, onModuleDestroy };
}
