import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNotificationQuery, parseNotificationPage } from '../src/core/domain/home/notifications.ts';

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

test('notification presentation metadata is bounded Unicode text without changing its recipient target',()=>{
 const row={id:'n',classroomId:'r',classroomName:'Aula',eventType:'WALL_QUERY',postId:'p',replyId:null,createdAt:'2026-11-06T10:00:00Z',readAt:null};
 const page=item=>({items:[item],nextCursor:null,unreadCount:1});
 assert.equal(parseNotificationPage(page({...row,actorName:'Ana 🦊',classroomDivision:'4.º A',message:'Una consulta'})).items[0].actorName,'Ana 🦊');
 for(const extra of [{actorName:42},{actorName:'x'.repeat(322)},{classroomDivision:null},{classroomDivision:'x'.repeat(81)},{message:'😀'.repeat(281)}])assert.throws(()=>parseNotificationPage(page({...row,...extra})),/INVALID_INPUT/);
});
