import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { FoxyPrivateAssetReadDescriptor } from '../../../../../../../src/core/domain/foxy/asset.ts';
import type { FoxyRasterPublicationArtifact } from '../../../../../../../src/core/domain/foxy/resource.ts';
import type { FileService } from './service.ts';
import type { PrivateImageInspector, FoxyPublicationRasterSource } from '../application/reader-contracts.ts';
import { FileError } from '../../domain/errors.ts';
type Authority = { authorizeVisualSource(capability: object, signal: AbortSignal): Promise<{ asset: FoxyPrivateAssetReadDescriptor }> };
export function createDurableFoxyPublicationRasterSource(options: { files: Pick<FileService,'storage'>; authority: Authority; inspector: PrivateImageInspector }): FoxyPublicationRasterSource {
  return { async read(capability: object, signal: AbortSignal): Promise<{bytes: Uint8Array; artifact: FoxyRasterPublicationArtifact}> {
    signal.throwIfAborted(); const before = await options.authority.authorizeVisualSource(capability,signal); signal.throwIfAborted();
    const asset = before.asset; let raw: Uint8Array;
    try { raw = await options.files.storage.get(asset.storageKey,asset.sizeBytes); }
    catch { signal.throwIfAborted(); await options.authority.authorizeVisualSource(capability,signal); throw new FileError('FILE_NOT_READY'); }
    signal.throwIfAborted(); const bytes = Uint8Array.from(raw);
    if (bytes.length !== asset.sizeBytes || createHash('sha256').update(bytes).digest('hex') !== asset.digest) throw new FileError('FILE_NOT_READY');
    const afterGet = await options.authority.authorizeVisualSource(capability,signal); if (!isDeepStrictEqual(before,afterGet)) throw new FileError('FORBIDDEN');
    const facts = await options.inspector.inspect(bytes,signal); signal.throwIfAborted();
    const afterInspection = await options.authority.authorizeVisualSource(capability,signal);
    if (!isDeepStrictEqual(before,afterInspection) || facts.digest !== asset.digest || facts.sizeBytes !== asset.sizeBytes
      || facts.mimeType !== asset.mimeType || facts.width !== asset.width || facts.height !== asset.height) throw new FileError('FILE_NOT_READY');
    return { bytes, artifact: { kind:'RASTER',digest:asset.digest,sizeBytes:asset.sizeBytes,mimeType:asset.mimeType,
      extension:asset.mimeType === 'image/png' ? 'png' : 'jpg',width:asset.width,height:asset.height,producerVersion:asset.producerVersion } };
  } };
}
