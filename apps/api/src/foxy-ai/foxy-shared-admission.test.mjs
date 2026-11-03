import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const cfg = { maxConcurrency: 1, deadlineMs: 30000, dailyActorRequests: 5, dailyGlobalRequests: 20,
  maxOutputTokens: 200, inputUsdPerMillion: 1, outputUsdPerMillion: 1, dailyBudgetUsd: 1 };
const metadata = { model: 'synthetic', promptVersion: 'foxy-chat-v1', schemaVersion: 'foxy-answer-v1' };
const fakeProgress = { completion: { expected: 1, delivered: 1, pending: 0, onTime: 1, late: 0, pendingResubmissions: 0, percentage: '100' },
  performance: { graded: 0, average: null }, activities: [{ id: randomUUID(), title: 'Sintética', type: 'ASSIGNMENT', expected: true,
    firstSubmission: { late: false }, pendingResubmission: false, grade: null }] };

async function candidate(kind, f, query, database, options) {
  const id = randomUUID();
  if (kind === 'extraction') {
    const [draft] = await query('SELECT id FROM classroom_drafts WHERE owner_id=$1::uuid LIMIT 1', f.teacherActor);
    const file = randomUUID();
    await query(`INSERT INTO files(id,updated_at,classroom_draft_id,uploaded_by_id,storage_key,original_name,extension,size_bytes)
      VALUES($1,now(),$2,$3,$4,'synthetic.pdf','pdf',5)`, file, draft.id, f.teacherActor, `test-extraction/${file}`);
    await query(`INSERT INTO classroom_curriculum_extractions(id,owner_id,draft_id,file_id,source_digest,base_revision,schema_version,prompt_version,model)
      VALUES($1,$2,$3,$4,$5,0,'study-plan-v1','synthetic','synthetic')`, id, f.teacherActor, draft.id, file, 'a'.repeat(64));
    const { claim } = await import('../classrooms/ai/queue.ts');
    return { claim: () => claim({ database, configuration: options }), reset: () => query("UPDATE classroom_curriculum_extractions SET state='QUEUED',lease_nonce=NULL,lease_until=NULL WHERE id=$1", id) };
  }
  if (kind === 'activity') {
    await query(`INSERT INTO activity_ai_generations(id,owner_id,classroom_id,unit_id,type,base_revision,request_hash,input_payload,curriculum_snapshot,source_snapshot,schema_version,prompt_version,model)
      VALUES($1,$2,$3,$4,'ASSIGNMENT',0,$5,'{}','{}','[]','activity-proposal-v1','synthetic','synthetic')`,
    id, f.teacherActor, f.rooms.teach.id, f.rooms.teach.unit, 'a'.repeat(64));
    const { claim } = await import('../../../../.build/api/apps/api/src/classrooms/activity-ai/queue.js');
    return { claim: () => claim({ access: { transaction: operation => database.$transaction(raw => operation({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) })) }, configuration: options }),
      reset: () => query("UPDATE activity_ai_generations SET state='QUEUED',lease_nonce=NULL,lease_until=NULL WHERE id=$1", id) };
  }
  if (kind === 'grading') {
    const activity = await f.activity('teach'), attempt = await f.attempt(activity);
    await query('UPDATE classrooms SET ai_grading_enabled=true WHERE id=$1::uuid', f.rooms.teach.id);
    await query(`INSERT INTO grading_ai_jobs(id,classroom_id,activity_id,attempt_id,owner_id,rubric_snapshot,epoch)
      VALUES($1,$2,$3,$4,$5,'Sintético',0)`, id, f.rooms.teach.id, activity.id, attempt, f.teacherActor);
    const { createGradingAiSqlQueue } = await import('../classrooms/grading-ai/sql-queue.ts');
    const q = createGradingAiSqlQueue({ database, configuration: options });
    return { claim: () => q.claim(), reset: () => query("UPDATE grading_ai_jobs SET state='QUEUED',lease_nonce=NULL,lease_until=NULL WHERE id=$1", id) };
  }
  const { StudentAiWorker } = await import('../classrooms/student-ai/worker.ts');
  const worker = new StudentAiWorker({ database, progressView: async () => fakeProgress, configuration: options, provider: {} });
  const member = { enrollment_id: f.rooms.teach.enrollment, classroom_id: f.rooms.teach.id, student_id: f.pupil, owner_id: f.teacherActor };
  const tx = { query };
  return { claim: () => worker.claim(tx, member), reset: () => query('DELETE FROM student_ai_reports WHERE enrollment_id=$1::uuid', member.enrollment_id) };
}
async function activeFoxy(api, f, query, owner) {
  const tx = { query }, conversations = api.createFoxyConversationRepository(), turns = api.createFoxyTurnRepository();
  const { conversation } = await conversations.create(tx, owner, { requestId: randomUUID(), title: 'Foxy', context: { kind: 'GENERAL' } }, 'a'.repeat(64));
  const body = { requestId: randomUUID(), revision: '0', purpose: 'CHAT', text: 'Hola', selection: { topicIds: [], sourceIds: [] } };
  const { turn } = await turns.enqueue(tx, owner, conversation.id, body, { context: { kind: 'GENERAL' }, curriculum: null, sources: [] }, 'b'.repeat(64), metadata);
  const leaseNonce = randomUUID();
  await query("UPDATE foxy_turns SET state='RUNNING',lease_nonce=$2::uuid,lease_until=clock_timestamp()+interval '1 minute' WHERE id=$1::uuid", turn.id, leaseNonce);
  return { ...turn, lease: { turnId:turn.id, ownerId:owner, conversationId:conversation.id, leaseNonce } };
}

test('existing AI claimers respect synthetic active Foxy work globally and per teacher', { timeout: 120000 }, async t => {
  const api = await import('./index.ts');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    for (const kind of ['extraction', 'activity', 'grading', 'student']) for (const scope of ['global', 'owner']) {
      await t.test(`${kind}: Foxy ${scope} admission`, () => transaction(async ({ query }) => {
        const f = await homeFixture(query), database = { $transaction: fn => fn({ $queryRawUnsafe: query }) };
        const configuration = { ...cfg, maxConcurrency: scope === 'global' ? 1 : 2 };
        const pending = await candidate(kind, f, query, database, configuration);
        assert.ok(await pending.claim(), 'positive control proves the candidate can otherwise be claimed');
        await pending.reset();
        await activeFoxy(api, f, query, scope === 'global' ? f.other : f.teacherActor);
        assert.ok((await pending.claim()) === null, `${kind} must count running Foxy work for ${scope}`);
      }));
    }
  });
});


test('other AI claimers wait for explicit Foxy recovery then regain capacity', { timeout: 120000 }, async t => {
  const api = await import('./index.ts');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    for (const kind of ['extraction', 'activity', 'grading', 'student']) for (const scope of ['global', 'owner']) for (const dispatched of [false, true]) {
      await t.test(`${kind}: ${scope}, ${dispatched ? 'dispatched' : 'undispatched'} recovery`, () => transaction(async ({ query }) => {
        const f = await homeFixture(query), database = { $transaction: fn => fn({ $queryRawUnsafe: query }) };
        const configuration = { ...cfg, maxJobAgeMs: 300000, maxConcurrency: scope === 'global' ? 1 : 2 };
        const pending = await candidate(kind, f, query, database, configuration);
        assert.ok(await pending.claim()); await pending.reset();
        const turn = await activeFoxy(api, f, query, scope === 'global' ? f.other : f.teacherActor);
        if (dispatched) assert.equal(await api.createFoxyTextBudget({configuration}).reserve({query},turn.lease,100),'RESERVED');
        await query("UPDATE foxy_turns SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid", turn.id);
        assert.equal(await pending.claim(), null, 'expired work must not bypass recovery');
        const foxyQueue = api.createFoxyTurnQueue({ database, configuration });
        assert.equal(await foxyQueue.recoverExpired(), 1);
        const [row] = await query('SELECT state,error_code,lease_nonce,lease_until FROM foxy_turns WHERE id=$1::uuid', turn.id);
        assert.equal(row.state, dispatched ? 'FAILED' : 'QUEUED');
        assert.equal(row.error_code, dispatched ? 'PROVIDER_OUTCOME_UNKNOWN' : null);
        assert.equal(row.lease_nonce, null); assert.equal(row.lease_until, null);
        assert.ok(await pending.claim(), 'recovery must release global and owner capacity');
      }));
    }
  });
});

test('ARQ-08 measures contended admission and settles one technical reservation', { timeout: 120000 }, async t => {
  await withAgendaDatabase(async ({ pool }) => {
    const query = async (sql, ...args) => (await pool.query(sql, args)).rows;
    const f = await homeFixture(query);
    const samples = [];
    const database = { async $transaction(operation) {
      const start = performance.now(), connection = await pool.connect();
      const sample = { connectionMs: performance.now() - start, admissionLockMs: 0, operationMs: 0 };
      try {
        await connection.query('BEGIN');
        const value = await operation({ $queryRawUnsafe: async (sql, ...args) => {
          const before = performance.now();
          const result = await connection.query(sql, args);
          if (sql.includes('pg_advisory_xact_lock(78123002)')) sample.admissionLockMs += performance.now() - before;
          return result.rows;
        } });
        await connection.query('COMMIT');
        return value;
      } catch (error) { await connection.query('ROLLBACK'); throw error; }
      finally { connection.release(); sample.operationMs = performance.now() - start; samples.push(sample); }
    } };
    const pending = await candidate('activity', f, query, database, cfg);
    const blocker = await pool.connect();
    let outcomes, waiting = false;
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT 1 FROM pg_advisory_xact_lock(78123002)');
      outcomes = Promise.allSettled([pending.claim(), pending.claim()]);
      for (let i = 0; i < 50; i++) {
        const [row] = await query(`SELECT count(*)::int AS count FROM pg_locks
          WHERE locktype='advisory' AND objid=78123002 AND NOT granted`);
        if (row.count === 2) { waiting = true; break; }
        await pause(10);
      }
    } finally { try { await blocker.query('ROLLBACK'); } finally { blocker.release(); } }
    const results = await outcomes;
    assert.equal(waiting, true, 'both contenders waited on the real admission lock');
    assert.ok(results.every(result => result.status === 'fulfilled'));
    const claimed = results.map(result => result.value).filter(Boolean);
    assert.equal(claimed.length, 1);
    assert.equal(samples.length, 2);
    for (const sample of samples) assert.ok(sample.admissionLockMs > 0 && sample.operationMs >= sample.admissionLockMs);
    const [age] = await query(`SELECT (extract(epoch FROM (clock_timestamp()-created_at))*1000)::float8 AS ms
      FROM activity_ai_generations WHERE id=$1::uuid`, claimed[0].id);
    assert.ok(age.ms >= 0);
    const { reserveAiTextBudget, settleAiTextBudget } = await import('../ai/text-budget.ts');
    await database.$transaction(async raw => {
      const tx = { query: (...args) => raw.$queryRawUnsafe(...args) };
      assert.equal(await reserveAiTextBudget(tx, claimed[0], 100, cfg, 'activity_ai_generations'), true);
      assert.equal(await reserveAiTextBudget(tx, claimed[0], 100, cfg, 'activity_ai_generations'), false);
      await settleAiTextBudget(tx, claimed[0], cfg, { inputTokens: 100, outputTokens: 30 }, 'activity_ai_generations');
    });
    const [spend] = await query(`SELECT request_count AS requests,reserved_microusd::text AS reserved,
      consumed_microusd::text AS consumed FROM ai_usage_daily WHERE scope='global' AND capability='study-plan-v1'`);
    assert.deepEqual(spend, { requests: 1, reserved: '0', consumed: '130' });
    t.diagnostic(JSON.stringify({ workload: 'two claimers, one queued activity', claims: samples.slice(0, 2), ageAtObservationMs: age.ms,
      budgetOperation: samples[2], spend }));
  });
});

test('ARQ-08 preserves the paired-generation owner and priority distinctions', { timeout: 120000 }, async () => {
  const { noAiWorkForOwner } = await import('../ai-admission.ts');
  await withAgendaDatabase(async ({ transaction }) => transaction(async ({ query, database }) => {
    const f = await homeFixture(query);
    const pending = await candidate('activity', f, query, database, cfg);
    const claimed = await pending.claim();
    assert.ok(claimed);
    await query("UPDATE activity_ai_generations SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid", claimed.id);
    const available = async policy => (await query(`SELECT ${noAiWorkForOwner('q', policy)} AS available
      FROM (SELECT $1::uuid AS owner_id) q`, f.teacherActor))[0].available;
    assert.equal(await available('active'), true);
    assert.equal(await available('generation'), false);
    assert.equal(await available('generation-priority'), false);
    await pending.reset();
    const report = await candidate('student', f, query, database, cfg);
    assert.ok(await report.claim());
    assert.equal(await available('generation'), false);
    assert.equal(await available('generation-priority'), true);
  }));
});

test('generation recovery bounds admission lock work and settles every expired reservation across polls', { timeout: 120000 }, async t => {
  await withAgendaDatabase(async ({ pool }) => {
    const query = async (sql, ...args) => (await pool.query(sql, args)).rows;
    const f = await homeFixture(query);
    const { claim } = await import('../classrooms/ai/queue.ts');
    const worker = await pool.connect(), peer = await pool.connect();
    let waiting;
    const database = { async $transaction(operation) {
      await worker.query('BEGIN');
      try {
        const result = await operation({ async $queryRawUnsafe(sql, ...args) {
          const result = await worker.query(sql, args);
          if (sql.includes('pg_advisory_xact_lock(78123002)') && !waiting) {
            const start = performance.now();
            waiting = peer.query('SELECT 1 FROM pg_advisory_xact_lock(78123002)').then(() => performance.now() - start);
          }
          return result.rows;
        } });
        await worker.query('COMMIT');
        return result;
      } catch (error) {
        await worker.query('ROLLBACK');
        throw error;
      }
    } };
    const counts = async () => (await query(`SELECT count(*) FILTER (WHERE state='RUNNING')::int AS pending,
      count(*) FILTER (WHERE state='FAILED' AND error_code='PROVIDER_OUTCOME_UNKNOWN' AND lease_nonce IS NULL
        AND lease_until IS NULL AND reserved_microusd=0)::int AS recovered FROM activity_ai_generations`))[0];
    const samples = [];
    try {
      for (const size of [0, 50, 250, 1000]) for (let repeat = 0; repeat < 3; repeat++) {
        await query('DELETE FROM activity_ai_generations');
        await query('DELETE FROM ai_usage_daily');
        await query(`INSERT INTO activity_ai_generations(id,owner_id,classroom_id,unit_id,type,base_revision,request_hash,
          input_payload,curriculum_snapshot,source_snapshot,schema_version,prompt_version,model,state,lease_nonce,lease_until,
          dispatch_started_at,dispatch_count,reserved_microusd,usage_day)
          SELECT gen_random_uuid(),$1,$2,$3,'ASSIGNMENT',0,repeat('a',64),'{}','{}','[]','activity-proposal-v1','synthetic','synthetic',
            'RUNNING',gen_random_uuid(),clock_timestamp()-interval '1 second',clock_timestamp()-interval '2 seconds',1,300,current_date
          FROM generate_series(1,$4::int)`, f.teacherActor, f.rooms.teach.id, f.rooms.teach.unit, size);
        await query(`INSERT INTO ai_usage_daily(day,scope,capability,request_count,reserved_microusd)
          VALUES(current_date,'global','study-plan-v1',$2,$2*300),(current_date,$1,'study-plan-v1',$2,$2*300)`, f.teacherActor, size);
        waiting = undefined;
        const start = performance.now();
        assert.equal(await claim({ database, configuration: cfg }), null);
        const operationMs = performance.now() - start, peerWaitMs = await waiting;
        assert.ok(Number.isFinite(peerWaitMs));
        samples.push({ size, operationMs, peerWaitMs, ...await counts() });
      }
      t.diagnostic(JSON.stringify(samples));
      for (const { size, pending, recovered } of samples) {
        assert.equal(recovered, Math.min(size, 25), 'each transaction recovers at most 25 rows from each table');
        assert.equal(pending, size - recovered);
      }
      for (let offset = 25; offset < 1000; offset += 25) await claim({ database, configuration: cfg });
      assert.deepEqual(await counts(), { pending: 0, recovered: 1000 });
      const spend = await query(`SELECT request_count AS requests,reserved_microusd::int AS reserved,
        consumed_microusd::int AS consumed FROM ai_usage_daily ORDER BY scope`);
      assert.deepEqual(spend, Array.from({ length: 2 }, () => ({ requests: 1000, reserved: 0, consumed: 300000 })));
    } finally {
      await waiting;
      worker.release();
      peer.release();
    }
  });
});

test('activity claim recovers both generation queues in bounded batches and requeues undispatched work', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ transaction }) => transaction(async ({ query, database }) => {
    const f = await homeFixture(query);
    await candidate('extraction', f, query, database, cfg);
    const activity = await candidate('activity', f, query, database, cfg);
    await query(`INSERT INTO classroom_curriculum_extractions(id,owner_id,draft_id,file_id,source_digest,base_revision,
      schema_version,prompt_version,model,generation,state,lease_nonce,lease_until)
      SELECT gen_random_uuid(),owner_id,draft_id,file_id,source_digest,base_revision,schema_version,prompt_version,model,
        n,'RUNNING',gen_random_uuid(),clock_timestamp()-interval '1 second'
      FROM classroom_curriculum_extractions CROSS JOIN generate_series(1,26) AS g(n)
      WHERE state='QUEUED'`);
    await query(`INSERT INTO activity_ai_generations(id,owner_id,classroom_id,unit_id,type,base_revision,request_hash,input_payload,
      curriculum_snapshot,source_snapshot,schema_version,prompt_version,model,state,lease_nonce,lease_until)
      SELECT gen_random_uuid(),owner_id,classroom_id,unit_id,type,base_revision,request_hash,input_payload,curriculum_snapshot,
        source_snapshot,schema_version,prompt_version,model,'RUNNING',gen_random_uuid(),clock_timestamp()-interval '1 second'
      FROM activity_ai_generations CROSS JOIN generate_series(1,26) WHERE state='QUEUED'`);
    for (const table of ['classroom_curriculum_extractions', 'activity_ai_generations']) {
      await query(`UPDATE ${table} SET next_attempt_at=clock_timestamp()+interval '1 hour'`);
    }
    const states = async table => (await query(`SELECT state,count(*)::int AS n FROM ${table} GROUP BY state ORDER BY state`));
    assert.equal(await activity.claim(), null);
    for (const table of ['classroom_curriculum_extractions', 'activity_ai_generations']) {
      assert.deepEqual(await states(table), [{ state: 'QUEUED', n: 26 }, { state: 'RUNNING', n: 1 }]);
    }
    assert.equal(await activity.claim(), null);
    for (const table of ['classroom_curriculum_extractions', 'activity_ai_generations']) {
      assert.deepEqual(await states(table), [{ state: 'QUEUED', n: 27 }]);
    }
  }));
});
