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
export function assertChart(chart) {
  assert(chart, 'measured chart SVG missing');
  for (const key of ['width', 'height', 'rectWidth', 'rectHeight']) {
    assert(Number.isFinite(chart[key]) && chart[key] > 0, `chart ${key} must be positive`);
  }
  assert.equal(chart.visible, true, 'chart SVG hidden');
  assert.equal(chart.inViewport, true, 'chart SVG outside visible viewport');
  assert(chart.marks > 0, 'visible plotted chart marks missing');
}
export function smokeOptions(args) {
  const options = { mode: 'all', filter: 'all' }, seen = new Set();
  for (const arg of args) {
    const match = /^--(mode|filter)=(.+)$/.exec(arg);
    assert(match && (match[1] === 'mode' ? ['production', 'dev', 'all'] : ['readiness', 'legacy', 'all']).includes(match[2]), 'Expected --mode=production|dev|all and --filter=readiness|legacy|all');
    assert(!seen.has(match[1]), `Duplicate --${match[1]}`);
    seen.add(match[1]); options[match[1]] = match[2];
  }
  return options;
}
export async function runScenarios(scenarios) {
  const failures = [], names = [];
  for (const scenario of scenarios) {
    if (interrupted) break;
    try { await scenario.run(); }
    catch (error) { failures.push(error); names.push(scenario.name); }
  }
  if (failures.length) throw new AggregateError(failures, `Failed scenarios: ${names.join(', ')}`);
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
  send(method, params = {}, timeout = this.timeout) {
    if (this.closed) return Promise.reject(Error('CDP closed'));
    return new Promise((resolve, reject) => {
      const id = ++this.next;
      const timer = setTimeout(() => { this.pending.delete(id); reject(Error(`CDP timeout: ${method}`)); }, timeout);
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
export async function connect(url) {
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
export function trackDownloads(cdp) {
  const downloads = [];
  cdp.on('Browser.downloadWillBegin', event => { downloads.push({ ...event, state: 'pending' }); });
  cdp.on('Browser.downloadProgress', event => {
    const download = downloads.find(item => item.guid === event.guid);
    if (download) Object.assign(download, { state: event.state, receivedBytes: event.receivedBytes, totalBytes: event.totalBytes });
  });
  return downloads;
}
export async function waitForDownload(downloads, before, timeout = 15000) {
  const deadline = Date.now() + timeout;
  const failure = label => {
    const observed = downloads.slice(before).map(download => ({
      guid: download.guid, suggestedFilename: download.suggestedFilename, url: download.url,
      state: download.state, receivedBytes: download.receivedBytes ?? null, totalBytes: download.totalBytes ?? null,
    }));
    const error = Error(`${label}: actual browser download completion; observed=${observed.length ? JSON.stringify(observed) : 'no start (no Browser.downloadWillBegin observed)'}`);
    error.downloads = observed;
    return error;
  };
  while (true) {
    if (interrupted) throw Error('Smoke interrupted; cleaning owned resources');
    // The first new start belongs to this sequential click; progress is matched
    // by GUID, never filename (duplicate originals must remain independent).
    const download = downloads[before];
    if (download?.state === 'canceled') throw failure('Download canceled');
    if (download?.state === 'completed') return download;
    if (Date.now() >= deadline) throw failure('Timeout');
    await delay(Math.min(100, deadline - Date.now()));
  }
}
const childStops = new WeakMap();
const errorDetails = error => ({ name: error.name, message: error.message, code: error.code ?? null });
export function stopChild(child, graceful = false, ownership = {}) {
  if (child && childStops.has(child)) return childStops.get(child);
  const pending = shutdown();
  if (child) childStops.set(child, pending);
  return pending;

  async function shutdown() {
    const started = Date.now();
    const outcome = {
      role: ownership.role || 'child', pid: child?.pid ?? null,
      executable: ownership.executable || child?.spawnfile || null, profile: ownership.profile ?? null,
      status: 'not-started', elapsedMs: 0, exitCode: child?.exitCode ?? null,
      signalCode: child?.signalCode ?? null, exitEvent: false,
      descendantTreeVerified: false, killRequests: [], errors: [],
    };
    let exited = false, wake, timer;
    const hasExited = () => exited || child?.exitCode != null || child?.signalCode != null;
    const onExit = (code, signal) => {
      exited = true; outcome.exitEvent = true;
      outcome.exitCode = code; outcome.signalCode = signal;
      wake?.();
    };
    const onError = error => outcome.errors.push({ elapsedMs: Date.now() - started, ...errorDetails(error) });
    const waitForExit = async () => {
      if (hasExited()) return;
      try {
        await new Promise(resolve => { wake = resolve; timer = setTimeout(resolve, 3000); });
      } finally { clearTimeout(timer); timer = undefined; wake = undefined; }
    };
    const requestKill = signal => {
      if (hasExited()) return;
      const request = { signal, elapsedMs: Date.now() - started, returned: null, error: null };
      outcome.killRequests.push(request);
      try { request.returned = child.kill(signal); }
      catch (error) { request.error = errorDetails(error); }
    };
    if (child) { child.on('exit', onExit); child.on('error', onError); }
    try {
      if (child?.pid && !hasExited()) {
        if (graceful) await waitForExit();
        if (!hasExited()) { requestKill('SIGTERM'); await waitForExit(); }
        if (!hasExited()) { requestKill('SIGKILL'); await waitForExit(); }
      }
      if (!exited) {
        outcome.exitCode = child?.exitCode ?? null;
        outcome.signalCode = child?.signalCode ?? null;
      }
      outcome.status = hasExited() ? 'exited' : child?.pid ? 'unresolved' : 'not-started';
      outcome.elapsedMs = Date.now() - started;
      if (outcome.status === 'unresolved') {
        const error = Error(`Owned ${outcome.role} PID ${outcome.pid} unresolved: ${JSON.stringify(outcome)}`);
        error.cleanup = outcome;
        throw error;
      }
      return outcome;
    } finally {
      clearTimeout(timer);
      child?.removeListener('exit', onExit); child?.removeListener('error', onError);
    }
  }
}
// Only this run's mkdtemp profile is eligible. Root exit permits attempting its
// removal, but neither root exit nor successful removal proves a descendant tree exited.
export async function cleanupOwnedResources({ browser, server, executable, profile, graceful = false },
  removeProfile = () => rm(profile, { recursive: true, force: true }), report = console.log) {
  const stopped = await Promise.allSettled([
    stopChild(browser, graceful, { role: 'browser', executable, profile }),
    stopChild(server, false, { role: 'server', executable: process.execPath }),
  ]);
  const children = stopped.map(result => result.status === 'fulfilled' ? result.value : result.reason.cleanup);
  const failures = stopped.filter(result => result.status === 'rejected').map(result => result.reason);
  for (const child of children) report(`CLEANUP child: ${JSON.stringify(child)}`);
  const profileOutcome = { path: profile, status: 'retained', reason: 'browser root exit unresolved; ownership does not prove descendants stopped' };
  if (children[0]?.status === 'exited' || children[0]?.status === 'not-started') {
    try { await removeProfile(); profileOutcome.status = 'removed'; profileOutcome.reason = 'owned profile removed; descendant tree unverified'; }
    catch (error) { profileOutcome.reason = errorDetails(error); failures.push(error); }
  }
  report(`CLEANUP profile: ${JSON.stringify(profileOutcome)}`);
  const cleanup = { children, profile: profileOutcome };
  if (failures.length) {
    const error = new AggregateError(failures, `Owned cleanup failed: ${JSON.stringify(cleanup)}`);
    error.cleanup = cleanup;
    throw error;
  }
  return cleanup;
}
export async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
const visible = `el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && Number(s.opacity) > .95; }`;
export async function evaluate(cdp, expression, timeout) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, timeout);
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
// Runs in the page: three consecutive frame samples, including target identity
// and geometry, must agree. The deadline timer also bounds a throttled/absent RAF.
function stableClickPoint(selector, text) {
  return new Promise((resolve, reject) => {
    const deadline = performance.now() + 15000;
    let frame, timer, target, aim, previous, samples = 0, last = 'target not visible';
    const reset = () => { previous = null; samples = 0; };
    const finish = (error, point) => {
      cancelAnimationFrame(frame); clearTimeout(timer);
      error ? reject(error) : resolve(point);
    };
    const expire = () => finish(Error(`Timeout: visible click ${selector} ${text} (${last})`));
    const sample = () => {
      if (performance.now() >= deadline) return expire();
      try {
        const el = [...document.querySelectorAll(selector)].find(el => {
          const r = el.getBoundingClientRect(), s = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && Number(s.opacity) > .95 && el.textContent.includes(text);
        });
        if (!el) { reset(); last = 'target not visible'; }
        else {
          if (el !== target) { target = el; reset(); el.scrollIntoView({ block: 'nearest' }); }
          const hitTarget = el.querySelector('h4') || el;
          if (hitTarget !== aim) { aim = hitTarget; reset(); }
          let animating = false;
          for (let parent = el; parent; parent = parent.parentElement) {
            if (parent.getAnimations().some(animation => animation.playState === 'running' &&
              animation.effect.getComputedTiming().endTime !== Infinity)) { animating = true; break; }
          }
          if (animating) { reset(); last = 'target/ancestor finite animation running'; }
          else {
            const r = el.getBoundingClientRect(), a = hitTarget.getBoundingClientRect();
            const geometry = [r.x, r.y, r.width, r.height, a.x, a.y, a.width, a.height];
            samples = previous && geometry.every((value, index) => value === previous[index]) ? samples + 1 : 1;
            previous = geometry; last = 'target geometry not stable';
            if (samples >= 3) {
              const x = a.x + a.width / 2, y = a.y + a.height / 2;
              if (a.width <= 0 || a.height <= 0 || x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) {
                reset(); last = `Hit target outside viewport at ${x},${y}`;
              } else {
                // Fresh hit test is the final page operation before native input.
                const hit = document.elementFromPoint(x, y);
                if (hit && el.contains(hit)) return finish(null, { x, y });
                reset(); last = `Hit target blocked at ${x},${y} by ${hit?.tagName}`;
                // Preserve the contact-list-only scroll correction for mobile nav.
                for (let parent = el.parentElement; parent && parent.tagName !== 'MAIN'; parent = parent.parentElement) {
                  if (getComputedStyle(parent).overflowY === 'auto') { parent.scrollTop += 80; break; }
                }
              }
            }
          }
        }
      } catch (error) { reset(); last = error.message; }
      frame = requestAnimationFrame(sample);
    };
    timer = setTimeout(expire, 15000);
    frame = requestAnimationFrame(sample);
  });
}
async function click(cdp, selector, text = '') {
  if (interrupted) throw Error('Smoke interrupted; cleaning owned resources');
  // Give the page's unchanged 15s action deadline room to report its own failure,
  // rather than the default 5s CDP transport timeout cutting off the RAF promise.
  const point = await evaluate(cdp, `(${stableClickPoint.toString()})(${JSON.stringify(selector)},${JSON.stringify(text)})`, 20000);
  if (interrupted) throw Error('Smoke interrupted; cleaning owned resources');
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  return point;
}
// Read-only snapshots: diagnostics must never replace native activation or mask
// its failure if the document/target disappears while collecting evidence.
export async function collectActionDiagnostics(cdp, selector, point = null) {
  return evaluate(cdp, `(() => {
    const describe = el => el ? {tag:el.tagName, label:el.getAttribute('aria-label'), text:el.textContent?.trim().slice(0,160)} : null;
    const target = document.querySelector(${JSON.stringify(selector)});
    const r = target?.getBoundingClientRect();
    const point = ${JSON.stringify(point)} || (r ? {x:r.x+r.width/2,y:r.y+r.height/2} : null);
    const hit = point ? document.elementFromPoint(point.x,point.y) : null;
    return {path:location.pathname, documentFocus:document.hasFocus(), activeElement:describe(document.activeElement),
      target:describe(target), rect:r ? {x:r.x,y:r.y,width:r.width,height:r.height} : null,
      point, hit:describe(hit), targetHit:!!target && !!hit && target.contains(hit),
      counters:{clicks:window.classroomClicks ?? null,pushes:window.classroomPushes ?? null},
      attachmentURLs:window.attachmentURLs ?? null};
  })()`);
}
const safeActionDiagnostics = (cdp, selector, point) => collectActionDiagnostics(cdp, selector, point)
  .catch(error => ({ unavailable: error.message }));
export async function clickDownload(cdp, downloads, selector) {
  const beforeCount = downloads.length;
  const before = await safeActionDiagnostics(cdp, selector);
  let point;
  try {
    point = await click(cdp, selector);
    return await waitForDownload(downloads, beforeCount);
  } catch (error) {
    error.actionDiagnostics = { selector, before, after: await safeActionDiagnostics(cdp, selector, point) };
    error.message += `; actionDiagnostics=${JSON.stringify(error.actionDiagnostics)}`;
    throw error;
  }
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
    active:(() => {const el=[...document.querySelectorAll('nav [aria-current="page"]')].find(${visible}); return el?.getAttribute('aria-label') || el?.textContent.trim().replace(/\\s*\\d+$/, '');})()})`;
  const actual = await waitFor(async () => {
    assertRoute(await evaluate(cdp, snapshot), expected);
    // Recheck after timers/animations: a premature match restarts bounded readiness.
    await delay(700);
    const settled = await evaluate(cdp, snapshot); assertRoute(settled, expected); return settled;
  }, `ready ${expected.path}`);
  console.log(`  URL ${actual.path}; title=${actual.title}; active=${actual.active}; mainFocus=${actual.focus}`);
}
async function readyChart(cdp) {
  const selector = 'main svg.recharts-surface';
  await waitFor(() => evaluate(cdp, `!!document.querySelector('${selector}')`), 'measured chart SVG mounted');
  await evaluate(cdp, `document.querySelector('${selector}').scrollIntoView({block:'center'})`);
  const snapshot = `(() => {
    const svg=document.querySelector('${selector}'); if (!svg) return null;
    const r=svg.getBoundingClientRect();
    return {width:Number(svg.getAttribute('width')),height:Number(svg.getAttribute('height')),
      rectWidth:r.width,rectHeight:r.height,visible:(${visible})(svg),
      inViewport:r.top>=0 && r.bottom<=innerHeight-80 && r.left>=0 && r.right<=innerWidth,
      marks:[...svg.querySelectorAll('.recharts-area-area,.recharts-rectangle')].filter(${visible}).length};
  })()`;
  const chart = await waitFor(async () => {
    const first = await evaluate(cdp, snapshot); assertChart(first);
    await delay(700);
    const settled = await evaluate(cdp, snapshot); assertChart(settled);
    for (const key of ['width', 'height', 'rectWidth', 'rectHeight']) {
      assert.equal(settled[key], first[key], `chart ${key} not settled`);
    }
    return settled;
  }, 'positive settled visible measured chart');
  console.log(`  settled chart SVG ${chart.width}x${chart.height}; visible plotted marks=${chart.marks}`);
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
// Real mounted submission -> role switch -> both teacher consumers, without reloading session memory.
async function submissionAttachments(cdp, downloads, downloadPath) {
  await ready(cdp, screen('alumno', 'aulas', 'Mis Aulas'));
  await click(cdp, 'main div.cursor-pointer:has(h3)', 'Literatura');
  await click(cdp, 'main div.cursor-pointer:has(h4)', 'Ensayo: Vanguardias Literarias');
  await waitFor(() => evaluate(cdp, '!!document.querySelector("input[type=file]")'), 'student attachment input');
  await click(cdp, 'button', 'Entregar Actividad');
  await waitFor(() => evaluate(cdp, '[...document.querySelectorAll("[role=alert]")].some(el=>el.textContent.includes("adjunta un archivo o escribe"))'), 'empty rejection');
  assert(!await evaluate(cdp, 'document.body.textContent.includes("Tu trabajo fue entregado")'));
  await evaluate(cdp, `(() => {
    const input = document.querySelector('input[type=file]');
    if (!input.multiple) throw Error('Multi-select unavailable');
    const selection = new DataTransfer();
    selection.items.add(new File([new Uint8Array([0,255,1,10])], 'Duplicado.txt', {type:'text/plain'}));
    selection.items.add(new File(['quitar'], 'Quitar.txt'));
    selection.items.add(new File(['invalid'], 'Mal.exe'));
    selection.items.add(new File([new Uint8Array(25*1024*1024+1)], 'Grande.pdf'));
    input.files = selection.files; input.dispatchEvent(new Event('change', {bubbles:true}));
  })()`);
  await waitFor(() => evaluate(cdp, '[...document.querySelectorAll("[role=alert]")].some(el=>el.textContent.includes("Formato no permitido") && el.textContent.includes("25 MB"))'), 'type and size feedback');
  await cdp.send('Page.bringToFront');
  await evaluate(cdp, `document.querySelector('button[aria-label="Quitar archivo 2: Quitar.txt"]').focus()`);
  assert.equal(await evaluate(cdp, 'document.activeElement.getAttribute("aria-label")'), 'Quitar archivo 2: Quitar.txt');
  await press(cdp, 'Enter');
  await waitFor(() => evaluate(cdp, `document.querySelectorAll('button[aria-label^="Quitar archivo"]').length===1`), 'keyboard removal');
  await evaluate(cdp, `(() => {
    const files = new DataTransfer();
    files.items.add(new File(['Segundo – ñ'], 'Duplicado.txt', {type:'text/plain'}));
    files.items.add(new File(['EPUB de prueba'], 'Lectura.EPUB', {type:'application/epub+zip'}));
    document.querySelector('[aria-label="Adjuntar archivos"]').dispatchEvent(new DragEvent('drop', {bubbles:true, cancelable:true, dataTransfer:files}));
  })()`);
  await waitFor(() => evaluate(cdp, `document.querySelectorAll('button[aria-label^="Quitar archivo"]').length===3 && !document.querySelector('[role=alert]')`), 'multi-file drop');
  await click(cdp, 'button', 'Entregar Actividad');
  await waitFor(() => evaluate(cdp, 'document.body.textContent.includes("Tu trabajo fue entregado")'), 'confirmed submission');
  await click(cdp, 'button[title="Volver al Aula"]');
  await click(cdp, 'aside button', 'Cerrar sesión');
  await ready(cdp, { path: '/' });
  await click(cdp, 'button', 'Soy Docente');
  await ready(cdp, screen('docente', 'dashboard', 'Dashboard'));
  await click(cdp, 'nav button', 'Aulas');
  await ready(cdp, screen('docente', 'aulas', 'Aulas'));
  await click(cdp, 'main div.cursor-pointer:has(h3)', 'Literatura');
  await click(cdp, 'main button', 'Actividades');
  await click(cdp, 'main div.cursor-pointer:has(h4)', 'Ensayo: Vanguardias Literarias');
  await evaluate(cdp, `(() => {
    window.attachmentURLs = {created:[], revoked:[], clicks:[], anchors:[]};
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = file => { const url = create(file); attachmentURLs.created.push(url); return url; };
    URL.revokeObjectURL = url => { attachmentURLs.revoked.push(url); revoke(url); };
    document.addEventListener('click', event => {
      const control = event.target.closest?.('button[aria-label^="Descargar archivo"]');
      if (control) attachmentURLs.clicks.push({label:control.getAttribute('aria-label'), trusted:event.isTrusted});
    }, true);
    const anchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() {
      attachmentURLs.anchors.push({href:this.href, download:this.download, connected:this.isConnected});
      return anchorClick.call(this);
    };
  })()`);
  const row = 'tr:has(ul[aria-label="Archivos de Sofía Herrera"])';
  const names = ['Duplicado.txt', 'Duplicado.txt', 'Lectura.EPUB'];
  const expectedBytes = [Buffer.from([0,255,1,10]), Buffer.from('Segundo – ñ'), Buffer.from('EPUB de prueba')];
  async function checkDownloads(scope) {
    const labels = await waitFor(async () => {
      const result = await evaluate(cdp, `[...document.querySelectorAll(${JSON.stringify(scope + ' button[aria-label^="Descargar archivo"]')})].map(el=>el.getAttribute('aria-label'))`);
      return result.length === 3 && result;
    }, 'all three teacher attachment controls');
    for (const [index, label] of labels.entries()) {
      assert(label.includes(`${index + 1}: ${names[index]}`), 'order and duplicate-name identity');
      const download = await clickDownload(cdp, downloads, `${scope} button[aria-label=${JSON.stringify(label)}]`);
      assert.equal(download.suggestedFilename, names[index]);
      assert.match(download.url, /^blob:http:\/\/127\.0\.0\.1:/);
      assert.deepEqual(await readFile(path.join(downloadPath, download.guid)), expectedBytes[index], 'Downloaded original File bytes, not submission text');
    }
  }
  await checkDownloads(row);
  await click(cdp, `${row} button`, 'Corregir entrega');
  const drawer = 'div.fixed.z-50';
  await checkDownloads(drawer);
  await click(cdp, `${drawer} button`, 'Publicar y Notificar');
  await waitFor(() => evaluate(cdp, `!document.querySelector(${JSON.stringify(drawer)})`), 'grading drawer closed');
  assert(await evaluate(cdp, `document.querySelector(${JSON.stringify(row)}).textContent.includes('Corregida')`));
  await checkDownloads(row);
  await waitFor(() => evaluate(cdp, 'attachmentURLs.revoked.length===9'), 'all download URLs revoked');
  const urls = await evaluate(cdp, 'attachmentURLs');
  assert.deepEqual(urls.revoked, urls.created);
  console.log('  mounted selection/errors/keyboard removal/drop -> teacher ordered downloads in table/drawer/after grading; 9 exact-byte downloads and URL cleanups, duplicate names preserved');
}
export async function press(cdp, key, code = key, value = key === 'Enter' ? 13 : key === 'Escape' ? 27 : 32) {
  await cdp.send('Page.bringToFront');
  const text = key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined;
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: value, nativeVirtualKeyCode: value,
    ...(text === undefined ? {} : { text, unmodifiedText: text }) });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: value, nativeVirtualKeyCode: value });
}
async function typeText(cdp, selector, text) {
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).focus()`);
  await cdp.send('Input.insertText', { text });
  await waitFor(() => evaluate(cdp, `document.querySelector(${JSON.stringify(selector)})?.value===${JSON.stringify(text)}`), 'controlled draft updated');
}
async function mobileDestinations(cdp, role) {
  const destinations = role === 'alumno'
    ? [['dashboard','Mi Dashboard'],['estudia','Carpeta de Estudio'],['aulas','Mis Aulas'],['progreso','Mi Progreso'],['mensajes','Mensajes'],['config','Configuración']]
    : [['dashboard','Dashboard'],['agenda','Agenda'],['aulas','Aulas'],['progreso','Progreso de Clase'],['copiloto','Foxy IA'],['mensajes','Mensajes'],['config','Configuración']];
  const nav = 'nav[aria-label="Navegación móvil"]', more = `${nav} button[aria-expanded]`;
  await ready(cdp, screen(role, 'dashboard', destinations[0][1]));
  // Check both floating accessibility and Más with the real mounted hit tester.
  // The open accessibility dialog intentionally blocks underlying navigation;
  // dismissal must restore it without changing the route.
  await click(cdp, 'button[aria-label="Abrir panel de accesibilidad DUA"]');
  await click(cdp, '[role="dialog"] button[aria-label="Cerrar panel"]');
  await waitFor(() => evaluate(cdp, '!document.querySelector(\'[role="dialog"]\')'), 'accessibility panel dismissed');
  await click(cdp, more); await click(cdp, more);
  assert.deepEqual(await evaluate(cdp, `[...document.querySelectorAll('${nav} button[aria-label]')].map(el=>el.getAttribute('aria-label'))`), destinations.map(([,label]) => label), 'all destinations available');
  async function bounds() {
    assert(await evaluate(cdp, `[...document.querySelectorAll('${nav} button')].filter(${visible}).every(el=>{const r=el.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1 && r.width>=44 && r.height>=44}) && document.documentElement.scrollWidth<=innerWidth`), 'mobile targets and page must not overflow horizontally');
  }
  for (const [index, [view, label]] of destinations.entries()) {
    if (index >= 5) await click(cdp, more);
    await bounds();
    await click(cdp, `${nav} button[aria-label=${JSON.stringify(label)}]`);
    await ready(cdp, { ...screen(role, view, label, index > 0), ...(index >= 5 ? { active: undefined } : {}) });
    if (view === 'progreso') await readyChart(cdp);
    assert.equal(await evaluate(cdp, `document.querySelector('${more}').getAttribute('aria-expanded')`), 'false', 'navigation closes Más');
    assert.deepEqual(await evaluate(cdp, `[...document.querySelectorAll('${nav} [aria-current="page"]')].map(el=>el.getAttribute('aria-label'))`), [label], 'exact current destination, including closed overflow');
    if (index >= 5) {
      assert(await evaluate(cdp, `document.querySelector('${more}').classList.contains('text-fox-orange')`), 'Más indicates overflow current');
      await click(cdp, more); await bounds();
      assert(await evaluate(cdp, `(${visible})(document.querySelector('${nav} [aria-current="page"]'))`), 'current overflow destination visible');
      await evaluate(cdp, `document.querySelector('${nav} [aria-current="page"]').focus()`);
      await press(cdp, 'Escape');
      assert(await evaluate(cdp, `document.activeElement===document.querySelector('${more}') && document.activeElement.getAttribute('aria-expanded')==='false'`), 'Escape closes and returns focus to Más');
    }
  }
}
async function classroomKeyboard(cdp) {
  await ready(cdp, screen('alumno', 'aulas', 'Mis Aulas'));
  await evaluate(cdp, `window.classroomPushes=0; window.classroomClicks=0; const push=history.pushState.bind(history); history.pushState=(...args)=>{classroomPushes++; return push(...args)}; document.addEventListener('click',event=>{if(event.target.closest('button[aria-label="Ingresar a Literatura · 3°A"]')) classroomClicks++})`);
  for (const [index, key] of ['Enter', ' '].entries()) {
    await cdp.send('Page.bringToFront');
    await evaluate(cdp, `(() => {const button=document.querySelector('button[aria-label="Ingresar a Literatura · 3°A"]'); button.scrollIntoView({block:'center'}); button.focus()})()`);
    const selector = 'button[aria-label="Ingresar a Literatura · 3°A"]';
    const before = await safeActionDiagnostics(cdp, selector);
    try {
      assert.equal(await evaluate(cdp, 'document.activeElement.getAttribute("aria-label")'), 'Ingresar a Literatura · 3°A');
      await press(cdp, key, key === ' ' ? 'Space' : 'Enter');
      await ready(cdp, { ...screen('alumno', 'aulas', 'Mis Aulas', true), path: '/alumno/aulas/c1' });
      assert.equal(await evaluate(cdp, 'classroomClicks'), index + 1, 'exactly one native button activation per key');
      assert.equal(await evaluate(cdp, 'classroomPushes'), index + 1, 'single keyboard activation/history entry');
    } catch (error) {
      error.actionDiagnostics = { key, before, after: await safeActionDiagnostics(cdp, selector) };
      error.message += `; actionDiagnostics=${JSON.stringify(error.actionDiagnostics)}`;
      throw error;
    }
    await evaluate(cdp, 'history.back()'); await ready(cdp, screen('alumno', 'aulas', 'Mis Aulas'));
  }
}
async function enrollment(cdp) {
  await ready(cdp, screen('alumno', 'aulas', 'Mis Aulas'));
  const cards = `document.querySelectorAll('button[aria-label^="Ingresar a "]').length`;
  const before = await evaluate(cdp, cards);
  for (const [code, toast, count] of [['HIS-SMOKE-3','Te has unido al aula de Historia Contemporánea',before+1], ['C1','Ya estás matriculado en Literatura',before+1]]) {
    await click(cdp, 'main button', 'Unirse a un Aula');
    await waitFor(() => evaluate(cdp, `!!document.querySelector('[role="dialog"]')`), 'join dialog mounted');
    await typeText(cdp, '#student-classroom-invitation-code', code);
    await click(cdp, '[role="dialog"] button', 'Unirme al Aula');
    await waitFor(() => evaluate(cdp, `!document.querySelector('[role="dialog"]') && document.body.textContent.includes(${JSON.stringify(toast)})`), 'confirmed enrollment outcome');
    assert.equal(await evaluate(cdp, cards), count, 'join adds once; duplicate adds nothing');
  }
  assert.equal(await evaluate(cdp, `document.querySelectorAll('button[aria-label="Ingresar a Historia Contemporánea · 3° Año A"]').length`), 1, 'new session membership visible');
  await click(cdp, 'main button', 'Unirse a un Aula');
  await waitFor(() => evaluate(cdp, '!!document.querySelector("#student-classroom-invitation-code")'), 'reopened join dialog');
  assert.equal(await evaluate(cdp, 'document.querySelector("#student-classroom-invitation-code").value'), '', 'confirmed join clears code');
}
async function messageLifecycle(cdp, role) {
  const route = { ...screen(role, 'mensajes', 'Mensajes'), ...(role === 'docente' ? { active: undefined } : {}), path: `/${role}/mensajes/dm-laura-valentina` };
  await ready(cdp, route);
  const textarea = 'main textarea[aria-label="Mensaje"]', text = `smoke-${role}-single-send`;
  await typeText(cdp, textarea, text);
  // Rapid DOM keyboard/click attempts against mounted controls; no replacement
  // store, callbacks, promises, or application state (not trusted OS input).
  await evaluate(cdp, `(() => {const el=document.querySelector('${textarea}'), button=document.querySelector('button[aria-label="Enviar mensaje"]'); if(!button || button.disabled) throw Error('Send control unavailable'); el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); button.click()})()`);
  const count = `[...document.querySelectorAll('main div.whitespace-pre-wrap')].filter(el=>el.textContent===${JSON.stringify(text)}).length`;
  await waitFor(() => evaluate(cdp, `${count}===1 && document.querySelector('${textarea}').value===''`), 'one message and cleared draft');
  await delay(700); assert.equal(await evaluate(cdp, count), 1, 'rapid activation never duplicates message');
  assert(await evaluate(cdp, `document.querySelector('button[aria-label="Enviar mensaje"]').disabled`), 'empty composer cannot resend');
  await typeText(cdp, textarea, 'unsent draft');
  await click(cdp, 'main button:has(svg.lucide-chevron-left)');
  await ready(cdp, { ...route, path: `/${role}/mensajes` });
  await click(cdp, 'main button:has(h4)', 'Carlos');
  await waitFor(() => evaluate(cdp, `location.pathname!==${JSON.stringify(route.path)} && document.querySelector('${textarea}')?.value===''`), 'different conversation clears unsent draft');
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
async function runMode(mode, browser, filter) {
  const profile = await mkdtemp(path.join(tmpdir(), 'foxmind-smoke-'));
  let server, chrome, browserCdp;
  const pages = new Set();
  // A single finally block owns shutdown, including interruption; no fire-and-forget kills.
  const abort = () => { interrupted = true; };
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
    const downloadPath = path.join(profile, 'downloads');
    const downloads = trackDownloads(browserCdp);
    // GUID filenames keep duplicate originals separate, solely inside our disposable profile.
    await browserCdp.send('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath, eventsEnabled: true });
    const manifest = mode === 'production' ? JSON.parse(await readFile(path.join(root, 'dist/.vite/manifest.json'), 'utf8')) : null;
    const scenarios = [];
    const add = (...args) => scenarios.push({ name: args[0], run: () => scenario(...args) });
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
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: mobileViewport || 1280, height: mobileViewport ? 740 : 900, deviceScaleFactor: 1, mobile: !!mobileViewport });
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
    if (filter !== 'readiness') {
      for (const role of ['alumno', 'docente']) add(`${role} UI/history/title/aria/focus/deep refresh`, '/', cdp => navigation(cdp, role, mode === 'dev'));
      if (mode === 'production') {
        add('student submission -> teacher all-file downloads and grading', '/alumno/aulas', cdp => submissionAttachments(cdp, downloads, downloadPath));
        add('mobile visible list/select/back/history/default inner bottom', '/alumno/mensajes', mobile, null, false, 390);
        for (const layout of [false, true]) for (const fail of [false, true]) {
          const source = layout ? 'src/components/layout/DocenteLayout.tsx' : 'src/views/docente/AgendaDocente.tsx';
          add(`${layout ? 'root layout' : 'page'} ${fail ? 'failure/reload' : 'pending/focus'}`, layout ? '/' : '/docente/dashboard', (cdp, intercept) => {
            assert(manifest[source]?.file, `Manifest missing ${source}`);
            return boundary(cdp, intercept, layout, fail);
          }, manifest[source]?.file, fail);
        }
      }
    }
    if (filter !== 'legacy') {
      for (const role of ['alumno', 'docente']) {
        for (const width of [320, 390]) add(`readiness mobile ${width} ${role} all destinations/current/overflow/Escape`, `/${role}/dashboard`, cdp => mobileDestinations(cdp, role), null, false, width);
        add(`readiness ${role} message draft/rapid duplicate`, `/${role}/mensajes/dm-laura-valentina`, cdp => messageLifecycle(cdp, role), null, false, 390);
      }
      add('readiness classroom Enter/Space single activation', '/alumno/aulas', classroomKeyboard, null, false, 390);
      add('readiness enrollment success/duplicate', '/alumno/aulas', enrollment, null, false, 390);
    }
    await runScenarios(scenarios);
  } finally {
    try {
      for (const page of pages) page.close();
      if (browserCdp) {
        try { await browserCdp.send('Browser.close'); console.log('CLEANUP Browser.close: acknowledged (not descendant-tree proof)'); }
        catch (error) { console.log(`CLEANUP Browser.close: ${JSON.stringify(errorDetails(error))}`); }
        finally { browserCdp.close(); }
      }
      await cleanupOwnedResources({ browser: chrome, server, executable: browser, profile, graceful: !!browserCdp });
    } finally {
      process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort);
    }
  }
}
export async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log('Usage: node scripts/frontend-navigation-smoke.mjs [--mode=production|dev|all] [--filter=readiness|legacy|all]\nRequires Node >=22, installed Chrome/Edge, installed project dependencies and npm run build for production. Set FOXMINDBROWSER to an executable path. npm run test:browser builds first.\nFilter readiness: both modes run mobile 320/390 all destinations/current/overflow/Escape, classroom Enter/Space, enrollment success/duplicate and messaging draft/rapid duplicate. Filter legacy: original checks only. Default all: production role navigation/history/refresh/title/aria/focus, student-to-teacher attachment downloads, mobile messaging and manifest-selected lazy page/root pending/failure/reload; dev mounted StrictMode role/screen effects. Loopback only; disposable profile and byte-checked attachment downloads; no screenshots, external uploads or browser installation.'); return;
  }
  requireRuntime();
  const { mode, filter } = smokeOptions(args);
  const browser = await locateBrowser();
  if (mode !== 'dev') {
    try { await access(path.join(root, 'dist/index.html')); await access(path.join(root, 'dist/.vite/manifest.json')); }
    catch { throw Error('Production dist/manifest missing. Run npm run build first, or use npm run test:browser.'); }
  }
  let failed = false;
  for (const current of mode === 'all' ? ['production', 'dev'] : [mode]) {
    if (interrupted) break;
    try { await runMode(current, browser, filter); } catch (error) { failed = true; console.error(`FAIL ${current}: ${error.message}`); }
  }
  assert(!failed && !interrupted, 'Browser smoke failed/interrupted (see named scenarios above)');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
