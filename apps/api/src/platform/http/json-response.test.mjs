import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { errorCode, publicError, sendJson } from './json-response.ts';

function response() {
  return Object.assign(new EventEmitter(), {
    headers: {}, statusCode: 200, writableEnded: false, destroyed: false, ends: 0,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value) { this.ends++; this.writableEnded = true; this.body = value; },
  });
}

test('sendJson writes JSON once, with extra headers, BigInt as strings and no body for 204', () => {
  const res = response();
  sendJson(res, 409, { error: { code: 'CONFLICT' }, revision: 7n }, { 'Cache-Control': 'no-store' });
  assert.equal(res.statusCode, 409);
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.deepEqual(JSON.parse(res.body), { error: { code: 'CONFLICT' }, revision: '7' });
  sendJson(res, 500, { again: true });
  assert.equal(res.ends, 1); assert.equal(res.statusCode, 409);
  const empty = response();
  sendJson(empty, 204, { ignored: true });
  assert.equal(empty.statusCode, 204); assert.equal(empty.body, undefined); assert.equal(empty.headers['content-type'], undefined);
  const gone = Object.assign(response(), { destroyed: true });
  sendJson(gone, 200, {});
  assert.equal(gone.ends, 0);
});

test('publicError maps known codes, masks unknown ones as the fallback and reads codes defensively', () => {
  const statuses = { INVALID_INPUT: 400, RATE_LIMITED: 429, SERVICE_UNAVAILABLE: 503, INTERNAL_ERROR: 500 };
  assert.deepEqual(publicError({ code: 'RATE_LIMITED' }, statuses), { code: 'RATE_LIMITED', status: 429 });
  assert.deepEqual(publicError(new Error('boom'), statuses), { code: 'SERVICE_UNAVAILABLE', status: 503 });
  assert.deepEqual(publicError({ code: 'SECRET' }, statuses, 'INTERNAL_ERROR'), { code: 'INTERNAL_ERROR', status: 500 });
  assert.deepEqual(publicError({ code: 'toString' }, statuses), { code: 'SERVICE_UNAVAILABLE', status: 503 });
  assert.deepEqual(publicError(null, {}), { code: 'SERVICE_UNAVAILABLE', status: 503 });
  assert.equal(errorCode('text'), ''); assert.equal(errorCode({ code: 7 }), '7');
});
