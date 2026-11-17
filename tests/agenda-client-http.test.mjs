import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const now = '2026-10-23T12:00:00.000Z';
const range = { startDate: '2026-11-01', endDateExclusive: '2026-12-01', timeZone: 'UTC' };
const payload = { title: ' Clase privada ', description: '<b>Texto propio</b>', category: 'CLASS', color: 'ORANGE',
  schedule: { kind: 'ALL_DAY', startDate: '2026-11-02', endDateExclusive: '2026-11-03' },
  repeat: { kind: 'WEEKLY', untilDate: '2026-11-16' } };
const { createWebAgendaClient } = loadTsModule('apps/web/src/application/clients/agenda-client.ts');
const { AgendaClientError } = loadTsModule('apps/web/src/features/agenda/api/api.ts');
const { createAgendaService } = loadTsModule('apps/api/src/modules/agenda/public.ts');
// Keep real identity error classes shared across the source loader's isolated module caches.
const securityErrors = loadTsModule('apps/api/src/modules/identity/domain/security/errors.ts');
const identityErrors = loadTsModule('apps/api/src/modules/identity/domain/errors.ts', {
  stubs: { './security/errors.ts': securityErrors },
});
const { installAgendaTransport } = loadTsModule('apps/api/src/bootstrap/agenda-transport.ts', {
  stubs: { '../modules/identity/domain/errors.ts': identityErrors },
});
const { installIdentityTransport, readSessionCookie } = loadTsModule('apps/api/src/modules/identity/presentation/transport.ts', {
  stubs: { '../domain/errors.ts': identityErrors },
});
const { readIdentityConfiguration } = loadTsModule('apps/api/src/modules/identity/infrastructure/security/configuration.ts', {
  stubs: { '../../domain/security/errors.ts': securityErrors },
});
const { AgendaError } = loadTsModule('src/core/domain/agenda/index.ts');

async function fixture(run) {
  const origin = 'http://127.0.0.1:3000', rows = new Map(), sessions = new Map(), wire = [], notices = [];
  const security = readIdentityConfiguration({ APP_ORIGIN: origin, AUTH_LOCAL_HTTP: 'true',
    AUTH_CSRF_HMAC_KEY: randomBytes(32).toString('base64url'),
    AUTH_ABUSE_HMAC_KEY: randomBytes(32).toString('base64url') }, '127.0.0.1');
  const [owner, foreign, unverified] = [true, true, false].map(verified => {
    const verifier = randomBytes(32).toString('base64url');
    const actor = { verifier, user: { id: randomUUID(), email_verified_at: verified ? new Date(now) : null } };
    sessions.set(verifier, actor); return actor;
  });
  const runtime = { configuration: { security }, store: { authenticate: async verifier => sessions.get(verifier) ?? null },
    async generalAdmission() {} };
  const target = { classroomId: randomUUID(), activityId: randomUUID() };
  const deadline = { kind: 'ACADEMIC_DEADLINE', id: randomUUID(), target, classroomName: 'Aula sintética',
    title: 'Entrega', activityType: 'ASSIGNMENT', role: 'student', deadlineAt: '2026-11-03T12:00:00.000Z',
    timeZone: 'UTC', pending: true, resubmission: false };
  let targetAvailable = true;
  // Same owner-scoped in-memory repository/UoW convention as agenda-events.test.mjs.
  // Only ports are faked: request serialization, admission and validators remain production code.
  const uow = { async run(request, _write, operation) {
    const actor = await runtime.store.authenticate(readSessionCookie(request.headers.cookie).verifier);
    const get = id => {
      const event = rows.get(id);
      return event?.owner === actor.user.id ? structuredClone(event.value) : null;
    };
    const current = (id, revision) => {
      const event = get(id);
      if (!event) throw new AgendaError('FORBIDDEN');
      if (event.revision !== revision) throw new AgendaError('CONFLICT');
      return event;
    };
    return operation({ actor: { userId: actor.user.id, now }, events: {
      async get(id) { return get(id); },
      async list() { return [...rows.keys()].map(get).filter(Boolean); },
      async create(id, input) {
        if (rows.has(id)) throw new AgendaError('CONFLICT');
        const value = { ...structuredClone(input), id, revision: '0', createdAt: now, updatedAt: now };
        rows.set(id, { owner: actor.user.id, value }); return get(id);
      },
      async replace(id, revision, input) {
        const previous = current(id, revision);
        const value = { ...structuredClone(input), id, revision: String(BigInt(revision) + 1n),
          createdAt: previous.createdAt, updatedAt: now };
        rows.set(id, { owner: actor.user.id, value }); return get(id);
      },
      async remove(id, revision) { current(id, revision); rows.delete(id); },
    }, academic: {
      async list() { return []; },
      async upcoming(limit) { assert.equal(limit, 1); return actor === owner ? [deadline] : []; },
      async resolveTarget(input) {
        assert.deepEqual(input, target);
        return actor === owner && targetAvailable ? target : null;
      },
    } });
  } };
  // Minimal Node mount adapter for the installers' public app.use contract (no Nest build/DB).
  const middleware = [], app = { use(path, handler) {
    middleware.push(typeof path === 'function' ? { path: '', handler: path } : { path, handler });
  } };
  installIdentityTransport(app, runtime);
  installAgendaTransport(app, runtime, createAgendaService(uow));
  const server = createServer((request, response) => {
    let index = 0;
    const next = () => {
      const layer = middleware[index++];
      if (!layer) { response.statusCode = 404; response.end(); return; }
      if (layer.path && !request.url.startsWith(layer.path + '/')) { next(); return; }
      const previous = request.url;
      request.url = request.url.slice(layer.path.length);
      layer.handler(request, response, () => { request.url = previous; next(); });
    };
    next();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const client = (actor, overrides = {}) => createWebAgendaClient(async (path, init) => {
    // Node fetch supplies only browser ambient origin/cookie; client helpers own body/CSRF.
    const headers = new Headers(init.headers);
    headers.set('origin', origin);
    if (actor) headers.set('cookie', `foxmind_session=${actor.verifier}`);
    for (const [key, value] of Object.entries(overrides)) headers.set(key, value);
    const response = await fetch(new URL(path, base), { ...init, headers });
    wire.push({ path, method: init.method ?? 'GET', status: response.status, body: await response.clone().text() });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return response;
  }, code => notices.push(code));
  try { await run({ api: client(owner), client, owner, foreign, unverified, wire, notices, target, deadline,
    revokeTarget: () => { targetAvailable = false; } }); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

async function rejected(f, operation, status, code) {
  const start = f.wire.length;
  await assert.rejects(operation(), error => {
    assert.equal(error.code, code); assert.equal(error.status, status);
    // loadTsModule has per-load class identity; compare the public error message contract too.
    assert.equal(error.message, new AgendaClientError(code, status).message);
    return true;
  });
  const responses = f.wire.slice(start).filter(call => call.path.startsWith('/api/v1/agenda'));
  assert.equal(responses.length, 1, 'one business request, no implicit retry');
  assert.equal(responses[0].status, status);
  assert.deepEqual(JSON.parse(responses[0].body), { error: { code } });
}

async function unchanged(api, id, event, page) {
  assert.deepEqual(await api.get(id), event, 'rejected input preserves payload, timestamps and revision');
  assert.deepEqual(await api.list(range), page, 'rejected input preserves visible collection/count');
}

test('real Agenda client and installed HTTP agree on CRUD, normalized payloads, string revisions and empty 204', async () => fixture(async f => {
  const id = randomUUID(), first = await f.api.put(id, payload);
  const expected = { ...payload, title: 'Clase privada', id, revision: '0', createdAt: now, updatedAt: now };
  assert.deepEqual(first, expected); assert.equal(f.wire.at(-1).status, 201);
  assert.deepEqual(await f.api.put(id, payload), first); assert.equal(f.wire.at(-1).status, 200);
  assert.deepEqual(await f.api.get(id), first); assert.equal(f.wire.at(-1).status, 200);
  const page = await f.api.list(range);
  assert.equal(f.wire.at(-1).status, 200);
  assert.equal(page.serverTime, now); assert.equal(page.nextCursor, null); assert.equal(page.items.length, 3);
  assert.ok(page.items.every(item => item.kind === 'PRIVATE_EVENT' && item.event.revision === '0'));
  assert.deepEqual(page.items.map(item => item.startDate), ['2026-11-02', '2026-11-09', '2026-11-16']);
  const changed = { title: 'Evaluación', description: '', category: 'EVALUATION',
    schedule: { kind: 'TIMED', timeZone: 'America/Argentina/Buenos_Aires',
      startLocal: '2026-11-04T10:00', endLocal: '2026-11-04T11:00' }, repeat: { kind: 'NONE' } };
  const updated = await f.api.replace(id, first.revision, changed);
  assert.equal(f.wire.at(-1).status, 200);
  assert.deepEqual(updated, { ...changed, id, revision: '1', createdAt: now, updatedAt: now });
  assert.equal(Object.hasOwn(updated, 'color'), false);
  assert.deepEqual(await f.api.get(id), updated); assert.equal(f.wire.at(-1).status, 200);
  const timed = await f.api.list(range);
  assert.equal(f.wire.at(-1).status, 200);
  assert.equal(timed.items.length, 1); assert.deepEqual(timed.items[0].event, updated);
  assert.equal(timed.items[0].startAt, '2026-11-04T13:00:00.000Z');
  assert.equal(await f.api.remove(id, updated.revision), undefined);
  assert.deepEqual(f.wire.at(-1), { path: `/api/v1/agenda/events/${id}`, method: 'DELETE', status: 204, body: '' });
  assert.deepEqual(await f.api.list(range), { serverTime: now, items: [], nextCursor: null });
  await rejected(f, () => f.api.get(id), 403, 'FORBIDDEN');
}));

test('real Agenda client preserves conflict/validation errors and rejected requests cannot change state or revision', async () => fixture(async f => {
  const id = randomUUID();
  await f.api.put(id, payload);
  const changed = { ...payload, title: 'Versión guardada', category: 'ACTIVITY' };
  const saved = await f.api.replace(id, '0', changed), page = await f.api.list(range);
  for (const operation of [() => f.api.put(id, payload), () => f.api.replace(id, '0', payload), () => f.api.remove(id, '0')]) {
    await rejected(f, operation, 409, 'CONFLICT');
    await unchanged(f.api, id, saved, page);
  }
  for (const revision of [0, '-1', '1.5']) for (const operation of [
    () => f.api.replace(id, revision, payload), () => f.api.remove(id, revision),
  ]) {
    await rejected(f, operation, 400, 'INVALID_INPUT');
    await unchanged(f.api, id, saved, page);
  }
  for (const invalid of [{ ...payload, title: '' }, { ...payload, ownerId: f.owner.user.id },
    { ...payload, color: 'AUTO' }, { ...payload, schedule: { ...payload.schedule, startDate: '2026-02-30' } }]) {
    await rejected(f, () => f.api.put(id, invalid), 400, 'INVALID_INPUT');
    await unchanged(f.api, id, saved, page);
    await rejected(f, () => f.api.replace(id, saved.revision, invalid), 400, 'INVALID_INPUT');
    await unchanged(f.api, id, saved, page);
  }
  assert.deepEqual(f.notices, []);
}));

test('real Agenda admission and client preserve auth/verification/owner/Origin/CSRF errors without mutation', async () => fixture(async f => {
  const id = randomUUID(), saved = await f.api.put(id, payload), page = await f.api.list(range);
  const other = f.client(f.foreign);
  for (const candidate of [id, randomUUID()]) for (const operation of [
    () => other.get(candidate), () => other.replace(candidate, '0', payload), () => other.remove(candidate, '0'),
  ]) {
    await rejected(f, operation, 403, 'FORBIDDEN');
    await unchanged(f.api, id, saved, page);
    assert.deepEqual(await other.list(range), { serverTime: now, items: [], nextCursor: null });
  }
  await rejected(f, () => f.client(null).list(range), 401, 'AUTH_REQUIRED');
  await unchanged(f.api, id, saved, page);
  await rejected(f, () => f.client(f.unverified).list(range), 403, 'EMAIL_VERIFICATION_REQUIRED');
  await unchanged(f.api, id, saved, page);
  await rejected(f, () => f.client(f.unverified).put(randomUUID(), payload), 403, 'EMAIL_VERIFICATION_REQUIRED');
  await unchanged(f.api, id, saved, page);
  for (const [overrides, code] of [[{ origin: 'http://evil.test' }, 'ORIGIN_NOT_ALLOWED'],
    [{ 'x-csrf-token': randomBytes(32).toString('base64url') }, 'CSRF_INVALID'],
    [{ 'x-csrf-token': '' }, 'CSRF_INVALID']]) {
    const denied = f.client(f.owner, overrides);
    for (const operation of [() => denied.put(randomUUID(), payload), () => denied.replace(id, '0', payload),
      () => denied.remove(id, '0'), () => denied.open(f.target)]) {
      await rejected(f, operation, 403, code);
      await unchanged(f.api, id, saved, page);
    }
  }
  assert.deepEqual(f.notices, ['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED']);
}));

test('real Agenda client reads academic envelopes and opening reauthorizes the target', async () => fixture(async f => {
  assert.deepEqual(await f.api.upcoming(1), { serverTime: now, items: [f.deadline] });
  assert.equal(f.wire.at(-1).status, 200);
  assert.deepEqual(await f.api.open(f.target), f.target); assert.equal(f.wire.at(-1).status, 200);
  const empty = await f.api.list(range);
  f.revokeTarget();
  await rejected(f, () => f.api.open(f.target), 403, 'FORBIDDEN');
  await rejected(f, () => f.client(f.foreign).open(f.target), 403, 'FORBIDDEN');
  await rejected(f, () => f.api.upcoming(0), 400, 'INVALID_INPUT');
  assert.deepEqual(await f.api.list(range), empty);
}));
