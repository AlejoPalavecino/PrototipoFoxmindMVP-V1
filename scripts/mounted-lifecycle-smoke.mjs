import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireRuntime, locateBrowser, connect, freePort, evaluate, waitFor, cleanupOwnedResources } from './frontend-navigation-smoke.mjs';
export { evaluate };
export const requiredAssertions = ['submission retry/file identity', 'submission late confirmation guard',
  'join retry/code retention', 'join late confirmation guard', 'message retry/draft retention',
  'message conversation-change guard', 'message late confirmation guard', 'subscription cleanup'];
export function assertReceipt(receipt) {
  assert(receipt && receipt.restored === true, 'fixture restoration missing');
  assert(receipt.strictSetups >= 2 && receipt.strictCleanups === receipt.strictSetups, 'StrictMode lifecycle missing');
  assert.deepEqual(receipt.errors || [], [], 'mounted assertions failed');
  for (const name of requiredAssertions) assert(receipt.assertions.includes(name), `Missing mounted assertion: ${name}`);
}
// Serialized into the owned child: no config file or production entry changes.
export async function bootOwnedVite(createServer, root, port, token) {
  const server = await createServer({
    root,
    server: { host: '127.0.0.1', port: Number(port), strictPort: true },
    plugins: [{
      name: 'mounted-lifecycle-owner',
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          if (request.url === '/tests/mounted-lifecycle.html') response.setHeader('x-foxmind-mounted-owner', token);
          next();
        });
      },
    }],
  });
  try {
    await server.listen();
    server.printUrls(); // Diagnostic only; readiness never parses this output.
  } catch (error) {
    await server.close(); // Do not leave Vite watchers alive on strict-port failure.
    throw error;
  }
}

export async function waitForOwnedVite(child, origin, {
  token, timeout = 15000, interval = 100, now = Date.now,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  request = (url, budget) => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(budget) }),
  assertActive = () => {},
} = {}) {
  assert(token, 'Owned Vite startup requires a per-run token');
  const url = `${origin}/tests/mounted-lifecycle.html`, deadline = now() + timeout;
  let log = '', spawnError, exited = false, code, signal, last = 'no HTTP response';
  const capture = data => { log = (log + data.toString()).slice(-8000); };
  const onError = error => { spawnError = error; };
  const onExit = (exitCode, signalCode) => { exited = true; code = exitCode; signal = signalCode; };
  const failure = reason => Error(`${reason}: owned Vite startup at ${url}\nLast probe: ${last}\nCaptured startup output:\n${log || '(empty)'}`);
  const alive = () => {
    assertActive();
    if (spawnError) throw failure(`Spawn error: ${spawnError.message}`);
    if (exited || child.exitCode != null || child.signalCode != null) {
      throw failure(`Child exited (code=${code ?? child.exitCode}, signal=${signal ?? child.signalCode})`);
    }
    if (!child.pid) throw failure('Owned child has no PID');
  };
  child.on('error', onError); child.on('exit', onExit);
  child.stdout?.on('data', capture); child.stderr?.on('data', capture);
  try {
    while (now() < deadline) {
      alive();
      let ready = false;
      try {
        const response = await request(url, Math.max(1, Math.min(2000, deadline - now())));
        last = `HTTP ${response.status}`;
        if (response.status === 200 && response.headers.get('x-foxmind-mounted-owner') === token) {
          const html = await response.text();
          ready = html.includes('src="/tests/mounted-lifecycle.tsx"');
          if (!ready) last += ' (fixture module missing)';
        } else {
          if (response.status === 200) last += ' (ownership token mismatch)';
          await response.body?.cancel();
        }
      } catch (error) { last = error.message; }
      alive(); // A racing HTTP response must never conceal owned-child failure.
      if (ready && now() < deadline) return;
      if (now() < deadline) await sleep(Math.min(interval, deadline - now()));
    }
    alive();
    throw failure('Timeout');
  } finally {
    child.removeListener('error', onError); child.removeListener('exit', onExit);
    child.stdout?.removeListener('data', capture); child.stderr?.removeListener('data', capture);
  }
}

// Keep tails alive until owned cleanup completes; disposal never erases evidence.
export function captureChildDiagnostics(child) {
  let stdout = '', stderr = '', spawnError = null;
  let exitCode = child.exitCode, signalCode = child.signalCode;
  const out = data => { stdout = (stdout + data.toString()).slice(-8000); };
  const err = data => { stderr = (stderr + data.toString()).slice(-8000); };
  const onError = error => { spawnError = error.message; };
  const onExit = (code, signal) => { exitCode = code; signalCode = signal; };
  child.stdout?.on('data', out); child.stderr?.on('data', err);
  child.on('error', onError); child.on('exit', onExit);
  return {
    snapshot: () => ({ pid: child.pid, exitCode: child.exitCode ?? exitCode,
      signalCode: child.signalCode ?? signalCode, spawnError, stdout, stderr }),
    dispose() {
      child.stdout?.removeListener('data', out); child.stderr?.removeListener('data', err);
      child.removeListener('error', onError); child.removeListener('exit', onExit);
    },
  };
}
export async function navigateMountedFixture(page, { origin, targetId, children }) {
  const errors = [];
  page.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text));
  page.on('Runtime.consoleAPICalled', event => { if (['error', 'warning'].includes(event.type)) errors.push(event.args.map(arg => arg.description || arg.value).join(' ')); });
  page.on('Log.entryAdded', ({ entry }) => { if (['error', 'warning'].includes(entry.level)) errors.push(`${entry.text}: ${entry.url || ''}`); });
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Log.enable');
  const url = `${origin}/tests/mounted-lifecycle.html`;
  try { await page.send('Page.navigate', { url }); }
  catch (error) {
    const evidence = { origin, fixtureURL: url, targetId, browserErrors: errors,
      children: Object.fromEntries(Object.entries(children).map(([role, child]) => [role, child.snapshot()])) };
    throw new Error(`${error.message}\nNavigation diagnostics: ${JSON.stringify(evidence)}`, { cause: error });
  }
  return errors;
}

export async function main() {
  requireRuntime();
  assert.equal(process.argv.length, 2, 'Usage: node scripts/mounted-lifecycle-smoke.mjs');
  const executable = await locateBrowser(), root = fileURLToPath(new URL('../', import.meta.url));
  const profile = await mkdtemp(path.join(tmpdir(), 'foxmind-mounted-'));
  let browser, server, browserCdp, page, interrupted = false, spawnError;
  const children = {};
  const abort = () => { interrupted = true; };
  process.once('SIGINT', abort); process.once('SIGTERM', abort);
  const alive = () => { assert(!interrupted, 'Interrupted'); if (spawnError) throw spawnError; };
  try {
    const port = await freePort(), origin = `http://127.0.0.1:${port}`;
    const token = randomUUID();
    const startup = `import { createServer } from 'vite'; (${bootOwnedVite.toString()})(createServer, ...process.argv.slice(1)).catch(error => { console.error(error); process.exitCode = 1; });`;
    server = spawn(process.execPath, ['--input-type=module', '-e', startup, root, String(port), token], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    children.server = captureChildDiagnostics(server);
    // Keep an error listener beyond readiness so late child errors also reach
    // the run's liveness checks and its existing finally-owned cleanup path.
    server.on('error', error => { spawnError = error; });
    await waitForOwnedVite(server, origin, { token, assertActive: () => assert(!interrupted, 'Interrupted') });
    browser = spawn(executable, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
    children.browser = captureChildDiagnostics(browser);
    browser.on('error', error => { spawnError = error; });
    const endpoint = await waitFor(async () => { alive(); assert.equal(browser.exitCode, null); return (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n'); }, 'owned browser startup');
    browserCdp = await connect(`ws://127.0.0.1:${endpoint[0]}${endpoint[1]}`);
    const { targetId } = await browserCdp.send('Target.createTarget', { url: 'about:blank' });
    const targets = await (await fetch(`http://127.0.0.1:${endpoint[0]}/json/list`, { signal: AbortSignal.timeout(2000) })).json();
    page = await connect(targets.find(target => target.id === targetId).webSocketDebuggerUrl);
    const errors = await navigateMountedFixture(page, { origin, targetId, children });
    const receipt = await waitFor(async () => { alive(); return evaluate(page, 'window.mountedLifecycleReceipt || null'); }, 'mounted lifecycle receipt', 60000);
    console.log(JSON.stringify(receipt, null, 2));
    assert.deepEqual(errors, [], 'browser console/uncaught errors'); assertReceipt(receipt);
    console.log('PASS real mounted React lifecycle (dedicated Vite entry)');
  } finally {
    try {
      page?.close();
      if (browserCdp) {
        try { await browserCdp.send('Browser.close'); }
        catch (error) { console.error(`Browser.close: ${error.message}`); }
        finally { browserCdp.close(); }
      }
      await cleanupOwnedResources({ browser, server, executable, profile, graceful: !!browserCdp });
    } finally {
      for (const child of Object.values(children)) child.dispose();
      process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort);
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
