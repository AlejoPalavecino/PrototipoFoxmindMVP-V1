import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';

const driver = await import(new URL('../../../scripts/frontend-navigation-smoke.mjs', import.meta.url).href);

test('route assertion rejects a wrong URL rather than reporting a smoke pass', () => {
  assert.throws(() => driver.assertRoute({ path: '/alumno/dashboard', pending: false }, { path: '/docente/dashboard' }), /URL/);
  driver.assertRoute({ path: '/docente/dashboard', pending: false, contentReady: true }, { path: '/docente/dashboard' });
});
test('route assertion rejects premature content, wrong title, aria and missing screen focus', () => {
  const expected = { path: '/alumno/aulas', title: 'Mis Aulas · Alumno | FoxMind', active: 'Mis Aulas', focus: true };
  const ready = { ...expected, pending: false, contentReady: true };
  driver.assertRoute(ready, expected);
  for (const change of [{ pending: true }, { contentReady: false }, { title: 'Wrong' }, { active: 'Mensajes' }, { focus: false }]) {
    assert.throws(() => driver.assertRoute({ ...ready, ...change }, expected));
  }
});

test('runtime capabilities fail closed on unsupported Node or absent native WebSocket', () => {
  assert.throws(() => driver.requireRuntime('20.19.0', class {}), /Node >=22/);
  assert.throws(() => driver.requireRuntime('22.0.0', null), /Node >=22/);
  driver.requireRuntime('22.0.0', class {});
  const url = new URL('../../../scripts/frontend-navigation-smoke.mjs', import.meta.url).href;
  const child = spawnSync(process.execPath, ['--input-type=module', '--eval', `import {requireRuntime} from ${JSON.stringify(url)}; requireRuntime('20.19.0');`], { encoding: 'utf8', timeout: 5000 });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /Node >=22/);
});

test('explicit missing browser is not silently replaced or skipped', async () => {
  await assert.rejects(driver.locateBrowser('/foxmind/nonexistent-browser'), /FOXMINDBROWSER/);
  const child = spawnSync(process.execPath, ['scripts/frontend-navigation-smoke.mjs', '--mode=all'], {
    env: { ...process.env, FOXMINDBROWSER: '/foxmind/nonexistent-browser' }, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /FOXMINDBROWSER/);
});

test('smoke options select bounded coverage and reject ambiguous or unknown flags', () => {
  assert.deepEqual(driver.smokeOptions([]), { mode: 'all', filter: 'all' });
  assert.deepEqual(driver.smokeOptions(['--filter=readiness', '--mode=dev']), { mode: 'dev', filter: 'readiness' });
  for (const args of [['--mode=wrong'], ['--filter=wrong'], ['--unknown'], ['--mode=dev', '--mode=all']]) {
    assert.throws(() => driver.smokeOptions(args), /Expected|Duplicate/);
  }
});

test('independent scenarios continue after download failure but retain every failure', async () => {
  const calls: string[] = [], download = Error('download canceled'), navigation = Error('wrong current');
  await assert.rejects(driver.runScenarios([
    { name: 'downloads', run: async () => { calls.push('downloads'); throw download; } },
    { name: 'mobile', run: async () => { calls.push('mobile'); } },
    { name: 'navigation', run: async () => { calls.push('navigation'); throw navigation; } },
  ]), (error: any) => {
    assert(error instanceof AggregateError);
    assert.deepEqual(error.errors, [download, navigation]);
    assert.match(error.message, /downloads.*navigation/);
    return true;
  });
  assert.deepEqual(calls, ['downloads', 'mobile', 'navigation']);
  await driver.runScenarios([{ name: 'pass', run: async () => { calls.push('pass'); } }]);
  assert.equal(calls.at(-1), 'pass');
});

class SocketFixture extends EventTarget {
  messages: { id: number; method: string }[] = [];
  send(message: string) { this.messages.push(JSON.parse(message)); }
  reply(message: unknown) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) })); }
  close() { this.dispatchEvent(new Event('close')); }
}

test('production protocol resolves responses, subscriptions unsubscribe and protocol errors reject', async () => {
  const socket = new SocketFixture();
  const cdp = new driver.Protocol(socket, 100);
  let calls = 0;
  const off = cdp.on('Page.loadEventFired', () => calls++);
  socket.reply({ method: 'Page.loadEventFired', params: {} }); off();
  socket.reply({ method: 'Page.loadEventFired', params: {} });
  assert.equal(calls, 1);
  const request = cdp.send('Page.enable');
  socket.reply({ id: socket.messages[0].id, result: { enabled: true } });
  assert.deepEqual(await request, { enabled: true });
  const failure = cdp.send('Bad.method');
  socket.reply({ id: socket.messages[1].id, error: { message: 'unknown method' } });
  await assert.rejects(failure, /unknown method/);
  cdp.close();
});

test('protocol timeout and close reject pending promises and release timers', async () => {
  const socket = new SocketFixture();
  const cdp = new driver.Protocol(socket, 20);
  await assert.rejects(cdp.send('Never.responds'), /CDP timeout: Never.responds/);
  assert.equal(cdp.pending.size, 0);
  const pending = cdp.send('Page.enable');
  socket.close();
  await assert.rejects(pending, /CDP closed/);
  await assert.rejects(cdp.send('Page.enable'), /CDP closed/);
  assert.equal(cdp.pending.size, 0);
});

test('long RAF evaluation can report its 15s action deadline without the default 5s transport cutoff', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const socket = new SocketFixture(), cdp = new driver.Protocol(socket);
  const pending = cdp.send('Runtime.evaluate', { awaitPromise: true }, 20000);
  t.mock.timers.tick(15000); await flushCleanup();
  assert.equal(cdp.pending.size, 1);
  socket.reply({ id: socket.messages[0].id, result: { exceptionDetails: { text: 'Timeout: visible click' } } });
  assert.deepEqual(await pending, { exceptionDetails: { text: 'Timeout: visible click' } });
  assert.equal(cdp.pending.size, 0); cdp.close();
});

test('action wait times out and captures the failed assertion', async () => {
  await assert.rejects(driver.waitFor(() => { throw Error('wrong URL fixture'); }, 'fixture ready', 20), /fixture ready.*wrong URL fixture/);
  assert.equal(await driver.waitFor(() => 'ready', 'fixture ready', 20), 'ready');
});

test('keyboard dispatch brings the page forward and sends native Enter/Space fields without synthetic clicks', async () => {
  for (const [key, code, value, text] of [['Enter', 'Enter', 13, '\r'], [' ', 'Space', 32, ' '], ['Escape', 'Escape', 27, undefined]] as const) {
    const calls: any[] = [];
    await driver.press({ send: async (method: string, params?: unknown) => { calls.push({ method, params }); } }, key, code);
    assert.deepEqual(calls, [
      { method: 'Page.bringToFront', params: undefined },
      { method: 'Input.dispatchKeyEvent', params: { type: 'keyDown', key, code, windowsVirtualKeyCode: value, nativeVirtualKeyCode: value,
        ...(text === undefined ? {} : { text, unmodifiedText: text }) } },
      { method: 'Input.dispatchKeyEvent', params: { type: 'keyUp', key, code, windowsVirtualKeyCode: value, nativeVirtualKeyCode: value } },
    ]);
  }
});

test('action diagnostics collect instrumentation, target/hit, document focus and keyboard counters', async () => {
  const rect = { x: 10, y: 20, width: 40, height: 44 };
  const element = { tagName: 'BUTTON', textContent: 'Descargar', getAttribute: () => 'Descargar archivo 1',
    getBoundingClientRect: () => rect, contains: (el: unknown) => el === element };
  const instrumentation = { created: ['blob:fixture'], revoked: [], clicks: ['Descargar archivo 1'], anchors: [{ download: 'Duplicado.txt' }] };
  const document = { querySelector: () => element, elementFromPoint: () => element, activeElement: element, hasFocus: () => false };
  const cdp = { send: async (method: string, params: any) => {
    assert.equal(method, 'Runtime.evaluate');
    const value = new Function('document', 'window', 'location', `return ${params.expression}`)(document,
      { attachmentURLs: instrumentation, classroomClicks: 0, classroomPushes: 0 }, { pathname: '/alumno/aulas' });
    return { result: { value } };
  } };
  const result = await driver.collectActionDiagnostics(cdp, 'button', { x: 30, y: 42 });
  assert.equal(result.path, '/alumno/aulas'); assert.equal(result.documentFocus, false);
  assert.equal(result.target.label, 'Descargar archivo 1'); assert.equal(result.hit.label, result.target.label);
  assert.equal(result.targetHit, true); assert.equal(result.activeElement.tag, 'BUTTON');
  assert.deepEqual(result.counters, { clicks: 0, pushes: 0 });
  assert.deepEqual(result.attachmentURLs, instrumentation);
});

test('download action failure retains original evidence and adds before/after click diagnostics', async () => {
  const downloads: any[] = [], calls: string[] = [];
  const cdp = { send: async (method: string, params: any) => {
    calls.push(method);
    if (method === 'Runtime.evaluate') {
      return { result: { value: params.expression.includes('scrollIntoView') ? { x: 30, y: 42 }
        : { documentFocus: true, targetHit: true, attachmentURLs: { created: [], clicks: downloads.length ? ['control'] : [], anchors: [] } } } };
    }
    if (params?.type === 'mouseReleased') downloads.push({ guid: 'failed', state: 'canceled', receivedBytes: 0, totalBytes: 4 });
    return {};
  } };
  await assert.rejects(driver.clickDownload(cdp, downloads, 'button'), (error: any) => {
    assert.match(error.message, /Download canceled:.*failed.*actionDiagnostics=/);
    assert.equal(error.downloads[0].guid, 'failed');
    assert.deepEqual(error.actionDiagnostics.before.attachmentURLs.clicks, []);
    assert.deepEqual(error.actionDiagnostics.after.attachmentURLs.clicks, ['control']);
    return true;
  });
  assert.deepEqual(calls, ['Runtime.evaluate', 'Runtime.evaluate', 'Input.dispatchMouseEvent', 'Input.dispatchMouseEvent', 'Runtime.evaluate']);
});

test('no-start download failure adds click evidence at the unchanged 15000ms deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let released = false, failure: any;
  const cdp = { send: async (method: string, params: any) => {
    if (method === 'Runtime.evaluate') return { result: { value: params.expression.includes('scrollIntoView') ? { x: 30, y: 42 }
      : { documentFocus: false, targetHit: true, attachmentURLs: { created: [], revoked: [], clicks: released ? ['control'] : [], anchors: [] } } } };
    if (params?.type === 'mouseReleased') released = true;
    return {};
  } };
  void driver.clickDownload(cdp, [], 'button').catch((error: any) => { failure = error; });
  await flushCleanup();
  for (let i = 0; i < 149; i++) { t.mock.timers.tick(100); await flushCleanup(); }
  assert.equal(failure, undefined);
  t.mock.timers.tick(100); await flushCleanup();
  assert(failure); assert.equal(Date.now(), 15000);
  assert.match(failure.message, /no start.*actionDiagnostics=/);
  assert.deepEqual(failure.downloads, []);
  assert.equal(failure.actionDiagnostics.after.documentFocus, false);
  assert.deepEqual(failure.actionDiagnostics.after.attachmentURLs, { created: [], revoked: [], clicks: ['control'], anchors: [] });
});

test('unavailable diagnostics do not mask the original download failure', async () => {
  const downloads: any[] = [];
  const cdp = { send: async (method: string, params: any) => {
    if (method === 'Runtime.evaluate') {
      if (!params.expression.includes('scrollIntoView')) throw Error('document unavailable');
      return { result: { value: { x: 30, y: 42 } } };
    }
    if (params?.type === 'mouseReleased') downloads.push({ guid: 'failed', state: 'canceled' });
    return {};
  } };
  await assert.rejects(driver.clickDownload(cdp, downloads, 'button'), (error: any) => {
    assert.match(error.message, /Download canceled:.*failed/);
    assert.equal(error.actionDiagnostics.before.unavailable, 'document unavailable');
    assert.equal(error.actionDiagnostics.after.unavailable, 'document unavailable');
    return true;
  });
});

// Execute the actual browser expression with a manually advanced animation clock.
// No browser, wall-clock sleeps, or replacement click/stability implementation.
function nativeClickFixture() {
  let now = 0, nextId = 0;
  const frames = new Map<number, FrameRequestCallback>(), timers = new Map<number, { at: number; callback: () => void }>();
  const calls: any[] = [], downloads: any[] = [];
  const state = { x: 100, width: 40, blocked: false, hitChecks: 0, scrolls: 0, nativeFailure: false,
    targetAnimations: [] as any[], ancestorAnimations: [] as any[] };
  const ancestor = { tagName: 'DIV', parentElement: null, getAnimations: () => state.ancestorAnimations };
  const target = { tagName: 'BUTTON', textContent: 'Descargar', parentElement: ancestor,
    getAttribute: () => 'Descargar archivo 1', querySelector: () => null,
    getBoundingClientRect: () => ({ x: state.x, y: 20, width: state.width, height: 44 }),
    getAnimations: () => state.targetAnimations, scrollIntoView: () => { state.scrolls++; },
    contains: (element: unknown) => element === target };
  const document = { querySelector: () => target, querySelectorAll: () => [target], activeElement: target,
    hasFocus: () => true, elementFromPoint: () => { state.hitChecks++; calls.push({ method: 'hit' }); return state.blocked ? ancestor : target; } };
  const cdp = { send: async (method: string, params: any) => {
    calls.push({ method, params });
    if (method === 'Runtime.evaluate') {
      const value = await new Function('document', 'window', 'location', 'getComputedStyle', 'innerWidth', 'innerHeight',
        'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', `return ${params.expression}`)(
        document, {}, { pathname: '/docente/aulas' }, () => ({ visibility: 'visible', opacity: '1', overflowY: 'visible' }), 1280, 900,
        (callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; },
        (id: number) => frames.delete(id),
        (callback: () => void, ms: number) => { timers.set(++nextId, { at: now + ms, callback }); return nextId; },
        (id: number) => timers.delete(id), { now: () => now });
      return { result: { value } };
    }
    if (state.nativeFailure && params?.type === 'mousePressed') throw Error('native dispatch failed');
    if (params?.type === 'mouseReleased') downloads.push({ guid: 'selected', state: 'completed' });
    return {};
  } };
  return { state, calls, frames, timers, now: () => now,
    presses: () => calls.filter(call => call.params?.type === 'mousePressed'),
    click: () => driver.clickDownload(cdp, downloads, 'button'),
    frame: async (ms = 16, paint = true) => {
      now += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback(); }
      if (paint) for (const [id, callback] of [...frames]) { frames.delete(id); callback(now); }
      await flushCleanup();
    } };
}
const animation = (iterations = 1, playState = 'running') => ({ playState,
  effect: { getComputedTiming: () => ({ iterations, endTime: iterations === Infinity ? Infinity : 300 }) } });

test('native click waits for three stable animation frames and freshly hit-tests before one press/release', async () => {
  const fixture = nativeClickFixture();
  const pending = fixture.click(); await flushCleanup();
  assert.equal(fixture.presses().length, 0, 'an initial visible rectangle is not stable');
  await fixture.frame(); await fixture.frame();
  assert.equal(fixture.presses().length, 0);
  await fixture.frame(); await pending;
  const native = fixture.calls.filter(call => call.method === 'Input.dispatchMouseEvent');
  assert.deepEqual(native.map(call => call.params), [
    { type: 'mousePressed', button: 'left', clickCount: 1, x: 120, y: 42 },
    { type: 'mouseReleased', button: 'left', clickCount: 1, x: 120, y: 42 },
  ]);
  assert.equal(fixture.calls[fixture.calls.indexOf(native[0]) - 1].method, 'hit', 'hit test must be the last operation before native press');
  assert.equal(fixture.state.scrolls, 1); assert.equal(fixture.frames.size, 0); assert.equal(fixture.timers.size, 0);
});

test('native click resamples moving drawer geometry and never dispatches an intermediate point', async () => {
  const fixture = nativeClickFixture(); fixture.state.x = 1278;
  const pending = fixture.click(); await flushCleanup(); await fixture.frame();
  fixture.state.x = 775; await fixture.frame();
  fixture.state.x = 313; await fixture.frame(); await fixture.frame();
  assert.equal(fixture.presses().length, 0);
  await fixture.frame(); await pending;
  assert.equal(fixture.presses()[0].params.x, 333);
});

for (const owner of ['targetAnimations', 'ancestorAnimations'] as const) {
  test(`native click waits for running finite ${owner}, but not infinite or finished animations`, async () => {
    const fixture = nativeClickFixture(); fixture.state[owner] = [animation()];
    const pending = fixture.click(); await flushCleanup();
    for (let i = 0; i < 4; i++) await fixture.frame();
    assert.equal(fixture.presses().length, 0, 'stationary geometry during a finite animation is not settled');
    fixture.state[owner] = [animation(Infinity), animation(1, 'finished')];
    await fixture.frame(); await fixture.frame(); assert.equal(fixture.presses().length, 0);
    await fixture.frame(); await pending; assert.equal(fixture.presses().length, 1);
  });
}

test('native click detects fresh occlusion after geometry settles and waits without dispatching', async () => {
  const fixture = nativeClickFixture();
  const pending = fixture.click(); await flushCleanup(); await fixture.frame(); await fixture.frame();
  fixture.state.blocked = true; await fixture.frame();
  assert.equal(fixture.presses().length, 0);
  fixture.state.blocked = false;
  for (let i = 0; i < 3; i++) await fixture.frame();
  await pending; assert.equal(fixture.presses().length, 1);
});

test('native dispatch failure retains diagnostics without a post-dispatch retry or synthetic fallback', async () => {
  const fixture = nativeClickFixture(); fixture.state.nativeFailure = true;
  const rejected = assert.rejects(fixture.click(), /native dispatch failed.*actionDiagnostics=/);
  await flushCleanup();
  for (let i = 0; i < 3; i++) await fixture.frame();
  await rejected; await fixture.frame();
  assert.equal(fixture.presses().length, 1);
  assert.equal(fixture.calls.filter(call => call.method === 'Input.dispatchMouseEvent').length, 1);
  assert.equal(fixture.frames.size, 0); assert.equal(fixture.timers.size, 0);
});

for (const reason of ['movement', 'occlusion', 'viewport', 'no animation frames'] as const) {
  test(`native click ${reason} fails at the unchanged 15000ms deadline with no native input`, async () => {
    const fixture = nativeClickFixture();
    if (reason === 'occlusion') fixture.state.blocked = true;
    if (reason === 'viewport') fixture.state.x = 1278;
    let failure: any;
    void fixture.click().catch((error: any) => { failure = error; }); await flushCleanup();
    for (let i = 0; i < 14; i++) {
      if (reason === 'movement') fixture.state.width++;
      await fixture.frame(1000, reason !== 'no animation frames');
    }
    assert.equal(failure, undefined); assert.equal(fixture.presses().length, 0);
    await fixture.frame(999, reason !== 'no animation frames'); assert.equal(failure, undefined);
    await fixture.frame(1, reason !== 'no animation frames');
    assert(failure); assert.match(failure.message, /Timeout: visible click button.*actionDiagnostics=/);
    assert.equal(fixture.now(), 15000); assert.equal(fixture.presses().length, 0);
    assert.equal(fixture.frames.size, 0); assert.equal(fixture.timers.size, 0);
  });
}

function downloadFixture() {
  const socket = new SocketFixture();
  const cdp = new driver.Protocol(socket);
  const downloads = driver.trackDownloads(cdp);
  const begin = (guid: string, name = 'Duplicado.txt') => socket.reply({ method: 'Browser.downloadWillBegin',
    params: { guid, suggestedFilename: name, url: `blob:http://127.0.0.1:1234/${guid}` } });
  const progress = (guid: string, state: string, receivedBytes = 0, totalBytes = 4) => socket.reply({ method: 'Browser.downloadProgress',
    params: { guid, state, receivedBytes, totalBytes } });
  return { cdp, downloads, begin, progress };
}

test('download completion matches GUID, preserving duplicate names and exact byte progress', async () => {
  const fixture = downloadFixture();
  try {
    fixture.begin('old'); fixture.progress('old', 'completed', 4);
    const before = fixture.downloads.length;
    fixture.begin('selected'); fixture.begin('other');
    fixture.progress('other', 'canceled', 1);
    fixture.progress('unknown', 'completed', 99);
    fixture.progress('selected', 'completed', 4);
    const download = await driver.waitForDownload(fixture.downloads, before);
    assert.equal(download.guid, 'selected'); assert.equal(download.state, 'completed');
    assert.equal(download.suggestedFilename, 'Duplicado.txt');
    assert.equal(download.url, 'blob:http://127.0.0.1:1234/selected');
    assert.equal(download.receivedBytes, 4); assert.equal(download.totalBytes, 4);
    assert.equal(fixture.downloads.length, 3);
    assert.equal(fixture.downloads[2].state, 'canceled');
  } finally { fixture.cdp.close(); }
});

test('an already-observed canceled download rejects immediately with identity/state/bytes', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const fixture = downloadFixture();
  try {
    fixture.begin('canceled-guid'); fixture.progress('canceled-guid', 'canceled', 2, 4);
    let failure: any;
    void driver.waitForDownload(fixture.downloads, 0).catch((error: any) => { failure = error; });
    await flushCleanup();
    assert(failure, 'terminal cancellation must reject without advancing the clock');
    assert.match(failure.message, /Download canceled:.*canceled-guid.*Duplicado.txt.*blob:http.*canceled.*receivedBytes.*2.*totalBytes.*4/);
    assert.equal(Date.now(), 0);
  } finally { fixture.cdp.close(); }
});

test('cancellation after download wait starts rejects at its next observation, not the deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const fixture = downloadFixture();
  try {
    let failure: any;
    void driver.waitForDownload(fixture.downloads, 0).catch((error: any) => { failure = error; });
    await flushCleanup(); fixture.begin('later'); fixture.progress('later', 'canceled', 0, 4);
    t.mock.timers.tick(100); await flushCleanup();
    assert(failure, 'canceled must not be masked until the 15000ms deadline');
    assert.match(failure.message, /Download canceled:.*later/);
  } finally { fixture.cdp.close(); }
});

for (const started of [false, true]) {
  test(`download timeout reports ${started ? 'all observed states and bytes' : 'no start'} at the unchanged deadline`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const fixture = downloadFixture();
    try {
      fixture.begin('previous'); fixture.progress('previous', 'completed', 4);
      const before = fixture.downloads.length;
      let failure: any;
      void driver.waitForDownload(fixture.downloads, before).catch((error: any) => { failure = error; });
      if (started) {
        fixture.begin('pending'); fixture.begin('in-flight');
        fixture.progress('in-flight', 'inProgress', 2, 4);
      }
      await flushCleanup();
      for (let i = 0; i < 149; i++) { t.mock.timers.tick(100); await flushCleanup(); }
      assert.equal(failure, undefined);
      t.mock.timers.tick(100); await flushCleanup();
      assert(failure); assert.match(failure.message, /Timeout: actual browser download completion/);
      assert.equal(Date.now(), 15000);
      assert(!failure.message.includes('previous'), 'diagnostics must exclude earlier clicks');
      if (started) {
        assert.match(failure.message, /pending.*in-flight.*inProgress.*receivedBytes.*2.*totalBytes.*4/);
      } else assert.match(failure.message, /no start/);
    } finally { fixture.cdp.close(); }
  });
}

test('failing CLI fixture exits nonzero after finally reaping only its own child', async () => {
  const moduleUrl = new URL('../../../scripts/frontend-navigation-smoke.mjs', import.meta.url).href;
  const fixture = `import {spawn} from 'node:child_process'; import {stopChild,assertRoute} from ${JSON.stringify(moduleUrl)};
    const child=spawn(process.execPath,['--input-type=module','--eval','setInterval(()=>{},1000)'],{stdio:'ignore'});
    try {assertRoute({path:'/wrong',pending:false},{path:'/expected'});}
    finally {await stopChild(child); console.log('REAPED',child.exitCode!==null||child.signalCode!==null);}`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', fixture], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /REAPED true/);
  assert.match(result.stderr, /URL/);
});

class ChildFixture extends EventEmitter {
  pid = 1234;
  exitCode: number | null = null;
  signalCode: string | null = null;
  signals: string[] = [];
  action: (signal: string) => boolean = () => true;
  kill(signal: string) { this.signals.push(signal); return this.action(signal); }
  exit(code: number | null = 0, signal: string | null = null) {
    this.exitCode = code; this.signalCode = signal; this.emit('exit', code, signal);
  }
}
const ownership = { role: 'browser', executable: 'fixture/chrome', profile: 'fixture/profile' };
async function flushCleanup() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
function assertReleased(child: ChildFixture) {
  assert.equal(child.listenerCount('exit'), 0);
  assert.equal(child.listenerCount('error'), 0);
}

test('owned shutdown reports already-exited identity without sending a signal', async () => {
  const child = new ChildFixture(); child.exit(7);
  const result = await driver.stopChild(child, false, ownership);
  assert.equal(result.role, 'browser'); assert.equal(result.pid, 1234);
  assert.equal(result.executable, ownership.executable); assert.equal(result.profile, ownership.profile);
  assert.equal(result.status, 'exited'); assert.equal(result.exitCode, 7);
  assert(result.elapsedMs >= 0); assert.equal(result.descendantTreeVerified, false);
  assert.deepEqual(result.killRequests, []); assertReleased(child);
});

test('graceful shutdown releases its timer and repeated concurrent cleanup shares one result', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const child = new ChildFixture();
  const pending = driver.stopChild(child, true, ownership);
  const repeat = driver.stopChild(child, true, ownership);
  t.mock.timers.tick(20); child.exit();
  const result = await pending;
  assert.deepEqual(await repeat, result);
  assert.equal(result.elapsedMs, 20); assert.deepEqual(child.signals, []);
  assertReleased(child); t.mock.timers.tick(20000); await flushCleanup();
  assert.deepEqual(child.signals, []);
  assert.deepEqual(await driver.stopChild(child, true, ownership), result);
});

test('TERM shutdown captures a synchronous exit race and true kill return', async () => {
  const child = new ChildFixture();
  child.action = signal => { child.exit(null, signal); return true; };
  const result = await driver.stopChild(child, false, ownership);
  assert.deepEqual(child.signals, ['SIGTERM']);
  assert.equal(result.signalCode, 'SIGTERM');
  assert.equal(result.killRequests[0].returned, true); assertReleased(child);
});

test('graceful deadline escalates to TERM, then KILL at the unchanged deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const child = new ChildFixture();
  child.action = signal => { if (signal === 'SIGKILL') child.exit(null, signal); return true; };
  const pending = driver.stopChild(child, true, ownership);
  t.mock.timers.tick(2999); await flushCleanup(); assert.deepEqual(child.signals, []);
  t.mock.timers.tick(1); await flushCleanup(); assert.deepEqual(child.signals, ['SIGTERM']);
  t.mock.timers.tick(3000); await flushCleanup();
  const result = await pending;
  assert.deepEqual(child.signals, ['SIGTERM', 'SIGKILL']);
  assert.equal(result.elapsedMs, 6000); assert.equal(result.status, 'exited'); assertReleased(child);
});

for (const failure of ['false return', 'emitted error', 'thrown error', 'unresolved']) {
  test(`unresolved owned shutdown exposes ${failure} and releases listeners/timers`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const child = new ChildFixture();
    child.action = () => {
      if (failure === 'emitted error') child.emit('error', Object.assign(Error('denied'), { code: 'EPERM' }));
      if (failure === 'thrown error') throw Object.assign(Error('denied'), { code: 'EPERM' });
      return failure !== 'false return';
    };
    const pending = driver.stopChild(child, false, ownership);
    const rejected = assert.rejects(pending, (error: any) => {
      assert.match(error.message, /browser.*1234.*unresolved/);
      const result = error.cleanup;
      assert.equal(result.status, 'unresolved'); assert.equal(result.elapsedMs, 6000);
      assert.equal(result.exitCode, null); assert.equal(result.signalCode, null);
      assert.deepEqual(result.killRequests.map((request: any) => request.signal), ['SIGTERM', 'SIGKILL']);
      if (failure === 'false return') assert(result.killRequests.every((request: any) => request.returned === false));
      if (failure === 'emitted error') assert.equal(result.errors[0].code, 'EPERM');
      if (failure === 'thrown error') assert.equal(result.killRequests[0].error.code, 'EPERM');
      return true;
    });
    await flushCleanup(); t.mock.timers.tick(3000); await flushCleanup();
    t.mock.timers.tick(3000); await rejected;
    assertReleased(child); t.mock.timers.tick(20000); await flushCleanup();
    assert.deepEqual(child.signals, ['SIGTERM', 'SIGKILL']);
    await assert.rejects(driver.stopChild(child, false, ownership), /unresolved/);
    assert.deepEqual(child.signals, ['SIGTERM', 'SIGKILL']);
  });
}

test('exit event proves root exit even when a fixture has not updated exit fields', async () => {
  const child = new ChildFixture();
  child.action = signal => { child.emit('exit', null, signal); return true; };
  const result = await driver.stopChild(child, false, ownership);
  assert.equal(result.status, 'exited'); assert.equal(result.signalCode, 'SIGTERM'); assertReleased(child);
});

test('an asynchronous kill error is recorded even if a later root exit succeeds', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const child = new ChildFixture();
  const pending = driver.stopChild(child, false, ownership);
  t.mock.timers.tick(1); child.emit('error', Object.assign(Error('late error'), { code: 'EPERM' }));
  t.mock.timers.tick(1); child.exit(0);
  const result = await pending;
  assert.equal(result.status, 'exited'); assert.equal(result.errors[0].elapsedMs, 1);
  assert.equal(result.errors[0].code, 'EPERM'); assertReleased(child);
});

test('cleanup reports both roots and retains the exact profile when browser exit is unresolved', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const browser = new ChildFixture(), server = new ChildFixture(); server.pid = 5678;
  server.action = signal => { server.exit(null, signal); return true; };
  let removed = false; const reports: string[] = [];
  const pending = driver.cleanupOwnedResources({ browser, server, executable: ownership.executable, profile: ownership.profile },
    async () => { removed = true; }, (report: string) => reports.push(report));
  const rejected = assert.rejects(pending, (error: any) => {
    assert.equal(error.cleanup.children[0].status, 'unresolved');
    assert.equal(error.cleanup.children[1].role, 'server');
    assert.equal(error.cleanup.children[1].status, 'exited');
    assert.equal(error.cleanup.profile.status, 'retained');
    assert.equal(error.cleanup.profile.path, ownership.profile);
    return true;
  });
  await flushCleanup(); t.mock.timers.tick(3000); await flushCleanup();
  t.mock.timers.tick(3000); await rejected;
  assert.equal(removed, false); assert.equal(reports.length, 3);
  assertReleased(browser); assertReleased(server);
});

test('server failure does not skip owned profile cleanup and both outcomes remain visible', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const browser = new ChildFixture(), server = new ChildFixture(); browser.exit(); server.pid = 5678;
  let removals = 0;
  const pending = driver.cleanupOwnedResources({ browser, server, profile: ownership.profile },
    async () => { removals++; }, () => {});
  const rejected = assert.rejects(pending, (error: any) => {
    assert.equal(error.cleanup.children[0].status, 'exited');
    assert.equal(error.cleanup.children[1].status, 'unresolved');
    assert.equal(error.cleanup.profile.status, 'removed');
    assert.equal(error.cleanup.children[0].descendantTreeVerified, false);
    return true;
  });
  await flushCleanup(); t.mock.timers.tick(3000); await flushCleanup();
  t.mock.timers.tick(3000); await rejected;
  assert.equal(removals, 1); assertReleased(server);
});

test('profile removal errors fail cleanup explicitly even after both roots exited', async () => {
  const browser = new ChildFixture(), server = new ChildFixture(); browser.exit(); server.exit();
  await assert.rejects(driver.cleanupOwnedResources({ browser, server, profile: ownership.profile },
    async () => { throw Object.assign(Error('profile locked'), { code: 'EBUSY' }); }, () => {}), (error: any) => {
    assert.equal(error.cleanup.profile.status, 'retained');
    assert.equal(error.cleanup.profile.reason.code, 'EBUSY');
    assert(error.cleanup.children.every((child: any) => child.status === 'exited'));
    return true;
  });
});

test('unspawned resources report not-started and only the supplied owned profile is removed', async () => {
  let removed = false;
  const result = await driver.cleanupOwnedResources({ profile: ownership.profile }, async () => { removed = true; }, () => {});
  assert(result.children.every((child: any) => child.status === 'not-started' && child.pid === null));
  assert.equal(result.profile.status, 'removed'); assert.equal(removed, true);
});

test('stopChild reaps a running owned fixture and safely tolerates repeated cleanup', async () => {
  const child = spawn(process.execPath, ['--eval', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
  await driver.stopChild(child);
  assert(child.exitCode !== null || child.signalCode !== null);
  await driver.stopChild(child);
});
