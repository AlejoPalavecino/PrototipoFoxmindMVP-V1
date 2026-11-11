import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { HomeError, type HomeActor, type HomePageQuery } from '../../../../../../src/core/domain/index.ts';
const signingKey = randomBytes(32);
export function pageOrder(query: HomePageQuery): 'asc' | 'desc' {
  return query.order ?? (['feedback', 'queries', 'materials'].includes(query.module) ? 'desc' : 'asc');
}
function scope(actor: HomeActor, query: HomePageQuery) { return [actor.userId, query.module, query.timeZone, pageOrder(query)]; }
export function readCursor(actor: HomeActor, query: HomePageQuery): string {
  if (query.cursor === null) return '';
  try {
    const [payload, signature, extra] = query.cursor.split('.');
    if (!payload || !signature || extra) throw new Error();
    const actual = Buffer.from(signature, 'base64url'), expected = createHmac('sha256', signingKey).update(payload).digest();
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    const decoded: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!Array.isArray(decoded) || decoded.length !== 5 || JSON.stringify(decoded.slice(0, 4)) !== JSON.stringify(scope(actor, query))
      || typeof decoded[4] !== 'string' || decoded[4].length > 600) throw new Error();
    return decoded[4];
  } catch { throw new HomeError('INVALID_INPUT'); }
}
export function nextCursor(actor: HomeActor, query: HomePageQuery, key: string): string {
  const payload = Buffer.from(JSON.stringify([...scope(actor, query), key])).toString('base64url');
  return `${payload}.${createHmac('sha256', signingKey).update(payload).digest('base64url')}`;
}
