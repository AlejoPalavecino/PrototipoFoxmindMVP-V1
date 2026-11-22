import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { IncomingHttpHeaders } from 'node:http';

export const clientAddressHeader = 'x-foxmind-client-address';
export const clientProofHeader = 'x-foxmind-client-proof';
export const clientProofContext = 'foxmind-client-address-v1';
const maxSkewSeconds = 60;

/** Optional shared secret between the web proxy and the API. Absent means "use the socket address". */
export function readClientAddressKey(raw: string | undefined): Buffer | undefined {
  if (raw === undefined || raw === '') return undefined;
  const bytes = /^[A-Za-z0-9_-]+$/.test(raw) ? Buffer.from(raw, 'base64url') : undefined;
  if (!bytes || bytes.length < 32 || bytes.toString('base64url') !== raw) throw new Error('Invalid client address key.');
  return bytes;
}
export function clientProof(key: Buffer, ip: string, seconds: number): string {
  const mac = createHmac('sha256', key).update(`${clientProofContext}\n${seconds}\n${ip}`).digest('base64url');
  return `${seconds}.${mac}`;
}
function loopback(address: string | undefined): boolean {
  if (!address) return false;
  const mapped = /^::ffff:(.+)$/i.exec(address)?.[1] ?? address;
  return address === '::1' || (isIP(mapped) === 4 && mapped.startsWith('127.'));
}
/**
 * The address used by per-client rate limits. A signed address is honoured only when the TCP peer is
 * loopback (the web server on the same host) and the HMAC proof is fresh; otherwise the socket address wins.
 * Client-controlled headers never choose the address on their own.
 */
export function clientAddress(
  request: { readonly socket: { readonly remoteAddress?: string }; readonly headers: IncomingHttpHeaders },
  key: Buffer | undefined, nowMs: number = Date.now(),
): string | undefined {
  const socketAddress = request.socket.remoteAddress;
  if (!key || !loopback(socketAddress)) return socketAddress;
  const ip = request.headers[clientAddressHeader], proof = request.headers[clientProofHeader];
  if (typeof ip !== 'string' || typeof proof !== 'string' || !isIP(ip)) return socketAddress;
  const match = /^(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(proof);
  if (!match || Math.abs(nowMs / 1000 - Number(match[1])) > maxSkewSeconds) return socketAddress;
  const expected = Buffer.from(clientProof(key, ip, Number(match[1])).split('.')[1]!, 'base64url');
  const actual = Buffer.from(match[2]!, 'base64url');
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? ip : socketAddress;
}
