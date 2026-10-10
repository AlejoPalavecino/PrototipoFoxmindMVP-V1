import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { messagingStore } from '../../features/messaging/messagingStore';

const driverURL = new URL('../../../scripts/mounted-lifecycle-smoke.mjs', import.meta.url);

// No processes, sockets, browser, or wall-clock sleeps: exercise the startup
// boundary with an owned child seam, scripted HTTP responses and a virtual clock.
function startupFixture() {
  const child = Object.assign(new EventEmitter(), {
    pid: 42, exitCode: null as number | null, signalCode: null as string | null,
    stdout: new EventEmitter(), stderr: new EventEmitter(),
  });
  let now = 0;
  const calls: { url: string; timeout: number }[] = [];
  const replies: (() => Promise<Response>)[] = [];
  const options = {
    token: 'owned-run', timeout: 300, interval: 100,
    now: () => now, sleep: async (ms: number) => { now += ms; },
    request: async (url: string, timeout: number) => {
      calls.push({ url, timeout });
      return (replies.shift() || (async () => new Response('starting', { status: 503 })))();
    },
  };
  const ready = (token = options.token) => new Response('<script type="module" src="/tests/mounted-lifecycle.tsx"></script>', {
    headers: { 'x-foxmind-mounted-owner': token },
  });
  return { child, calls, replies, options, ready, elapsed: () => now };
}

test('owned Vite readiness waits for delayed HTTP, not color/split startup logs', async () => {
  const driver = await import(driverURL.href), fixture = startupFixture();
  fixture.replies.push(async () => { throw Error('ECONNREFUSED'); }, async () => new Response('starting', { status: 503 }), async () => fixture.ready());
  const pending = driver.waitForOwnedVite(fixture.child, 'http://127.0.0.1:4173', fixture.options);
  fixture.child.stdout.emit('data', Buffer.from('Local: http://\u001b[32m127.0.'));
  fixture.child.stdout.emit('data', Buffer.from('0.1:\u001b[0m4173/\n'));
  await pending;
  assert.equal(fixture.calls.length, 3); assert.equal(fixture.elapsed(), 200);
  assert(fixture.calls.every(call => call.url === 'http://127.0.0.1:4173/tests/mounted-lifecycle.html' && call.timeout <= 300));
  for (const event of ['error', 'exit']) assert.equal(fixture.child.listenerCount(event), 0);
  assert.equal(fixture.child.stdout.listenerCount('data'), 0);
});

test('owned Vite readiness fails promptly on exit with captured startup diagnostics', async () => {
  const driver = await import(driverURL.href), fixture = startupFixture();
  fixture.replies.push(async () => {
    fixture.child.stderr.emit('data', Buffer.from('Port 4173 is already in use'));
    fixture.child.exitCode = 1; fixture.child.emit('exit', 1, null);
    return fixture.ready(); // A racing successful response must not hide exit.
  });
  await assert.rejects(driver.waitForOwnedVite(fixture.child, 'http://127.0.0.1:4173', fixture.options), /exited.*1[\s\S]*Port 4173 is already in use/);
  assert.equal(fixture.elapsed(), 0); assert.equal(fixture.calls.length, 1);
});

test('owned Vite readiness fails promptly on spawn error with diagnostics', async () => {
  const driver = await import(driverURL.href), fixture = startupFixture();
  fixture.replies.push(async () => {
    fixture.child.stderr.emit('data', Buffer.from('startup attempted'));
    fixture.child.emit('error', Error('spawn ENOENT')); throw Error('ECONNREFUSED');
  });
  await assert.rejects(driver.waitForOwnedVite(fixture.child, 'http://127.0.0.1:4173', fixture.options), /spawn ENOENT[\s\S]*startup attempted/);
  assert.equal(fixture.elapsed(), 0);
});

test('owned Vite readiness times out within budget and reports HTTP/startup evidence', async () => {
  const driver = await import(driverURL.href), fixture = startupFixture();
  const pending = driver.waitForOwnedVite(fixture.child, 'http://127.0.0.1:4173', fixture.options);
  fixture.child.stderr.emit('data', Buffer.from('transform still pending'));
  await assert.rejects(pending, /Timeout[\s\S]*HTTP 503[\s\S]*transform still pending/);
  assert.equal(fixture.elapsed(), 300); assert.equal(fixture.calls.length, 3);
});

test('owned Vite readiness rejects unrelated servers and redirects even while child is live', async () => {
  const driver = await import(driverURL.href);
  for (const response of [() => new Response('unrelated'), () => startupFixture().ready('foreign-run'), () => new Response('', { status: 302 })]) {
    const fixture = startupFixture();
    fixture.options.request = async () => response();
    await assert.rejects(driver.waitForOwnedVite(fixture.child, 'http://127.0.0.1:4173', fixture.options), /Timeout/);
    assert.equal(fixture.elapsed(), 300);
  }
});

test('owned Vite readiness rejects signal exit and never polls an already-dead child', async () => {
  const driver = await import(driverURL.href), fixture = startupFixture();
  fixture.child.signalCode = 'SIGTERM';
  await assert.rejects(driver.waitForOwnedVite(fixture.child, 'http://127.0.0.1:4173', fixture.options), /exited.*SIGTERM/);
  assert.equal(fixture.calls.length, 0);
});
test('owned Vite boot strictly binds the selected port and marks only its fixture response', async () => {
  const driver = await import(driverURL.href);
  let listened = false, printed = false, middleware: any;
  await driver.bootOwnedVite(async (config: any) => {
    assert.deepEqual(config.server, { host: '127.0.0.1', port: 4173, strictPort: true });
    assert.equal(config.root, '/fixture-root');
    config.plugins[0].configureServer({ middlewares: { use: (handler: any) => { middleware = handler; } } });
    return { listen: async () => { listened = true; }, printUrls: () => { printed = true; } };
  }, '/fixture-root', '4173', 'owned-run');
  assert(listened && printed);
  for (const url of ['/tests/mounted-lifecycle.html', '/index.html']) {
    const headers: Record<string, string> = {}; let next = false;
    middleware({ url }, { setHeader: (key: string, value: string) => { headers[key] = value; } }, () => { next = true; });
    assert(next); assert.deepEqual(headers, url.startsWith('/tests/') ? { 'x-foxmind-mounted-owner': 'owned-run' } : {});
  }
});

test('owned Vite boot closes its watchers when strict-port listen fails', async () => {
  const driver = await import(driverURL.href); let closed = false;
  await assert.rejects(driver.bootOwnedVite(async () => ({
    listen: async () => { throw Error('Port 4173 is already in use'); },
    close: async () => { closed = true; },
    printUrls: () => { assert.fail('failed child must not announce readiness'); },
  }), '/fixture-root', '4173', 'owned-run'), /Port 4173 is already in use/);
  assert(closed);
});

test('owned Vite readiness requires the fixture module and honors the original deadline', async () => {
  const driver = await import(driverURL.href), fixture = startupFixture();
  fixture.options.request = async () => new Response('<html>not the fixture</html>', { headers: { 'x-foxmind-mounted-owner': 'owned-run' } });
  await assert.rejects(driver.waitForOwnedVite(fixture.child, 'http://127.0.0.1:4173', fixture.options), /Timeout[\s\S]*fixture module missing/);
  assert.equal(fixture.elapsed(), 300);
  assert.equal(fixture.child.stderr.listenerCount('data'), 0);
  const late = startupFixture();
  late.options.request = async () => { await late.options.sleep(300); return late.ready(); };
  await assert.rejects(driver.waitForOwnedVite(late.child, 'http://127.0.0.1:4173', late.options), /Timeout/);
  assert.equal(late.elapsed(), 300);
});

test('navigation rejection retains bounded diagnostics and its cause through cleanup without retry', async () => {
  const driver = await import(driverURL.href), fixture = startupFixture();
  const child = driver.captureChildDiagnostics(fixture.child);
  const page = new EventEmitter(), calls: unknown[][] = [];
  const original = Error('CDP timeout: Page.navigate');
  const origin = 'http://127.0.0.1:4173';
  fixture.child.stdout.emit('data', Buffer.from('old stdout' + 'z'.repeat(9000) + 'startup ready\n'));
  fixture.child.stderr.emit('data', Buffer.from('old output' + 'x'.repeat(9000) + 'transform pending'));
  Object.assign(page, { send: async (...args: unknown[]) => {
    calls.push(args);
    if (args[0] === 'Runtime.enable') page.emit('Runtime.exceptionThrown', { exceptionDetails: { text: 'early exception' } });
    if (args[0] === 'Page.navigate') {
      page.emit('Runtime.consoleAPICalled', { type: 'error', args: [{ value: 'console failure' }] });
      page.emit('Log.entryAdded', { entry: { level: 'warning', text: 'resource warning', url: origin } });
      throw original;
    }
    return {};
  } });
  let failure: any;
  try {
    await driver.navigateMountedFixture(page, { origin, targetId: 'owned-target', children: { server: child } });
    assert.fail('navigation must reject');
  } catch (error) { failure = error; }
  finally {
    fixture.child.stderr.emit('data', Buffer.from('\ncleanup output'));
    fixture.child.emit('exit', 1, 'SIGTERM');
    child.dispose(); // Mirrors the runner: detach only after owned cleanup.
  }
  assert.equal(failure.cause, original);
  for (const evidence of [original.message, origin, '/tests/mounted-lifecycle.html', 'owned-target',
    'early exception', 'console failure', 'resource warning', 'transform pending', '"exitCode":null']) {
    assert(failure.message.includes(evidence), `missing ${evidence}`);
  }
  assert(!failure.message.includes('old output')); assert(!failure.message.includes('old stdout'));
  const retained = child.snapshot();
  assert(retained.stderr.length <= 8000); assert(retained.stdout.length <= 8000); assert.match(retained.stdout, /startup ready/);
  assert.match(retained.stderr, /cleanup output/); assert.equal(retained.exitCode, 1); assert.equal(retained.signalCode, 'SIGTERM');
  assert.deepEqual(calls, [['Page.enable'], ['Runtime.enable'], ['Log.enable'], ['Page.navigate', { url: `${origin}/tests/mounted-lifecycle.html` }]]);
  for (const event of ['error', 'exit']) assert.equal(fixture.child.listenerCount(event), 0);
  assert.equal(fixture.child.stderr.listenerCount('data'), 0);
});

test('successful navigation keeps browser event capture active for receipt assertions', async () => {
  const driver = await import(driverURL.href), page = new EventEmitter();
  Object.assign(page, { send: async () => ({}) });
  const errors = await driver.navigateMountedFixture(page, { origin: 'http://127.0.0.1:4173', targetId: 'owned', children: {} });
  assert.deepEqual(errors, []);
  page.emit('Runtime.exceptionThrown', { exceptionDetails: { exception: { description: 'late exception' } } });
  page.emit('Runtime.consoleAPICalled', { type: 'log', args: [{ value: 'not an error' }] });
  assert.deepEqual(errors, ['late exception']);
});

test('existing real store seam supports reversible deferred send and subscription observation', async () => {
  const seam = messagingStore as unknown as { conversations: unknown[]; listeners: Set<() => void> };
  assert(Array.isArray(seam.conversations)); assert(seam.listeners instanceof Set);
  const descriptor = Object.getOwnPropertyDescriptor(messagingStore, 'sendMessage');
  const original = messagingStore.sendMessage, before = seam.listeners.size;
  let off = () => {};
  try {
    Object.defineProperty(messagingStore, 'sendMessage', { configurable: true, value: () => Promise.resolve() });
    await messagingStore.sendMessage({ conversationId: 'missing', senderId: 'fixture', senderName: 'Fixture', senderRole: 'docente', text: 'draft' });
    off = messagingStore.subscribe(() => {}); assert.equal(seam.listeners.size, before + 1);
  } finally {
    off();
    if (descriptor) Object.defineProperty(messagingStore, 'sendMessage', descriptor);
    else Reflect.deleteProperty(messagingStore, 'sendMessage');
  }
  assert.equal(messagingStore.sendMessage, original); assert.equal(seam.listeners.size, before);
});
test('mounted receipt fails closed for missing assertions, lifecycle evidence or cleanup', async () => {
  const driver = await import(driverURL.href);
  const receipt = { assertions: driver.requiredAssertions, strictSetups: 2, strictCleanups: 2, restored: true };
  driver.assertReceipt(receipt);
  for (const change of [{ assertions: [] }, { strictSetups: 1 }, { strictCleanups: 1 }, { restored: false }, { errors: ['late confirmation'] }]) {
    assert.throws(() => driver.assertReceipt({ ...receipt, ...change }));
  }
});
test('dedicated HTML entry is separate from the production HTML entry (structural, not mounted evidence)', async () => {
  const fixture = await readFile(new URL('../../../tests/mounted-lifecycle.html', import.meta.url), 'utf8');
  const production = await readFile(new URL('../../../index.html', import.meta.url), 'utf8');
  assert.match(fixture, /type="module" src="\/tests\/mounted-lifecycle\.tsx"/);
  assert.doesNotMatch(production, /mounted-lifecycle/);
});
test('CDP evaluation rejects page exceptions instead of treating undefined as success', async () => {
  const driver = await import(driverURL.href);
  assert.equal(await driver.evaluate({ send: async () => ({ result: { value: 7 } }) }, '7'), 7);
  await assert.rejects(driver.evaluate({ send: async () => ({ exceptionDetails: { text: 'fixture failed' } }) }, 'bad'), /fixture failed/);
});
