import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { createAgendaDatabaseFixture, withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const migration = '202611160001_ai_execution_profiles';
const { initializeAiExecutionPolicy } = loadTsModule('apps/api/src/platform/ai/execution-policy.ts');
const { snapshotForTask, configurationForJob } = loadTsModule('apps/api/src/platform/ai/execution-snapshot.ts');
const { reserveAiTextBudget, settleAiTextBudget } = loadTsModule('apps/api/src/platform/ai/text-budget.ts');
const configuration = () => ({ backend: 'gemini-developer', model: 'synthetic-gemini', apiKey: 'synthetic-never-persist',
  maxInputTokens: 1000, maxOutputTokens: 100, deadlineMs: 5000, maxConcurrency: 2, maxDispatches: 1, maxJobAgeMs: 60000,
  inputUsdPerMillion: 1, outputUsdPerMillion: 1, dailyBudgetUsd: 10, dailyActorRequests: 100, dailyGlobalRequests: 100 });

test('policy startup initializes idempotently through the real generated Prisma client', { timeout: 120000 }, async () => {
  await import('reflect-metadata');
  const { PrismaService } = await import('../.build/api/apps/api/src/platform/database/prisma.service.js');
  await withAgendaDatabase(async ({ databaseUrl }) => {
    const database = new PrismaService(databaseUrl), config = configuration();
    try {
      await initializeAiExecutionPolicy(database, config);
      const [first] = await database.$queryRawUnsafe('SELECT baseline_profiles,active_profiles FROM ai_execution_policy WHERE singleton');
      assert.equal(Object.keys(first.active_profiles).length, 6);
      await initializeAiExecutionPolicy(database, config);
      const [second] = await database.$queryRawUnsafe('SELECT baseline_profiles,active_profiles FROM ai_execution_policy WHERE singleton');
      assert.deepEqual(second, first);
      assert.equal(Object.keys(config.legacyExecutionProfiles).length, 6);
    } finally { await database.onModuleDestroy(); }
  });
});
test('API pool sessions end transactions left idle and keep the statement bound', { timeout: 120000 }, async () => {
  await import('reflect-metadata');
  const { PrismaService } = await import('../.build/api/apps/api/src/platform/database/prisma.service.js');
  await withAgendaDatabase(async ({ databaseUrl }) => {
    const database = new PrismaService(databaseUrl);
    try {
      const [settings] = await database.$queryRawUnsafe(`SELECT current_setting('idle_in_transaction_session_timeout') AS idle,
        current_setting('statement_timeout') AS statement`);
      // Above the longest transaction timeout in the API (15 s), so it only reclaims stuck sessions.
      assert.deepEqual(settings, { idle: '20s', statement: '1s' });
    } finally { await database.onModuleDestroy(); }
  });
});
function databaseFor(pool, observe = () => {}) {
  return { async $transaction(operation) {
    const client = await pool.connect(); observe(client.processID);
    try {
      await client.query('BEGIN');
      const result = await operation({ $queryRawUnsafe: async (sql, ...values) => (await client.query(sql, values)).rows });
      await client.query('COMMIT'); return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  } };
}
async function waitForAdvisory(pool, pid) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await pool.query("SELECT 1 FROM pg_locks WHERE pid=$1 AND locktype='advisory' AND NOT granted", [pid])).rowCount) return;
    await delay(10);
  }
  assert.fail('concurrent operation never waited for the profile advisory lock');
}

test('AI profile upgrade, immutable snapshots, policy transitions and concurrent legacy admission', { timeout: 120000 }, async t => {
  await createAgendaDatabaseFixture({ beforeMigration: migration })(async ({ pool }) => {
    const absent = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_name='study_ai_dispatches' AND column_name='execution_profile'");
    assert.equal(absent.rowCount, 0, 'upgrade fixture must start before the new migration');
    const owner = randomUUID(), legacy = randomUUID();
    await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Synthetic','Student','no-login',now(),'student')`, [owner, `${owner}@example.invalid`]);
    const insertLegacy = (connection, id = randomUUID()) => connection.query(`INSERT INTO study_ai_dispatches
      (id,owner_id,request_id,lease_until) VALUES($1,$2,$3,clock_timestamp()+interval '1 minute') RETURNING id`, [id, owner, randomUUID()]);
    await insertLegacy(pool, legacy);
    await pool.query('UPDATE study_ai_dispatches SET input_tokens=7,reserved_microusd=13,usage_day=CURRENT_DATE WHERE id=$1', [legacy]);
    await pool.query(await readFile(`prisma/migrations/${migration}/migration.sql`, 'utf8'));
    const db = databaseFor(pool), base = configuration();
    const changed = { ...configuration(), executionProfiles: { study: { ...snapshotForTask(base, 'study'), provider: 'anthropic',
      model: 'synthetic-claude', profileId: 'study-alternate', inputUsdPerMillion: 2, outputUsdPerMillion: 3 } } };
    const policy = async () => (await pool.query('SELECT baseline_profiles,active_profiles FROM ai_execution_policy WHERE singleton')).rows[0];
    const insertPinned = async () => (await pool.query(`INSERT INTO study_ai_dispatches
      (id,owner_id,request_id,lease_until,execution_profile) VALUES($1,$2,$3,clock_timestamp()+interval '1 minute',
      (SELECT active_profiles->'study' FROM ai_execution_policy WHERE singleton)) RETURNING *`, [randomUUID(), owner, randomUUID()])).rows[0];
    let pinned;

    await t.test('upgrade preserves legacy state, usage and null profiles across all six nullable columns', async () => {
      const row = (await pool.query('SELECT * FROM study_ai_dispatches WHERE id=$1', [legacy])).rows[0];
      assert.equal(row.execution_profile, null); assert.equal(row.state, 'RUNNING');
      assert.equal(String(row.input_tokens), '7'); assert.equal(String(row.reserved_microusd), '13');
      const columns = await pool.query(`SELECT table_name,is_nullable FROM information_schema.columns WHERE column_name='execution_profile'
        AND table_name=ANY($1::text[])`, [['classroom_curriculum_extractions', 'activity_ai_generations', 'student_ai_reports', 'grading_ai_jobs', 'foxy_turns', 'study_ai_dispatches']]);
      assert.equal(columns.rowCount, 6); assert.ok(columns.rows.every(row => row.is_nullable === 'YES'));
    });
    await t.test('database itself rejects initial policy creation while unresolved legacy exists', async () => {
      const profiles = Object.fromEntries(['curriculum', 'activities', 'analysis', 'grading', 'foxy', 'study'].map(task => [task, snapshotForTask(base, task)]));
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await assert.rejects(client.query('INSERT INTO ai_execution_policy(baseline_profiles,active_profiles) VALUES($1::jsonb,$1::jsonb)', [JSON.stringify(profiles)]), /AI_LEGACY_PENDING/u);
      } finally { await client.query('ROLLBACK'); client.release(); }
    });
    await t.test('first initialization refuses unresolved legacy, then persists a credential-free baseline after drain', async () => {
      await assert.rejects(initializeAiExecutionPolicy(db, base), { code: 'AI_LEGACY_PENDING' });
      await assert.rejects(initializeAiExecutionPolicy(db, changed), { code: 'AI_LEGACY_PENDING' });
      assert.equal(await policy(), undefined);
      await pool.query("UPDATE study_ai_dispatches SET state='FAILED' WHERE id=$1", [legacy]);
      await initializeAiExecutionPolicy(db, base);
      assert.deepEqual((await policy()).baseline_profiles.study, snapshotForTask(configuration(), 'study'));
      assert.ok(!JSON.stringify(await policy()).includes('synthetic-never-persist'));
      assert.equal(base.legacyExecutionProfiles.study.model, 'synthetic-gemini');
      assert.equal((await policy()).active_profiles.study.provider, 'gemini');
      await assert.rejects(insertLegacy(pool), /AI_LEGACY_PENDING/u);
      pinned = await insertPinned(); assert.equal(pinned.execution_profile.model, 'synthetic-gemini');
    });
    await t.test('snapshots reject mutation, null-to-profile replacement and extra secret fields', async () => {
      const saved = JSON.stringify(pinned.execution_profile);
      await assert.rejects(pool.query('UPDATE study_ai_dispatches SET execution_profile=$2::jsonb WHERE id=$1', [legacy, saved]), /AI_EXECUTION_PROFILE_IMMUTABLE/u);
      await assert.rejects(pool.query('UPDATE study_ai_dispatches SET execution_profile=NULL WHERE id=$1', [pinned.id]), /AI_EXECUTION_PROFILE_IMMUTABLE/u);
      await assert.rejects(pool.query('UPDATE study_ai_dispatches SET execution_profile=$2::jsonb WHERE id=$1', [pinned.id, JSON.stringify({ ...pinned.execution_profile, model: 'mutated-model' })]), /AI_EXECUTION_PROFILE_IMMUTABLE/u);
      await assert.rejects(pool.query(`INSERT INTO study_ai_dispatches(id,owner_id,request_id,lease_until,execution_profile)
        VALUES($1,$2,$3,now(),$4::jsonb)`, [randomUUID(), owner, randomUUID(), JSON.stringify({ ...pinned.execution_profile, apiKey: 'forbidden-field' })]), { code: '23514' });
      assert.equal((await pool.query('SELECT foxmind_valid_ai_execution($1::jsonb,\'study\') AS valid', [JSON.stringify({ ...pinned.execution_profile, apiKey: 'forbidden-field' })])).rows[0].valid, false);
    });
    await t.test('baseline cannot mutate or delete, even after changing active profiles', async () => {
      await assert.rejects(pool.query("UPDATE ai_execution_policy SET baseline_profiles=jsonb_set(baseline_profiles,'{study,model}','\"mutated\"')"), /AI_EXECUTION_BASELINE_IMMUTABLE/u);
      await assert.rejects(pool.query('DELETE FROM ai_execution_policy'), /AI_EXECUTION_POLICY_IMMUTABLE/u);
      await pool.query("UPDATE study_ai_dispatches SET state='FAILED' WHERE id=$1", [legacy]);
      await initializeAiExecutionPolicy(db, changed);
      assert.equal((await policy()).active_profiles.study.provider, 'anthropic');
      assert.equal((await policy()).baseline_profiles.study.provider, 'gemini');
      await assert.rejects(insertLegacy(pool), /AI_LEGACY_PENDING/u);
      await assert.rejects(pool.query(`INSERT INTO study_ai_dispatches(id,owner_id,request_id,lease_until,execution_profile)
        VALUES($1,$2,$3,now(),$4::jsonb)`, [randomUUID(), owner, randomUUID(), JSON.stringify(pinned.execution_profile)]), /AI_EXECUTION_PROFILE_CONFLICT/u);
      const jobConfig = configurationForJob(changed, pinned.execution_profile, 'study');
      assert.equal(jobConfig.model, 'synthetic-gemini'); assert.equal(jobConfig.outputUsdPerMillion, 1);
      assert.equal((await insertPinned()).execution_profile.model, 'synthetic-claude');
    });
    await t.test('legacy reactivation after profile change is rejected before it creates pending work', async () => {
      await assert.rejects(pool.query("UPDATE study_ai_dispatches SET state='RUNNING' WHERE id=$1", [legacy]), /AI_LEGACY_PENDING/u);
      assert.equal((await pool.query('SELECT state FROM study_ai_dispatches WHERE id=$1', [legacy])).rows[0].state, 'FAILED');
    });
    await t.test('old application cannot claim a modern job or replace its lease', async () => {
      const old = await pool.connect();
      try {
        await old.query("SET application_name='foxmind-api'");
        await assert.rejects(old.query("UPDATE study_ai_dispatches SET lease_until=clock_timestamp()+interval '2 minutes' WHERE id=$1", [pinned.id]), /AI_EXECUTOR_VERSION_REQUIRED/u);
      } finally { await old.query("SET application_name='foxmind-api-ai-execution-v1'"); old.release(); }
    });
    await t.test('budget uses pinned prices and output limit despite different live configuration', async () => {
      // Exercise today's billing code against the upgraded database with the original pinned job.
      const laterMigrations = (await readdir('prisma/migrations')).filter(name => /^\d+_/.test(name) && name > migration).sort();
      for (const name of laterMigrations) {
        await pool.query(await readFile(`prisma/migrations/${name}/migration.sql`, 'utf8'));
      }
      const live = { ...configuration(), maxOutputTokens: 900, inputUsdPerMillion: 90, outputUsdPerMillion: 90 };
      const job = { id: pinned.id, owner_id: owner };
      await db.$transaction(async raw => {
        const tx = { query: (sql, ...values) => raw.$queryRawUnsafe(sql, ...values) };
        assert.equal(await reserveAiTextBudget(tx, job, 10, live, 'study_ai_dispatches'), true);
      });
      assert.equal(String((await pool.query('SELECT reserved_microusd FROM study_ai_dispatches WHERE id=$1', [pinned.id])).rows[0].reserved_microusd), '110');
      await db.$transaction(async raw => settleAiTextBudget({ query: (sql, ...values) => raw.$queryRawUnsafe(sql, ...values) }, job, live,
        { inputTokens: 10, outputTokens: 5 }, 'study_ai_dispatches'));
      const usage = (await pool.query("SELECT reserved_microusd,consumed_microusd FROM ai_usage_daily WHERE scope=$1 AND capability='study-plan-v1'", [owner])).rows[0];
      assert.equal(String(usage.reserved_microusd), '0'); assert.equal(String(usage.consumed_microusd), '15');
    });
  });
});

test('first policy initialization and legacy insertion serialize in both lock orders', { timeout: 120000 }, async t => {
  await createAgendaDatabaseFixture()(async ({ pool }) => {
    const owner = randomUUID();
    await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Synthetic','Student','no-login',now(),'student')`, [owner, `${owner}@example.invalid`]);
    const insert = client => client.query(`INSERT INTO study_ai_dispatches(id,owner_id,request_id,lease_until)
      VALUES($1,$2,$3,now()+interval '1 minute') RETURNING id`, [randomUUID(), owner, randomUUID()]);
    await t.test('legacy insert commits first and waiting initializer rejects without creating baseline', async () => {
      const holder = await pool.connect(); let pending;
      try {
        await holder.query('BEGIN'); await holder.query('SELECT pg_advisory_xact_lock(78123003)');
        await insert(holder);
        let pid;
        pending = initializeAiExecutionPolicy(databaseFor(pool, value => { pid = value; }), configuration()).then(() => null, error => error);
        for (let n = 0; !pid && n < 100; n++) await delay(10);
        await waitForAdvisory(pool, pid); await holder.query('COMMIT');
        assert.equal((await pending)?.code, 'AI_LEGACY_PENDING');
        assert.equal((await pool.query('SELECT count(*)::int AS n FROM ai_execution_policy')).rows[0].n, 0);
      } finally { await holder.query('ROLLBACK'); holder.release(); await pending; }
    });
    await pool.query("UPDATE study_ai_dispatches SET state='FAILED'");
    await t.test('initial policy commits first and waiting legacy insert rejects without pending work', async () => {
      const holder = await pool.connect(), writer = await pool.connect(); let pending;
      try {
        await holder.query('BEGIN'); await holder.query('SELECT pg_advisory_xact_lock(78123003)');
        const db = { $transaction: operation => operation({ $queryRawUnsafe: async (sql, ...values) => (await holder.query(sql, values)).rows }) };
        await initializeAiExecutionPolicy(db, configuration());
        pending = insert(writer).then(() => null, error => error);
        await waitForAdvisory(pool, writer.processID); await holder.query('COMMIT');
        assert.match((await pending)?.message ?? '', /AI_LEGACY_PENDING/u);
        assert.equal((await pool.query('SELECT foxmind_ai_legacy_pending() AS pending')).rows[0].pending, false);
      } finally { await holder.query('ROLLBACK'); holder.release(); writer.release(); await pending; }
    });
  });
});
