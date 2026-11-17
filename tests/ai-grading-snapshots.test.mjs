import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const root = 'apps/api/src/modules/grading/';
const saved = { provider: 'anthropic', model: 'saved-model', deadlineMs: 1200, maxInputTokens: 50, maxOutputTokens: 25,
  inputUsdPerMillion: 2, outputUsdPerMillion: 3 };
const base = { model: 'current-model', deadlineMs: 3000, maxInputTokens: 5, maxOutputTokens: 10, maxConcurrency: 2 };
const resolutions = [];
const snapshotStub = { configurationForJob(configuration, snapshot, task) {
  resolutions.push({ snapshot, task });
  return { ...configuration, ...snapshot, executionProfile: snapshot };
} };
const shared = { '../../../../../platform/ai/execution-snapshot.ts': snapshotStub };

test('analysis pins one provider and configuration for count, generate and budget', async () => {
  const budgets = [], calls = [], configurations = [];
  const { StudentAiWorker } = loadTsModule(`${root}student-analysis/infrastructure/student-ai/worker.ts`, { stubs: { ...shared,
    '../../../../../platform/ai/text-budget.ts': { async reserve(_tx, _job, count, config) { budgets.push(config); return true; },
      reserveAiTextBudget: async (_tx, _job, _count, config) => { budgets.push(config); return true; },
      settleAiTextBudget: async (_tx, _job, config) => { budgets.push(config); } },
    '../../../../../../../../src/core/domain/grading/student-ai.ts': { validateStudentAiReport() {} },
  } });
  const provider = { async countStudentAiTokens() { calls.push('count'); return 20; },
    async generateStudentAi() { calls.push('generate'); return { json: {}, inputTokens: 20, outputTokens: 2 }; } };
  const worker = new StudentAiWorker({ configuration: base, provider: { countStudentAiTokens() { throw Error('global provider'); } },
    providerForExecution(config) { configurations.push(config); return provider; }, database: {}, progressView() {} });
  worker.transaction = operation => operation({ async query() { return [{ id: 'job' }]; } });
  worker.current = async () => true;
  await worker.execute({ id: 'job', owner_id: 'owner', execution_profile: saved }, {});
  assert.deepEqual(calls, ['count', 'generate']);
  assert.equal(configurations.length, 1);
  assert.equal(configurations[0].model, 'saved-model');
  assert.deepEqual(budgets.map(config => config.model), ['saved-model', 'saved-model']);
  assert.equal(base.model, 'current-model');
});

test('grading SQL claim retains saved snapshot and uses saved deadline and tariffs', async () => {
  const queries = [], costs = [];
  const row = { id: 'job', owner_id: 'owner', classroom_id: 'room', activity_id: 'activity', attempt_id: 'attempt', execution_profile: saved };
  const { createGradingAiSqlQueue } = loadTsModule(`${root}assistance/infrastructure/grading-ai/sql-queue.ts`, { stubs: { ...shared,
    '../../../../../platform/ai/text-budget.ts': { async reserveAiTextBudget(_tx, _job, _count, config) { costs.push(config); return true; }, async settleAiTextBudget() {} },
  } });
  const database = { $transaction: operation => operation({ async $queryRawUnsafe(sql, ...args) {
    queries.push({ sql, args });
    if (sql.includes('AS count')) return [{ count: 0 }];
    if (sql.startsWith('SELECT j.*') || sql.startsWith('UPDATE grading_ai_jobs j')) return [row];
    return [{ id: 'job' }];
  } }) };
  const queue = createGradingAiSqlQueue({ database, configuration: base });
  const job = await queue.claim();
  assert.deepEqual(job.executionProfile, saved);
  const claimed = queries.find(query => query.sql.startsWith('UPDATE grading_ai_jobs j'));
  assert.equal(claimed.args[2], 11200);
  await queue.reserve(job, 20);
  assert.equal(costs[0].model, 'saved-model');
  assert.equal(costs[0].inputUsdPerMillion, 2);
});

test('grading runtime resolves one saved provider for count and generation', async () => {
  const calls = [], configurations = [], finishes = [];
  const { GradingAiRuntime } = loadTsModule(`${root}assistance/infrastructure/grading-ai/runtime.ts`, { stubs: { ...shared,
    './sql-queue.ts': { createGradingAiSqlQueue() { return {}; } },
    './snapshot-sql.ts': { async gradingAiSnapshotFromSql() { return { fingerprint: 'same' }; } },
    '../../../../../../../../src/core/domain/grading/grading-ai.ts': { validateGradingAiProposal(value) { return value; } },
  } });
  const provider = { async countGradingAiTokens() { calls.push('count'); return 20; },
    async generateGradingAi() { calls.push('generate'); return { json: {}, inputTokens: 20, outputTokens: 2 }; } };
  const runtime = new GradingAiRuntime({ configuration: base, provider: {}, database: {}, reader: {},
    providerForExecution(config) { configurations.push(config); return provider; } });
  runtime.queue = { async recover() {}, async claim() { return { id: 'job', executionProfile: saved }; },
    async isCurrent() { return true; }, async reserve() { return true; }, async finish(_job, state) { finishes.push(state); } };
  runtime.snapshot = async () => ({ files: [], fingerprint: 'same', snapshot: { evidence: { files: [] }, spec: {} } });
  await runtime.run(new AbortController().signal);
  assert.deepEqual(calls, ['count', 'generate']);
  assert.deepEqual(finishes, ['READY']);
  assert.equal(configurations.length, 1);
  assert.equal(configurations[0].model, 'saved-model');
  assert.equal(base.maxInputTokens, 5);
});

test('enqueue stores active grading profile and analysis retries preserve the original snapshot', async () => {
  const { enqueueSubmittedAttemptGradingAi } = loadTsModule(`${root}assistance/infrastructure/grading-ai/enqueue.ts`);
  let insert;
  await enqueueSubmittedAttemptGradingAi({ async query(sql) {
    if (sql.startsWith('SELECT')) return [{ ai_grading_enabled: true, ai_grading_epoch: 0n }];
    insert = sql; return [{ id: 'job' }];
  } }, {});
  assert.match(insert, /execution_profile/u);
  assert.match(insert, /active_profiles->'grading'/u);
  const { StudentAiWorker } = loadTsModule(`${root}student-analysis/infrastructure/student-ai/worker.ts`, { stubs: shared });
  const worker = new StudentAiWorker({ configuration: base, database: {}, provider: {}, progressView() {} });
  worker.snapshot = async () => ({ hash: 'digest', references: [], evidence: {} });
  let analysis;
  await worker.claim({ async query(sql) {
    if (sql.includes('AS count')) return [{ count: 0, owner_busy: false }];
    if (sql.startsWith('INSERT')) analysis = sql;
    return [{ id: 'job' }];
  } }, {});
  assert.match(analysis, /active_profiles->'analysis'/u);
  assert.ok(!/execution_profile\s*=/u.test(analysis.split('DO UPDATE SET')[1]));
});

test('analysis bootstrap keeps synthetic override isolated and pins real factory per job', () => {
  const created = [], captured = [];
  const { StudentAiRuntime } = loadTsModule('apps/api/src/bootstrap/academic-student-runtime.ts', { stubs: {
    '../modules/grading/student-analysis/infrastructure/student-ai/provider.ts': { createStudentAiProvider(configuration) { created.push(configuration); return { configuration }; } },
    '../modules/grading/student-analysis/infrastructure/student-ai/worker.ts': { StudentAiWorker: class { constructor(options) { captured.push(options); } } },
  } });
  const fake = {};
  new StudentAiRuntime({}, base, fake);
  assert.equal(captured[0].provider, fake);
  assert.equal(captured[0].providerForExecution, undefined);
  assert.deepEqual(created, []);
  new StudentAiRuntime({}, base);
  const pinned = { ...base, ...saved };
  assert.equal(captured[1].providerForExecution(pinned).configuration, pinned);
  assert.deepEqual(created, [base, pinned]);
});
