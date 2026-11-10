import { createHmac, timingSafeEqual } from 'node:crypto';

export type CursorNamespace = 'wall-cursor-v1:' | 'notification-cursor-v1:' | 'search-cursor-v1:';
function mac(key: Buffer, namespace: CursorNamespace, body: string): Buffer {
  return createHmac('sha256', key).update(namespace).update(body).digest();
}
export function signPageCursor(key: Buffer, namespace: CursorNamespace, value: unknown): string {
  const body = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${body}.${mac(key, namespace, body).toString('base64url')}`;
}
export function readPageCursor(key: Buffer, namespace: CursorNamespace, token: string, fail: (code: 'INVALID_INPUT') => never): unknown {
  if (typeof token !== 'string' || token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return fail('INVALID_INPUT');
  const [body, signature] = token.split('.') as [string, string];
  const decodedBody = Buffer.from(body, 'base64url'), supplied = Buffer.from(signature, 'base64url');
  if (decodedBody.toString('base64url') !== body || supplied.toString('base64url') !== signature || supplied.length !== 32)
    return fail('INVALID_INPUT');
  if (!timingSafeEqual(supplied, mac(key, namespace, body))) return fail('INVALID_INPUT');
  return JSON.parse(decodedBody.toString());
}
