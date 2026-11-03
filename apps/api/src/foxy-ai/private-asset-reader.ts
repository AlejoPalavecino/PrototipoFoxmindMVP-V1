import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { assetUuid } from '../../../../src/core/domain/index.ts';
import type { createFoxyUnitOfWork } from './unit-of-work.ts';
import type { createFoxyPrivateAssetReadRepository } from './private-asset-read-repository.ts';
const fail = (code: string): never => { throw Object.assign(new Error(code), { code }); };
export function createFoxyPrivateAssetReader(options: { uow: ReturnType<typeof createFoxyUnitOfWork>; assets: ReturnType<typeof createFoxyPrivateAssetReadRepository>; storage: { get(key: string, maxBytes: number): Promise<Uint8Array> } }) {
  return { async readFile(request: unknown, assetId: string, mode: 'preview' | 'download', signal: AbortSignal) {
    const id = assetUuid(assetId); if (!['preview','download'].includes(mode) || !signal || typeof signal.throwIfAborted !== 'function') return fail('INVALID_INPUT');
    signal.throwIfAborted(); const describe = () => options.uow.run(request, false, (tx, actor) => options.assets.describe(tx, actor.id, id));
    const before = await describe(); signal.throwIfAborted(); let input: Uint8Array;
    try { input = await options.storage.get(before.storageKey, before.sizeBytes); }
    catch { signal.throwIfAborted(); await describe(); return fail('SERVICE_UNAVAILABLE'); }
    signal.throwIfAborted(); const bytes = Uint8Array.from(input);
    if (bytes.length !== before.sizeBytes || createHash('sha256').update(bytes).digest('hex') !== before.digest) return fail('FILE_NOT_READY');
    const after = await describe(); signal.throwIfAborted(); if (!isDeepStrictEqual(before,after)) return fail('FILE_NOT_READY');
    return { bytes, headers: { 'Content-Type': before.mimeType, 'Content-Length': String(bytes.length), 'Content-Disposition': `${mode === 'preview' ? 'inline' : 'attachment'}; filename="foxy-image.${before.mimeType === 'image/png' ? 'png' : 'jpg'}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin', 'Content-Security-Policy': "sandbox; default-src 'none'" } };
  } };
}
