import { createHmac } from 'node:crypto';
import { BlockList, isIP } from 'node:net';

/** Signed in place of an address when a trusted edge proxy did not say who the client is; the API then fails closed. */
export const unresolvedClientAddress = 'unresolved';

type IncomingLike = {
  readonly socket?: { readonly remoteAddress?: string };
  readonly headers?: Readonly<Record<string, string | string[] | undefined>>;
};

function unmapped(address: string): string {
  return /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address)?.[1] ?? address;
}
/** Parses `WEB_TRUSTED_PROXY_CIDRS` (comma-separated CIDRs). Unset means no trusted proxy; malformed means null. */
function trustedProxies(raw: string | undefined): BlockList | undefined | null {
  if (raw === undefined || raw.trim() === '') return undefined;
  const list = new BlockList();
  for (const cidr of raw.split(',').map(value => value.trim())) {
    const [network, prefix, extra] = cidr.split('/');
    const version = isIP(network ?? '');
    if (extra !== undefined || !version || !/^(0|[1-9][0-9]*)$/.test(prefix ?? '')
      || Number(prefix) > (version === 4 ? 32 : 128)) return null;
    list.addSubnet(network!, Number(prefix), version === 4 ? 'ipv4' : 'ipv6');
  }
  return list;
}
function trusted(list: BlockList, address: string): boolean {
  const version = isIP(address);
  return version !== 0 && list.check(address, version === 4 ? 'ipv4' : 'ipv6');
}
/** Rate limits treat an IPv6 /64 as one client, since a single host usually controls the whole prefix. */
function bucket(address: string): string {
  if (isIP(address) !== 6) return address;
  const [head = '', tail] = address.split('::');
  const groups = (part: string) => part === '' ? [] : part.split(':').flatMap(group => {
    if (!group.includes('.')) return [group];
    const [a, b, c, d] = group.split('.').map(Number) as [number, number, number, number];
    return [((a << 8) | b).toString(16), ((c << 8) | d).toString(16)];
  });
  const left = groups(head), right = tail === undefined ? [] : groups(tail);
  const full = [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  return `${full.slice(0, 4).map(group => parseInt(group, 16).toString(16)).join(':')}::`;
}
/**
 * The client as seen by this server. Without trusted proxies it is the TCP peer. When the peer is a trusted
 * edge proxy, `X-Forwarded-For` is read right to left and the first untrusted hop is the client; a missing or
 * malformed chain yields the unresolved sentinel instead of falling back to the proxy's own address.
 */
function resolveClient(request: IncomingLike, rawTrusted: string | undefined): string | undefined {
  const peer = request.socket?.remoteAddress;
  if (!peer || !isIP(peer)) return undefined;
  const proxies = trustedProxies(rawTrusted);
  if (proxies === null) return unresolvedClientAddress;
  if (!proxies || !trusted(proxies, unmapped(peer))) return unmapped(peer);
  const header = request.headers?.['x-forwarded-for'];
  const hops = (Array.isArray(header) ? header.join(',') : header ?? '').split(',').map(value => value.trim());
  for (let index = hops.length - 1; index >= 0; index -= 1) {
    const hop = unmapped(hops[index]!);
    if (!isIP(hop)) return unresolvedClientAddress;
    if (!trusted(proxies, hop)) return hop;
  }
  return unresolvedClientAddress;
}

/**
 * Server-only. Tells the API which client this proxy saw, authenticated with a secret shared with the API.
 * Client headers are read only when the TCP peer is a configured trusted proxy. Without a valid key nothing
 * is sent and the API keeps using the proxy's own address.
 */
export function clientAddressHeaders(
  request: IncomingLike,
  rawKey: string | undefined = process.env.FOXMIND_PROXY_CLIENT_KEY,
  nowMs: number = Date.now(),
  rawTrusted: string | undefined = process.env.WEB_TRUSTED_PROXY_CIDRS,
): Record<string, string> {
  if (!rawKey || !/^[A-Za-z0-9_-]+$/.test(rawKey)) return {};
  const key = Buffer.from(rawKey, 'base64url');
  if (key.length < 32 || key.toString('base64url') !== rawKey) return {};
  const resolved = resolveClient(request, rawTrusted);
  if (!resolved) return {};
  const ip = resolved === unresolvedClientAddress ? resolved : bucket(resolved);
  const seconds = Math.floor(nowMs / 1000);
  const mac = createHmac('sha256', key).update(`foxmind-client-address-v1\n${seconds}\n${ip}`).digest('base64url');
  return { 'x-foxmind-client-address': ip, 'x-foxmind-client-proof': `${seconds}.${mac}` };
}
