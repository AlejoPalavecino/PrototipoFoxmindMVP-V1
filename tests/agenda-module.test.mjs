import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const infrastructure = 'apps/api/src/modules/agenda/events/infrastructure/unit-of-work.ts';
function fixture({ identities, verified = true } = {}) {
  const owner = randomUUID(), calls = [], raw = { async $queryRawUnsafe(sql, ...values) {
    calls.push(['query', sql, values]);
    return sql.includes('email_verified_at') ? [{ email_verified_at: verified ? new Date() : null }]
      : [{ now: new Date('2026-11-10T12:00:00.000Z') }];
  } };
  let remaining = identities ? [...identities] : null;
  const database = { async $transaction(operation, options) {
    calls.push(['transaction', options]); return operation(raw);
  } };
  const authenticate = async (tx, request, write) => {
    calls.push(['authenticate', tx, request, write]); return remaining ? remaining.shift() : owner;
  };
  const academic = { list: async () => [], upcoming: async () => [], resolveTarget: async () => null };
  const factory = (tx, actor) => { calls.push(['academic', tx, actor]); return academic; };
  const { createAgendaUnitOfWork } = loadTsModule(infrastructure);
  return { owner, calls, academic, uow: createAgendaUnitOfWork(database, authenticate, factory) };
}

test('modern Agenda UOW injects academic projection with the transaction query and actor', async () => {
  const f = fixture(), request = { synthetic: true };
  const result = await f.uow.run(request, true, async unit => {
    assert.equal(unit.academic, f.academic);
    const factory = f.calls.find(call => call[0] === 'academic');
    assert.equal(factory[1], f.calls.find(call => call[0] === 'authenticate')[1]);
    assert.equal(factory[2], unit.actor);
    assert.deepEqual(unit.actor, { userId: f.owner, now: '2026-11-10T12:00:00.000Z' });
    return 'committed';
  });
  assert.equal(result, 'committed');
  assert.deepEqual(f.calls[0], ['transaction', { maxWait: 2000, timeout: 6000 }]);
  assert.equal(f.calls.filter(call => call[0] === 'authenticate').length, 3);
  assert.match(f.calls.find(call => call[0] === 'query')[1], /FOR UPDATE/);
});

test('modern Agenda read keeps shared lock and blocks unverified actors before factory use', async () => {
  const f = fixture();
  await f.uow.run({}, false, async () => undefined);
  assert.match(f.calls.find(call => call[0] === 'query')[1], /FOR SHARE/);
  const denied = fixture({ verified: false });
  await assert.rejects(denied.uow.run({}, true, async () => assert.fail('must not execute')), { code: 'FORBIDDEN' });
  assert.equal(denied.calls.some(call => call[0] === 'academic'), false);
});

test('modern Agenda reauthenticates after lock and operation and retains safe errors', async () => {
  const owner = randomUUID();
  for (const identities of [[owner, randomUUID()], [owner, owner, randomUUID()]]) {
    const f = fixture({ identities });
    await assert.rejects(f.uow.run({}, true, async () => undefined), { code: 'FORBIDDEN' });
  }
  const f = fixture(), safe = Object.assign(new Error('csrf'), { code: 'CSRF_INVALID' });
  await assert.rejects(f.uow.run({}, true, async () => { throw safe; }), error => error === safe);
  await assert.rejects(f.uow.run({}, true, async () => { throw new Error('private failure'); }), { code: 'SERVICE_UNAVAILABLE' });
});

test('modern Agenda public surface excludes infrastructure and presentation and has no Aulas dependency', () => {
  const api = loadTsModule('apps/api/src/modules/agenda/public.ts');
  assert.deepEqual(Object.keys(api).sort(), ['AgendaService', 'createAgendaService']);
  const source = readFileSync(infrastructure, 'utf8');
  assert.doesNotMatch(source, /classrooms|createAcademicAgenda/);
  assert.match(source, /createAcademic: AcademicAgendaFactory/);
  for (const capability of ['events', 'academic-projection']) {
    const root = `apps/api/src/modules/agenda/${capability}`;
    const files = readdirSync(root, { recursive: true }).filter(file => file.endsWith('.ts'));
    assert.ok(files.length, `${capability} must have inspected source files`);
    for (const file of files) {
      assert.doesNotMatch(readFileSync(`${root}/${file}`, 'utf8'), /core\/domain\/index\.ts/);
    }
  }
});
