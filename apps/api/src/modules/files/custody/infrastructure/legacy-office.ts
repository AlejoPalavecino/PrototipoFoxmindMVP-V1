import { DOCUMENT_MAX_BYTES } from '../../../../../../../src/core/domain/documents/document-formats.ts';
import { FileError } from '../../domain/errors.ts';

const compoundFile = Buffer.from('d0cf11e0a1b11ae1', 'hex');
/** Loopback broker (scripts/office-converter-broker.mjs) that alone may run the disposable converter container. */
export interface OfficeConverterEndpoint { readonly url: string; readonly token: string }
let endpoint: OfficeConverterEndpoint | undefined;

/** Set by the files infrastructure composition; absent means .doc/.ppt conversion is unavailable. */
export function configureLegacyOfficeConverter(value: OfficeConverterEndpoint | undefined): void {
  endpoint = value ? Object.freeze({ url: value.url, token: value.token }) : undefined;
}

export function legacyOffice(extension: string): extension is 'doc' | 'ppt' {
  return extension === 'doc' || extension === 'ppt';
}

export async function convertLegacyOffice(bytes: Uint8Array, extension: 'doc' | 'ppt', signal?: AbortSignal) {
  if (bytes.length < 512 || bytes.length > DOCUMENT_MAX_BYTES
    || !Buffer.from(bytes.subarray(0, 8)).equals(compoundFile)) throw new FileError('FILE_REJECTED');
  const target = endpoint;
  if (!target || signal?.aborted) throw new FileError('SERVICE_UNAVAILABLE');
  let response: Response;
  try {
    response = await fetch(`${target.url}/convert/${extension}`, {
      method: 'POST', body: Buffer.from(bytes), redirect: 'error',
      headers: { authorization: `Bearer ${target.token}`, 'content-type': 'application/octet-stream' },
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(16_000)]) : AbortSignal.timeout(16_000),
    });
  } catch { throw new FileError('SERVICE_UNAVAILABLE'); }
  if (response.status === 422) { await response.body?.cancel(); throw new FileError('FILE_REJECTED'); }
  if (response.status !== 200) { await response.body?.cancel(); throw new FileError('SERVICE_UNAVAILABLE'); }
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > DOCUMENT_MAX_BYTES) { await response.body?.cancel(); throw new FileError('SERVICE_UNAVAILABLE'); }
  const converted = Buffer.from(await response.arrayBuffer());
  if (!converted.length || converted.length > DOCUMENT_MAX_BYTES) throw new FileError('SERVICE_UNAVAILABLE');
  return { bytes: converted, extension: extension === 'doc' ? 'docx' as const : 'pptx' as const };
}
