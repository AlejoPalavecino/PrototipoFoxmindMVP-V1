import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let interrupted = false;
export function requireRuntime(version = process.versions.node, websocket = globalThis.WebSocket) {
  assert(Number(version.split('.')[0]) >= 22 && typeof websocket === 'function',
    'Use Node >=22 with built-in WebSocket (no browser downloads or dependencies).');
}
export function assertRoute(actual, expected) {
  assert.equal(actual.path, expected.path, 'URL');
  assert.equal(actual.pending, false, 'content still loading');
  assert.equal(actual.contentReady, true, 'settled main content missing');
  for (const key of ['title', 'active', 'focus']) {
    if (expected[key] !== undefined) assert.equal(actual[key], expected[key], key);
  }
}
export async function locateBrowser(override = process.env.FOXMINDBROWSER, platform = process.platform, env = process.env) {
  const names = platform === 'win32' ? ['chrome.exe', 'msedge.exe'] : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'microsoft-edge-stable'];
  const conventional = platform === 'win32'
    ? [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean).flatMap(base =>
      [path.join(base, 'Google/Chrome/Application/chrome.exe'), path.join(base, 'Microsoft/Edge/Application/msedge.exe')])
    : platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'] : [];
  const candidates = override ? [override] : [...conventional, ...(env.PATH || '').split(path.delimiter).flatMap(base => names.map(name => path.join(base, name)))];
  for (const candidate of candidates) {
    try { await access(candidate); if ((await stat(candidate)).isFile()) return candidate; } catch { /* Try only installed candidates. */ }
  }
  throw Error('Chrome/Edge not found. Set FOXMINDBROWSER to an installed browser executable; no automatic install/download.');
}
export class Protocol {
  constructor(socket, timeout = 5000) {
    this.socket = socket;
    this.timeout = timeout;
    this.next = 0;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const request = this.pending.get(message.id);
        if (!request) return;
        clearTimeout(request.timer); this.pending.delete(message.id);
        message.error ? request.reject(Error(message.error.message)) : request.resolve(message.result);
      } else for (const listener of this.listeners.get(message.method) || []) listener(message.params);
    });
    socket.addEventListener('close', () => this.close());
    socket.addEventListener('error', () => this.close());
  }
  on(method, listener) {
    const listeners = this.listeners.get(method) || new Set();
    this.listeners.set(method, listeners); listeners.add(listener);
    return () => listeners.delete(listener);
  }
  send(method, params = {}) {
    if (this.closed) return Promise.reject(Error('CDP closed'));
    return new Promise((resolve, reject) => {
      const id = ++this.next;
      const timer = setTimeout(() => { this.pending.delete(id); reject(Error(`CDP timeout: ${method}`)); }, this.timeout);
      this.pending.set(id, { resolve, reject, timer });
      try { this.socket.send(JSON.stringify({ id, method, params })); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    for (const request of this.pending.values()) { clearTimeout(request.timer); request.reject(Error('CDP closed')); }
    this.pending.clear(); this.listeners.clear(); this.socket.close();
  }
}
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.close(); reject(Error('CDP connection timeout')); }, 5000);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timer); socket.close(); reject(Error('CDP connection failed')); }, { once: true });
  });
  return new Protocol(socket);
}
export async function waitFor(operation, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    if (interrupted) throw Error('Smoke interrupted; cleaning owned resources');
    try { const value = await operation(); if (value) return value; } catch (error) { last = error; }
    await delay(100);
  }
  throw Error(`Timeout: ${label}${last ? ` (${last.message})` : ''}`);
}
export async function stopChild(child, graceful = false) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise(resolve => child.once('exit', resolve));
  let timer;
  if (graceful) {
    await Promise.race([exited, new Promise(resolve => { timer = setTimeout(resolve, 3000); })]);
    clearTimeout(timer);
    if (child.exitCode !== null || child.signalCode !== null) return;
  }
  child.kill('SIGTERM');
  await Promise.race([exited, new Promise(resolve => { timer = setTimeout(resolve, 3000); })]);
  clearTimeout(timer);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await Promise.race([exited, new Promise(resolve => { timer = setTimeout(resolve, 3000); })]);
    clearTimeout(timer);
    assert(child.exitCode !== null || child.signalCode !== null, 'Owned child did not exit');
  }
}
async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
const visible = `el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && Number(s.opacity) > .95; }`;
async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function click(cdp, selector, text = '') {
  const point = await waitFor(() => evaluate(cdp, `(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => (${visible})(el) && el.textContent.includes(${JSON.stringify(text)}));
    if (!el) return null; el.scrollIntoView({block:'nearest'});
    const r = (el.querySelector('h4') || el).getBoundingClientRect();
    const x = r.x+r.width/2, y = r.y+r.height/2;
    if (el.contains(document.elementFromPoint(x,y))) return {x,y};
    // Scroll only the contact list when fixed mobile navigation covers a row.
    for (let parent=el.parentElement; parent && parent.tagName!=='MAIN'; parent=parent.parentElement) {
      if (getComputedStyle(parent).overflowY==='auto') { parent.scrollTop+=80; break; }
    }
    throw Error('Hit target blocked at '+x+','+y+' by '+document.elementFromPoint(x,y)?.tagName);
  })()`), `visible click ${selector} ${text}`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
async function ready(cdp, expected) {
  const snapshot = `({path:location.pathname, title:document.title,
    pending:[...document.querySelectorAll('[role="status"]')].some(el=>el.textContent.includes('Cargando vista…')),
    contentReady:!document.querySelector('[role="alert"]') && [...document.querySelectorAll('main h1,main h2,main h3')].some(${visible}) &&
      !document.getAnimations().some(a=>a.playState==='running' && a.effect.getComputedTiming().iterations!==Infinity) &&
      (!location.pathname.includes('/mensajes') || (location.pathname.endsWith('/mensajes')
        ? [...document.querySelectorAll('main input[placeholder="Buscar conversación o contacto..."]')].some(${visible})
        : [...document.querySelectorAll('main textarea')].some(${visible}))),
    focus:document.activeElement?.tagName==='MAIN',
    active:[...document.querySelectorAll('nav [aria-current="page"]')].find(${visible})?.textContent.trim().replace(/\\s*\\d+$/, '')})`;
  const actual = await waitFor(async () => {
    assertRoute(await evaluate(cdp, snapshot), expected);
    // Recheck after timers/animations: a premature match restarts bounded readiness.
    await delay(700);
    const settled = await evaluate(cdp, snapshot); assertRoute(settled, expected); return settled;
  }, `ready ${expected.path}`);
  console.log(`  URL ${actual.path}; title=${actual.title}; active=${actual.active}; mainFocus=${actual.focus}`);
}
const screen = (role, view, label, focus) => ({ path: `/${role}/${view}`, title: `${label} · ${role === 'alumno' ? 'Alumno' : 'Docente'} | FoxMind`, active: label, ...(focus ? { focus: true } : {}) });
async function navigation(cdp, role, dev) {
  const dashboard = role === 'alumno' ? 'Mi Dashboard' : 'Dashboard';
  const label = role === 'alumno' ? 'Mis Aulas' : 'Agenda';
  const view = role === 'alumno' ? 'aulas' : 'agenda';
  await ready(cdp, { path: '/', title: 'Seleccionar rol | FoxMind' });
  await evaluate(cdp, `window.smoke={pushes:0,focus:0}; const push=history.pushState.bind(history); history.pushState=(...a)=>{smoke.pushes++;return push(...a)}; document.addEventListener('focusin',e=>{if(e.target.tagName==='MAIN')smoke.focus++})`);
  await click(cdp, 'button', `Soy ${role === 'alumno' ? 'Alumno' : 'Docente'}`);
  await ready(cdp, screen(role, 'dashboard', dashboard, true));
  await click(cdp, 'nav button', label); await ready(cdp, screen(role, view, label, true));
  await evaluate(cdp, 'history.back()'); await ready(cdp, screen(role, 'dashboard', dashboard));
  await evaluate(cdp, 'history.forward()'); await ready(cdp, screen(role, view, label));
  if (dev) {
    await click(cdp, 'aside button', 'Cerrar sesión');
    await ready(cdp, { path: '/', title: 'Seleccionar rol | FoxMind', focus: true });
    await click(cdp, 'button', `Soy ${role === 'alumno' ? 'Alumno' : 'Docente'}`);
    await ready(cdp, screen(role, 'dashboard', dashboard, true));
    await click(cdp, 'nav button', label); await ready(cdp, screen(role, view, label, true));
  }
  const counters = await evaluate(cdp, 'smoke');
  assert.deepEqual(counters, { pushes: dev ? 5 : 2, focus: dev ? 5 : 2 }, 'single screen effects/history');
  console.log(`  ${dev ? 'mounted StrictMode' : 'production'} counters ${JSON.stringify(counters)}`);
  await cdp.send('Page.reload', { ignoreCache: true }); await ready(cdp, screen(role, view, label));
}
async function mobile(cdp) {
  await ready(cdp, screen('alumno', 'mensajes', 'Mensajes'));
  const metrics = `(() => {const main=document.querySelector('main'); const inner=[...main.querySelectorAll('div.overflow-y-auto')].find(el=>(${visible})(el)&&el.scrollHeight>el.clientHeight); return {main:main.scrollTop,max:main.scrollHeight-main.clientHeight,inner:inner?.scrollTop,bottom:inner?inner.scrollHeight-inner.clientHeight:0,window:scrollY};})()`;
  const initial = await evaluate(cdp, metrics);
  if (initial.max > 20) await evaluate(cdp, 'document.querySelector("main").scrollTop=20');
  // The existing fixture labels Laura's default thread as Valentina in both roles.
  await click(cdp, 'main button:has(h4)', 'Valentina Rodríguez');
  await ready(cdp, { ...screen('alumno', 'mensajes', 'Mensajes'), path: '/alumno/mensajes/dm-laura-valentina' });
  await waitFor(async () => { const m = await evaluate(cdp, metrics); return m.bottom > 0 && Math.abs(m.bottom-m.inner)<2; }, 'fresh Laura inner bottom');
  const opened = await evaluate(cdp, metrics);
  if (initial.max > 20) assert.equal(opened.main, 20, 'thread must preserve real main overflow');
  assert.equal(opened.window, 0); console.log(`  mobile 390x740 Laura ${JSON.stringify(opened)}`);
  assert(await evaluate(cdp, `[...document.querySelectorAll('main textarea')].some(${visible})`), 'visible composer (not toast)');
  if (initial.max > 60) await evaluate(cdp, 'document.querySelector("main").scrollTop=60');
  await evaluate(cdp, 'history.back()'); await ready(cdp, screen('alumno', 'mensajes', 'Mensajes'));
  if (initial.max > 60) assert.equal((await evaluate(cdp, metrics)).main, 20, 'Back restores list entry');
  await evaluate(cdp, 'history.forward()');
  await ready(cdp, { ...screen('alumno', 'mensajes', 'Mensajes'), path: '/alumno/mensajes/dm-laura-valentina' });
  if (initial.max > 60) assert.equal((await evaluate(cdp, metrics)).main, 60, 'Forward restores thread entry');
  console.log(`  mobile history restored ${JSON.stringify(await evaluate(cdp, metrics))}`);
  await evaluate(cdp, 'history.back()'); await ready(cdp, screen('alumno', 'mensajes', 'Mensajes'));
  await click(cdp, 'main button:has(h4)', 'Carlos');
  const carlos = await evaluate(cdp, 'location.pathname'); assert.match(carlos, /\/alumno\/mensajes\/dm-/);
  await ready(cdp, { ...screen('alumno', 'mensajes', 'Mensajes'), path: carlos });
  await click(cdp, 'main button:has(svg.lucide-chevron-left)');
  await ready(cdp, screen('alumno', 'mensajes', 'Mensajes'));
  await click(cdp, 'main button:has(h4)', 'Valentina Rodríguez');
  await ready(cdp, { ...screen('alumno', 'mensajes', 'Mensajes'), path: '/alumno/mensajes/dm-laura-valentina' });
  await evaluate(cdp, 'history.back()'); await ready(cdp, screen('alumno', 'mensajes', 'Mensajes'));
  await evaluate(cdp, 'history.forward()'); await ready(cdp, { ...screen('alumno', 'mensajes', 'Mensajes'), path: '/alumno/mensajes/dm-laura-valentina' });
}
async function boundary(cdp, intercept, layout, fail) {
  const label = layout ? 'root layout' : 'page';
  if (!layout) await ready(cdp, screen('docente', 'dashboard', 'Dashboard'));
  else await ready(cdp, { path: '/' });
  if (layout) await click(cdp, 'button', 'Soy Docente');
  else await click(cdp, 'nav button', 'Agenda');
  await waitFor(() => intercept.requests.length, `${label} chunk intercepted`);
  const role = fail ? 'alert' : 'status';
  await waitFor(() => evaluate(cdp, `[...document.querySelectorAll('[role="${role}"]')].some(el=>el.textContent.includes(${JSON.stringify(fail ? 'No se pudo cargar esta vista.' : 'Cargando vista…')}))`), `${label} Spanish ${role}`);
  assert(await evaluate(cdp, `!!document.querySelector('button[aria-label="Abrir panel de accesibilidad DUA"]')`), 'outside accessibility survives');
  if (!layout) assert(await evaluate(cdp, '!!document.querySelector("aside nav")'), 'page shell survives');
  assert(await evaluate(cdp, `!!document.querySelector('div.fixed.top-4.right-4')`), 'outside toast host remains mounted (empty host, not invented toast controls)');
  await click(cdp, 'button[aria-label="Abrir panel de accesibilidad DUA"]');
  assert(await waitFor(() => evaluate(cdp, '!!document.querySelector("#dyslexic-toggle") || !!document.querySelector("input[type=checkbox]")'), 'outside settings usable'));
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape' }); await delay(400);
  const preserved = await evaluate(cdp, 'location.pathname');
  if (fail) { intercept.enabled = false; await click(cdp, 'button', 'Recargar página'); }
  else { for (const requestId of intercept.requests) await cdp.send('Fetch.continueRequest', { requestId }); }
  await ready(cdp, layout ? screen('docente', 'dashboard', 'Dashboard', !fail) : screen('docente', 'agenda', 'Agenda', !fail));
  assert.equal(await evaluate(cdp, 'location.pathname'), preserved, 'reload preserves URL');
  console.log(`  ${label} ${fail ? 'failure + actual reload recovery' : 'held pending + ready/focus'}; intercepted=${intercept.requests.length}`);
}
async function runMode(mode, browser) {
  const profile = await mkdtemp(path.join(tmpdir(), 'foxmind-smoke-'));
  let server, chrome, browserCdp;
  const pages = new Set();
  const abort = () => { interrupted = true; void browserCdp?.send('Browser.close').catch(() => {}); void stopChild(server); };
  process.once('SIGINT', abort); process.once('SIGTERM', abort);
  try {
    const port = await freePort(); const origin = `http://127.0.0.1:${port}`;
    let serverLog = '', spawnError;
    server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), ...(mode === 'production' ? ['preview'] : []), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    server.on('error', error => { spawnError = error; });
    for (const pipe of [server.stdout, server.stderr]) pipe.on('data', data => { serverLog = (serverLog + data.toString().replace(/\x1b\[[0-9;]*m/g, '')).slice(-8000); });
    // Require this child's startup message AND liveness before polling its URL.
    await waitFor(() => { if (spawnError) throw spawnError; assert.equal(server.exitCode, null, serverLog); return serverLog.includes(origin); }, 'owned strict-port Vite startup');
    await waitFor(async () => (await fetch(origin, { signal: AbortSignal.timeout(1500) })).ok, 'Vite HTTP');
    chrome = spawn(browser, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
    chrome.on('error', error => { spawnError = error; });
    const endpoint = await waitFor(async () => { if (spawnError) throw spawnError; assert.equal(chrome.exitCode, null, 'Browser exited'); return (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n'); }, 'owned browser startup');
    browserCdp = await connect(`ws://127.0.0.1:${endpoint[0]}${endpoint[1]}`);
    console.log(`RUN ${mode}: Node ${process.versions.node}; ${(await browserCdp.send('Browser.getVersion')).product}; owned Vite ${origin}`);
    const manifest = mode === 'production' ? JSON.parse(await readFile(path.join(root, 'dist/.vite/manifest.json'), 'utf8')) : null;
    async function scenario(name, url, action, chunk, fail = false, mobileViewport = false) {
      const { targetId } = await browserCdp.send('Target.createTarget', { url: 'about:blank' });
      const targets = await (await fetch(`http://127.0.0.1:${endpoint[0]}/json/list`, { signal: AbortSignal.timeout(2000) })).json();
      const cdp = await connect(targets.find(target => target.id === targetId).webSocketDebuggerUrl); pages.add(cdp);
      const errors = [], expected = [], transportErrors = [];
      const intercept = { enabled: true, requests: [] };
      const record = text => {
        if (fail && /Failed to fetch dynamically imported module/.test(text) && text.includes(chunk)) expected.push(text);
        else errors.push(text);
      };
      try {
        cdp.on('Runtime.exceptionThrown', event => record(event.exceptionDetails.exception?.description || event.exceptionDetails.text));
        cdp.on('Log.entryAdded', ({ entry }) => {
          if (!['error', 'warning'].includes(entry.level)) return;
          if (entry.source === 'network' && (/^https:\/\/fonts\.(googleapis|gstatic|cdnfonts)\.com\//.test(entry.url || '') || (fail && entry.url === `${origin}/${chunk}`))) expected.push(`${entry.text}: ${entry.url}`);
          else if (entry.source === 'network' && entry.url === `${origin}/favicon.ico` && entry.text.includes('404')) expected.push(`optional browser favicon 404: ${entry.url}`);
          else record(`${entry.text}: ${entry.url || ''}`);
        });
        cdp.on('Runtime.consoleAPICalled', event => { if (event.type === 'error' || event.type === 'warning') record(event.args.map(arg => arg.description || arg.value).join(' ')); });
        cdp.on('Fetch.requestPaused', event => {
          const requestUrl = event.request.url;
          let command;
          if (!requestUrl.startsWith(`${origin}/`)) {
            const font = /^(fonts\.googleapis\.com|fonts\.gstatic\.com|fonts\.cdnfonts\.com)$/.test(new URL(requestUrl).hostname);
            (font ? expected : errors).push(`blocked ${font ? 'font' : 'unexpected external'}: ${requestUrl}`);
            command = cdp.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'BlockedByClient' });
          }
          else if (chunk && intercept.enabled && new URL(requestUrl).pathname === `/${chunk}`) {
            intercept.requests.push(event.requestId);
            if (fail) command = cdp.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'Failed' });
          } else command = cdp.send('Fetch.continueRequest', { requestId: event.requestId });
          command?.catch(error => transportErrors.push(error.message));
        });
        await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Log.enable');
        await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Fetch.enable', { patterns: [{ urlPattern: 'http*', requestStage: 'Request' }] });
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: mobileViewport ? 390 : 1280, height: mobileViewport ? 740 : 900, deviceScaleFactor: 1, mobile: mobileViewport });
        await cdp.send('Page.navigate', { url: `${origin}${url}` });
        await action(cdp, intercept); await delay(300);
        assert.deepEqual(transportErrors, [], 'interception transport'); assert.deepEqual(errors, [], 'unexpected app console/uncaught errors');
        console.log(`PASS ${mode}: ${name}; expected induced/blocked=${expected.length}; unexpected=${errors.length}`);
        for (const text of new Set(expected)) console.log(`  EXPECTED ${text.split('\n')[0]}`);
      } catch (error) { console.error(`FAIL ${mode}: ${name}: ${error.message}; console=${JSON.stringify(errors)}`); throw error; }
      finally {
        try { await browserCdp.send('Target.closeTarget', { targetId }); }
        finally { cdp.close(); pages.delete(cdp); }
      }
    }
    for (const role of ['alumno', 'docente']) await scenario(`${role} UI/history/title/aria/focus/deep refresh`, '/', cdp => navigation(cdp, role, mode === 'dev'));
    if (mode === 'production') {
      await scenario('mobile visible list/select/back/history/default inner bottom', '/alumno/mensajes', mobile, null, false, true);
      for (const layout of [false, true]) for (const fail of [false, true]) {
        const source = layout ? 'src/components/layout/DocenteLayout.tsx' : 'src/views/docente/AgendaDocente.tsx';
        assert(manifest[source]?.file, `Manifest missing ${source}`);
        await scenario(`${layout ? 'root layout' : 'page'} ${fail ? 'failure/reload' : 'pending/focus'}`, layout ? '/' : '/docente/dashboard', (cdp, intercept) => boundary(cdp, intercept, layout, fail), manifest[source].file, fail);
      }
    }
  } finally {
    for (const page of pages) page.close();
    if (browserCdp) { await browserCdp.send('Browser.close').catch(() => {}); browserCdp.close(); }
    const stopped = await Promise.allSettled([stopChild(chrome, !!browserCdp), stopChild(server)]);
    if (!chrome?.pid || chrome.exitCode !== null || chrome.signalCode !== null) await rm(profile, { recursive: true, force: true });
    process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort);
    for (const result of stopped) if (result.status === 'rejected') throw result.reason;
    console.log(`CLEANUP ${mode}: owned browser/server reaped; disposable profile removed`);
  }
}
export async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log('Usage: node scripts/frontend-navigation-smoke.mjs [--mode=production|dev|all]\nRequires Node >=22, installed Chrome/Edge, installed project dependencies and npm run build for production. Set FOXMINDBROWSER to an executable path. npm run test:browser builds first.\nDefault all: production role navigation/history/refresh/title/aria/focus, mobile messaging and manifest-selected lazy page/root pending/failure/reload; dev mounted StrictMode role/screen effects. Loopback only; disposable profile; no screenshots, uploads or browser downloads.'); return;
  }
  requireRuntime();
  assert(args.length <= 1 && (!args.length || /^--mode=(production|dev|all)$/.test(args[0])), 'Expected --mode=production|dev|all');
  const browser = await locateBrowser();
  const mode = args[0]?.split('=')[1] || 'all';
  if (mode !== 'dev') {
    try { await access(path.join(root, 'dist/index.html')); await access(path.join(root, 'dist/.vite/manifest.json')); }
    catch { throw Error('Production dist/manifest missing. Run npm run build first, or use npm run test:browser.'); }
  }
  let failed = false;
  for (const current of mode === 'all' ? ['production', 'dev'] : [mode]) {
    if (interrupted) break;
    try { await runMode(current, browser); } catch (error) { failed = true; console.error(`FAIL ${current}: ${error.message}`); }
  }
  assert(!failed && !interrupted, 'Browser smoke failed/interrupted (see named scenarios above)');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
