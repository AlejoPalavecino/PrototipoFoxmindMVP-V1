import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createServer, request as httpRequest } from 'node:http';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';
import { proxyFoxyRequest } from '../apps/web/src/application/server/foxy-proxy.ts';

const proxies = [
  { name: 'classroom', proxy: proxyClassroomRequest, path: '/api/v1/classrooms/drafts', limit: 512 * 1024 },
  { name: 'foxy', proxy: proxyFoxyRequest, path: '/api/v1/foxy-ai/conversations', limit: 1024 * 1024 },
];
const sha = value => createHash('sha256').update(value).digest('hex');
const flush = async () => { for (let turn = 0; turn < 16; turn++) await Promise.resolve(); };

async function serve(handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    async close() {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    },
  };
}

function sendFullBoundaryPayload(url, payload) {
  return new Promise((resolve, reject) => {
    let sent = 0, stopped = false, complete = false, closed = false, settled = false;
    const chunks = [];
    let result;
    const finish = error => {
      if (settled) return;
      if (error) { settled = true; reject(error); return; }
      if (complete && closed) {
        settled = true;
        resolve({ ...result, bytes: Buffer.concat(chunks), sent });
      }
    };
    const request = httpRequest(url, { method: 'POST', headers: {
      'Content-Type': 'application/json', 'Content-Length': String(payload.length),
    } }, response => {
      stopped = true;
      request.end();
      result = { status: response.statusCode, headers: response.headers };
      response.on('data', chunk => chunks.push(chunk));
      response.once('aborted', () => finish(new Error('HTTP rejection response aborted before completion')));
      response.once('error', finish);
      response.once('end', () => {
        complete = response.complete;
        if (!complete) finish(new Error('Incomplete HTTP rejection response'));
        else finish();
      });
    });
    request.setTimeout(10000, () => {
      const error = new Error('Synthetic client did not receive a complete rejection within the metadata budget');
      finish(error); request.destroy(error);
    });
    request.on('error', error => { if (!complete) finish(error); });
    request.once('close', () => { closed = true; finish(); });
    function write() {
      if (stopped || settled) return;
      if (sent === payload.length) { request.end(); return; }
      const end = Math.min(payload.length, sent + 65536), chunk = payload.subarray(sent, end);
      sent = end;
      if (request.write(chunk)) setImmediate(write);
      else request.once('drain', () => setImmediate(write));
    }
    write();
  });
}

class Incoming extends EventEmitter {
  constructor(config, declared) {
    super();
    this.url = config.path;
    this.method = 'POST';
    this.headers = { 'content-type': 'application/json', ...(declared === null
      ? { 'transfer-encoding': 'chunked' } : { 'content-length': String(declared) }) };
    this.complete = false;
    this.readableEnded = false;
    this.aborted = false;
    this.destroyed = false;
    this.resumeCalls = 0;
    this.socket = { destroyed: false, destroy: () => { this.socket.destroyed = true; } };
  }
  resume() { this.resumeCalls++; return this; }
  pause() { return this; }
  destroy() { this.destroyed = true; this.socket.destroy(); this.emit('close'); return this; }
  endBody() { this.complete = true; this.readableEnded = true; this.emit('end'); }
  cancel() { this.aborted = true; this.destroyed = true; this.emit('aborted'); this.emit('close'); }
}

class Outgoing extends EventEmitter {
  constructor() {
    super();
    this.headers = {};
    this.headersSent = false;
    this.writableEnded = false;
    this.destroyed = false;
    this.ends = [];
  }
  setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; }
  getHeader(name) { return this.headers[name.toLowerCase()]; }
  writeHead(status, headers = {}) {
    this.statusCode = status;
    for (const [name, value] of Object.entries(headers)) this.setHeader(name, value);
    this.headersSent = true;
    return this;
  }
  end(body) { this.headersSent = true; this.writableEnded = true; this.ends.push(body); this.emit('finish'); return this; }
  destroy() { this.destroyed = true; this.emit('close'); return this; }
}

function fakeExchange(t, config, declared = config.limit + 1) {
  const request = new Incoming(config, declared), response = new Outgoing();
  const work = config.proxy(request, response, 'http://127.0.0.1:1');
  t.after(async () => {
    request.cancel(); response.destroy(); await work; await flush();
    for (const event of ['data', 'end', 'error', 'aborted', 'close']) {
      assert.equal(request.listenerCount(event), 0, `Request ${event} listener must be released`);
    }
    assert.equal(response.listenerCount('close'), 0, 'Response close listener must be released');
  });
  return { request, response, work };
}

function assertRejection(config, response) {
  assert.equal(response.statusCode, 413);
  assert.equal(response.ends.length, 1);
  const body = JSON.parse(response.ends[0]);
  assert.equal(body.error.code, 'REQUEST_TOO_LARGE');
  if (config.name === 'classroom') {
    assert.ok(body.error.requestId);
    assert.equal(response.getHeader('x-request-id'), body.error.requestId);
  }
}

function virtualClock(t) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  t.mock.method(performance, 'now', () => Date.now());
}

for (const config of proxies) {
  test(`${config.name} returns the complete 413 for the unchanged boundary payload without forwarding`, async () => {
    let calls = 0;
    const upstream = await serve((_request, response) => { calls++; response.end('{}'); });
    const web = await serve((request, response) => void config.proxy(request, response, upstream.origin));
    const payload = Buffer.from('x'.repeat(config.limit + 1)), before = sha(payload);
    try {
      const actual = await sendFullBoundaryPayload(web.origin + config.path, payload);
      assert.equal(actual.status, 413);
      assert.equal(actual.sent, payload.length, 'The complete original payload must be transmitted');
      assert.equal(sha(payload), before);
      const body = JSON.parse(actual.bytes.toString('utf8'));
      assert.equal(body.error.code, 'REQUEST_TOO_LARGE');
      assert.deepEqual(actual.bytes, Buffer.from(JSON.stringify(body)), 'Read every rejection response byte');
      if (config.name === 'classroom') assert.equal(actual.headers['x-request-id'], body.error.requestId);
      assert.equal(calls, 0);
    } finally { await web.close(); await upstream.close(); }
  });

  test(`${config.name} waits for bounded discard completion without assembling rejected body chunks`, async t => {
    const concatenate = t.mock.method(Buffer, 'concat', Buffer.concat);
    const { request, response, work } = fakeExchange(t, config);
    await flush();
    assert.equal(response.ends.length, 0, 'Do not end the rejection while request bytes are still pending');
    request.emit('data', Buffer.alloc(config.limit));
    request.emit('data', Buffer.alloc(1));
    await flush();
    assert.equal(response.ends.length, 0, 'The byte boundary does not substitute for request end');
    request.endBody();
    await work; await flush();
    assertRejection(config, response);
    assert.equal(concatenate.mock.calls.length, 0, 'Discard must not concatenate rejected payloads');
  });

  test(`${config.name} aborts transport once additional discard exceeds JSON limit plus one`, async t => {
    const { request, response, work } = fakeExchange(t, config, config.limit * 3);
    await flush();
    request.emit('data', Buffer.alloc(config.limit + 1));
    await flush();
    assert.equal(request.destroyed || response.destroyed, false, 'Exactly the discard budget is allowed');
    request.emit('data', Buffer.alloc(1));
    await work; await flush();
    assert.equal(request.destroyed || response.destroyed, true, 'Exceeded discard budget must close transport');
    assert.equal(response.ends.length, 0, 'Do not claim a complete HTTP rejection after budget abort');
  });

  test(`${config.name} counts discard budget after the parser has already rejected overflow`, async t => {
    const { request, response, work } = fakeExchange(t, config, null);
    await flush();
    request.emit('data', Buffer.alloc(config.limit + 1));
    await flush();
    assert.equal(response.ends.length, 0);
    request.emit('data', Buffer.alloc(config.limit + 1));
    await flush();
    assert.equal(request.destroyed || response.destroyed, false, 'Discard budget is additional to parser input');
    request.endBody();
    await work; await flush();
    assertRejection(config, response);
  });

  test(`${config.name} uses only the absolute metadata deadline remaining after parser overflow`, async t => {
    virtualClock(t);
    const { request, response, work } = fakeExchange(t, config, null);
    await flush();
    t.mock.timers.tick(9000);
    request.emit('data', Buffer.alloc(config.limit + 1));
    await flush();
    t.mock.timers.tick(999);
    await flush();
    assert.equal(request.destroyed || response.destroyed, false, 'Do not expire before the original deadline');
    t.mock.timers.tick(1);
    await flush(); await work;
    assert.equal(request.destroyed || response.destroyed, true, 'Do not grant a fresh ten seconds after parsing');
    assert.equal(response.ends.length, 0);
  });

  for (const cancellation of ['request abort', 'response close']) {
    test(`${config.name} cancels pending discard on ${cancellation} and releases ownership`, async t => {
      const { request, response, work } = fakeExchange(t, config);
      await flush();
      assert.equal(response.ends.length, 0);
      if (cancellation === 'request abort') request.cancel();
      else response.destroy();
      await work; await flush();
      assert.equal(request.destroyed || response.destroyed, true);
      assert.equal(response.ends.length, 0);
    });
  }
}
