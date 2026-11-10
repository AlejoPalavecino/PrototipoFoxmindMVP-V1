import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomeService } from '../apps/api/src/modules/home/application/service.ts';

const names = ['pending', 'review', 'feedback', 'agenda', 'queries', 'materials', 'classrooms', 'drafts', 'submitted'];
const actor = { userId: '11111111-1111-4111-8111-111111111111', now: '2026-10-25T12:00:00.000Z' };
const query = { timeZone: 'UTC' };
const empty = () => ({ status: 'ready', items: [], totalItems: 0, nextCursor: null });
function fixture() {
  const calls = [], pages = Object.fromEntries(names.map(name => [name, empty()]));
  const participation = { participation: 'mixed', memberships: { study: 1, teach: 1, archived: 2 }, setup: { drafts: 2, invitations: 1 } };
  const unit = { actor, read: {
    async participation() { calls.push(['participation']); return structuredClone(participation); },
    async page(module, input) { calls.push(['page', module, input]); return structuredClone(pages[module]); },
  } };
  const uow = { async run(request, write, operation) { calls.push(['run', request, write]); return operation(unit); } };
  return { calls, pages, participation, uow, unit };
}
const service = uow => createHomeService(uow);

test('D9 Home reads actor and clock from one read-only unit, participation first, without client authority', async () => {
  const f = fixture(), request = { session: 'opaque-test-request' }, result = await service(f.uow).read(request, query);
  assert.deepEqual(f.calls[0], ['run', request, false]);
  assert.deepEqual(f.calls[1], ['participation']);
  assert.equal(f.calls.filter(([type]) => type === 'run').length, 1);
  assert.equal(result.version, 1); assert.equal(result.subjectId, actor.userId); assert.equal(result.generatedAt, actor.now);
  assert.equal(result.timeZone, 'UTC'); assert.equal(result.participation, 'mixed');
  assert.deepEqual(result.memberships, f.participation.memberships); assert.deepEqual(result.setup, f.participation.setup);
  assert.deepEqual(Object.keys(result.modules).sort(), [...names].sort());
  for (const name of names) assert.deepEqual(result.modules[name], empty());
  assert.ok(f.calls.filter(([type]) => type === 'page').every(([, , input]) => input.timeZone === 'UTC' && input.cursor === null));
});

test('D9 malformed aggregate/page input is rejected before any authentication or database operation', async () => {
  const f = fixture(), home = service(f.uow);
  for (const input of [{ timeZone: 'Fake/Zone' }, { ...query, role: 'teacher' }, { ...query, userId: actor.userId }])
    await assert.rejects(home.read({}, input), { code: 'INVALID_INPUT' });
  for (const input of [{ ...query, module: 'unknown', cursor: null }, { ...query, module: 'pending', cursor: 'x'.repeat(2049) },
    { ...query, module: 'pending', cursor: null, offset: 1 }])
    await assert.rejects(home.page({}, input), { code: 'INVALID_INPUT' });
  assert.deepEqual(f.calls, []);
});

test('D9 widget error stays distinct from an empty queue and does not remove other successful modules', async () => {
  const f = fixture(); f.pages.review = { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true };
  const result = await service(f.uow).read({}, query);
  assert.deepEqual(result.modules.review, f.pages.review);
  for (const name of names.filter(name => name !== 'review')) assert.deepEqual(result.modules[name], empty());
  assert.equal(result.participation, 'mixed');
  assert.equal(Object.hasOwn(result.modules.review, 'items'), false);
});

test('D9 unverifiable participation and identity failures remain global and never turn into false none/empty', async () => {
  for (const code of ['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'SERVICE_UNAVAILABLE']) {
    const f = fixture(), failure = Object.assign(new Error(code), { code });
    if (code === 'SERVICE_UNAVAILABLE') f.unit.read.participation = async () => { throw failure; };
    else f.uow.run = async () => { throw failure; };
    await assert.rejects(service(f.uow).read({}, query), error => error === failure);
    assert.equal(f.calls.filter(([type]) => type === 'page').length, 0);
  }
});

test('D9 module retry uses the same typed module/zone/cursor and preserves server subject/time', async () => {
  const f = fixture(), input = { timeZone: 'America/Argentina/Buenos_Aires', module: 'materials', cursor: 'opaque.signed_cursor' };
  const result = await service(f.uow).page({}, input);
  assert.equal(result.subjectId, actor.userId); assert.equal(result.generatedAt, actor.now);
  assert.equal(result.module, 'materials'); assert.deepEqual(result.page, empty());
  assert.deepEqual(f.calls.filter(([type]) => type === 'page'), [['page', 'materials', input]]);
  assert.equal(f.calls.filter(([type]) => type === 'run').length, 1);
  assert.equal(f.calls.find(([type]) => type === 'run')[2], false);
});

test('D9 projections execute sequentially instead of unbounded parallel fan-out', async () => {
  const f = fixture(); let active = 0, peak = 0;
  f.unit.read.page = async name => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setImmediate(resolve)); active--; return f.pages[name];
  };
  await service(f.uow).read({}, query);
  assert.equal(peak, 1); assert.equal(active, 0);
});
