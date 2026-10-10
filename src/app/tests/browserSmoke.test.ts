import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn, spawnSync } from 'node:child_process';

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

test('action wait times out and captures the failed assertion', async () => {
  await assert.rejects(driver.waitFor(() => { throw Error('wrong URL fixture'); }, 'fixture ready', 20), /fixture ready.*wrong URL fixture/);
  assert.equal(await driver.waitFor(() => 'ready', 'fixture ready', 20), 'ready');
});

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

test('stopChild reaps a running owned fixture and safely tolerates repeated cleanup', async () => {
  const child = spawn(process.execPath, ['--eval', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
  await driver.stopChild(child);
  assert(child.exitCode !== null || child.signalCode !== null);
  await driver.stopChild(child);
});
