import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { transactionDatabase } from '../../../../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const create = async options => { const api = await import('./index.ts'); assert.equal(typeof api.createFoxyUnitOfWork, 'function'); return api.createFoxyUnitOfWork(options); };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('teacher identity is checked before lock, after lock and after operation; lock mode follows write', async () => {
  for (const write of [false, true]) {
    const id = randomUUID(), request = { headers: {} }, calls = [];
    const database = { $transaction: async fn => fn({ $queryRawUnsafe: async (sql, ...args) => {
      calls.push(['sql', sql, ...args]); return [{ id, account_role: 'teacher', email_verified_at: new Date() }]; } }) };
    const authenticate = async (tx, req, flag) => { calls.push(['auth', tx, req, flag]); return id; };
    const uow = await create({ database, authenticate });
    assert.equal(await uow.run(request, write, async (tx, actor) => { calls.push(['operation', tx]); assert.equal(actor.id, id); assert.equal(actor.accountRole, 'teacher'); assert.ok(actor.now instanceof Date); return 'ok'; }), 'ok');
    const names = calls.map(c => c[0]), locks = calls.filter(c => c[0] === 'sql' && /\busers\b/iu.test(c[1]));
    assert.equal(locks.length, 1); assert.match(locks[0][1], write ? /FOR UPDATE/iu : /FOR SHARE/iu);
    assert.deepEqual(names.filter(x => x !== 'sql'), ['auth', 'auth', 'operation', 'auth']);
    assert.ok(names.indexOf('auth') < names.indexOf('sql') && names.lastIndexOf('auth') > names.indexOf('operation'));
    for (const call of calls.filter(c => c[0] === 'auth')) { assert.equal(call[2], request); assert.equal(call[3], write); }
  }
});

test('student, unverified teacher and authentication failures never execute the operation', async () => {
  for (const variant of ['student', 'unverified', 'ORIGIN_NOT_ALLOWED', 'CSRF_INVALID', 'AUTH_REQUIRED']) {
    const id = randomUUID(); let ran = false;
    const database = { $transaction: async fn => fn({ $queryRawUnsafe: async () => [{ id,
      account_role: variant === 'student' ? 'student' : 'teacher', email_verified_at: variant === 'unverified' ? null : new Date() }] }) };
    const authenticate = async () => { if (['ORIGIN_NOT_ALLOWED', 'CSRF_INVALID', 'AUTH_REQUIRED'].includes(variant)) throw Object.assign(Error(variant), { code: variant }); return id; };
    const uow = await create({ database, authenticate });
    await assert.rejects(uow.run({}, true, async () => { ran = true; })); assert.equal(ran, false, variant);
  }
});

test('revoked or substituted session after lock and before commit is rejected', async () => {
  for (const changedAt of [2, 3]) {
    const id = randomUUID(); let count = 0, ran = false;
    const database = { $transaction: async fn => fn({ $queryRawUnsafe: async () => [{ id, account_role: 'teacher', email_verified_at: new Date() }] }) };
    const uow = await create({ database, authenticate: async () => ++count === changedAt ? randomUUID() : id });
    await assert.rejects(uow.run({}, true, async () => { ran = true; })); assert.equal(ran, changedAt === 3);
  }
});

test('real PostgreSQL lock wait rechecks a revoked session before invoking operation', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const query = async (sql, ...args) => (await pool.query(sql, args)).rows, f = await homeFixture(query);
    const entered = deferred(); let revoked = false, ran = false;
    const database = transactionDatabase(pool), uow = await create({ database, authenticate: async () => { entered.resolve();
      if (revoked) throw Object.assign(Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' }); return f.teacherActor; } });
    const conn = await pool.connect();
    try {
      await conn.query('BEGIN'); await conn.query('SELECT id FROM users WHERE id=$1::uuid FOR UPDATE', [f.teacherActor]);
      const running = uow.run({}, true, async () => { ran = true; }); await entered.promise;
      revoked = true; await conn.query('COMMIT'); await assert.rejects(running); assert.equal(ran, false);
    } finally { await conn.query('ROLLBACK'); conn.release(); }
  });
});

test('unexpected driver failure is sanitized while allowed domain codes survive', async () => {
  const id = randomUUID(), secret = 'sensitive synthetic driver detail';
  const database = { $transaction: async () => { throw Object.assign(Error(secret), { code: 'XX000', detail: secret }); } };
  const uow = await create({ database, authenticate: async () => id });
  await assert.rejects(uow.run({}, true, async () => {}), error => {
    assert.equal(error.code, 'SERVICE_UNAVAILABLE');
    assert.equal(String(error.message).includes(secret), false); assert.equal(JSON.stringify(error).includes(secret), false); return true;
  });
  for (const code of ['FORBIDDEN', 'CONFLICT', 'CSRF_INVALID', 'ORIGIN_NOT_ALLOWED', 'AUTH_REQUIRED']) {
    const domainError = Object.assign(Error(code), { code });
    const domain = await create({ database: { $transaction: async () => { throw domainError; } }, authenticate: async () => id });
    await assert.rejects(domain.run({}, true, async () => {}), error => error.code === code);
  }
});

test('driver failure after a write rolls back and does not reveal SQL detail', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const query = async (sql, ...args) => (await pool.query(sql, args)).rows, f = await homeFixture(query);
    const uow = await create({ database: transactionDatabase(pool), authenticate: async () => f.teacherActor });
    const [before] = await query('SELECT name FROM classrooms WHERE id=$1::uuid', f.rooms.teach.id);
    let caught; try { await uow.run({}, true, async tx => {
      await tx.query("UPDATE classrooms SET name='synthetic changed' WHERE id=$1::uuid", f.rooms.teach.id);
      await tx.query('SELECT nonexistent_synthetic_secret_column FROM users');
    }); } catch (error) { caught = error; }
    const [after] = await query('SELECT name FROM classrooms WHERE id=$1::uuid', f.rooms.teach.id); assert.equal(after.name, before.name);
    assert.equal(caught?.code, 'SERVICE_UNAVAILABLE'); assert.equal(String(caught?.message).includes('nonexistent_synthetic_secret_column'), false);
  });
});
