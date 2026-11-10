import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { signWallCursor, readWallCursor } from '../apps/api/src/modules/communication/infrastructure/wall-cursor.ts';
import { notificationPage } from '../apps/api/src/modules/home/infrastructure/notification-page.ts';

const key = Buffer.alloc(32, 7), alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const room = '11111111-1111-4111-8111-111111111111', post = '22222222-2222-4222-8222-222222222222';
const actor = '33333333-3333-4333-8333-333333333333', id = '44444444-4444-4444-8444-444444444444';
const position = { timestamp: '2026-10-30T12:00:00.123456Z', id };
const fixture = kind => ({ v: 1, kind, room, ...(kind === 'replies' ? { post } : { high: position }), direction: 'after', position });
function alias(text, increment) {
  const index = alphabet.indexOf(text.at(-1));
  const altered = text.slice(0, -1) + alphabet[index + increment];
  assert.notEqual(altered, text);
  assert.deepEqual(Buffer.from(altered, 'base64url'), Buffer.from(text, 'base64url'));
  assert.notEqual(Buffer.from(altered, 'base64url').toString('base64url'), altered);
  return altered;
}
function signatureAlias(token, increment) {
  const [body, signature] = token.split('.');
  assert.equal(signature.length, 43); assert.equal(alphabet.indexOf(signature.at(-1)) % 4, 0);
  return `${body}.${alias(signature, increment)}`;
}
function bodyAlias(cursor, namespace) {
  let json = JSON.stringify(cursor);
  while (Buffer.byteLength(json) % 3 === 0) json += ' ';
  const body = Buffer.from(json).toString('base64url');
  const changed = alias(body, 1);
  const signature = createHmac('sha256', key).update(namespace).update(changed).digest('base64url');
  return `${changed}.${signature}`;
}
function transaction() {
  let queries = 0;
  return { get count() { return queries; }, async query(sql) {
    queries++;
    if (sql.includes('count(*)')) return [{ count: 2n }];
    return [{ id, stamp: position.timestamp, item: { id } }, { id: post, stamp: position.timestamp, item: { id: post } }];
  } };
}
async function notificationCursor() {
  const tx = transaction();
  const page = await notificationPage(tx, key, actor, 'SELECT synthetic', { limit: 1, unread: true });
  assert.ok(page.nextCursor); assert.equal(page.items.length, 1);
  return page.nextCursor;
}
for (const kind of ['feed', 'replies']) {
  const value = fixture(kind), token = signWallCursor(key, value), args = [kind, room, ...(kind === 'replies' ? [post] : [])];
  test(`wall ${kind} canonical cursor remains compatible`, () => assert.deepEqual(readWallCursor(key, token, ...args), value));
  for (const increment of [1, 2, 3]) test(`wall ${kind} rejects signature alias ${increment}`, () => {
    assert.throws(() => readWallCursor(key, signatureAlias(token, increment), ...args), { code: 'INVALID_INPUT' });
  });
  test(`wall ${kind} rejects noncanonical body with valid signature`, () => {
    assert.throws(() => readWallCursor(key, bodyAlias(value, 'wall-cursor-v1:'), ...args), { code: 'INVALID_INPUT' });
  });
}
for (const increment of [1, 2, 3]) test(`notification rejects signature alias ${increment} before queries`, async () => {
  const token = await notificationCursor(), tx = transaction();
  await assert.rejects(notificationPage(tx, key, actor, 'SELECT synthetic', { cursor: signatureAlias(token, increment), unread: true }), { code: 'INVALID_INPUT' });
  assert.equal(tx.count, 0);
});
test('notification canonical cursor remains compatible and actor/filter scoped', async () => {
  const token = await notificationCursor(), tx = transaction();
  await notificationPage(tx, key, actor, 'SELECT synthetic', { cursor: token, unread: true }); assert.equal(tx.count, 2);
  for (const [otherActor, unread] of [[room, true], [actor, false]]) {
    const rejected = transaction(); await assert.rejects(notificationPage(rejected, key, otherActor, 'SELECT synthetic', { cursor: token, unread }), { code: 'INVALID_INPUT' });
    assert.equal(rejected.count, 0);
  }
});
test('notification rejects noncanonical body with valid signature before queries', async () => {
  const value = { v: 1, actor, unread: true, timestamp: position.timestamp, id };
  const tx = transaction();
  await assert.rejects(notificationPage(tx, key, actor, 'SELECT synthetic', { cursor: bodyAlias(value, 'notification-cursor-v1:'), unread: true }), { code: 'INVALID_INPUT' });
  assert.equal(tx.count, 0);
});
