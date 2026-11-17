import { AgendaError, type AgendaPage, type AgendaRange } from '../../../../../../../src/core/domain/agenda/index.ts';

type Item = AgendaPage['items'][number];
function key(item: Item): string {
  return item.kind === 'PRIVATE_EVENT'
    ? `${item.startAt ?? `${item.startDate}T00:00:00.000Z`}|${item.kind}|${item.occurrenceId}`
    : `${item.deadlineAt}|${item.kind}|${item.id}`;
}
export function pageItems(items: Item[], range: AgendaRange, owner: string, cursor: string | null) {
  const scope = JSON.stringify([owner, range.startDate, range.endDateExclusive, range.timeZone]);
  let after = '';
  if (cursor !== null) {
    try {
      if (typeof cursor !== 'string' || !/^[A-Za-z0-9_-]{1,4096}$/.test(cursor)) throw new Error();
      const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
      if (!Array.isArray(decoded) || decoded.length !== 2 || decoded[0] !== scope || typeof decoded[1] !== 'string') throw new Error();
      after = decoded[1];
    } catch { throw new AgendaError('INVALID_INPUT'); }
  }
  const ordered = items.sort((a, b) => key(a).localeCompare(key(b))).filter(item => key(item) > after);
  const page = ordered.slice(0, 200);
  const nextCursor = ordered.length > 200
    ? Buffer.from(JSON.stringify([scope, key(page[199])])).toString('base64url') : null;
  return { items: page, nextCursor };
}
