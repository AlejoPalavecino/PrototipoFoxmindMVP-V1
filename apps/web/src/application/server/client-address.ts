import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

/**
 * Server-only. Tells the API which client address this proxy saw, authenticated with a secret shared
 * with the API. The address always comes from the TCP peer of the incoming Node request, never from a
 * client header. Without a valid key nothing is sent and the API keeps using the proxy's own address.
 */
export function clientAddressHeaders(
  request: { readonly socket?: { readonly remoteAddress?: string } },
  rawKey: string | undefined = process.env.FOXMIND_PROXY_CLIENT_KEY,
  nowMs: number = Date.now(),
): Record<string, string> {
  const ip = request.socket?.remoteAddress;
  if (!ip || !isIP(ip) || !rawKey || !/^[A-Za-z0-9_-]+$/.test(rawKey)) return {};
  const key = Buffer.from(rawKey, 'base64url');
  if (key.length < 32 || key.toString('base64url') !== rawKey) return {};
  const seconds = Math.floor(nowMs / 1000);
  const mac = createHmac('sha256', key).update(`foxmind-client-address-v1\n${seconds}\n${ip}`).digest('base64url');
  return { 'x-foxmind-client-address': ip, 'x-foxmind-client-proof': `${seconds}.${mac}` };
}
