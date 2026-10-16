import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setImmediate as turn } from 'node:timers/promises';
import { createFilesHandler } from '../apps/api/src/files/http.ts';

const request = () => Object.assign(new EventEmitter(), { method: 'GET', complete: true, headers: {},
  url: '/files/12345678-1234-1234-1234-123456789abc/content' });
class Response extends EventEmitter {
  headersSent = false; destroyed = false;
  constructor(hold = false) { super(); this.hold = hold; }
  setHeader() {}
  end(bytes) { this.body = bytes; this.headersSent = true; if (!this.hold) this.emit('finish'); }
  destroy() { this.destroyed = true; this.body = undefined; this.emit('close'); }
}
test('a stalled download retains the transfer slot until finish or close', async () => {
  let reads = 0;
  const handler = createFilesHandler({ async read() { reads++; return { bytes: Buffer.alloc(1000000), headers: {} }; } });
  const first = new Response(true), second = new Response(), third = new Response(true);
  try {
    handler(request(), first, () => {}); await turn();
    handler(request(), second, () => {}); await turn();
    assert.equal(reads, 1); assert.equal(second.statusCode, 503);
    first.emit('finish'); await turn();
    handler(request(), third, () => {}); await turn(); assert.equal(reads, 2);
    third.destroy(); await turn();
    const fourth = new Response(); handler(request(), fourth, () => {}); await turn();
    assert.equal(reads, 3); assert.equal(fourth.statusCode, 200);
  } finally { first.destroy(); third.destroy(); await turn(); }
});
test('a stalled output expires and releases its slot after the absolute send deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const handler = createFilesHandler({ async read() { return { bytes: Buffer.alloc(1), headers: {} }; } });
  const stalled = new Response(true);
  try {
    handler(request(), stalled, () => {}); await turn();
    t.mock.timers.tick(30000); await turn(); assert.equal(stalled.destroyed, true);
    const next = new Response(); handler(request(), next, () => {}); await turn(); assert.equal(next.statusCode, 200);
  } finally { stalled.destroy(); await turn(); }
});
