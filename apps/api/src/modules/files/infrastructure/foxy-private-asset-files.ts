import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { parseFoxyDiagram, type FoxyAspectRatio, type FoxyDiagram } from '../../../../../../src/core/domain/index.ts';
import type { FoxyPrivateAssetAuthorityPort } from '../../foxy/public.ts';
import type { FileService } from './service.ts';
import type { PrivateImageFacts as Facts, PrivateImageInspector, FoxyPrivateAssetPayload as Payload, FoxyPrivateAssetFiles, RenewPrivateAsset } from '../application/reader-contracts.ts';
import { FileError } from '../domain/errors.ts';
import { createFoxyAssetCustodyLifecycle } from './foxy-private-asset-files-lifecycle.ts';
import type { FoxyPrivateAssetLease } from '../../foxy/public.ts';

type Authority = FoxyPrivateAssetAuthorityPort;
type Grant = Awaited<ReturnType<Authority['authorize']>>;


const sizes: Record<FoxyAspectRatio, readonly [number, number]> = { '1:1': [1600, 1600], '4:3': [1600, 1200], '3:4': [1200, 1600], '16:9': [1920, 1080] };
const failure = (code = 'INVALID_INPUT') => Object.assign(new Error(code), { code });
function snapshot(input: Payload): Payload {
  if (!input || !(input.bytes instanceof Uint8Array) || input.bytes.byteLength < 1 || input.bytes.byteLength > 10_485_760
    || typeof input.title !== 'string' || !input.title.trim() || [...input.title].length > 200 || typeof input.description !== 'string'
    || [...input.description].length > 5000 || [input.title, input.description].some(value => /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\ud800-\udfff]/u.test(value))) throw failure();
  return { bytes: Uint8Array.from(input.bytes), title: input.title, description: input.description,
    producerVersion: input.producerVersion, diagram: input.diagram === null ? null : parseFoxyDiagram(input.diagram) };
}
function metadata(input: Payload, facts: Facts, grant: Grant) {
  if (grant.kind === 'DIAGRAM') {
    const diagram = input.diagram, size = sizes[grant.aspectRatio];
    if (!diagram || !diagram.nodes.length || diagram.title !== input.title || diagram.description !== input.description
      || input.producerVersion !== 'foxy-diagram-png-v1' || facts.mimeType !== 'image/png'
      || !size || facts.width !== size[0] || facts.height !== size[1]) throw failure();
  } else if (grant.kind !== 'IMAGE' || input.diagram !== null || input.producerVersion !== 'foxy-image-original-v1') throw failure();
  if (BigInt(facts.sizeBytes) > grant.reservedBytes) throw failure();
  return { ...facts, title: input.title, description: input.description, producerVersion: input.producerVersion, diagram: input.diagram };
}
function checkKey(grant: Grant): void {
  const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
  if (!new RegExp(`^${uuid}$`, 'u').test(grant.ownerId) || !new RegExp(`^${uuid}$`, 'u').test(grant.assetId)
    || grant.storageKey !== `foxy-assets/${grant.ownerId}/${grant.assetId}`) throw failure('FORBIDDEN');
}
function matches(bytes: Uint8Array, facts: Facts): boolean {
  return bytes.byteLength === facts.sizeBytes && createHash('sha256').update(bytes).digest('hex') === facts.digest;
}
export function createFoxyPrivateAssetFiles(options: { files: FileService; authority: Authority; inspector: PrivateImageInspector; renew: RenewPrivateAsset; timing?: { renewIntervalMs: number; deadlineMs: number } }): FoxyPrivateAssetFiles {
  const lifecycle = createFoxyAssetCustodyLifecycle(options);
  let internalSignal: AbortSignal;
  function check(): void { internalSignal.throwIfAborted(); }
  async function authorize(capability: object, signal: AbortSignal, expected?: Grant): Promise<Grant> {
    check(); signal.throwIfAborted(); const grant = await options.authority.authorize(capability, signal); check(); signal.throwIfAborted();
    checkKey(grant); if (expected && !isDeepStrictEqual(grant, expected)) throw failure('FORBIDDEN'); return grant;
  }
  async function inspect(bytes: Uint8Array, capability: object, signal: AbortSignal): Promise<Facts> {
    try { return await options.inspector.inspect(bytes, internalSignal); }
    catch (error) {
      if ((error as { code?: string })?.code === 'FILE_REJECTED' && !signal.aborted && !internalSignal.aborted) await options.authority.reject(capability, 'INVALID_CONTENT', signal);
      throw error;
    }
  }
  async function read(grant: Grant, capability: object, signal: AbortSignal): Promise<Buffer> {
    await authorize(capability, signal, grant);
    const bytes = await options.files.storage.get(grant.storageKey, grant.payload!.sizeBytes);
    await authorize(capability, signal, grant);
    if (!matches(bytes, grant.payload!)) throw failure('CONFLICT'); return bytes;
  }
  async function finish(grant: Grant, bytes: Uint8Array, capability: object, signal: AbortSignal): Promise<Facts> {
    const facts = await inspect(bytes, capability, signal); await authorize(capability, signal, grant);
    if (!isDeepStrictEqual(facts, { digest: grant.payload!.digest, sizeBytes: grant.payload!.sizeBytes, mimeType: grant.payload!.mimeType, width: grant.payload!.width, height: grant.payload!.height })) throw failure('CONFLICT');
    await authorize(capability, signal, grant);
    try { await options.files.scanner.scan(Buffer.from(bytes)); }
    catch (error) {
      await authorize(capability, signal, grant);
      if (error instanceof FileError && error.code === 'FILE_REJECTED') await options.authority.reject(capability, 'INFECTED', signal);
      throw error;
    }
    await authorize(capability, signal, grant); await read(grant, capability, signal);
    check(); if (!await options.authority.complete(capability, { ...facts, validatedDigest: facts.digest, scannedDigest: facts.digest }, signal)) throw failure('FORBIDDEN');
    return facts;
  }
  return {
    receive(capability: object, payload: Payload, signal: AbortSignal): Promise<Facts> {
      return lifecycle.run(capability, signal, async context => {
        internalSignal = context.signal; signal.throwIfAborted(); const input = snapshot(payload), initial = await authorize(capability, signal);
        await context.start(initial);
        const facts = await inspect(input.bytes, capability, signal); await authorize(capability, signal, initial);
        const bound = await options.authority.bind(capability, metadata(input, facts, initial), signal);
        await authorize(capability, signal, bound);
        try { await options.files.storage.put(bound.storageKey, Buffer.from(input.bytes)); }
        catch (error) {
          await authorize(capability, signal, bound);
          if (!(error instanceof FileError) || error.code !== 'UPLOAD_CONFLICT') throw error;
          const existing = await read(bound, capability, signal); return finish(bound, existing, capability, signal);
        }
        await authorize(capability, signal, bound); return finish(bound, input.bytes, capability, signal);
      });
    },
    recover(capability: object, signal: AbortSignal): Promise<Facts> {
      return lifecycle.run(capability, signal, async context => { internalSignal = context.signal; const grant = await authorize(capability, signal); await context.start(grant); if (!grant.payload) throw failure('CONFLICT');
        const bytes = await read(grant, capability, signal); return finish(grant, bytes, capability, signal); });
    },
    async close(): Promise<void> { await lifecycle.close(); await options.files.storage.drain?.(); },
  };
}
