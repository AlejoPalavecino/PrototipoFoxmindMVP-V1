const TYPES = new Set(['QUESTIONNAIRE', 'EVALUATION', 'ASSIGNMENT', 'setup']);
const STAGES = new Set(['bootstrap', 'setup', 'originalstart', 'grading', 'publication', 'reopen', 'transfer',
  'answer', 'save', 'submit', 'upload', 'refresh', 'restart', 'confirm', 'retry', 'fixture', 'start']);
const CODES = new Set(['RATE_LIMITED', 'AUTH_REQUIRED', 'CSRF_INVALID', 'CONFLICT',
  'FORBIDDEN', 'SERVICE_UNAVAILABLE', 'INVALID_INPUT']);
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export function watchResponse(page, predicate, timeoutMs, timers = { set: setTimeout, clear: clearTimeout }) {
  let finish, active = true, timer;
  const promise = new Promise(resolve => { finish = resolve; });
  const settle = result => {
    if (!active) return;
    active = false;
    timers.clear(timer);
    page.off('response', listener);
    finish(result);
  };
  const listener = response => {
    try { if (predicate(response)) settle({ response }); }
    catch (error) { settle({ error }); }
  };
  page.on('response', listener);
  timer = timers.set(() => settle({ error: new Error('Expected response within the existing UI deadline') }), timeoutMs);
  return {
    async value() {
      const result = await promise;
      if (result.error) throw result.error;
      return result.response;
    },
    dispose() { settle({ error: new Error('Response watcher disposed') }); },
  };
}

function operationFor(path, method) {
  if (path === '/api/v1/auth/csrf') return 'csrf';
  if (/\/session\/?$/.test(path)) return 'session';
  for (const op of ['transfer', 'answer', 'submit-answers', 'submit-practical']) {
    if (path.endsWith(`/${op}`)) return op;
  }
  if (path === '/api/v1/files' && method === 'POST') return 'allocate';
  if (/^\/api\/v1\/files\/[^/]+\/content\/?$/.test(path)) return 'content';
  if (/^\/api\/v1\/classrooms\/[^/]+\/?$/.test(path)) return 'classroom';
  if (/^\/api\/v1\/classrooms\/[^/]+\/activities\/?$/.test(path)) return 'activities';
  if (path.startsWith('/api/v1/auth/')) return 'identity';
  return 'other-api';
}

function emptyCounts() { return { total: 0, byActor: { teacher: 0, student: 0 } }; }
function increment(counts, actor) { counts.total++; counts.byActor[actor]++; }
function requestPath(request) {
  try { return new URL(request.url()).pathname; } catch { return ''; }
}
function retryAfter(response) {
  const value = response.headers()['retry-after'];
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}
async function projectResponse(response, info, now) {
  const status = response.status();
  let code = null;
  if (status >= 400) {
    try {
      const body = await response.json();
      if (CODES.has(body?.error?.code)) code = body.error.code;
    } catch { /* Non-JSON errors have no exposed code. */ }
  }
  return { actor: info.actor, type: info.type, stage: info.stage, operation: info.operation,
    method: info.method, status, code, retryAfter: retryAfter(response), elapsedMs: info.elapsedMs ?? now() - info.time };
}

class JourneyObserver {
  constructor(pages, now) {
    this.now = now;
    this.stages = { teacher: { type: null, stage: null }, student: { type: null, stage: null } };
    this.requests = new WeakMap();
    this.counts = emptyCounts();
    this.recent = [];
    this.rows = [];
    this.pending = new Set();
    this.listeners = [];
    for (const actor of ['teacher', 'student']) this.subscribe(pages[actor], actor);
  }
  subscribe(page, actor) {
    const request = value => this.onRequest(actor, value);
    const response = value => this.onResponse(value);
    page.on('request', request);
    page.on('response', response);
    this.listeners.push({ page, request, response });
  }
  onRequest(actor, request) {
    const path = requestPath(request);
    if (!path.startsWith('/api/v1/')) return;
    const rawMethod = request.method();
    const method = METHODS.has(rawMethod) ? rawMethod : 'OTHER';
    const info = { actor, ...this.stages[actor], operation: operationFor(path, method), method, time: this.now() };
    this.requests.set(request, info);
    increment(this.counts, actor);
    this.recent.push({ actor, time: info.time });
  }
  onResponse(response) {
    const info = this.requests.get(response.request());
    if (!info) return;
    this.requests.delete(response.request());
    info.elapsedMs = this.now() - info.time;
    const task = projectResponse(response, info, this.now).then(row => this.rows.push(row)).catch(() => {});
    this.pending.add(task);
    task.finally(() => this.pending.delete(task));
  }
  setStage(actor, type, stage) {
    if (!Object.hasOwn(this.stages, actor)) return;
    this.stages[actor] = { type: TYPES.has(type) ? type : null, stage: STAGES.has(stage) ? stage : null };
  }
  async drain() { await Promise.all([...this.pending]); }
  async snapshot() {
    await this.drain();
    const last60s = emptyCounts(), cutoff = this.now() - 60000;
    while (this.recent.length && this.recent[0].time <= cutoff) this.recent.shift();
    for (const entry of this.recent) increment(last60s, entry.actor);
    return { rows: this.rows.map(row => ({ ...row })),
      counts: { total: this.counts.total, byActor: { ...this.counts.byActor }, last60s } };
  }
  async close() {
    for (const { page, request, response } of this.listeners) {
      page.off('request', request);
      page.off('response', response);
    }
    await this.drain();
  }
}

export function createJourneyObserver(pages, { now = Date.now } = {}) {
  return new JourneyObserver(pages, now);
}
