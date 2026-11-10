import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'node:stream';
import { proxyAccountRequest } from '../../../src/application/server/identity-proxy';

export const config = { api: { bodyParser: false, responseLimit: '16kb' } };

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  // The fixed parsing origin never selects the destination or grants authorization.
  const init: RequestInit & { duplex?: 'half' } = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = Readable.toWeb(request) as ReadableStream<Uint8Array>;
    init.duplex = 'half';
  }
  const result = await proxyAccountRequest(new Request(new URL(request.url ?? '/', 'http://web.invalid'), init), process.env.FOXMIND_API_ORIGIN);
  response.status(result.status);
  for (const [name, value] of result.headers) if (name !== 'set-cookie') response.setHeader(name, value);
  const cookies = result.headers.getSetCookie();
  if (cookies.length) response.setHeader('Set-Cookie', cookies);
  response.end(result.status === 204 ? undefined : Buffer.from(await result.arrayBuffer()));
}
