import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNotificationQuery, parseNotificationPage } from '../src/core/domain/classroom-notifications.ts';

const params = value => new URLSearchParams(value);
test('notification pagination parses bounded queries and rejects ambiguous or foreign parameters', () => {
  const parsed = parseNotificationQuery(params('limit=50&unread=true&cursor=opaque'));
  assert.equal(parsed.limit, 50); assert.equal(parsed.unread, true); assert.equal(parsed.cursor, 'opaque');
  const unreadFalse = parseNotificationQuery(params('unread=false'));
  assert.equal(unreadFalse.unread, false);
  for (const query of ['limit=0', 'limit=51', 'limit=1.5', 'limit=1&limit=2', 'unread=yes', 'unread=true&unread=false', 'cursor=', 'actor=other', `cursor=${'a'.repeat(2049)}`]) {
    assert.throws(() => parseNotificationQuery(params(query)), /INVALID_INPUT/, query);
  }
});
test('notification page decoder rejects malformed collections and unread counts', () => {
  for (const value of [null, {}, { items: [], nextCursor: null, unreadCount: -1 },
    { items: [], nextCursor: null, unreadCount: 1.5 }, { items: {}, nextCursor: null, unreadCount: 0 },
    { items: [], nextCursor: 2, unreadCount: 0 }, { items: Array(51).fill({}), nextCursor: null, unreadCount: 0 }]) {
    assert.throws(() => parseNotificationPage(value), /INVALID_INPUT/);
  }
  assert.deepEqual(parseNotificationPage({ items: [], nextCursor: null, unreadCount: 0 }), { items: [], nextCursor: null, unreadCount: 0 });
});
