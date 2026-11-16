import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const paths = {
  curriculum: '../apps/api/src/modules/curriculum/infrastructure/ai/',
  activities: '../apps/api/src/modules/activities/infrastructure/activity-ai/',
};
const states = {};
for (const [task, path] of Object.entries(paths)) {
  await mock.module(new URL(`${path}queue.ts`, import.meta.url).href, { namedExports: {
    claim: async () => states[task].row, fenced: async () => states[task].row,
  } });
  await mock.module(new URL(`${path}budget.ts`, import.meta.url).href, { namedExports: {
    reserve: async (_tx, _row, _count, configuration) => { states[task].reserved = configuration; return true; },
    settle: async (_tx, _row, configuration) => { states[task].settled = configuration; },
  } });
  await mock.module(new URL(`${path}worker-source.ts`, import.meta.url).href, { namedExports: task === 'curriculum'
    ? { businessSource: async () => true, checkSource: async () => true, requireGrant: async () => {} }
    : { validSource: async () => true, requireGrant: async () => {} } });
}
const activityScope = { unit: { id: 'resolved-unit' }, units: [{ id: 'resolved-unit' }, { id: 'another-unit' }], topics: [] };
await mock.module(new URL(`${paths.activities}source.ts`, import.meta.url).href, { namedExports: {
  curriculum: async () => activityScope, snapshots: async () => [], revalidate: async () => true,
} });
const { ClassroomAiWorker } = await import(`${paths.curriculum}worker.ts`);
const { ActivityAiWorker } = await import(`${paths.activities}worker.ts`);
const { ClassroomAiService } = await import(`${paths.curriculum}service.ts`);
const { ActivityAiService } = await import(`${paths.activities}service.ts`);

const base = () => ({ model: 'new-active-model', maxInputTokens: 1000, maxOutputTokens: 400,
  deadlineMs: 2000, maxDispatches: 2, maxJobAgeMs: 300000, maxConcurrency: 2,
  dailyActorRequests: 5, dailyGlobalRequests: 20, dailyBudgetUsd: 10,
  inputUsdPerMillion: 8, outputUsdPerMillion: 9 });
const snapshot = task => ({ format: 'ai-execution-v1', task, provider: 'anthropic', model: 'persisted-model',
  profileId: `${task}-v1`, profileVersion: '1', promptVersion: task === 'curriculum' ? 'study-plan-v1' : 'activity-proposal-v1',
  responseVersion: task === 'curriculum' ? 'study-plan-v1' : 'activity-proposal-v1',
  maxInputTokens: 100, maxOutputTokens: 200, deadlineMs: 1000, maxDocumentBytes: 20000000,
  inputUsdPerMillion: 1, outputUsdPerMillion: 2 });
function fixture(task, executionProfile = snapshot(task)) {
  const state = { calls: [], row: { id: 'job', owner_id: 'owner', draft_id: 'draft', file_id: 'file', source_digest: 'digest',
    lease_nonce: 'lease', dispatch_count: 0, source_snapshot: [], execution_profile: executionProfile,
    input_payload: { objective: 'Comparar', context: 'Contexto', counts: {} },
    curriculum_snapshot: { unit: {}, topics: [] }, type: 'ASSIGNMENT' } };
  states[task] = state;
  const query = async (sql, ...args) => { state.calls.push(['sql', sql, args]); return [state.row]; };
  const configuration = base();
  const provider = config => task === 'curriculum' ? {
    countStudyPlanTokens: async input => { state.calls.push(['count', config, input]); return 20; },
    extractStudyPlan: async input => { state.calls.push(['generate', config, input]); return {
      json: { units: [{ name: 'Luz', topics: [{ name: 'Color' }] }], warnings: [] }, inputTokens: 20, outputTokens: 30,
    }; },
  } : {
    countActivityTokens: async input => { state.calls.push(['count', config, input]); return 20; },
    generateActivity: async input => { state.calls.push(['generate', config, input]); return {
      json: { status: 'INSUFFICIENT_CONTENT', missingInformation: ['Ampliar contexto'] }, inputTokens: 20, outputTokens: 30,
    }; },
  };
  const options = { configuration, provider: provider(configuration), providerForExecution: config => {
    state.calls.push(['factory', config]); return provider(config);
  }, reader: { read: async () => ({ kind: 'text', text: 'Plan sintético' }) },
  database: { $transaction: async operation => operation({ $queryRawUnsafe: query }) },
  access: { transaction: async operation => operation({ query }) } };
  const worker = task === 'curriculum' ? new ClassroomAiWorker(options) : new ActivityAiWorker(options);
  return { state, options, worker, query };
}

for (const task of Object.keys(paths)) {
  test(`${task}: persisted profile chooses one provider and pins limits and budget`, async () => {
    const { state, options, worker } = fixture(task), originalConfiguration = { ...options.configuration };
    await worker.runOnce();
    const factories = state.calls.filter(([kind]) => kind === 'factory');
    assert.equal(factories.length, 1);
    const effective = factories[0][1];
    assert.equal(effective.model, 'persisted-model');
    assert.equal(effective.executionProfile.provider, 'anthropic');
    assert.equal(effective.maxInputTokens, 100);
    assert.equal(effective.maxOutputTokens, 200);
    assert.equal(effective.deadlineMs, 1000);
    assert.equal(state.reserved, effective);
    assert.equal(state.settled, effective);
    const count = state.calls.find(([kind]) => kind === 'count');
    const generation = state.calls.find(([kind]) => kind === 'generate');
    assert.equal(count[1], effective);
    assert.equal(generation[1], effective);
    assert.equal(generation[2], count[2]);
    assert.deepEqual(options.configuration, originalConfiguration);
  });

  test(`${task}: malformed persisted profile closes without creating or calling provider`, async () => {
    const { state, worker } = fixture(task, { ...snapshot(task), task: 'study' });
    await worker.runOnce();
    assert.equal(state.calls.some(([kind]) => ['factory', 'count', 'generate'].includes(kind)), false);
    const finish = state.calls.find(([kind, sql]) => kind === 'sql' && sql.includes("SET state=$3"));
    assert.equal(finish[2][2], 'FAILED');
    assert.equal(finish[2][4], 'AI_UNAVAILABLE');
  });

  test(`${task}: legacy job uses baseline profile and injected overrides remain usable`, async () => {
    const { state, options, worker } = fixture(task, null);
    options.configuration.legacyExecutionProfiles = { [task]: { ...snapshot(task), provider: 'gemini', model: 'legacy-baseline' } };
    await worker.runOnce();
    assert.equal(state.calls.find(([kind]) => kind === 'factory')[1].model, 'legacy-baseline');
    const injected = fixture(task, null);
    delete injected.options.providerForExecution;
    await injected.worker.runOnce();
    assert.equal(injected.state.calls.some(([kind]) => kind === 'generate'), true);
  });
}

test('both INSERTs snapshot active policy and model without adding or reordering parameters', async () => {
  for (const task of Object.keys(paths)) {
    const { options } = fixture(task), calls = [];
    const tx = { query: async (sql, ...args) => { calls.push([sql, args]); return [{}]; } };
    if (task === 'curriculum') await new ClassroomAiService(options).insert(tx, { id: 'draft', owner_id: 'owner', revision: 1 }, 'file', 'digest');
    else await new ActivityAiService(options).insert(tx, {}, 'classroom', 'owner', {
      unitIds: ['another-unit', 'resolved-unit'], type: 'ASSIGNMENT', revision: '1', teacherBrief: 'Comparar los dos temas.',
    }, 'hash');
    const [sql, args] = calls.find(([sql]) => sql.startsWith('INSERT INTO'));
    assert.match(sql, /execution_profile/);
    assert.ok(sql.includes(`active_profiles->'${task}'`));
    assert.ok(sql.includes(`active_profiles->'${task}'->>'model'`));
    assert.match(sql, /COALESCE/);
    assert.equal(args.length, task === 'curriculum' ? 10 : 14);
    assert.equal(args[task === 'curriculum' ? 7 : 11], options.configuration.model);
    if (task === 'activities') {
      assert.equal(args[3], activityScope.unit.id);
      assert.deepEqual(JSON.parse(args[8]), activityScope);
    }
  }
});

test('real queue claims pin lease deadline and preserve operational concurrency', async () => {
  for (const task of Object.keys(paths)) {
    const { claim } = await import(`${paths[task]}queue.ts?lease-verification`);
    const configuration = base(), row = { id: 'job', execution_profile: snapshot(task) }, calls = [];
    let running = 0;
    const query = async (sql, ...args) => {
      calls.push([sql, args]);
      if (sql.includes('SELECT count(*)::int AS count')) return [{ count: running }];
      if (sql.includes('SELECT q.*')) return [row];
      if (sql.includes("SET state='RUNNING'")) return [row];
      return [];
    };
    const options = { configuration, database: { $transaction: async operation => operation({ $queryRawUnsafe: query }) },
      access: { transaction: async operation => operation({ query }) } };
    assert.equal(await claim(options), row);
    const update = calls.find(([sql]) => sql.includes("SET state='RUNNING'"));
    assert.equal(update[1][2], row.execution_profile.deadlineMs + 10000);
    calls.length = 0; running = configuration.maxConcurrency;
    assert.equal(await claim(options), null);
    assert.equal(calls.some(([sql]) => sql.includes("SET state='RUNNING'")), false);
  }
});
